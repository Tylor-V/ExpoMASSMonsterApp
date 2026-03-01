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
  const userRef = firestore().collection('users').doc(uid);
  const redemptionRequestRef = userRef.collection('redemptionRequests').doc();

  await redemptionRequestRef.set({
    rewardId: reward.id,
    requestedAt: firestore.FieldValue.serverTimestamp(),
  });

  return { submitted: true };
}
