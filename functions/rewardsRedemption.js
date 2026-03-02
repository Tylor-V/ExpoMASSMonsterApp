const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const {createBasicDiscountCode} = require('./shopifyAdminClient');

if (!admin.apps.length) {
  admin.initializeApp();
}

const REWARD_CATALOG = {
  coupon5: {
    points: 5,
    name: '$5 Off',
    type: 'shopify_discount',
    amount: 5,
    currency: 'USD',
    expiresDays: 7,
  },
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

    const requestDoc = await requestRef.get();
    const requestData = requestDoc.data() || {};

    if (requestData.status !== 'approved') {
      return null;
    }

    const reward = REWARD_CATALOG[requestData.rewardId];
    if (reward?.type !== 'shopify_discount') {
      return null;
    }

    const redemptionDoc = await redemptionRef.get();
    const redemptionData = redemptionDoc.data() || {};

    if (redemptionData.discountCode) {
      functions.logger.info('Discount already issued; skipping', {uid, requestId});
      return null;
    }

    const discountCode = `MM-${requestId.slice(0, 8).toUpperCase()}`;
    const startsAt = new Date();
    const expiresAtDate = new Date(
      startsAt.getTime() + ((reward.expiresDays || 7) * 24 * 60 * 60 * 1000),
    );
    const expiresAt = expiresAtDate.toISOString();

    await createBasicDiscountCode({
      code: discountCode,
      title: `${reward.name} (${requestId.slice(0, 8).toUpperCase()})`,
      valueType: 'FIXED_AMOUNT',
      value: reward.amount,
      startsAt: startsAt.toISOString(),
      endsAt: expiresAt,
      usageLimit: 1,
      oncePerCustomer: false,
    });

    await redemptionRef.set({
      discountCode,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
      fulfillmentStatus: 'issued',
    }, {merge: true});

    functions.logger.info('Issued Shopify discount code for redemption', {
      uid,
      requestId,
      rewardId: requestData.rewardId,
      expiresAt,
    });

    return null;
  });
