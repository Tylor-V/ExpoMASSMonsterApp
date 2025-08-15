const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendNewsPushNotification = functions.firestore
  .document('news/{newsId}')
  .onCreate(async (snap, context) => {
    const news = snap.data();
    if (!news || !news.message) return null;

    // Get all device tokens (you should store these in Firestore, e.g., in a 'deviceTokens' collection)
    const tokensSnapshot = await admin.firestore().collection('deviceTokens').get();
    const tokens = tokensSnapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) return null;

    const payload = {
      notification: {
        title: 'MASS Monster News',
        body: news.message,
      },
      data: {
        type: 'news',
        newsId: snap.id,
      },
    };

    // Send notification to all tokens
    return admin.messaging().sendToDevice(tokens, payload);
  });