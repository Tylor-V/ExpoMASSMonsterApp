import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore, storage } from '../firebase/firebase';
import { colors } from '../theme';

const { height, width } = Dimensions.get('window');

const FeedVideo = React.memo(
  ({ uri, isActive }: { uri: string; isActive: boolean }) => {
    const ref = useRef<Video>(null);

    useEffect(() => {
      if (isActive) {
        try {
          ref.current?.play();
        } catch {
          // ignore play errors
        }
      } else {
        try {
          ref.current?.pause();
        } catch {
          // ignore pause errors
        }
      }
    }, [isActive]);

    return (
      <Video
        ref={ref}
        source={{ uri }}
        style={styles.video}
        contentFit="cover"
        isLooping
        onError={(e) => console.error('Video playback error', e)}
      />
    );
  }
);

export default function GymVideoFeed({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const [currentUserRole, setCurrentUserRole] = useState('member');
  const currentUserId = auth().currentUser?.uid;
  const insets = useSafeAreaInsets();
  // Return to the previous screen (typically the chat tab) preserving the user's
  // last visited channel. If there is no screen to go back to, fall back to
  // navigating to the chat tab explicitly.
  const handleBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate({ name: 'MainApp', params: { tabIndex: 0 }, merge: true });
    }
  }, [navigation]);

  useEffect(() => {
    setLoading(true);
    firestore()
      .collection('videos').doc('gym-feed').collection('gym-feed')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snap => {
  const arr = [];
  if (snap && snap.docs) {
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (!data.hiddenBy || !data.hiddenBy.includes(currentUserId)) {
        arr.push({ id: doc.id, ...data });
      }
    });
  }
        setVideos(arr);
        setLoading(false);
      });
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = firestore()
      .collection('users')
      .doc(currentUserId)
      .onSnapshot(doc => {
        if (doc.exists) {
          setCurrentUserRole(doc.data().role || 'member');
        }
      });
    return unsubscribe;
  }, [currentUserId]);

  const handleUpload = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your library to upload videos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (res.canceled || !res.assets?.length) return;
    const file = res.assets[0];
    if (!file.uri) return;

    // File size check (warn if > 150MB, for example)
    if (file.fileSize && file.fileSize > 150 * 1024 * 1024) {
      Alert.alert('File too large', 'Please upload a video less than 150MB.');
      return;
    }
    setUploading(true);
    try {
      const filename = `${currentUserId}_${Date.now()}.mp4`;
      const ref = storage().ref(`/gymVideos/${filename}`);
      await ref.putFile(file.uri);
      const url = await ref.getDownloadURL();
      await firestore().collection('videos').doc('gym-feed').collection('gym-feed').add({
        userId: currentUserId,
        url,
        timestamp: Date.now(),
        reactions: [],
        hiddenBy: [],
        reportedBy: [],
      });
      Alert.alert('Success', 'Video uploaded!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not upload video.');
    }
    setUploading(false);
  };

  const handleReact = useCallback(async (id: string) => {
    const docRef = firestore()
      .collection('videos')
      .doc('gym-feed')
      .collection('gym-feed')
      .doc(id);
    const doc = await docRef.get();
    const data = doc.data();
    const reactions = data?.reactions ?? [];
    if (reactions.find(r => r.userId === currentUserId && r.emoji === '💪')) return;
    await docRef.update({ reactions: [...reactions, { emoji: '💪', userId: currentUserId }] });
  }, [currentUserId]);

  const handleHide = useCallback(async (id: string) => {
    const docRef = firestore()
      .collection('videos')
      .doc('gym-feed')
      .collection('gym-feed')
      .doc(id);
    const doc = await docRef.get();
    const hiddenBy = doc.data()?.hiddenBy ?? [];
    await docRef.update({ hiddenBy: [...hiddenBy, currentUserId] });
  }, [currentUserId]);

  const handleReport = useCallback(async (id: string) => {
    await firestore()
      .collection('reports')
      .add({
        type: 'video',
        reportedBy: currentUserId,
        targetId: id,
        reason: 'Inappropriate video',
        timestamp: Date.now(),
      });
    Alert.alert('Reported', 'Video reported to admins.');
  }, [currentUserId]);

  const handleDelete = useCallback(
    async (id: string, userId: string) => {
      if (userId !== currentUserId && currentUserRole !== 'moderator') return;
      Alert.alert('Delete', 'Delete this video?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await firestore()
              .collection('videos')
              .doc('gym-feed')
              .collection('gym-feed')
              .doc(id)
              .delete();
          },
        },
      ]);
    },
    [currentUserId, currentUserRole]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={styles.videoPage}>
        <FeedVideo uri={item.url} isActive={activeIndex === index} />
        <LinearGradient
          colors={["transparent", "rgba(13,13,13,0.85)"]}
          style={styles.bottomGradient}
        />
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.reactBtn} onPress={() => handleReact(item.id)}>
            <Text style={styles.emoji}>💪</Text>
            <Text style={styles.reactCount}>{item.reactions?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleHide(item.id)}>
            <Ionicons name="eye-off-outline" size={28} color="#232323" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleReport(item.id)}>
            <Ionicons name="alert-circle-outline" size={28} color="#232323" />
          </TouchableOpacity>
          {(item.userId === currentUserId || currentUserRole === 'moderator') && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item.id, item.userId)}
            >
              <Ionicons name="trash-outline" size={27} color="#FF4545" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    [activeIndex, currentUserId, currentUserRole, handleReact, handleHide, handleReport, handleDelete]
  );

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length) setActiveIndex(viewableItems[0].index || 0);
  }).current;

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }] }>
      <ActivityIndicator color="#FFCC00" size="large" />
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 49 }]}
        onPress={handleBack}
        accessibilityLabel="Back to Chat"
      >
        <Ionicons name="chevron-back" size={29} color={colors.grayLight} />
      </TouchableOpacity>
    </View>
  );

  if (!videos.length) return (
    <View style={[styles.container, styles.emptyContainer]}>
      <Text style={styles.emptyText}>No videos yet—be the first to upload!</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={handleUpload} disabled={uploading}>
        <Ionicons name="cloud-upload-outline" size={29} color="#232323" />
        <Text style={styles.uploadTxt}>{uploading ? 'Uploading...' : 'Upload Video'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 49 }]}
        onPress={handleBack}
        accessibilityLabel="Back to Chat"
      >
        <Ionicons name="chevron-back" size={29} color={colors.grayLight} />
      </TouchableOpacity>
    </View>
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        pagingEnabled
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 85 }}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={[styles.uploadBtn, { bottom: insets.bottom + 48 }]}
        onPress={handleUpload}
        disabled={uploading}
      >
        <Ionicons name="cloud-upload-outline" size={29} color="#232323" />
        <Text style={styles.uploadTxt}>{uploading ? "Uploading..." : "Upload Video"}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 49 }]}
        onPress={handleBack}
        accessibilityLabel="Back to Chat"
      >
        <Ionicons name="chevron-back" size={29} color={colors.grayLight} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  videoPage: { width, height, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: '#0D0D0D' },
  video: { width, height, position: 'absolute', top: 0, left: 0 },
  bottomGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 },
  overlay: { position: 'absolute', right: 28, bottom: 120, alignItems: 'center', zIndex: 10 },
  reactBtn: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFCC00',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  emoji: { fontSize: 28, color: '#FFCC00', marginRight: 4 },
  reactCount: { color: '#232323', fontWeight: 'bold', fontSize: 15 },
  actionBtn: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderColor: '#FFCC00',
    borderWidth: 2,
    borderRadius: 28,
    padding: 8,
  },
  uploadBtn: {
    position: 'absolute',
    right: 23,
    backgroundColor: '#FFCC00',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    elevation: 4,
    zIndex: 30,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#FFCC00',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  uploadTxt: { color: '#232323', fontWeight: 'bold', fontSize: 16, marginLeft: 7 },
  backBtn: { position: 'absolute', left: 19, padding: 7, zIndex: 22 },
});