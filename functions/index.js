/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const {sendNewsPushNotification} = require('./newsPushNotification');
const {awardAccountabilityCheckin} = require('./accountabilityAward');
const {processRedemptionRequest} = require('./rewardsRedemption');
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.deleteOldStories = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = Date.now();
    const expiry = now - 24 * 60 * 60 * 1000; // 24hr ago
    const storiesRef = admin.firestore().collection('stories');
    const userSnaps = await storiesRef.listDocuments();
    let deleted = 0;

    for (const userDocRef of userSnaps) {
      const storyMediaSnap = await userDocRef.collection('storyMedia')
        .where('timestamp', '<', expiry)
        .get();
      for (const doc of storyMediaSnap.docs) {
        await doc.ref.delete();
        deleted++;
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
