import { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';

export function useNews() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('news')
      .where('active', '==', true)
      .orderBy('created', 'desc')
      .onSnapshot(
        (snapshot: any) => {
          const items = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
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