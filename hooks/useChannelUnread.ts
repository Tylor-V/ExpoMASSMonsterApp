import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function useChannelUnread(channelIds: string[], activeId: string) {
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid || !channelIds.length) return;

    const lastReads: Record<string, number> = {};
    const latest: Record<string, number> = {};
    const latestUsers: Record<string, string | null> = {};
    const unsubs: Array<() => void> = [];

    const update = (cid: string) => {
      const unread =
        (latest[cid] || 0) > (lastReads[cid] || 0) &&
        latestUsers[cid] !== uid;
      setUnreadMap(prev => ({ ...prev, [cid]: cid === activeId ? false : unread }));
    };

    channelIds.forEach(cid => {
      unsubs.push(
        firestore()
          .collection('users')
          .doc(uid)
          .collection('lastRead')
          .doc(cid)
          .onSnapshot(doc => {
            lastReads[cid] = doc.data()?.timestamp || 0;
            update(cid);
          }),
      );

      unsubs.push(
        firestore()
          .collection('channels')
          .doc(cid)
          .collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .onSnapshot(snap => {
            const data = snap.docs[0]?.data();
            const ts = data?.timestamp;
            latest[cid] = ts?.toMillis ? ts.toMillis() : ts || 0;
            latestUsers[cid] = data?.userId || null;
            update(cid);
          }),
      );
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [activeId, channelIds.join('|')]);

  useEffect(() => {
    setUnreadMap(prev => ({ ...prev, [activeId]: false }));
  }, [activeId]);

  return unreadMap;
}