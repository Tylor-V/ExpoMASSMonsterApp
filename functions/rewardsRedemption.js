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

function isDiscountCodeConflictError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /already|taken|exists|duplicate/i.test(message);
}

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
    const now = admin.firestore.Timestamp.now();
    let shopifyPhase = null;

    await db.runTransaction(async (tx) => {
      const requestDoc = await tx.get(requestRef);
      const requestData = requestDoc.data() || {};

      shopifyPhase = null;

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

      if (reward.type === 'shopify_discount') {
        const activeRewardRef = userRef.collection('activeRewards').doc(rewardId);
        const activeRewardDoc = await tx.get(activeRewardRef);
        const activeRewardData = activeRewardDoc.data() || {};
        const activeUsedAt = activeRewardData.usedAt;
        const activeExpiresAt = activeRewardData.expiresAt;

        const hasActiveRewardLock = !!activeRewardDoc.exists &&
          !activeUsedAt &&
          (!activeExpiresAt || activeExpiresAt.toMillis() > now.toMillis());

        if (hasActiveRewardLock) {
          tx.update(requestRef, {
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'rejected',
            reason: 'already_has_active_reward',
          });
          return;
        }

        const existingRedemptionQuery = userRef
          .collection('redemptions')
          .where('rewardId', '==', rewardId)
          .limit(5);
        const existingRedemptions = await tx.get(existingRedemptionQuery);
        const hasActiveRedemption = existingRedemptions.docs.some((doc) => {
          const data = doc.data() || {};
          const usedAt = data.usedAt;
          const expiresAt = data.expiresAt;
          const isIssued = data.fulfillmentStatus === 'issued' || !!data.discountCode;
          const isUnexpired = !expiresAt || expiresAt.toMillis() > now.toMillis();

          return isIssued && !usedAt && isUnexpired;
        });

        if (hasActiveRedemption) {
          tx.update(requestRef, {
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'rejected',
            reason: 'already_has_active_reward',
          });
          return;
        }

        tx.set(requestRef, {
          status: 'processing',
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

        shopifyPhase = {rewardId, reward};
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

    if (!shopifyPhase) {
      return null;
    }

    const {rewardId, reward} = shopifyPhase;
    const activeRewardRef = userRef.collection('activeRewards').doc(rewardId);
    const discountCode = `MM-${requestId.slice(0, 8).toUpperCase()}`;
    const startsAt = new Date();
    const expiresAtDate = new Date(
      startsAt.getTime() + ((reward.expiresDays || 7) * 24 * 60 * 60 * 1000),
    );
    const expiresAt = expiresAtDate.toISOString();

    try {
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
    } catch (error) {
      if (!isDiscountCodeConflictError(error)) {
        const message = error instanceof Error ? error.message : 'unknown_issue_error';
        functions.logger.error('Failed to issue Shopify discount code', {
          uid,
          requestId,
          rewardId,
          issue: message,
        });

        await db.runTransaction(async (tx) => {
          const requestDoc = await tx.get(requestRef);
          const requestData = requestDoc.data() || {};
          if (requestData.processedAt) {
            return;
          }

          const existingRedemption = await tx.get(redemptionRef);
          if (existingRedemption.exists) {
            return;
          }

          tx.update(requestRef, {
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'rejected',
            reason: 'issue_failed',
          });
        });

        return null;
      }

      functions.logger.warn('Discount code already exists; continuing finalize', {
        uid,
        requestId,
        rewardId,
      });
    }

    await db.runTransaction(async (tx) => {
      const requestDoc = await tx.get(requestRef);
      const requestData = requestDoc.data() || {};

      shopifyPhase = null;

      if (requestData.processedAt) {
        return;
      }

      const existingRedemption = await tx.get(redemptionRef);
      if (!existingRedemption.exists) {
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
      }

      tx.set(redemptionRef, {
        rewardId,
        name: reward.name,
        points: reward.points,
        cost: reward.points,
        date: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        requestId,
        discountCode,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
        fulfillmentStatus: 'issued',
      }, {merge: true});

      tx.set(activeRewardRef, {
        rewardId,
        requestId,
        discountCode,
        fulfillmentStatus: 'issued',
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      tx.update(requestRef, {
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'approved',
        redemptionId: requestId,
      });
    });

    functions.logger.info('Issued Shopify discount code for redemption', {
      uid,
      requestId,
      rewardId,
      expiresAt,
    });

    return null;
  });

