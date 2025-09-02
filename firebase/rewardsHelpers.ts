import { firestore } from './firebase';
import { auth } from './firebase';

export type RewardInfo = {
  id: string;
  name: string;
  points: number;
};

export async function redeemReward(reward: RewardInfo) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const userDoc = firestore().collection('users').doc(uid);
  const userRef = userDoc.ref;
  await firestore().runTransaction(async tx => {
    const doc = await tx.get(userRef);
    const current = (doc.data()?.accountabilityPoints || 0) as number;
    if (current < reward.points) {
      throw new Error('Not enough points');
    }
    tx.update(userRef, { accountabilityPoints: current - reward.points });
    const redemptionRef = userDoc.collection('redemptions').doc().ref;
    tx.set(redemptionRef, {
      rewardId: reward.id,
      name: reward.name,
      points: reward.points,
      date: Date.now(),
      status: 'pending',
    });
  });
}