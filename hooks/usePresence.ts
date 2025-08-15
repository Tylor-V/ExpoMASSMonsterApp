import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { firestore } from '../firebase/firebase';
import { auth } from '../firebase/firebase';

export default function usePresence() {
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const userRef = firestore().collection('users').doc(uid);

    const setOnline = () =>
      userRef.update({ presence: 'online', lastActive: Date.now() }).catch(() => {});

    const setOffline = () =>
      userRef.update({ presence: 'offline', lastActive: Date.now() }).catch(() => {});

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