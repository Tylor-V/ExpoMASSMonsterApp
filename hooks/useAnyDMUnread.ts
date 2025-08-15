import { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';
import { auth } from '../firebase/firebase';

export default function useAnyDMUnread() {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

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

    const unsubThreads = firestore()
      .collection('dms')
      .where('participants', 'array-contains', uid)
      .onSnapshot(snap => {
        const tids = snap.docs.map(d => d.id);
        tids.forEach(tid => {
          if (!(tid in lastReads)) {
            unsubs.push(
              firestore()
                .collection('users')
                .doc(uid)
                .collection('lastReadDMs')
                .doc(tid)
                .onSnapshot(doc => {
                  lastReads[tid] = doc.data()?.timestamp || 0;
                  update(tid);
                }),
            );
            unsubs.push(
              firestore()
                .collection('dms')
                .doc(tid)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .onSnapshot(msnap => {
                  const data = msnap.docs[0]?.data();
                  const ts = data?.timestamp;
                  latest[tid] = ts?.toMillis ? ts.toMillis() : ts || 0;
                  latestUsers[tid] = data?.userId || null;
                  update(tid);
                }),
            );
          }
        });
      });

    return () => {
      unsubThreads();
      unsubs.forEach(u => u());
    };
  }, []);

  return hasUnread;
}