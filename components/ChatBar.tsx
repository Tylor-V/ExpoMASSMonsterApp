import { FontAwesome, Ionicons as Icon } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InboxIcon from '../assets/inbox.png';
import UsersIcon from '../assets/users.png';
import { auth, firestore, storage } from '../firebase/firebase';
import useAnyDMUnread from '../hooks/useAnyDMUnread';
import useChannelUnread from '../hooks/useChannelUnread';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import ChatScreen from '../MainScreens/ChatScreen';
import StoriesViewer from '../screens/StoriesViewer';
import { colors, fonts } from '../theme';
import { ANIM_MEDIUM } from '../utils/animations';
import OnlineUsersSidebar from './OnlineUsersSidebar';
import ProfileImage from './ProfileImage';
import ScreenContainer from './ScreenContainer';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BASE_CHANNELS = [
  { id: 'general', name: 'GENERAL' },
  { id: 'memes', name: 'MEMES' },
  { id: 'split-sharing', name: 'SPLIT SHARING' },
];

const VOICE_CHANNELS = [
  {
    id: 'community-voice',
    name: 'COMMUNITY VOICE',
    type: 'voice' as const,
  },
];

const MOD_CHANNEL = { id: 'mod-only', name: 'MOD ONLY' };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** StoriesBar component previously in separate file */
function StoriesBar({ openStoriesViewer }: { openStoriesViewer: (uid: string) => void }) {
  const [stories, setStories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userStory, setUserStory] = useState<any>(null);
  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    const fetchStories = async () => {
      const usersSnap = await firestore().collection('users').get();
      const now = Date.now();
      const storyPromises = usersSnap.docs.map(async userDoc => {
        const storySnap = await firestore()
          .collection('stories')
          .doc(userDoc.id)
          .collection('storyMedia')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();
        if (storySnap.empty) {
          return null;
        }
        const s = storySnap.docs[0].data();
        const storyId = storySnap.docs[0].id;
        if (now - s.timestamp < 24 * 60 * 60 * 1000) {
          return {
            userId: userDoc.id,
            firstName: userDoc.data().firstName,
            profilePicUrl: userDoc.data().profilePicUrl,
            ...s,
          };
        }
        firestore()
          .collection('stories')
          .doc(userDoc.id)
          .collection('storyMedia')
          .doc(storyId)
          .delete();
        if (s.url) {
          try {
            const ref = storage().refFromURL(s.url);
            ref.delete();
          } catch (err) {
            console.error('Failed to delete story media', err);
          }
        }
        return null;
      });
      const results = await Promise.all(storyPromises);
      const allStories = results.filter(Boolean) as any[];
      const myStory = allStories.find(s => s.userId === currentUserId) || null;
      setUserStory(myStory);
      setStories(allStories);
    };
    fetchStories();
  }, [uploading]);

  const handleUploadStory = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'] as ImagePicker.MediaType[],
    });
    if (res.canceled || !res.assets?.length) return;
    const file = res.assets[0];
    if (!file.uri) return;
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const activeSnap = await firestore()
      .collection('stories')
      .doc(currentUserId)
      .collection('storyMedia')
      .where('timestamp', '>=', since)
      .get();
    if (activeSnap.size >= 5) {
      Alert.alert('Limit Reached', 'You can only have 5 active stories at a time.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.type?.includes('video') ? 'mp4' : 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const ref = storage().ref(`/stories/${currentUserId}/${filename}`);
      await ref.putFile(file.uri);
      const url = await ref.getDownloadURL();
      await firestore().collection('stories').doc(currentUserId).collection('storyMedia').add({
        url,
        type: file.type?.includes('video') ? 'video' : 'image',
        timestamp: Date.now(),
      });
      Alert.alert('Success', 'Story uploaded!');
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Could not upload story.');
    }
    setUploading(false);
  };

  return (
    <View style={storyStyles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}>
        <TouchableOpacity
          style={storyStyles.storyCircle}
          onPress={userStory ? () => openStoriesViewer(currentUserId!) : handleUploadStory}
          activeOpacity={0.7}
        >
          <View
            style={[
              storyStyles.avatarCircle,
              userStory ? { borderColor: colors.accent, borderWidth: 2.7 } : { borderColor: '#bbb', borderWidth: 2 },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : userStory ? (
              <ProfileImage uri={userStory.profilePicUrl} style={storyStyles.avatarImg} isCurrentUser />
            ) : (
              <Icon name="add-circle-outline" size={39} color="#bbb" />
            )}
          </View>
          <Text style={storyStyles.label}>{userStory ? 'Your Story' : 'Add Story'}</Text>
        </TouchableOpacity>
        {stories
          .filter(s => s.userId !== currentUserId)
          .map(story => (
            <TouchableOpacity
              key={story.userId}
              style={storyStyles.storyCircle}
              onPress={() => openStoriesViewer(story.userId)}
              activeOpacity={0.7}
            >
              <View style={[storyStyles.avatarCircle, { borderColor: colors.accent, borderWidth: 2.2 }]}>
                <ProfileImage uri={story.profilePicUrl} style={storyStyles.avatarImg} />
              </View>
              <Text numberOfLines={1} style={storyStyles.label}>
                {story.firstName}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const storyStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    zIndex: 19,
    borderBottomColor: colors.grayLight,
    borderBottomWidth: 1,
  },
  storyCircle: {
    alignItems: 'center',
    marginHorizontal: 7,
    width: 62,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  label: {
    fontSize: 13,
    color: colors.textDark,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
    width: 66,
  },
});

/** Header, Stories and Pinned bar combined */
type ChatBarProps = {
  isActive?: boolean;
  onOpenDMInbox: () => void;
  onOpenGymFeed: () => void;
};

const ChatBar: React.FC<ChatBarProps> = ({ isActive = true, onOpenDMInbox, onOpenGymFeed }) => {
  const [selectedId, setSelectedId] = useState(BASE_CHANNELS[0].id);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [storyUserId, setStoryUserId] = useState('');
  const [onlineUsersOpen, setOnlineUsersOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [pinUsers, setPinUsers] = useState<Record<string, any>>({});
  const [scrollToMessageFn, setScrollToMessageFn] = useState<((id: string) => void) | null>(null);

  const user = useCurrentUserDoc();
  const channels = useMemo(
    () => (user?.role === 'moderator' ? [...BASE_CHANNELS, MOD_CHANNEL] : BASE_CHANNELS),
    [user?.role],
  );
const allChannels = useMemo(() => [...channels, ...VOICE_CHANNELS], [channels]);

  useEffect(() => {
    if (!allChannels.find(c => c.id === selectedId)) {
      setSelectedId(allChannels[0].id);
    }
  }, [allChannels, selectedId]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const updateStatus = (presence: 'online' | 'offline') => {
      firestore().collection('users').doc(uid).update({
        lastActive: firestore.FieldValue.serverTimestamp(),
        presence,
      });
    };
    const interval = setInterval(() => updateStatus('online'), 30000);
    updateStatus('online');
    const appListener = AppState.addEventListener('change', state => {
      if (state === 'active') updateStatus('online');
      if (state.match(/inactive|background/)) updateStatus('offline');
    });
    return () => {
      clearInterval(interval);
      appListener.remove();
    };
  }, [user?.uid]);

  const openStoriesViewer = (uid: string) => {
    setStoryUserId(uid);
    setStoriesOpen(true);
  };

  // Load user info for pinned messages
  useEffect(() => {
    const loadUsers = async () => {
      const missing = pinnedMessages
        .map(pm => pm.userId)
        .filter(uid => uid && !pinUsers[uid]);
      if (!missing.length) return;
      const snaps = await Promise.all(
        missing.map(uid => firestore().collection('users').doc(uid).get()),
      );
      const map = { ...pinUsers };
      snaps.forEach(doc => {
        if (doc.exists) {
          const data = doc.data() || {};
          data.selectedBadges = Array.isArray(data.selectedBadges)
            ? data.selectedBadges
            : Object.values(data.selectedBadges || {});
          map[doc.id] = data;
        }
      });
      setPinUsers(map);
    };
    if (pinnedMessages.length) loadUsers();
  }, [pinnedMessages]);

  const selectedChannel = allChannels.find(c => c.id === selectedId)!;
  const unreadMap = useChannelUnread(channels.map(c => c.id), selectedId);
  const dmUnread = useAnyDMUnread();

  const anyUnread = Object.values(unreadMap).some(Boolean);

  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const arrowRef = useRef<View | null>(null);
  const headerRef = useRef<View | null>(null);
  const barRef = useRef<View | null>(null);
  const [arrowCenterX, setArrowCenterX] = useState(0);
  const [headerBottomY, setHeaderBottomY] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState(false);
  const [barBottomY, setBarBottomY] = useState(0);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const updateBarBottomY = () => {
    barRef.current?.measureInWindow((_x, y, _width, height) => {
      setBarBottomY(y + height);
    });
  };

  const headerStyles = useMemo(
    () =>
      StyleSheet.create({
        headerBar: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          paddingTop: insets.top + 6,
          paddingBottom: 6,
          paddingHorizontal: 12,
          // Ensure pinned dropdown renders below this bar
          zIndex: 18,
        },
        headerTitle: {
          fontSize: 24,
          fontWeight: '700',
          marginLeft: 4,
          fontWeight: 'bold',
          color: colors.background,
        },
        headerArrowBtn: { marginLeft: 1, alignSelf: 'center', padding: 2 },
        unreadDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.accentRed,
          marginLeft: 2,
        },
        dmUnreadDot: {
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.accentRed,
          right: 0,
          bottom: 0,
        },
        dropdownUnreadDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.accentRed,
          marginRight: 6,
        },
        dropdown: {
          position: 'absolute',
          backgroundColor: colors.white,
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 8,
          shadowColor: colors.shadow,
          shadowOpacity: 0.27,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
          zIndex: 1002,
        },
        dropdownItem: { paddingVertical: 8 },
        dropdownItemText: { fontSize: 18, fontWeight: 'bold', color: colors.background },
        dropdownItemTextActive: { color: colors.accent },
        dropdownDivider: {
          height: 1,
          backgroundColor: colors.grayLight,
          marginVertical: 6,
        },
        dropdownSectionHeader: {
          fontSize: 12,
          fontWeight: 'bold',
          color: colors.gray,
          textTransform: 'uppercase',
          marginBottom: 4,
        },
      }),
    [insets.top, insets.bottom],
  );

  const pinnedStyles = StyleSheet.create({
    pinnedDropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: colors.white,
      zIndex: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    pinnedPreviewRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    pinnedPreviewIcon: {
      marginRight: 6,
      textShadowColor: colors.gold,
      textShadowRadius: 2,
    },
    pinnedPreviewText: {
      fontSize: 14,
      color: colors.black,
      fontFamily: fonts.regular,
      marginLeft: 4,
    },
    pinnedPreviewSender: {
      fontSize: 10,
      color: colors.gray,
      fontStyle: 'italic',
    },
    pinnedPreviewTime: {
      fontSize: 10,
      color: colors.gray,
      marginLeft: 6,
    },
    pinnedDivider: {
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    pinnedOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(20,20,20,0.85)',
      zIndex: 15,
    },
    pinBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.accent,
      borderColor: colors.white,
      borderWidth: 1,
      borderRadius: 10,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinBadgeText: {
      color: colors.white,
      fontSize: 10,
      fontFamily: fonts.bold,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });

  const toggleMenu = () => {
    arrowRef.current?.measureInWindow((x, y, width) => {
      setArrowCenterX(x + width / 2);
    });
    headerRef.current?.measureInWindow((_x, y, _width, height) => {
      setHeaderBottomY(y + height);
    });
    setMenuOpen(x => !x);
  };

  const togglePinnedDropdown = () => {
    if (showPinnedDropdown) {
      Animated.parallel([
        Animated.timing(dropdownAnim, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
      ]).start();
      // Delay state update and run after interactions to avoid React insertion warnings
      setTimeout(
        () => InteractionManager.runAfterInteractions(() => setShowPinnedDropdown(false)),
        ANIM_MEDIUM,
      );
    } else {
      updateBarBottomY();
      setShowPinnedDropdown(true);
    }
  };

  useEffect(() => {
    if (showPinnedDropdown) {
      dropdownAnim.setValue(0);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.timing(dropdownAnim, { toValue: 1, duration: ANIM_MEDIUM, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: ANIM_MEDIUM, useNativeDriver: true }),
      ]).start();
    }
  }, [showPinnedDropdown, dropdownAnim, overlayAnim]);

  return (
    <ScreenContainer padTop={false}>
      <View style={{ flex: 1 }}>
      <View ref={barRef} onLayout={updateBarBottomY}>
        <View
          style={headerStyles.headerBar}
          ref={headerRef}
          onLayout={() => {
            if (!menuOpen) {
              headerRef.current?.measureInWindow((x, y, width, height) =>
                setHeaderBottomY(y + height),
              );
            }
          }}
        >
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}
          onPress={toggleMenu}
        >
            <FontAwesome
              name="hashtag"
              size={20}
              color={colors.background}
              style={{ marginRight: -3, marginBottom: -2 }}
            />
            {selectedChannel.id === 'split-sharing' ? (
              <>
                <Text style={headerStyles.headerTitle} numberOfLines={1}>
                  SPLIT
                </Text>
                <Icon
                  name="share-outline"
                  size={26}
                  color={colors.accent}
                  style={{ marginLeft: 4 }}
                />
                <Text
                  style={[headerStyles.headerTitle, { marginLeft: 2 }]}
                  numberOfLines={1}
                >
                  {"'s"}
                </Text>
              </>
            ) : (
              <>
                <Text style={headerStyles.headerTitle} numberOfLines={1}>
                  {selectedChannel.name}
                </Text>
                {selectedChannel.type === 'voice' ? (
                  <Icon
                    name="volume-high"
                    size={16}
                    color={colors.accent}
                    style={{ marginLeft: 4 }}
                  />
                ) : selectedChannel.type === 'video' ? (
                  <Icon
                    name="videocam"
                    size={16}
                    color={colors.accent}
                    style={{ marginLeft: 4 }}
                  />
                ) : null}
              </>
            )}
          <View
            ref={arrowRef}
            style={headerStyles.headerArrowBtn}
            onLayout={e => {
              if (!menuOpen) {
                setArrowCenterX(
                  e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2,
                );
              }
            }}
          >
            <Icon
              name={menuOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={menuOpen ? colors.accent : colors.background}
            />
          </View>
          {anyUnread && <View style={headerStyles.unreadDot} />}
        </Pressable>
        {selectedChannel.type !== 'voice' && selectedChannel.type !== 'video' && (
          <TouchableOpacity onPress={togglePinnedDropdown} style={{ marginHorizontal: 8 }}>
            <View style={{ position: 'relative' }}>
              <Icon
                testID="pinned-button"
                name={pinnedMessages.length ? 'pin' : 'pin-outline'}
                size={28}
                color={pinnedMessages.length ? colors.accent : colors.gray}
              />
              {pinnedMessages.length > 0 && (
                <View testID="pinned-count-badge" style={pinnedStyles.pinBadge}>
                  <Text testID="pinned-count-text" style={pinnedStyles.pinBadgeText}>
                    {pinnedMessages.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onOpenGymFeed} style={{ marginHorizontal: 8 }}>
          <Icon
            testID="gym-feed-button"
            name="film-outline"
            size={28}
            color={colors.black}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOnlineUsersOpen(true)} style={{ marginHorizontal: 8 }}>
          <Image source={UsersIcon} style={{ width: 32, height: 32 }} contentFit="contain" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenDMInbox} style={{ marginHorizontal: 8 }}>
          <View style={{ position: 'relative' }}>
            <Image source={InboxIcon} style={{ width: 32, height: 32 }} contentFit="contain" />
            {dmUnread && <View style={headerStyles.dmUnreadDot} />}
          </View>
        </TouchableOpacity>
        </View>
        {selectedChannel.type !== 'voice' &&
          selectedChannel.type !== 'video' && (
            <StoriesBar openStoriesViewer={openStoriesViewer} />
          )}
      </View>
      {menuOpen && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 1001 }]}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={[headerStyles.dropdown, { top: headerBottomY, left: arrowCenterX - dropdownWidth / 2 }]}
            onLayout={e => setDropdownWidth(e.nativeEvent.layout.width)}
          >
            {channels.map(channel => (
              <TouchableOpacity
                key={channel.id}
                style={headerStyles.dropdownItem}
                onPress={() => {
                  setSelectedId(channel.id);
                  setMenuOpen(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {unreadMap[channel.id] && <View style={headerStyles.dropdownUnreadDot} />}
                  <Text
                    style={[
                      headerStyles.dropdownItemText,
                      selectedId === channel.id && headerStyles.dropdownItemTextActive,
                    ]}
                  >
                    {channel.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={headerStyles.dropdownDivider} />
            <Text style={headerStyles.dropdownSectionHeader}>Voice Channels</Text>
            {VOICE_CHANNELS.map(channel => (
              <TouchableOpacity
                key={channel.id}
                style={headerStyles.dropdownItem}
                onPress={() => {
                  setSelectedId(channel.id);
                  setMenuOpen(false);
                }}
              >
                <Text
                  style={[
                    headerStyles.dropdownItemText,
                    selectedId === channel.id && headerStyles.dropdownItemTextActive,
                  ]}
                >
                  {channel.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
      {selectedChannel.type !== 'voice' &&
        selectedChannel.type !== 'video' && (
          <>
            {showPinnedDropdown && (
              <AnimatedPressable
                testID="pinned-overlay"
                style={[pinnedStyles.pinnedOverlay, { top: barBottomY, opacity: overlayAnim }]}
                onPress={togglePinnedDropdown}
              />
            )}
            {showPinnedDropdown && (
              <Animated.View
                testID="pinned-dropdown"
                style={[
                  pinnedStyles.pinnedDropdown,
                  {
                    top: barBottomY,
                    maxHeight: SCREEN_HEIGHT * 0.6,
                    opacity: dropdownAnim,
                    transform: [
                      {
                        translateY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-SCREEN_HEIGHT * 0.6, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <ScrollView>
                  {pinnedMessages.length ? (
                    pinnedMessages.map((pm, idx) => {
                      const user = pinUsers[pm.userId] || {};
                      const displayName = user.firstName
                        ? `${user.firstName} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`
                        : 'User';
                      const d = pm.timestamp?.toDate ? pm.timestamp.toDate() : new Date(pm.timestamp);
                      const time = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate())} ${d.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`;
                      const previewText = String(
                        selectedChannel.id === 'split-sharing' && pm.split?.name
                          ? pm.split.name
                          : pm.text || ''
                      );
                      return (
                        <TouchableOpacity
                          key={pm.id}
                          style={[
                            pinnedStyles.pinnedPreviewRow,
                            idx !== pinnedMessages.length - 1 && pinnedStyles.pinnedDivider,
                          ]}
                          onPress={() => {
                            togglePinnedDropdown();
                            setTimeout(() => {
                              InteractionManager.runAfterInteractions(() => {
                                scrollToMessageFn?.(String(pm.id));
                              });
                            }, ANIM_MEDIUM + 30);
                          }}
                          activeOpacity={0.7}
                        >
                          <FontAwesome
                            name="thumb-tack"
                            size={16}
                            color={colors.yellow}
                            style={pinnedStyles.pinnedPreviewIcon}
                          />
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={2} style={pinnedStyles.pinnedPreviewText}>
                              {previewText}
                            </Text>
                            <View style={{ flexDirection: 'row', marginTop: 2 }}>
                              <Text style={pinnedStyles.pinnedPreviewSender}>{displayName}</Text>
                              <Text style={pinnedStyles.pinnedPreviewTime}>{time}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={{ padding: 16 }}>
                      <Text style={{ color: colors.gray }}>No pinned messages</Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            )}
          </>
        )}
      <StoriesViewer visible={storiesOpen} userId={storyUserId} onClose={() => setStoriesOpen(false)} />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ChatScreen
            channelId={selectedChannel.id}
            channelName={selectedChannel.name}
            isActive={isActive}
            onPinnedMessagesChange={
              selectedChannel.type === 'voice' || selectedChannel.type === 'video'
                ? undefined
                : setPinnedMessages
            }
            onRegisterScrollToMessage={fn => setScrollToMessageFn(() => fn)}
          />
        </View>
      </View>
      <OnlineUsersSidebar visible={onlineUsersOpen} onClose={() => setOnlineUsersOpen(false)} currentUserId={user?.uid} />
      </View>
    </ScreenContainer>
  );
};

export default React.memo(ChatBar);