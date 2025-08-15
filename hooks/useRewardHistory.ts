import { useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';
import { auth } from '../firebase/firebase';

type RewardHistoryItem = {
  id: string;
  name: string;
  points: number;
  date: number;
  status?: string;
};

export function useRewardHistory() {
  const [history, setHistory] = useState<RewardHistoryItem[]>([]);

  useEffect(() => {
    if (typeof auth !== 'function' || typeof auth().onAuthStateChanged !== 'function') {
      setHistory([]);
      return;
    }
    let unsub: (() => void) | undefined;
    const unsubAuth = auth().onAuthStateChanged(user => {
      unsub?.();
      if (user) {
        unsub = firestore()
          .collection('users')
          .doc(user.uid)
          .collection('redemptions')
          .orderBy('date', 'desc')
          .onSnapshot(
            snap => {
              const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
              setHistory(list as RewardHistoryItem[]);
            },
            () => setHistory([]),
          );
      } else {
        setHistory([]);
      }
    });
    return () => {
      unsubAuth();
      unsub?.();
    };
  }, []);

  return history;
}