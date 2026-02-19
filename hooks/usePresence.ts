import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { auth, firestore } from '../firebase/firebase';

export default function usePresence() {
  const lastWriteKeyRef = useRef('');
  const lastWriteAtRef = useRef(0);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const PRESENCE_KEEPALIVE_MS = 90000;
    const MIN_WRITE_GAP_MS = 15000;

    const userRef = firestore().collection('users').doc(uid);
    const publicUserRef = firestore().collection('publicUsers').doc(uid);
    let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
    let currentAppState: AppStateStatus = AppState.currentState;

    const stopKeepAlive = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    };

    const updatePresence = async (presence: 'online' | 'offline', force = false) => {
      const now = Date.now();
      if (
        !force &&
        lastWriteKeyRef.current === presence &&
        now - lastWriteAtRef.current < MIN_WRITE_GAP_MS
      ) {
        return;
      }

      lastWriteKeyRef.current = presence;
      lastWriteAtRef.current = now;
      const timestamp = firestore.FieldValue.serverTimestamp();

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

    const setOnline = (force = false) => {
      void updatePresence('online', force);
    };

    const setOffline = (force = false) => {
      void updatePresence('offline', force);
    };

    const startKeepAlive = () => {
      stopKeepAlive();
      if (currentAppState !== 'active') return;

      keepAliveInterval = setInterval(() => {
        if (currentAppState !== 'active') {
          stopKeepAlive();
          return;
        }
        setOnline();
      }, PRESENCE_KEEPALIVE_MS);
    };

    if (currentAppState === 'active') {
      setOnline(true);
      startKeepAlive();
    } else {
      setOffline(true);
    }

    const handleChange = (state: AppStateStatus) => {
      currentAppState = state;
      if (state === 'active') {
        setOnline(true);
        startKeepAlive();
      } else if (state === 'background' || state === 'inactive') {
        stopKeepAlive();
        setOffline(true);
      }
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      sub.remove();
      stopKeepAlive();
      setOffline(true);
    };
  }, []);
}
