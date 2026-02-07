import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
  Pressable,
  DeviceEventEmitter,
  LayoutAnimation,
  Modal,
  TextInput,
} from 'react-native';
import type { PropsWithChildren } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AllChannels, { CustomRenderParams } from './AllChannels';
import ProfileImage from '../components/ProfileImage';
import {
  saveSharedSplits,
  addSharedSplit,
  removeSharedSplit,
} from '../firebase/userProfileHelpers';
import { LIFT_CATEGORIES, LIFT_CATEGORY_ORDER } from '../constants/liftCategories';
import { LIFT_RATINGS } from '../constants/liftRatings';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { auth, firestore } from '../firebase/firebase';
import {
  MESSAGE_REPORT_REASONS,
  submitMessageReport,
  type MessageReportReason,
} from '../firebase/reportHelpers';
import { colors } from '../theme';
import { ANIM_INSTANT, ANIM_BUTTON_PRESS, ANIM_WIGGLE } from '../utils/animations';
import {
  normalizeSharedSplitList,
  normalizeWorkoutPlan,
} from '../utils/splitSharing';
import useCarousel from '../hooks/useCarousel';
import CarouselNavigator from '../components/CarouselNavigator';
import UserPreviewModal from '../components/UserPreviewModal';
import { useHiddenContent } from '../hooks/useHiddenContent';

const SplitShareBubble = ({
  item,
  onSave,
  error,
  anim,
  saved,
  isOwn,
  onUserPreview,
}: {
  item: any;
  onSave: () => void;
  error: boolean;
  anim: Animated.Value;
  saved: boolean;
  isOwn?: boolean;
  onUserPreview?: () => void;
}) => {
  const user = item.user || {};
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const split = item.split;
  const bubbleWidth = (width - insets.left - insets.right) * 0.85;
  const cardWidth = bubbleWidth * 0.93;
  const cardSpacing = 20;
  const sidePadding = (bubbleWidth - cardWidth) / 2;
  const { index: dayIndex, goToIndex, ref: carouselRef } = useCarousel<any>(
    split.days.length,
    cardWidth + cardSpacing,
    { animatedScroll: true },
  );
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  const saveScale = useRef(new Animated.Value(1)).current;

  return (
    <View
      style={[
        styles.splitContainer,
        isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.splitMetaRow,
          isOwn ? styles.splitMetaRowOwn : styles.splitMetaRowOther,
        ]}
      >
        {!isOwn && (
          <Pressable
            onPress={onUserPreview}
            style={styles.userPreviewRow}
            hitSlop={6}
          >
            <ProfileImage uri={user.profilePicUrl} style={styles.profilePic} />
            <Text style={styles.splitUser}>{
              `${user.firstName || 'User'} ${user.lastName?.charAt(0) || ''}.`
            }</Text>
          </Pressable>
        )}
      </View>
      <View
        style={[
          styles.splitBubble,
          { width: bubbleWidth },
          isOwn && styles.ownSplitBubble,
          item.pinned && styles.pinnedBubble,
        ]}
      >
        <View style={styles.splitTitleRow}>
          <Text style={styles.splitTitle} numberOfLines={1} ellipsizeMode="tail">
            {split.name}
          </Text>
          {split.notes ? (
            <Text
              style={styles.splitNotes}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {` - ${split.notes}`}
            </Text>
          ) : null}
        </View>
        <View style={{ position: 'relative', marginVertical: 4 }}>
          <FlatList
            ref={carouselRef}
            data={split.days.slice(0, 10)}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + cardSpacing}
            decelerationRate="fast"
            snapToAlignment="center"
            scrollEnabled={false}
            getItemLayout={(_, index) => ({
              length: cardWidth + cardSpacing,
              offset: (cardWidth + cardSpacing) * index,
              index,
            })}
            style={{}}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item: d }) => {
            const used = new Set<string>();
            const byCat = LIFT_CATEGORY_ORDER.map(cat => {
              const lifts = d.lifts.filter((l: string) => {
                const match = LIFT_CATEGORIES[cat]?.includes(l);
                if (match) used.add(l);
                return match;
              });
              return lifts.length ? { cat, lifts } : null;
            }).filter(Boolean) as { cat: string; lifts: string[] }[];
            const otherLifts = d.lifts.filter((l: string) => !used.has(l));
            if (otherLifts.length) {
              byCat.push({ cat: 'Other Lifts', lifts: otherLifts });
            }
            const noLifts = byCat.length === 0;
            return (
              <View style={[styles.dayCard, { width: cardWidth }]}>
                <View style={styles.dayTitleRow}>
                  <Text style={styles.dayTitle} numberOfLines={1} ellipsizeMode="tail">
                    {d.title}
                  </Text>
                  {d.notes ? (
                    <Text
                      style={styles.dayNotes}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {` - ${d.notes}`}
                    </Text>
                  ) : null}
                </View>
                {noLifts ? (
                  <Text style={styles.noLiftsText}>No lifts added</Text>
                ) : (
                  byCat.map(({ cat, lifts }) => {
                    const headRatings: Record<string, number> = {};
                    lifts.forEach(l => {
                      const ratings = LIFT_RATINGS[cat]?.[l];
                      if (!ratings) return;
                      Object.entries(ratings).forEach(([head, rating]) => {
                        if (rating > 0) {
                          headRatings[head] = Math.max(
                            headRatings[head] || 0,
                            rating,
                          );
                        }
                      });
                    });
                    return (
                      <View key={cat} style={{ marginTop: 6 }}>
                        <Text style={styles.liftCategory}>{`${cat}:`}</Text>
                        {Object.keys(headRatings).length > 0 && (
                          <View style={styles.headRatingsRow}>
                            {Object.entries(headRatings).map(([head, rating]) => (
                              <View key={head} style={styles.headRatingItem}>
                                <Text style={styles.headRatingText}>{head} {rating}</Text>
                                <Ionicons name="star" size={14} color={colors.accent} style={{ marginLeft: 3 }} />
                              </View>
                            ))}
                          </View>
                        )}
                        <View style={styles.liftsContainer}>
                          {lifts.map(lift => (
                            <View key={lift} style={styles.liftBadge}>
                              <Text style={styles.liftBadgeText}>{lift}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
        />
          {split.days.length > 1 && (
            <CarouselNavigator
              index={dayIndex}
              length={split.days.length}
              onIndexChange={goToIndex}
              leftOffset={-18}
              rightOffset={-18}
              inactiveColor={colors.grayLight}
              dotsRowStyle={styles.dayDotsRow}
              maxDots={10}
            />
          )}
        </View>
        {/* Dots are rendered by CarouselNavigator */}
        {!isOwn && (
          <AnimatedPressable
            onPress={onSave}
            onPressIn={() =>
              Animated.timing(saveScale, {
                toValue: 1.1,
                duration: ANIM_BUTTON_PRESS,
                useNativeDriver: true,
              }).start()
            }
            onPressOut={() =>
              Animated.timing(saveScale, {
                toValue: 1,
                duration: ANIM_BUTTON_PRESS,
                useNativeDriver: true,
              }).start()
            }
            style={[
              styles.saveIconBtn,
              saved && styles.saveIconSaved,
              { transform: [{ scale: saveScale }, { translateX: anim }] },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={saved ? colors.accent: colors.accent}
            />
          </AnimatedPressable>
        )}
        <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
          <Text style={[styles.splitTime, isOwn && styles.splitTimeOwn]}>
            {new Date(item.timestamp?.toDate?.() || item.timestamp).toLocaleDateString()}
          </Text>
        </View>
        {!isOwn && error && (
          <Text style={styles.saveErrorTxt}>Delete a Shared-Split first to save!</Text>
        )}
      </View>
    </View>
  );
};

type ChannelProps = PropsWithChildren<{
  channelId: string;
  channelName: string;
  isActive?: boolean;
  onHeightChange?: (height: number) => void;
  onPinnedMessagesChange?: (msgs: any[]) => void;
  onRegisterScrollToMessage?: (fn: (id: string) => void) => void;
}>;

const SplitSharingChannel: React.FC<ChannelProps> = props => {
  const [savedSplitMsgIds, setSavedSplitMsgIds] = useState<string[]>([]);
  const splitShakeAnim = useRef(new Animated.Value(0)).current;
  const saveErrorTimer = useRef<NodeJS.Timeout | null>(null);
  const [saveErrorId, setSaveErrorId] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [reportTargetMessage, setReportTargetMessage] = useState<any | null>(null);
  const [reportReason, setReportReason] =
    useState<MessageReportReason>(MESSAGE_REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const { hideContent } = useHiddenContent({
    containerId: props.channelId,
    targetType: 'channelMessage',
  });

  const loadSavedSplitIds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('sharedSplits');
      const list = normalizeSharedSplitList(stored ? JSON.parse(stored) : []);
      const ids = list
        .map((s: any) => s.msgId)
        .filter((id: any) => typeof id === 'string');
      setSavedSplitMsgIds(ids);
    } catch (e) {
      setSavedSplitMsgIds([]);
    }
  }, []);

  useEffect(() => {
    loadSavedSplitIds();
    const sub = DeviceEventEmitter.addListener('sharedSplitsUpdated', loadSavedSplitIds);
    return () => sub.remove();
  }, [loadSavedSplitIds]);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    const unsub = firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(doc => {
        if (doc.exists) {
          setCurrentUserRole(doc.data()?.role || 'member');
        }
      });
    return unsub;
  }, []);

  const triggerShake = useCallback((anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: -8, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 8, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -6, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -3, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: ANIM_INSTANT, useNativeDriver: true }),
    ]).start();
  }, []);

  const MAX_SHARED = 3;

  const handleSaveSplit = async (msgId: string, split: any, user: any) => {
    try {
      const normalizedSplit = normalizeWorkoutPlan(split);
      if (!normalizedSplit) {
        Alert.alert('Save Failed', 'This split is missing required details.');
        return;
      }
      const stored = await AsyncStorage.getItem('sharedSplits');
      const list = normalizeSharedSplitList(stored ? JSON.parse(stored) : []);
      const existing = list.findIndex((s: any) => s.msgId === msgId);
      const msgRef = firestore()
        .collection('channels')
        .doc(props.channelId)
        .collection('messages')
        .doc(msgId);

      if (existing !== -1) {
        const updated = list.filter((_: any, i: number) => i !== existing);
        await AsyncStorage.setItem('sharedSplits', JSON.stringify(updated));
        await saveSharedSplits(updated);
        await removeSharedSplit(msgId);
        setSavedSplitMsgIds(ids => ids.filter(id => id !== msgId));
        await msgRef.update({ saveCount: firestore.FieldValue.increment(-1) });
        DeviceEventEmitter.emit('sharedSplitsUpdated');
        return;
      }

      if (list.length >= MAX_SHARED) {
        setSaveErrorId(msgId);
        triggerShake(splitShakeAnim);
        if (saveErrorTimer.current) clearTimeout(saveErrorTimer.current);
        saveErrorTimer.current = setTimeout(() => setSaveErrorId(null), 1500);
        return;
      }

      const newSplit = {
        id: msgId,
        msgId,
        split: normalizedSplit,
        fromName: `${user.firstName || 'User'} ${
          user.lastName?.charAt(0) || ''
        }.`,
        fromPic: user.profilePicUrl || '',
        savedAt: Date.now(),
      };
      const updated = normalizeSharedSplitList([...list, newSplit]);
      await AsyncStorage.setItem('sharedSplits', JSON.stringify(updated));
      await saveSharedSplits(updated);
      await addSharedSplit(newSplit);
      setSavedSplitMsgIds(ids => [...ids, msgId]);
      await msgRef.update({ saveCount: firestore.FieldValue.increment(1) });
      DeviceEventEmitter.emit('sharedSplitsUpdated');
      Alert.alert('Split saved!', 'Find it under "Shared with me" in Calendar.');
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Could not save split.');
    }
  };

  const handleLongPress = useCallback(
    (msgId: string, userId: string) => {
      const currentUserId = auth().currentUser?.uid;
      const canDelete = currentUserRole === 'moderator' || userId === currentUserId;
      const canReport = userId !== currentUserId;
      const canPin = currentUserRole === 'moderator';
      if (!canDelete && !canReport && !canPin) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActionTargetId(msgId);
      wiggleAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(wiggleAnim, {
            toValue: 1,
            duration: ANIM_WIGGLE,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(wiggleAnim, {
            toValue: -1,
            duration: ANIM_WIGGLE,
            useNativeDriver: true,
            isInteraction: false,
          }),
        ])
      ).start();
    },
    [currentUserRole]
  );

  const stopActions = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    wiggleAnim.stopAnimation();
    wiggleAnim.setValue(0);
    setActionTargetId(null);
  }, []);

  const pinMessage = async (msgId: string, pinned: boolean) => {
    await firestore()
      .collection('channels')
      .doc(props.channelId)
      .collection('messages')
      .doc(msgId)
      .update(
        pinned
          ? { pinned: false, pinnedAt: firestore.FieldValue.delete() }
          : { pinned: true, pinnedAt: firestore.FieldValue.serverTimestamp() }
      );
    stopActions();
  };

  const confirmDelete = (msgId: string) => {
    Alert.alert('Delete Message', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel', onPress: stopActions },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await firestore()
            .collection('channels')
            .doc(props.channelId)
            .collection('messages')
            .doc(msgId)
            .delete();
          stopActions();
        },
      },
    ]);
  };

  const openReportMessage = useCallback(
    (item: any) => {
      setReportReason(MESSAGE_REPORT_REASONS[0]);
      setReportDetails('');
      setReportTargetMessage(item);
      stopActions();
    },
    [stopActions],
  );

  const submitReportMessage = useCallback(async () => {
    if (!auth().currentUser?.uid || !reportTargetMessage?.id) {
      return;
    }
    await submitMessageReport({
      channelId: props.channelId,
      messageId: reportTargetMessage.id,
      messageText: reportTargetMessage?.split?.name || 'Shared split',
      reportedBy: auth().currentUser?.uid || '',
      targetUserId: reportTargetMessage.userId,
      reason: reportReason,
      details: reportDetails,
      source: 'SplitSharingChannel',
    });
    await hideContent(reportTargetMessage.id);
    setReportTargetMessage(null);
    setReportDetails('');
    setReportReason(MESSAGE_REPORT_REASONS[0]);
    Alert.alert('Reported', 'Thanks — reports are reviewed as soon as possible.');
  }, [props.channelId, reportDetails, reportReason, reportTargetMessage, hideContent]);

  const renderCustomMessage = useCallback(
    ({
      item,
      index: _index,
      isLast,
      isOwnMessage,
      showUnreadHere,
      user,
      addReaction,
      openReactionPicker,
    }: CustomRenderParams) => {
      if (!item.split) return null;
      const currentUserId = auth().currentUser?.uid || '';
      const canDelete =
        currentUserRole === 'moderator' || item.userId === currentUserId;
      const canPin = currentUserRole === 'moderator';
      const canReport = item.userId !== currentUserId;
      return (
        <>
          {showUnreadHere && (
            <View style={styles.unreadMarkerRow}>
              <View style={styles.unreadMarker}>
                <Text style={styles.unreadMarkerText}>New Messages</Text>
              </View>
            </View>
          )}
          <View
            style={[
              styles.messageContainer,
              isOwnMessage
                ? { alignItems: 'flex-end', alignSelf: 'flex-end' }
                : { alignItems: 'flex-start', alignSelf: 'flex-start' },
                isLast && styles.lastMessagePadding,
            ]}
          >
            <TouchableOpacity
              onLongPress={() => handleLongPress(item.id, item.userId)}
              delayLongPress={400}
              activeOpacity={1}
              style={{
                transform:
                  actionTargetId === item.id
                    ? [{
                        rotate: wiggleAnim.interpolate({
                          inputRange: [-1, 1],
                          outputRange: ['-2deg', '2deg'],
                        }),
                      }]
                    : undefined,
              }}
            >
              <SplitShareBubble
                item={{ ...item, user }}
                onSave={() => handleSaveSplit(item.id, item.split, user)}
                error={saveErrorId === item.id}
                anim={splitShakeAnim}
                saved={savedSplitMsgIds.includes(item.id)}
                isOwn={isOwnMessage}
                onUserPreview={
                  isOwnMessage ? undefined : () => setPreviewUserId(item.userId)
                }
              />
              {item.pinned && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pinnedIconWrap,
                    isOwnMessage && styles.pinnedIconOwn,
                  ]}
                >
                  <FontAwesome name="thumb-tack" size={18} color={colors.gold} />
                </Animated.View>
              )}
            </TouchableOpacity>
            {actionTargetId !== item.id && (
              <View
                style={[
                  styles.reactionRow,
                  isOwnMessage ? styles.reactionRowOwn : styles.reactionRowOther,
                ]}
              >
                <View style={styles.saveCountWrap}>
                  <Ionicons name="bookmark" size={14} color={colors.accent} />
                  <Text style={styles.saveCountText}>{item.saveCount ?? 0}</Text>
                </View>
                  {Array.from(new Set((item.reactions || []).map(r => r.emoji))).map(emoji => {
                    const count = (item.reactions || []).filter(r => r.emoji === emoji).length;
                    const userReacted = (item.reactions || []).some(
                      r => r.emoji === emoji && r.userId === currentUserId,
                    );
                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[styles.reactionBubble, userReacted && styles.reactionHighlight]}
                        onPress={() => {
                          if (!isOwnMessage) addReaction(emoji);
                        }}
                        disabled={isOwnMessage}
                        activeOpacity={0.6}
                      >
                        <Text style={{ fontSize: 15 }}>{emoji}</Text>
                        <Text style={{ fontSize: 10, color: '#666', marginLeft: 2 }}>{count}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {!isOwnMessage && !(item.reactions || []).some(r => r.userId === currentUserId) && (
                    <TouchableOpacity onPress={openReactionPicker} style={[styles.reactionBubble, styles.reactionAddBtn]}>
                      <Ionicons name="add-circle-outline" size={18} color="#888" />
                    </TouchableOpacity>
                  )}
              </View>
            )}
            {actionTargetId === item.id && (
              <>
                <Pressable style={StyleSheet.absoluteFill} onPress={stopActions} />
                <View
                  style={[
                    styles.actionButtons,
                    isOwnMessage && styles.actionButtonsOwn,
                  ]}
                >
                  {canPin && (
                    <Pressable onPress={() => pinMessage(item.id, item.pinned)} style={styles.actionBtn}>
                      <FontAwesome name="thumb-tack" size={22} color={colors.gold} />
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable onPress={() => confirmDelete(item.id)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={22} color={colors.delete} />
                    </Pressable>
                  )}
                  {canReport && (
                    <Pressable
                      onPress={() => openReportMessage(item)}
                      style={styles.reportMessageBtn}
                    >
                      <Text style={styles.reportMessageBtnText}>Report</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </>
      );
    },
    [
      actionTargetId,
      currentUserRole,
      handleLongPress,
      handleSaveSplit,
      openReportMessage,
      saveErrorId,
      savedSplitMsgIds,
      splitShakeAnim,
      stopActions,
      wiggleAnim,
    ],
  );

  return (
    <>
      <AllChannels {...props} readOnly={true} renderCustomMessage={renderCustomMessage} />
      <UserPreviewModal
        visible={!!previewUserId}
        userId={previewUserId || ''}
        onClose={() => setPreviewUserId(null)}
      />
      {reportTargetMessage && (
        <Modal
          transparent
          animationType="fade"
          visible={!!reportTargetMessage}
          onRequestClose={() => setReportTargetMessage(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setReportTargetMessage(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.reportModal}
              onPress={() => {}}
            >
              <Text style={styles.reportModalTitle}>Report Message</Text>
              <View style={styles.reasonList}>
                {MESSAGE_REPORT_REASONS.map(reasonOption => {
                  const selected = reasonOption === reportReason;
                  return (
                    <Pressable
                      key={reasonOption}
                      onPress={() => setReportReason(reasonOption)}
                      style={[
                        styles.reasonOption,
                        selected && styles.reasonOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonOptionText,
                          selected && styles.reasonOptionTextSelected,
                        ]}
                      >
                        {reasonOption}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={styles.reportDetailsInput}
                placeholder="Optional details"
                placeholderTextColor={colors.gray}
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                maxLength={300}
              />
              <View style={styles.reportActionsRow}>
                <Pressable
                  onPress={() => setReportTargetMessage(null)}
                  style={styles.reportCancelBtn}
                >
                  <Text style={styles.reportCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submitReportMessage}
                  style={styles.reportSubmitBtn}
                >
                  <Text style={styles.reportSubmitBtnText}>Submit</Text>
                </Pressable>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  splitBubble: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 2,
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
    marginBottom: 8,
    marginTop: 2,
    marginHorizontal: 2,
  },
  ownSplitBubble: {
    backgroundColor: colors.purple,
  },
  pinnedBubble: {
    borderWidth: 4,
    borderColor: colors.accent,
    shadowColor: colors.goldGlow,
    shadowOpacity: 1.0,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  splitContainer: {
    marginHorizontal: 8,
    marginVertical: 10,
  },
  splitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitMetaRowOwn: {
    justifyContent: 'flex-end',
    marginRight: 8,
  },
  splitMetaRowOther: {
    marginLeft: 8,
  },
  userPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitUser: {
    fontWeight: 'bold',
    color: colors.purple,
    fontSize: 12,
    fontWeight: 'bold',
  },
  splitTime: { fontSize: 10, color: colors.purple, marginRight: 14, marginBottom: 6, marginTop: -16 },
  splitTimeOwn: { color: colors.white },
  splitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  splitTitle: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: -1,
  },
  splitNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textDark,
    flexShrink: 1,
    marginLeft: 4,
    marginTop: 3,
    textAlign: 'center',
  },
  dayCard: {
    backgroundColor: colors.grayLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingBottom: 4,
    paddingTop: 1,
    marginRight: 26,
    marginLeft: -6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTitle: {
    fontWeight: 'bold',
    color: colors.black,
    fontSize: 20,
    textAlign: 'center',
  },
  dayNotes: {
    fontSize: 12,
    color: colors.textDark,
    fontStyle: 'italic',
    flexShrink: 1,
    marginLeft: 4,
    marginTop: 6,
    textAlign: 'center',
  },
  noLiftsText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.gray,
    marginTop: 6,
  },
  liftCategory: {
    fontWeight: 'bold',
    color: colors.textDark,
  },
  headRatingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  headRatingItem: { flexDirection: 'row', alignItems: 'center', marginRight: 6, fontStyle: 'italic' },
  headRatingText: { fontSize: 10, color: colors.textDark, fontStyle: 'italic' },
  liftsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  liftBadge: {
    backgroundColor: colors.grayOutline,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 3,
    marginBottom: 8,
  },
  liftBadgeText: { fontSize: 10, color: colors.textDark },
  moreLifts: { fontSize: 12, color: colors.gray, marginTop: 4 },
  dayDotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -20,
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveIconBtn: {
    position: 'absolute',
    left: 8,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  saveIconSaved: {
    backgroundColor: colors.white,
    shadowOpacity: 0.25,
  },
  saveErrorTxt: {
    color: colors.error,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  ownSplitLabel: {
    color: colors.purple,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  messageContainer: {
    marginBottom: 5.5,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 3,
    },
  reactionRowOther: {
    alignSelf: 'flex-start',
    marginLeft: 16,
  },
  reactionRowOwn: {
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  reactionHighlight: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  saveCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  saveCountText: { fontSize: 10, color: colors.gray, marginLeft: 2 },
  reactionAddBtn: {
    backgroundColor: colors.white,
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    position: 'absolute',
    flexDirection: 'row',
    bottom: 10,
    left: 0,
    right: 0,
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  actionButtonsOwn: { bottom: -22 },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reportMessageBtn: {
    minWidth: 96,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.delete,
  },
  reportMessageBtnText: {
    color: colors.delete,
    fontSize: 12,
    fontWeight: '700',
  },
  pinnedIconWrap: { position: 'absolute', top: 18, alignSelf: 'center', zIndex: 5 },
  pinnedIconOwn: { top: 0 },
  unreadMarkerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  unreadMarker: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  unreadMarkerText: {
    color: colors.textDark,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  profilePic: {
    width: 19,
    height: 18,
    borderRadius: 15,
    marginRight: 7,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModal: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    width: '86%',
    maxWidth: 360,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 12,
  },
  reasonList: {
    marginBottom: 10,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: '#fff6d6',
  },
  reasonOptionText: {
    color: colors.textDark,
    fontSize: 14,
  },
  reasonOptionTextSelected: {
    color: colors.black,
    fontWeight: '700',
  },
  reportDetailsInput: {
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 8,
    minHeight: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textDark,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  reportActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  reportCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  reportCancelBtnText: {
    color: colors.gray,
    fontWeight: '600',
  },
  reportSubmitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  reportSubmitBtnText: {
    color: colors.black,
    fontWeight: '700',
  },
  /** Extra space below the final message */
  lastMessagePadding: {
    marginBottom: 40,
  },
});

export default SplitSharingChannel;
