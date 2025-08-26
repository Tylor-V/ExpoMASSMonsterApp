import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore, storage } from '../firebase/firebase';
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
  const ref = useRef<Video>(null);

  useEffect(() => {
    ref.current?.playAsync().catch(() => null);
  }, [uri]);

  return (
    <Video
      ref={ref}
      source={{ uri }}
      style={styles.img}
      resizeMode="cover"
      isLooping
      onError={(e) => console.error('Video playback error', e)}
    />
  );
}

export default function StoriesViewer({ visible, userId, onClose, initialIndex = 0 }: StoriesViewerProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [idx, setIdx] = useState<number>(initialIndex);
  const currentUserId = auth().currentUser?.uid;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

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
  }, [userId, visible]);


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