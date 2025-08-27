import { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';

export function useNews() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('news')
      .where('active', '==', true)
      .onSnapshot(
        (snapshot: any) => {
          const items = snapshot.docs
            .map((doc: any) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a: any, b: any) =>
                (b.created?.toMillis?.() ?? 0) - (a.created?.toMillis?.() ?? 0)
            );
          setNews(items);
          setLoading(false);
        },
        (err: any) => {
          console.error('Failed to load news', err);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  return { news, loading };
}