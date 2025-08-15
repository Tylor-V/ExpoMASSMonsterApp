import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useEffect, useState, useCallback } from 'react';

/**
 * React hook to listen for the user's last read message in a given channel.
 * Returns [lastRead, markAsRead].
 */
export function useLastRead(channelId: string) {
  const [lastRead, setLastRead] = useState<{ messageId: string; timestamp: number } | null>(null);
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (!userId || !channelId) return;
    const unsub = firestore()
      .collection('users')
      .doc(userId)
      .collection('lastRead')
      .doc(channelId)
      .onSnapshot(doc => {
        setLastRead(doc.exists ? (doc.data() as any) : null);
      });
    return unsub;
  }, [userId, channelId]);

  const markAsRead = useCallback((messageId: string, timestamp: number) => {
    if (!userId || !channelId) return;
    firestore()
      .collection('users')
      .doc(userId)
      .collection('lastRead')
      .doc(channelId)
      .set({ messageId, timestamp });
  }, [userId, channelId]);

  return [lastRead, markAsRead] as const;
}

/**
 * React hook to listen for the user's last read message in a given DM thread.
 * Returns [lastRead, markAsRead].
 */
export function useLastReadDM(dmThreadId: string) {
  const [lastRead, setLastRead] = useState<{ messageId: string; timestamp: number } | null>(null);
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (!userId || !dmThreadId) return;
    const unsub = firestore()
      .collection('users')
      .doc(userId)
      .collection('lastReadDMs')
      .doc(dmThreadId)
      .onSnapshot(doc => {
        setLastRead(doc.exists ? (doc.data() as any) : null);
      });
    return unsub;
  }, [userId, dmThreadId]);

  const markAsRead = useCallback((messageId: string, timestamp: number) => {
    if (!userId || !dmThreadId) return;
    firestore()
      .collection('users')
      .doc(userId)
      .collection('lastReadDMs')
      .doc(dmThreadId)
      .set({ messageId, timestamp });
  }, [userId, dmThreadId]);

  return [lastRead, markAsRead] as const;
}