import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { auth, firestore } from '../firebase/firebase';

export default function usePresence() {
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const userRef = firestore().collection('users').doc(uid);

    const setOnline = () =>
      userRef
        .update({ presence: 'online', lastActive: Date.now() })
        .catch(err => console.error('Failed to set online presence', err));

    const setOffline = () =>
      userRef
        .update({ presence: 'offline', lastActive: Date.now() })
        .catch(err => console.error('Failed to set offline presence', err));

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