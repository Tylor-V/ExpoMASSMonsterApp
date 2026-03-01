const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const REWARD_CATALOG = {
  coupon5: {points: 30, name: '$5 Shop Coupon'},
  mindset: {points: 200, name: 'Coral Club Mindset Pack'},
};

exports.processRedemptionRequest = functions.firestore
  .document('users/{uid}/redemptionRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const requestId = context.params.requestId;
    const initialData = snap.data() || {};

    if (initialData.processedAt) {
      return null;
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const requestRef = snap.ref;
    const redemptionRef = userRef.collection('redemptions').doc(requestId);

    await db.runTransaction(async (tx) => {
      const requestDoc = await tx.get(requestRef);
      const requestData = requestDoc.data() || {};

      if (requestData.processedAt) {
        return;
      }

      const rewardId = requestData.rewardId;
      const reward = REWARD_CATALOG[rewardId];

      if (!reward) {
        tx.update(requestRef, {
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'rejected',
          reason: 'invalid_reward',
        });
        return;
      }

      const userDoc = await tx.get(userRef);
      const userData = userDoc.data() || {};
      const currentPoints = userData.accountabilityPoints || 0;

      if (currentPoints < reward.points) {
        tx.update(requestRef, {
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'rejected',
          reason: 'insufficient_points',
        });
        return;
      }

      tx.update(userRef, {
        accountabilityPoints: admin.firestore.FieldValue.increment(-reward.points),
      });

      tx.set(redemptionRef, {
        rewardId,
        name: reward.name,
        points: reward.points,
        cost: reward.points,
        date: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        requestId,
      }, {merge: true});

      tx.update(requestRef, {
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'approved',
        redemptionId: requestId,
      });
    });

    return null;
  });
