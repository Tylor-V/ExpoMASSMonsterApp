import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  enforceSelectedBadges,
  getBadgeAsset,
  getUnlockedBadges
} from '../badges/UnlockableBadges';
import { ROLE_COLORS, ROLE_TAGS } from '../constants/roles';
import { auth, firestore } from '../firebase/firebase';
import { postSystemMessage } from '../firebase/systemMessages';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import { colors } from '../theme';
import { ANIM_MODAL } from '../utils/animations';
import { getChatLevelColor } from '../utils/chatLevel';
import { formatUserDisplayName } from '../utils/userDisplayName';
import ProfileImage from './ProfileImage';

const SOCIAL_ICONS: { [key: string]: string } = {
  insta: 'logo-instagram',
  fb: 'logo-facebook',
  tiktok: 'logo-tiktok',
  yt: 'logo-youtube',
  twitch: 'logo-twitch',
};

const SOCIAL_COLORS: { [key: string]: string } = {
  insta: '#E1306C',
  fb: '#1877F2',
  tiktok: '#69C9D0',
  yt: '#FF0000',
  twitch: '#9146FF',
};


function buildSocialUrl(platform: string, handle: string) {
  if (!handle) return '';
  if (handle.startsWith('http')) return handle;
  const cleaned = handle.replace(/^@/, '');
  const map: Record<string, string> = {
    insta: `https://www.instagram.com/${cleaned}`,
    fb: `https://www.facebook.com/${cleaned}`,
    tiktok: `https://www.tiktok.com/@${cleaned}`,
    yt: `https://www.youtube.com/${cleaned.startsWith('@') ? cleaned : `@${cleaned}`}`,
    twitch: `https://www.twitch.tv/${cleaned}`,
  };
  return map[platform] || handle;
}

const ONLINE_THRESHOLD = 10 * 60 * 1000;

export default function UserPreviewModal({ visible, userId, onClose }) {
  const [user, setUser] = useState<any>(null);
  const navigation = useNavigation<any>();
  const currentUserId = auth().currentUser?.uid;
  const currentUser = useCurrentUserDoc();
  const isModerator = currentUser?.role === 'moderator';
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [sentFeedback, setSentFeedback] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    const unsub = firestore()
      .collection('users')
      .doc(userId)
      .onSnapshot(doc => {
        setUser(doc.exists ? { id: doc.id, ...doc.data() } : null);
      });
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: ANIM_MODAL,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIM_MODAL,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0.7);
    }
  }, [visible]);

  if (!visible || !user) return null;

  const { firstName, lastName, role, profilePicUrl, bio, chatLevel, socials, badges = [], selectedBadges = [], lastActive, timeoutUntil } = user;
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const toMillis = (ts: any) => (typeof ts?.toMillis === 'function' ? ts.toMillis() : ts || 0);
  const timeoutMs = timeoutUntil ? toMillis(timeoutUntil) - Date.now() : 0;
  const isTimedOut = timeoutMs > 0;
  const hoursLeft = Math.floor(timeoutMs / 3600000);
  const minsLeft = Math.floor((timeoutMs % 3600000) / 60000);
  const isOnline = () => {
    const last = toMillis(lastActive);
    return !!last && Date.now() - last <= ONLINE_THRESHOLD;
  };

  const allBadges = getUnlockedBadges(user);
  const badgeList = enforceSelectedBadges(selectedBadges.length ? selectedBadges : allBadges, user);

  const sendMessage = async () => {
    if (!currentUserId || !message.trim()) return;

    const idA = `${currentUserId}_${user.id}`;
    const idB = `${user.id}_${currentUserId}`;
    let threadDoc = await firestore().collection('dms').doc(idA).get();
    let threadId = idA;
    if (!threadDoc.exists) {
      threadDoc = await firestore().collection('dms').doc(idB).get();
      if (threadDoc.exists) {
        threadId = idB;
      }
    }

    await firestore()
      .collection('dms')
      .doc(threadId)
      .set(
        {
          participants: [currentUserId, user.id],
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await firestore()
      .collection('dms')
      .doc(threadId)
      .collection('messages')
      .add({
        userId: currentUserId,
        text: message.trim(),
        timestamp: firestore.FieldValue.serverTimestamp(),
        reactions: [],
        mediaUrl: '',
      });

    setMessage('');
    setSentFeedback(true);
    setTimeout(() => {
      setSentFeedback(false);
      onClose?.();
    }, 800);
  };

  const handleTimeoutToggle = async () => {
    if (!currentUserId || !isModerator) return;
    if (!isTimedOut) {
      Alert.alert(
        'Timeout User',
        `Time out ${name} for 24 hours?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Timeout',
            style: 'destructive',
            onPress: async () => {
              try {
                await firestore()
                  .collection('users')
                  .doc(user.id)
                  .update({ timeoutUntil: Date.now() + 24 * 60 * 60 * 1000 });
                const displayName = formatUserDisplayName(user);
                await postSystemMessage({
                  channelId: 'mod-only',
                  title: 'Timeout',
                  body: `${displayName} has been timed out!`,
                });
              } catch (error: any) {
                console.error('Failed to timeout user', error);
                Alert.alert(
                  'Timeout Failed',
                  error?.message || 'Could not timeout this user.',
                );
              }
            },
          },
        ],
      );
    } else {
      Alert.alert('Remove Timeout', `Remove timeout for ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            await firestore().collection('users').doc(user.id).update({
              timeoutUntil: firestore.FieldValue.delete(),
            });
          },
        },
      ]);
    }
  };

  const handleReport = async () => {
    if (!currentUserId) return;
    await firestore().collection('reports').add({
      type: 'user',
      reportedBy: currentUserId,
      targetId: user.id,
      timestamp: Date.now(),
    });
    Alert.alert('Reported', 'User reported to admins.');
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.box, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={styles.headerRow}>
            <View style={{ marginRight: 12 }}>
              <ProfileImage
              uri={profilePicUrl}
              style={styles.avatar}
              isCurrentUser={auth().currentUser?.uid === user.id}
            />
              {isOnline() && <View style={styles.onlineDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              {chatLevel ? (
                <View style={[styles.levelIndicator, { backgroundColor: getChatLevelColor(chatLevel) }]}>
                  <Text style={styles.levelText}>Lv{chatLevel}</Text>
                </View>
              ) : null}
              {user.accountabilityStreak > 0 && (
                <View style={[styles.levelIndicator, { backgroundColor: getChatLevelColor(chatLevel) }]}>
                  <Text style={styles.levelText}>🔥{user.accountabilityStreak}</Text>
                </View>
              )}
              {ROLE_TAGS[user.role] && (
                <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] }]}>
                  <Text style={styles.roleBadgeTxt}>{ROLE_TAGS[user.role]}</Text>
                </View>
              )}
              {badgeList.length > 0 && (
                <View style={styles.badgesRow}>
                  {badgeList.map((b: string, i: number) => {
                    const asset = getBadgeAsset(b);
                    if (asset?.type === 'image') {
                      return (
                        <Image
                          key={b + i}
                          source={asset.source}
                          style={[{ width: 16, height: 16, aspectRatio: 1, marginRight: 4 }, styles.badgeHighlight]}
                          contentFit="contain"
                        />
                      );
                    }
                    return null;
                  })}
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
              <Icon name="close-circle" size={27} color="#E2E2E2" />
            </Pressable>
          </View>
          {bio ? (
            <Text style={styles.bio} numberOfLines={2} ellipsizeMode="tail">
              {bio}
            </Text>
          ) : null}
          {Object.entries(socials || {})
            .filter(([_, { handle, hidden }]) => handle && !hidden)
            .length > 0 && (
              <View style={styles.socialRow}>
                {Object.entries(socials || {})
                  .filter(([_, { handle, hidden }]) => handle && !hidden)
                  .map(([platform, { handle }]) => (
                    <Pressable
                      key={platform}
                      onPress={() => Linking.openURL(buildSocialUrl(platform, handle))}
                      style={({ pressed }) => [styles.socialIconWrap, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
                    >
                      <Icon
                        name={SOCIAL_ICONS[platform] || 'at'}
                        size={24}
                        color={SOCIAL_COLORS[platform] || '#FFFFFF'}
                      />
                    </Pressable>
                  ))}
              </View>
            )}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={({ pressed }) => [
              styles.msgBtn,
              { transform: [{ scale: pressed ? 0.97 : 1 }], backgroundColor: pressed ? '#E2E2E2' : '#FFFFFF' },
              focused && styles.msgBtnFocused,
              currentUserId === user.id && styles.msgBtnDisabled,
            ]}
          >
            {sentFeedback ? (
              <View style={styles.sentRow}>
                <Text style={styles.sentText}>Message sent</Text>
                <Icon name="checkmark" size={16} color="#808080" style={{ marginLeft: 4 }} />
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                style={[styles.msgInput, currentUserId === user.id && { color: '#5A5C62' }]}
                value={message}
                onChangeText={setMessage}
                editable={currentUserId !== user.id}
                placeholder={`Message @${name}`}
                placeholderTextColor="#B0B2BA"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
            )}
          </Pressable>
          <View style={styles.secondaryRow}>
            {isModerator && currentUserId !== user.id ? (
              <Pressable
                onPress={handleTimeoutToggle}
                style={({ pressed }) => [styles.reportBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              >
                <Icon name="time-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.reportBtnTxt}>
                  {isTimedOut ? `Timed Out for ${hoursLeft}h ${minsLeft}m` : 'Timeout'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleReport}
                style={({ pressed }) => [styles.reportBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              >
                <Icon name="alert-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.reportBtnTxt}>Report</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13,13,13,0.83)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: colors.white,
    borderRadius: 6,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    width: '90%',
    maxWidth: 370,
    shadowColor: '#000',
    shadowOpacity: 0.90,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.gray,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#60D394',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    color: colors.background,
    fontWeight: 'bold',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  badgePill: {
    backgroundColor: colors.accent,
    borderRadius: 7,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeHighlight: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 8,
  },
  badgeText: {
    color: '#232323',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roleBadge: {
    borderRadius: 7,
    paddingHorizontal: 6,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  roleBadgeTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelIndicator: {
    borderRadius: 2,
    paddingHorizontal: 4,
    marginRight: 3,
    marginLeft: 1,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  bio: {
    color: '#C5C5D2',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  socialIconWrap: {
    marginHorizontal: 8,
  },
  msgBtn: {
    width: '92%',
    alignSelf: 'center',
    height: 46,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  msgBtnFocused: {
    borderColor: '#FFD700',
  },
  msgBtnDisabled: {
    backgroundColor: '#2A2B2F',
    borderColor: '#2A2B2F',
  },
  msgInput: {
    flex: 1,
    color: '#232323',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 8,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentText: {
    color: '#808080',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryRow: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'center',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4545',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 35,
  },
  reportBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});