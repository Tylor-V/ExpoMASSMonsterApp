import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth, firestore } from '../firebase/firebase';

type HideStoryParams = {
  storyId: string;
  ownerUid?: string | null;
};

export function useHiddenStories() {
  const currentUserId = auth().currentUser?.uid;
  const [hiddenStoryIds, setHiddenStoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setHiddenStoryIds([]);
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(currentUserId)
      .collection('hiddenContent')
      .where('targetType', '==', 'story')
      .onSnapshot(snapshot => {
        const ids = snapshot.docs
          .map(doc => String(doc.data()?.targetId || ''))
          .filter(Boolean);
        setHiddenStoryIds(ids);
      });

    return unsubscribe;
  }, [currentUserId]);

  const hiddenStorySet = useMemo(() => new Set(hiddenStoryIds), [hiddenStoryIds]);

  const hideStory = useCallback(async ({ storyId, ownerUid }: HideStoryParams) => {
    if (!currentUserId || !storyId) return;
    const normalizedId = String(storyId);
    setHiddenStoryIds(prev => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]));
    await firestore()
      .collection('users')
      .doc(currentUserId)
      .collection('hiddenContent')
      .add({
        targetType: 'story',
        targetId: normalizedId,
        targetOwnerUid: ownerUid || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
  }, [currentUserId]);

  return {
    hiddenStoryIds,
    hiddenStorySet,
    hideStory,
  };
}
