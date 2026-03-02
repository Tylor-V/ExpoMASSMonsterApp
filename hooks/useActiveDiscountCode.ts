import { auth, firestore } from '../firebase/firebase';

type RedemptionDoc = {
  date?: number;
  discountCode?: string | null;
  expiresAt?: any;
  fulfillmentStatus?: string;
  usedAt?: any;
};

const toMillis = (value: any): number | null => {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : null;
  }
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000;
  }
  return null;
};

export async function getActiveIssuedDiscountCode(): Promise<string | null> {
  const user = auth()?.currentUser;
  if (!user?.uid) return null;

  const snap = await firestore()
    .collection('users')
    .doc(user.uid)
    .collection('redemptions')
    .where('fulfillmentStatus', '==', 'issued')
    .orderBy('date', 'desc')
    .limit(25)
    .get({ suppressAlert: true });

  const now = Date.now();
  const active = snap.docs
    .map(doc => doc.data() as RedemptionDoc)
    .filter(redemption => {
      const code = redemption.discountCode?.trim();
      if (!code) return false;
      const expiresAt = toMillis(redemption.expiresAt);
      if (expiresAt !== null && expiresAt <= now) return false;
      if (redemption.usedAt) return false;
      return true;
    })
    .sort((a, b) => {
      const aExpiresAt = toMillis(a.expiresAt);
      const bExpiresAt = toMillis(b.expiresAt);

      if (aExpiresAt !== null && bExpiresAt !== null) {
        return aExpiresAt - bExpiresAt;
      }
      if (aExpiresAt !== null) return -1;
      if (bExpiresAt !== null) return 1;

      const aDate = typeof a.date === 'number' ? a.date : 0;
      const bDate = typeof b.date === 'number' ? b.date : 0;
      return bDate - aDate;
    });

  return active[0]?.discountCode?.trim() || null;
}
