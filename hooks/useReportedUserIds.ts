import { useEffect, useMemo, useState } from 'react';
import { auth, firestore } from '../firebase/firebase';

export function useReportedUserIds() {
  const currentUserId = auth().currentUser?.uid;
  const [reportedUserIds, setReportedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setReportedUserIds([]);
      return;
    }

    const unsubscribe = firestore()
      .collection('reports')
      .where('reportedBy', '==', currentUserId)
      .where('targetType', '==', 'user')
      .onSnapshot(snapshot => {
        const ids = snapshot.docs
          .map(doc => String(doc.data()?.targetId || ''))
          .filter(Boolean);
        setReportedUserIds(ids);
      });

    return unsubscribe;
  }, [currentUserId]);

  const reportedUserSet = useMemo(() => new Set(reportedUserIds), [reportedUserIds]);

  return {
    reportedUserIds,
    reportedUserSet,
  };
}
