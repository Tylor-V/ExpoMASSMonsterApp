import { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';
import { auth } from '../firebase/firebase';

export default function useAnyDMUnread() {
  const [hasUnread, setHasUnread] = useState(false);
  const [uid, setUid] = useState<string | null>(() => {
    try {
      return typeof auth === 'function' ? auth()?.currentUser?.uid ?? null : null;
    } catch (error) {
      console.warn('Failed to read current auth user for DM unread hook', error);
      return null;
    }
  });

  useEffect(() => {
    if (typeof auth !== 'function') {
      setUid(null);
      return;
    }

    try {
      const authInstance = auth();
      setUid(authInstance?.currentUser?.uid ?? null);
      if (typeof authInstance?.onAuthStateChanged === 'function') {
        const unsubAuth = authInstance.onAuthStateChanged(user => {
          setUid(user?.uid ?? null);
        });
        return () => {
          unsubAuth?.();
        };
      }
    } catch (error) {
      console.warn('Failed to subscribe to auth state for DM unread hook', error);
      setUid(null);
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      setHasUnread(false);
      return;
    }

    if (typeof firestore !== 'function') {
      setHasUnread(false);
      return;
    }

    const lastReads: Record<string, number> = {};
    const latest: Record<string, number> = {};
    const latestUsers: Record<string, string | null> = {};
    const unsubs: Array<() => void> = [];
    const threadUnread: Record<string, boolean> = {};

    const update = (tid: string) => {
      const unread =
        (latest[tid] || 0) > (lastReads[tid] || 0) &&
        latestUsers[tid] !== uid;
      threadUnread[tid] = unread;
      setHasUnread(Object.values(threadUnread).some(Boolean));
    };

    let unsubThreads: (() => void) | undefined;

    try {
      const dmCollection = firestore().collection('dms');
      const dmQuery = dmCollection?.where?.('participants', 'array-contains', uid);
      unsubThreads = dmQuery?.onSnapshot?.(snap => {
        const tids = snap?.docs?.map(d => d.id) ?? [];
        tids.forEach(tid => {
          if (!(tid in lastReads)) {
            const lastReadUnsub = firestore()
              .collection('users')
              .doc(uid)
              .collection('lastReadDMs')
              .doc(tid)
              .onSnapshot(doc => {
                lastReads[tid] = doc?.data?.()?.timestamp || 0;
                update(tid);
              });
            if (typeof lastReadUnsub === 'function') {
              unsubs.push(lastReadUnsub);
            }
            const latestUnsub = firestore()
              .collection('dms')
              .doc(tid)
              .collection('messages')
              .orderBy('timestamp', 'desc')
              .limit(1)
              .onSnapshot(msnap => {
                const data = msnap?.docs?.[0]?.data?.();
                const ts = data?.timestamp;
                latest[tid] = ts?.toMillis ? ts.toMillis() : ts || 0;
                latestUsers[tid] = data?.userId || null;
                update(tid);
              });
            if (typeof latestUnsub === 'function') {
              unsubs.push(latestUnsub);
            }
          }
        });
      });
    } catch (error) {
      console.warn('Failed to subscribe to DM unread data', error);
    }

    return () => {
      unsubThreads?.();
      unsubs.forEach(u => u?.());
    };
  }, [uid]);

  return hasUnread;
}