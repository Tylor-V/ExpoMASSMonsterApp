import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth, firestore } from '../firebase/firebase';

type HiddenContentParams = {
  containerId?: string | null;
  targetType: 'channelMessage' | 'dmMessage';
};

export function useHiddenContent({ containerId, targetType }: HiddenContentParams) {
  const currentUserId = auth().currentUser?.uid;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUserId || !containerId) {
      setHiddenIds([]);
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(currentUserId)
      .collection('hiddenContent')
      .where('containerId', '==', containerId)
      .where('targetType', '==', targetType)
      .onSnapshot(snapshot => {
        const ids = snapshot.docs
          .map(doc => String(doc.data()?.targetId || ''))
          .filter(Boolean);
        setHiddenIds(ids);
      });

    return unsubscribe;
  }, [containerId, currentUserId, targetType]);

  const hiddenContentSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const hideContent = useCallback(async (targetId: string) => {
    if (!currentUserId || !containerId || !targetId) return;
    const normalizedId = String(targetId);
    setHiddenIds(prev => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]));
    await firestore()
      .collection('users')
      .doc(currentUserId)
      .collection('hiddenContent')
      .add({
        targetType,
        containerId,
        targetId: normalizedId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
  }, [containerId, currentUserId, targetType]);

  return {
    hiddenIds,
    hiddenContentSet,
    hideContent,
  };
}
