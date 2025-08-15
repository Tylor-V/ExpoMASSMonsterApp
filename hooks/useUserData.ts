import { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface UserDataState {
  user: any | null;
  loading: boolean;
}

export function useUserData(): UserDataState {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    let unsubDoc: (() => void) | undefined;

    unsubAuth = auth().onAuthStateChanged(firebaseUser => {
      unsubDoc?.();

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        unsubDoc = firestore()
          .collection('users')
          .doc(uid)
          .onSnapshot(
            doc => {
              setUser(doc.data() || null);
              setLoading(false);
            },
            err => {
              console.error('Failed to fetch user data', err);
              setUser(null);
              setLoading(false);
            },
          );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth?.();
      unsubDoc?.();
    };
  }, []);

  return { user, loading };
}