import { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    const loadAndSubscribe = async () => {
      try {
        const cached = await AsyncStorage.getItem('newsCache');
        if (cached && !cancelled) {
          setNews(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}

      setLoading(true);

      unsub = firestore()
        .collection('news')
        // Fetch all news items regardless of active state
        // .where('active', '==', true)
        .orderBy('created', 'desc')
        .onSnapshot(
          snap => {
            if (cancelled) return;
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
              const priDiff = (b.priority ?? 0) - (a.priority ?? 0);
              if (priDiff !== 0) return priDiff;
              const timeA =
                typeof a.created?.toMillis === 'function'
                  ? a.created.toMillis()
                  : a.created;
              const timeB =
                typeof b.created?.toMillis === 'function'
                  ? b.created.toMillis()
                  : b.created;
              return (timeB ?? 0) - (timeA ?? 0);
            });
            setNews(items);
            AsyncStorage.setItem('newsCache', JSON.stringify(items));
            setLoading(false);
          },
          () => !cancelled && setLoading(false)
        );
    };

    loadAndSubscribe();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return { news, loading };
}