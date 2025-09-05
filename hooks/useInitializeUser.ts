import { useAppContext } from '../firebase/AppContext';
import { firestore } from '../firebase/firebase';
import { ensureShopifyCustomer } from '../utils/shopifyCustomer';

export function useInitializeUser() {
  const { setAppStatus } = useAppContext();

  return async (uid: string) => {
    try {
      const doc = await firestore().collection('users').doc(uid).get();
      let data = doc.data() || {};
      if (!data.shopifyCustomerId && data.email) {
        const shopifyCustomerId = await ensureShopifyCustomer(
          data.email,
          data.firstName,
          data.lastName,
        );
        if (shopifyCustomerId) {
          await firestore().collection('users').doc(uid).update({
            shopifyCustomerId,
          });
          data = { ...data, shopifyCustomerId };
        }
      }
      setAppStatus({
        user: data,
        points: data.accountabilityPoints ?? 0,
        workoutHistory: Array.isArray(data.workoutHistory)
          ? data.workoutHistory
          : [],
      });
      return true;
    } catch (err) {
      console.error('Failed to initialize user', err);
      return false;
    }
  };
}