import { Ionicons as Icon } from '@expo/vector-icons';
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
  getUnlockedBadges,
} from '../badges/UnlockableBadges';
import { ROLE_COLORS, ROLE_TAGS } from '../constants/roles';
import { auth, firestore } from '../firebase/firebase';
import { pickPublicUser } from '../firebase/publicUserHelpers';
import { postSystemMessage } from '../firebase/systemMessages';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import { isModeratorOrAdmin } from '../src/lib/roles';
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

const SOCIAL_LABELS: { [key: string]: string } = {
  insta: 'Instagram',
  fb: 'Facebook',
  tiktok: 'TikTok',
  yt: 'YouTube',
  twitch: 'Twitch',
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
const toMillis = (value: any) => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return typeof value === 'number' ? value : 0;
};

function getVisibleSocialEntries(socials: any) {
  if (!socials || typeof socials !== 'object') return [];
  return Object.entries(socials).flatMap(([platform, rawValue]) => {
    const value = rawValue && typeof rawValue === 'object' ? rawValue : null;
    const hidden = value?.hidden === true;
    const handleRaw = typeof value?.handle === 'string' ? value.handle.trim() : '';
    if (!handleRaw || hidden) return [];
    return [{ platform, handle: handleRaw, url: buildSocialUrl(platform, handleRaw) }];
  });
}

function formatSocialDisplay(handle: string) {
  const trimmed = handle.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('http')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.slice(1) : parsed.host;
  } catch {
    return trimmed;
  }
}

const resolveThreadId = async (currentUserId: string, otherUserId: string) => {
  const idA = `${currentUserId}_${otherUserId}`;
  const idB = `${otherUserId}_${currentUserId}`;
  const [docA, docB] = await Promise.all([
    firestore().collection('dms').doc(idA).get(),
    firestore().collection('dms').doc(idB).get(),
  ]);

  if (docA.exists && docB.exists) {
    const aData = docA.data() || {};
    const bData = docB.data() || {};
    const aTs = toMillis(aData.updatedAt) || toMillis(aData.createdAt);
    const bTs = toMillis(bData.updatedAt) || toMillis(bData.createdAt);
    return {
      threadId: aTs >= bTs ? idA : idB,
      docExists: true,
    };
  }

  if (docA.exists) return { threadId: idA, docExists: true };
  if (docB.exists) return { threadId: idB, docExists: true };
  return { threadId: idA, docExists: false };
};

export default function UserPreviewModal({ visible, userId, onClose, onUserBlocked, onUserReported }) {
  const [user, setUser] = useState<any>(null);
  const currentUserId = auth().currentUser?.uid;
  const currentUser = useCurrentUserDoc();
  const isModerator = isModeratorOrAdmin(currentUser?.role);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [sentFeedback, setSentFeedback] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    const unsub = firestore()
      .collection('publicUsers')
      .doc(userId)
      .onSnapshot(doc => {
        if (!doc.exists) {
          setUser({ id: userId, firstName: 'User', lastName: '', selectedBadges: [], badges: [] });
          return;
        }
        const data: any = doc.data() || {};
        setUser(pickPublicUser(data, doc.id));
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
  }, [opacityAnim, scaleAnim, visible]);

  if (!visible || !user) return null;

  const {
    firstName,
    lastName,
    profilePicUrl,
    bio,
    chatLevel,
    socials,
    badges = [],
    selectedBadges = [],
    lastActive,
    timeoutUntil,
  } = user;
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const tsToMillis = (ts: any) => (typeof ts?.toMillis === 'function' ? ts.toMillis() : ts || 0);
  const timeoutMs = timeoutUntil ? tsToMillis(timeoutUntil) - Date.now() : 0;
  const isTimedOut = timeoutMs > 0;
  const isBanned = user?.isBanned === true;
  const hoursLeft = Math.floor(timeoutMs / 3600000);
  const minsLeft = Math.floor((timeoutMs % 3600000) / 60000);
  const visibleSocials = getVisibleSocialEntries(socials);

  const isOnline = () => {
    const last = tsToMillis(lastActive);
    return !!last && Date.now() - last <= ONLINE_THRESHOLD;
  };

  const allBadges = getUnlockedBadges(user);
  const badgeList = enforceSelectedBadges(selectedBadges.length ? selectedBadges : allBadges, {
    ...user,
    badges,
  });

  const withActionGuard = async (fn: () => Promise<void>) => {
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      await fn();
    } catch (error: any) {
      Alert.alert('Action Failed', error?.message || 'Please try again.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const otherUid = user?.id;
    if (!currentUserId || !otherUid || otherUid === currentUserId) {
      Alert.alert('Unable to start DM', 'Please try again.');
      return;
    }

    const { threadId, docExists } = await resolveThreadId(currentUserId, otherUid);
    const threadRef = firestore().collection('dms').doc(threadId);
    if (docExists) {
      try {
        await threadRef.update({
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } catch (error: any) {
        if (error?.code !== 'firestore/not-found') {
          throw error;
        }
        await threadRef.set({
          participants: [currentUserId, otherUid],
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      await threadRef.set({
        participants: [currentUserId, otherUid],
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    await threadRef.collection('messages').add({
      userId: currentUserId,
      text: trimmedMessage,
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
    if (!currentUserId || !isModerator || currentUserId === user.id) return;
    if (!isTimedOut) {
      Alert.alert('Timeout User', `Time out ${name} for 24 hours?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Timeout',
          style: 'destructive',
          onPress: async () => {
            await withActionGuard(async () => {
              const timeoutValue = Date.now() + 24 * 60 * 60 * 1000;
              const batch = firestore().batch();
              batch.update(firestore().collection('users').doc(user.id), {
                timeoutUntil: timeoutValue,
              });
              batch.set(
                firestore().collection('publicUsers').doc(user.id),
                { timeoutUntil: timeoutValue },
                { merge: true },
              );
              await batch.commit();
              const displayName = formatUserDisplayName(user);
              await postSystemMessage({
                channelId: 'mod-only',
                title: 'Timeout',
                body: `${displayName} has been timed out for 24 hours.`,
              });
            });
          },
        },
      ]);
      return;
    }

    Alert.alert('Remove Timeout', `Remove timeout for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        onPress: async () => {
          await withActionGuard(async () => {
            const batch = firestore().batch();
            batch.update(firestore().collection('users').doc(user.id), {
              timeoutUntil: firestore.FieldValue.delete(),
            });
            batch.set(
              firestore().collection('publicUsers').doc(user.id),
              { timeoutUntil: firestore.FieldValue.delete() },
              { merge: true },
            );
            await batch.commit();
          });
        },
      },
    ]);
  };

  const handleBanToggle = async () => {
    if (!currentUserId || !isModerator || currentUserId === user.id) return;
    if (!isBanned) {
      Alert.alert('Ban User', `Ban ${name} from posting and messaging?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            await withActionGuard(async () => {
              const batch = firestore().batch();
              batch.update(firestore().collection('users').doc(user.id), {
                isBanned: true,
                bannedAt: firestore.FieldValue.serverTimestamp(),
                bannedBy: currentUserId,
              });
              batch.set(
                firestore().collection('publicUsers').doc(user.id),
                { isBanned: true },
                { merge: true },
              );
              await batch.commit();
              await firestore().collection('reports').add({
                targetType: 'user',
                targetId: user.id,
                targetOwnerUid: user.id,
                reportedBy: currentUserId,
                reason: null,
                details: null,
                status: 'open',
                action: 'ban',
                source: 'UserPreviewModal',
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              const displayName = formatUserDisplayName(user);
              await postSystemMessage({
                channelId: 'mod-only',
                title: 'Ban',
                body: `${displayName} has been banned.`,
              });
            });
          },
        },
      ]);
      return;
    }

    Alert.alert('Unban User', `Remove ban for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unban',
        onPress: async () => {
          await withActionGuard(async () => {
            const batch = firestore().batch();
            batch.update(firestore().collection('users').doc(user.id), {
              isBanned: false,
              bannedAt: firestore.FieldValue.delete(),
              bannedBy: firestore.FieldValue.delete(),
            });
            batch.set(
              firestore().collection('publicUsers').doc(user.id),
              { isBanned: false },
              { merge: true },
            );
            await batch.commit();
          });
        },
      },
    ]);
  };

  const handleBlock = () => {
    if (!currentUserId || currentUserId === user.id) return;
    Alert.alert('Block User', `Block @${name}? You will not see each other's content.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: async () => {
          await withActionGuard(async () => {
            const blockId = `${currentUserId}_${user.id}`;
            await firestore().collection('blocks').doc(blockId).set({
              blockerUid: currentUserId,
              blockedUid: user.id,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            await firestore().collection('reports').add({
              targetType: 'user',
              targetId: user.id,
              targetOwnerUid: user.id,
              reportedBy: currentUserId,
              reason: null,
              details: null,
              status: 'open',
              action: 'block',
              source: 'UserPreviewModal',
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            onUserBlocked?.(user.id);
            onClose?.();
          });
        },
      },
    ]);
  };

  const handleReport = async () => {
    if (!currentUserId || currentUserId === user.id) return;
    await withActionGuard(async () => {
      await firestore().collection('reports').add({
        targetType: 'user',
        targetId: user.id,
        targetOwnerUid: user.id,
        reportedBy: currentUserId,
        reason: null,
        details: null,
        status: 'open',
        action: 'report',
        source: 'UserPreviewModal',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      onUserReported?.(user.id);
      Alert.alert('Reported', 'User reported to admins.');
      onClose?.();
    });
  };

  const openSocial = async (url: string) => {
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Invalid Link', 'This social link is not available.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}}>
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
                    <Text style={styles.levelText}>Streak {user.accountabilityStreak}</Text>
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
                            style={styles.badgeIcon}
                            contentFit="contain"
                          />
                        );
                      }
                      return null;
                    })}
                  </View>
                )}
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              >
                <Icon name="close-circle" size={27} color="#E2E2E2" />
              </Pressable>
            </View>

            {bio ? (
              <Text style={styles.bio} numberOfLines={2} ellipsizeMode="tail">
                {bio}
              </Text>
            ) : null}

            {visibleSocials.length > 0 && (
              <>
                <Text style={styles.socialTitle}>Socials</Text>
                <View style={styles.socialRow}>
                  {visibleSocials.map(({ platform, handle, url }) => (
                    <Pressable
                      key={`${platform}:${handle}`}
                      onPress={() => openSocial(url)}
                      style={({ pressed }) => [
                        styles.socialChip,
                        pressed && styles.socialChipPressed,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] },
                      ]}
                    >
                      <Icon
                        name={SOCIAL_ICONS[platform] || 'at'}
                        size={16}
                        color={SOCIAL_COLORS[platform] || '#4B5563'}
                      />
                      <Text style={styles.socialChipTxt} numberOfLines={1}>
                        {SOCIAL_LABELS[platform] || platform} {formatSocialDisplay(handle)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Pressable
              onPress={() => inputRef.current?.focus()}
              style={({ pressed }) => [
                styles.msgBtn,
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  backgroundColor: pressed ? '#E2E2E2' : '#FFFFFF',
                },
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
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.timeoutBtn,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}
                >
                  <Icon name="time-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnTxt}>
                    {isTimedOut ? `Timed Out ${hoursLeft}h ${minsLeft}m` : 'Timeout'}
                  </Text>
                </Pressable>
              ) : null}

              {isModerator && currentUserId !== user.id ? (
                <Pressable
                  onPress={handleBanToggle}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.banBtn,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}
                >
                  <Icon
                    name={isBanned ? 'checkmark-circle-outline' : 'ban-outline'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTxt}>{isBanned ? 'Unban' : 'Ban'}</Text>
                </Pressable>
              ) : null}

              {currentUserId !== user.id ? (
                <Pressable
                  onPress={handleReport}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.reportBtn,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}
                >
                  <Icon name="alert-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnTxt}>Report</Text>
                </Pressable>
              ) : null}

              {currentUserId !== user.id ? (
                <Pressable
                  onPress={handleBlock}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.blockBtn,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}
                >
                  <Icon name="close-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnTxt}>Block</Text>
                </Pressable>
              ) : null}
            </View>

            {isSubmittingAction ? <Text style={styles.actionBusyTxt}>Applying...</Text> : null}
          </Animated.View>
        </Pressable>
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
    borderRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    width: '90%',
    maxWidth: 370,
    shadowColor: '#000',
    shadowOpacity: 0.2,
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
    marginTop: 8,
  },
  badgeIcon: {
    width: 20,
    height: 20,
    aspectRatio: 1,
    marginRight: 6,
    marginBottom: 4,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 9,
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
    borderRadius: 4,
    paddingHorizontal: 6,
    marginRight: 3,
    marginLeft: 1,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  bio: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 12,
  },
  socialTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    margin: 4,
    maxWidth: '96%',
  },
  socialChipPressed: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  socialChipTxt: {
    marginLeft: 6,
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 220,
  },
  msgBtn: {
    width: '92%',
    alignSelf: 'center',
    minHeight: 46,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 35,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  timeoutBtn: {
    backgroundColor: '#2563EB',
  },
  banBtn: {
    backgroundColor: '#B91C1C',
  },
  reportBtn: {
    backgroundColor: '#F97316',
  },
  blockBtn: {
    backgroundColor: '#4B5563',
  },
  actionBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  actionBusyTxt: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
});

