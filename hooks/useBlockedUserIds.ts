import { useEffect, useMemo, useState } from 'react';
import { auth, firestore } from '../firebase/firebase';

export function useBlockedUserIds() {
  const currentUserId = auth().currentUser?.uid;
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setBlockedIds([]);
      return;
    }

    const unsubscribe = firestore()
      .collection('blocks')
      .where('blockerUid', '==', currentUserId)
      .onSnapshot(snapshot => {
        const ids = snapshot.docs
          .map(doc => String(doc.data()?.blockedUid || ''))
          .filter(Boolean);
        setBlockedIds(ids);
      });

    return unsubscribe;
  }, [currentUserId]);

  const blockedSet = useMemo(() => new Set(blockedIds), [blockedIds]);

  return {
    blockedIds,
    blockedSet,
  };
}
