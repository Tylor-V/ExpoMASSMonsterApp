/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const logger = require('firebase-functions/logger');
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const {sendNewsPushNotification} = require('./newsPushNotification');
const {awardAccountabilityCheckin} = require('./accountabilityAward');
const {processRedemptionRequest} = require('./rewardsRedemption');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function recursiveDeleteCollection(collectionRef) {
  const snap = await collectionRef.get();
  for (const doc of snap.docs) {
    await recursiveDeleteDocument(doc.ref);
  }
}

async function recursiveDeleteDocument(docRef) {
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    await recursiveDeleteCollection(subcollection);
  }

  try {
    await docRef.delete();
  } catch (error) {
    const code = error && error.code ? String(error.code) : '';
    if (code !== 'not-found' && code !== 5) {
      throw error;
    }
  }
}

function extractStoragePathFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // gs://bucket/path/to/file
  if (url.startsWith('gs://')) {
    const withoutScheme = url.replace('gs://', '');
    const firstSlash = withoutScheme.indexOf('/');
    if (firstSlash === -1) return null;
    return decodeURIComponent(withoutScheme.slice(firstSlash + 1));
  }

  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>
  const marker = '/o/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const remainder = url.slice(markerIndex + marker.length);
  const encodedPath = remainder.split('?')[0] || '';
  if (!encodedPath) {
    return null;
  }

  try {
    return decodeURIComponent(encodedPath);
  } catch (_error) {
    return encodedPath;
  }
}

async function deleteStorageObjectByUrl(url) {
  const path = extractStoragePathFromUrl(url);
  if (!path) {
    return;
  }

  try {
    await admin.storage().bucket().file(path).delete();
  } catch (error) {
    const code = error && error.code ? String(error.code) : '';
    if (code !== '404' && code !== 404 && code !== 'storage/object-not-found') {
      logger.warn('Failed to delete storage object', {path, error: String(error)});
    }
  }
}

async function deleteStoragePrefix(prefix) {
  if (!prefix) {
    return;
  }

  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({prefix});
  for (const file of files) {
    try {
      await file.delete();
    } catch (error) {
      const code = error && error.code ? String(error.code) : '';
      if (code !== '404' && code !== 404) {
        logger.warn('Failed to delete storage file', {file: file.name, error: String(error)});
      }
    }
  }
}

async function deleteStoryMedia(uid) {
  const storyMediaRef = db.collection('stories').doc(uid).collection('storyMedia');
  const storiesSnap = await storyMediaRef.get();

  for (const doc of storiesSnap.docs) {
    const data = doc.data() || {};
    await deleteStorageObjectByUrl(data.url || '');
    await doc.ref.delete();
  }

  await recursiveDeleteDocument(db.collection('stories').doc(uid));
}

async function deleteGymVideos(uid) {
  const gymFeedRef = db.collection('videos').doc('gym-feed').collection('gym-feed');
  const gymVideosSnap = await gymFeedRef.where('userId', '==', uid).get();

  for (const doc of gymVideosSnap.docs) {
    const data = doc.data() || {};
    await deleteStorageObjectByUrl(data.url || '');
    await doc.ref.delete();
  }

  // Legacy upload naming format in this app: gymVideos/<uid>_<timestamp>.mp4
  await deleteStoragePrefix(`gymVideos/${uid}_`);
}

async function deletePrivateUserData(uid) {
  const userDocRef = db.collection('users').doc(uid);
  const userDocSnap = await userDocRef.get();
  if (!userDocSnap.exists) {
    return;
  }

  await recursiveDeleteDocument(userDocRef);
}

async function tombstonePublicUser(uid, requestData) {
  await db.collection('publicUsers').doc(uid).set({
    uid,
    firstName: 'Deleted',
    lastName: 'User',
    profilePicUrl: '',
    bio: '',
    socials: {},
    role: 'deleted',
    selectedBadges: [],
    badges: [],
    showOnlineStatus: false,
    deleted: true,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletionSource: requestData.requestSource || 'in-app',
  }, {merge: false});
}

async function deleteAuthUser(uid) {
  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') {
      return;
    }
    throw error;
  }
}

exports.processAccountDeletionRequest = functions.firestore
  .document('accountDeletionRequests/{uid}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const requestData = snap.data() || {};

    if (!uid) {
      return null;
    }

    if (requestData.uid && requestData.uid !== uid) {
      await snap.ref.set({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: 'request uid mismatch',
      }, {merge: true});
      return null;
    }

    await snap.ref.set({
      status: 'processing',
      processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    try {
      await deleteStoryMedia(uid);
      await deleteGymVideos(uid);
      await deleteStoragePrefix(`profilePics/${uid}/`);
      await deletePrivateUserData(uid);
      await tombstonePublicUser(uid, requestData);
      await deleteAuthUser(uid);

      await snap.ref.set({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    } catch (error) {
      logger.error('Account deletion failed', {uid, error: String(error)});
      await snap.ref.set({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: String(error),
      }, {merge: true});
    }

    return null;
  });

exports.deleteOldStories = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const now = Date.now();
    const expiry = now - 24 * 60 * 60 * 1000; // 24hr ago
    const storiesRef = db.collection('stories');
    const userSnaps = await storiesRef.listDocuments();

    for (const userDocRef of userSnaps) {
      const storyMediaSnap = await userDocRef.collection('storyMedia')
        .where('timestamp', '<', expiry)
        .get();
      for (const doc of storyMediaSnap.docs) {
        await doc.ref.delete();
      }
    }

    return null;
  });

exports.sendNewsPushNotification = sendNewsPushNotification;
exports.awardAccountabilityCheckin = awardAccountabilityCheckin;
exports.processRedemptionRequest = processRedemptionRequest;


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

