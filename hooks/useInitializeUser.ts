import { useAppContext } from '../firebase/AppContext';
import { firestore } from '../firebase/firebase';

export function useInitializeUser() {
  const { setAppStatus } = useAppContext();

  return async (uid: string, retryOptions: { suppressAlert?: boolean } = {}) => {
    try {
      const doc = await firestore().collection('users').doc(uid).get(retryOptions);
      let data = doc.data() || {};
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
