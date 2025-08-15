import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANIM_FAST } from '../animations';

const { width, height } = Dimensions.get('window');

export default function StoriesViewer({ visible, userId, onClose, initialIndex = 0 }) {
  const [stories, setStories] = useState([]);
  const [idx, setIdx] = useState(initialIndex);
  const currentUserId = auth().currentUser?.uid;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          onClose();
        } else if (g.dx < -50) {
          handleNext();
        } else if (g.dx > 50) {
          handlePrev();
        }
      },
    }),
  ).current;

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
    .collection('stories').doc(userId).collection('storyMedia')
    .orderBy('timestamp', 'asc')
    .get().then(snap => {
      const filtered = [];
      snap.docs.forEach(doc => {
        const s = doc.data();
        if (now - s.timestamp > 24 * 60 * 60 * 1000) {
          // Delete expired
          firestore().collection('stories').doc(userId).collection('storyMedia').doc(doc.id).delete();
          if (s.url) {
            try {
              const ref = storage().refFromURL(s.url);
              ref.delete();
            } catch {}
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
        } catch {}
      }
      const remaining = stories.filter(s => s.id !== story.id);
      setStories(remaining);
      if (!remaining.length) {
        onClose();
      } else if (idx >= remaining.length) {
        setIdx(remaining.length - 1);
      }
    } catch {}
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
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
        {...panResponder.panHandlers}
      >
        {story.type === 'video' ? (
          <Video
            source={{ uri: story.url }}
            style={styles.img}
            resizeMode="cover"
            controls
            paused={false}
            repeat
          />
        ) : (
          <Image source={{ uri: story.url }} style={styles.img} resizeMode="cover" />
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
        {currentUserId === userId && (
          <TouchableOpacity
            style={[styles.deleteBtn, { top: insets.top + 40 }]}
            onPress={handleDelete}
          >
            <Icon name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 40 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Icon name="close" size={20} color="#0D0D0D" />
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