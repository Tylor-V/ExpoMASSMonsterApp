import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { auth, firestore } from '../firebase/firebase';

export default function usePresence() {
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const userRef = firestore().collection('users').doc(uid);
    const publicUserRef = firestore().collection('publicUsers').doc(uid);

    const updatePresence = async (presence: 'online' | 'offline') => {
      const timestamp = Date.now();
      try {
        await userRef.update({ presence, lastActive: timestamp });
      } catch (err) {
        console.error(`Failed to set ${presence} presence`, err);
        return;
      }

      try {
        await publicUserRef.set({ uid, lastActive: timestamp }, { merge: true });
      } catch (err) {
        console.warn('Failed to mirror public lastActive', err);
      }
    };

    const setOnline = () => {
      void updatePresence('online');
    };

    const setOffline = () => {
      void updatePresence('offline');
    };

    setOnline();

    const handleChange = (state: AppStateStatus) => {
      if (state === 'active') {
        setOnline();
      } else if (state === 'background' || state === 'inactive') {
        setOffline();
      }
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      sub.remove();
      setOffline();
    };
  }, []);
}
