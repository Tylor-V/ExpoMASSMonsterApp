import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore, storage } from '../firebase/firebase';
import { useBlockedUserIds } from '../hooks/useBlockedUserIds';
import { useReportedUserIds } from '../hooks/useReportedUserIds';
import { ANIM_FAST } from '../utils/animations';

type Story = {
  id: string;
  url: string;
  type: 'video' | 'image';
  timestamp: number;
};

interface StoriesViewerProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  initialIndex?: number;
}

const { width, height } = Dimensions.get('window');

function StoryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, player => {
    player.loop = true;
    player.play().catch(() => {});
    player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') {
        console.error('Video playback error', error);
      }
    });
  });

  return <VideoView style={styles.img} contentFit="cover" player={player} />;
}

export default function StoriesViewer({ visible, userId, onClose, initialIndex = 0 }: StoriesViewerProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [idx, setIdx] = useState<number>(initialIndex);
  const [ownerName, setOwnerName] = useState('');
  const currentUserId = auth().currentUser?.uid;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { blockedSet } = useBlockedUserIds();
  const { reportedUserSet } = useReportedUserIds();

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIM_FAST,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  useEffect(() => {
    if (!userId || !visible) return;
    if (blockedSet.has(userId) || reportedUserSet.has(userId)) {
      setStories([]);
      setIdx(0);
      return;
    }
    const now = Date.now();
    firestore()
      .collection('stories')
      .doc(userId)
      .collection('storyMedia')
      .orderBy('timestamp', 'asc')
      .get()
      .then((snap: any) => {
        const filtered: Story[] = [];
        snap.docs.forEach((doc: any) => {
          const s = doc.data() as any;
          if (s?.status === 'removed' || s?.isRemoved) {
            return;
          }
          if (now - s.timestamp > 24 * 60 * 60 * 1000) {
            // Delete expired
            firestore()
              .collection('stories')
              .doc(userId)
              .collection('storyMedia')
              .doc(doc.id)
              .delete();
            if (s.url) {
              try {
                const ref = storage().refFromURL(s.url);
                ref.delete();
              } catch (err) {
                console.error('Failed to delete expired story media', err);
              }
            }
          } else {
            filtered.push({ id: doc.id, ...s });
          }
        });
        setStories(filtered);
        setIdx(0);
      });
  }, [userId, visible, blockedSet, reportedUserSet]);

  useEffect(() => {
    if (!userId || !visible) {
      setOwnerName('');
      return;
    }
    firestore()
      .collection('users')
      .doc(userId)
      .get()
      .then(doc => {
        const data = doc.data() || {};
        const name = String(data.firstName || data.username || data.displayName || '');
        setOwnerName(name);
      })
      .catch(() => setOwnerName(''));
  }, [userId, visible]);

  useEffect(() => {
    if (!visible || !userId) return;
    if (blockedSet.has(userId) || reportedUserSet.has(userId)) {
      onClose();
    }
  }, [blockedSet, reportedUserSet, onClose, userId, visible]);

  const handleReportStory = async () => {
    if (!currentUserId) return;
    const story = stories[idx];
    if (!story?.id) return;
    await firestore().collection('reports').add({
      targetType: 'story',
      targetId: story.id,
      targetOwnerUid: userId,
      reportedBy: currentUserId,
      reason: 'Inappropriate story',
      details: null,
      status: 'open',
      createdAt: firestore.FieldValue.serverTimestamp(),
      source: 'StoriesViewer',
      action: 'report',
    });
    Alert.alert('Reported', 'Story reported to admins.');
  };

  const handleBlockUser = () => {
    if (!currentUserId || currentUserId === userId) return;
    const handle = ownerName ? `@${ownerName}` : 'this user';
    Alert.alert(
      'Block User',
      `Block ${handle}? You won’t see each other’s content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            const blockId = `${currentUserId}_${userId}`;
            await firestore().collection('blocks').doc(blockId).set({
              blockerUid: currentUserId,
              blockedUid: userId,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            await firestore().collection('reports').add({
              targetType: 'user',
              targetId: userId,
              targetOwnerUid: userId,
              reportedBy: currentUserId,
              reason: null,
              details: null,
              status: 'open',
              action: 'block',
              source: 'StoriesViewer',
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            onClose();
          },
        },
      ],
    );
  };

  const handleMorePress = () => {
    Alert.alert('Story Options', undefined, [
      { text: 'Report Story', onPress: handleReportStory },
      { text: 'Block User', style: 'destructive', onPress: handleBlockUser },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleNext = () => {
    if (idx < stories.length - 1) setIdx(idx + 1);
    else onClose();
  };
  const handlePrev = () => {
    if (idx > 0) setIdx(idx - 1);
    else onClose();
  };

  const handleDelete = async () => {
    const story = stories[idx];
    try {
      await firestore()
        .collection('stories').doc(currentUserId)
        .collection('storyMedia')
        .doc(story.id)
        .delete();
      if (story.url) {
        try {
          const ref = storage().refFromURL(story.url);
          await ref.delete();
        } catch (err) {
          console.error('Failed to delete story media', err);
        }
      }
      const remaining = stories.filter(s => s.id !== story.id);
      setStories(remaining);
      if (!remaining.length) {
        onClose();
      } else if (idx >= remaining.length) {
        setIdx(remaining.length - 1);
      }
    } catch (err) {
      console.error('Failed to delete story', err);
    }
  };

  if (!visible || !stories.length) return null;
  const story = stories[idx];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {story.type === 'video' ? (
          <StoryVideo uri={story.url} />
        ) : (
          <Image source={{ uri: story.url }} style={styles.img} contentFit="cover" />
        )}
        <View style={[styles.progressRow, { top: insets.top + 20 }]} pointerEvents="none">
          {stories.map((_, i) => (
            <View key={i} style={[styles.bar, i === idx && styles.barActive]} />
          ))}
        </View>
        <TouchableOpacity
          style={styles.leftZone}
          onPress={handlePrev}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={styles.rightZone}
          onPress={handleNext}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={[styles.arrowBtn, styles.leftArrow]}
          onPress={handlePrev}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.arrowBtn, styles.rightArrow]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-forward" size={32} color="#fff" />
        </TouchableOpacity>
        {currentUserId === userId && (
          <TouchableOpacity
            style={[styles.deleteBtn, { top: insets.top + 40 }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        {currentUserId && currentUserId !== userId && (
          <TouchableOpacity
            style={[styles.moreBtn, { top: insets.top + 40 }]}
            onPress={handleMorePress}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 40 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#0D0D0D" />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  img: { width, height, position: 'absolute', top: 0, left: 0 },
  leftZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width / 2,
  },
  rightZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: width / 2,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  leftArrow: { left: 12 },
  rightArrow: { right: 12 },
  deleteBtn: {
    position: 'absolute',
    top: 40,
    right: 22,
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    position: 'absolute',
    top: 40,
    right: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    left: 22,
    backgroundColor: '#FFCC00',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    marginHorizontal: 2,
    backgroundColor: '#555',
  },
  barActive: { backgroundColor: '#FFCC00' },
});
