import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  chatStyles,
  JUMP_BUTTON_OFFSET,
  useChatInputBarHeight,
} from '../channels/AllChannels';
import ProfileImage from '../components/ProfileImage';
import UserPreviewModal from '../components/UserPreviewModal';
import WhiteBackgroundWrapper from '../components/WhiteBackgroundWrapper';
import { auth, firestore } from '../firebase/firebase';
import { MESSAGE_REPORT_REASONS, submitMessageReport } from '../firebase/reportHelpers';
import { useLastReadDM } from '../firebase/userChatReadHelpers';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import { useKeyboardAnimation } from '../hooks/useKeyboardAnimation';
import { useBlockedUserIds } from '../hooks/useBlockedUserIds';
import { useReportedUserIds } from '../hooks/useReportedUserIds';
import { colors } from '../theme';
import { dedupeById } from '../utils/dedupeById';
import { formatDisplayName } from '../utils/displayName';

const EMOJI_LIST = ['💪', '🔥', '😂', '👏', '😎', '🥇', '😍'];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTION_SPACING = 60;

const formatTimestamp = (ts: any) => {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};


const DMChatScreen = ({ navigation, route }) => {
  const { threadId, otherUser = {}, onBack } = route.params || {};
  const handleBack = onBack || navigation.goBack;
  const { profilePicUrl = '', firstName = 'User', lastName = '' } = otherUser as any;
  const displayName = formatDisplayName(firstName, lastName);
  const currentUserId = auth().currentUser?.uid;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showJump, setShowJump] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const inputBarHeight = useChatInputBarHeight();
  const currentUser = useCurrentUserDoc();
  const [keyboardOffset, keyboardHeight] = useKeyboardAnimation(20);
  const timeoutMs = currentUser?.timeoutUntil
    ? (typeof currentUser.timeoutUntil.toMillis === 'function'
        ? currentUser.timeoutUntil.toMillis()
        : currentUser.timeoutUntil) - Date.now()
    : 0;
  const isTimedOut = timeoutMs > 0;
  const hLeft = Math.floor(timeoutMs / 3600000);
  const mLeft = Math.floor((timeoutMs % 3600000) / 60000);
  const flatListRef = useRef<FlatList<any>>(null);
  const isAtBottomRef = useRef(true);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [reportTargetMessage, setReportTargetMessage] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState<(typeof MESSAGE_REPORT_REASONS)[number]>(MESSAGE_REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const { blockedSet } = useBlockedUserIds();
  const { reportedUserSet } = useReportedUserIds();
  const [localBlockedIds, setLocalBlockedIds] = useState<string[]>([]);
  const scrollToLatest = (animated: boolean = true) => {
    if (flatListRef.current && visibleMessages.length > 0) {
      try {
        flatListRef.current.scrollToIndex({
          index: visibleMessages.length - 1,
          animated,
        });
      } catch (err) {
        flatListRef.current.scrollToEnd({ animated });
      }
    }
    isAtBottomRef.current = true;
  };
  const visibleMessages = React.useMemo(() => messages.filter((m: any) => {
    const userId = String(m.userId || '');
    return !blockedSet.has(userId) && !reportedUserSet.has(userId) && !localBlockedIds.includes(userId);
  }), [messages, blockedSet, reportedUserSet, localBlockedIds]);
  const latestMessageId = visibleMessages.length ? visibleMessages[visibleMessages.length - 1]?.id : null;
  const latestMessageUserId = visibleMessages.length
    ? visibleMessages[visibleMessages.length - 1]?.userId
    : null;
  const [showNewMarker, setShowNewMarker] = useState(false);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const [lastReadDM, markAsReadDM] = useLastReadDM(threadId);
  const initialLastReadLoaded = useRef(false);
  const initialScrollDone = useRef(false);
  const prevMessagesRef = useRef<any[]>([]);

  useEffect(() => {
    initialLastReadLoaded.current = false;
    initialScrollDone.current = false;
    setLastReadMessageId(null);
    isAtBottomRef.current = true;
    setShowJump(false);
    setShowNewMarker(false);
  }, [threadId]);

  useEffect(() => {
    if (threadId) {
      markAsReadDM(latestMessageId || '', Date.now());
    }
  }, [threadId]);
  
  useEffect(() => {
    if (!initialLastReadLoaded.current && lastReadDM) {
      setLastReadMessageId(lastReadDM.messageId);
      initialLastReadLoaded.current = true;
    }
  }, [lastReadDM, threadId]);

  useEffect(() => {
    if (!threadId) return;
    setLoading(true);
    const unsub = firestore()
      .collection('dms')
      .doc(threadId)
      .collection('messages')
      // Load newest messages first
      .orderBy('timestamp', 'desc')
      .onSnapshot(snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const ordered = dedupeById(msgs.reverse());
        setMessages(ordered);
        setLoading(false);
        if (isAtBottomRef.current) {
          const lastId = ordered.length ? ordered[ordered.length - 1].id : null;
          if (lastId) {
            markAsReadDM(lastId, Date.now());
          }
          scrollToLatest(false);
        }
      });
    return unsub;
  }, [threadId]);

  useEffect(() => {
    return () => {
      if (latestMessageId) {
        markAsReadDM(latestMessageId, Date.now());
      }
    };
  }, [threadId, latestMessageId]);
  
  useEffect(() => {
    if (!visibleMessages.length) return;
    if (!initialScrollDone.current) {
      scrollToLatest(false);
      initialScrollDone.current = true;
      prevMessagesRef.current = visibleMessages;
      return;
    }

    const prevMessages = prevMessagesRef.current;
    const prevLastMessage =
      prevMessages.length > 0 ? prevMessages[prevMessages.length - 1] : null;
    const currentLastMessage =
      visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null;
    const hasNewMessage =
      visibleMessages.length > prevMessages.length ||
      (!!currentLastMessage && !prevLastMessage) ||
      (!!currentLastMessage &&
        !!prevLastMessage &&
        currentLastMessage.id !== prevLastMessage.id);

    if (
      hasNewMessage &&
      visibleMessages.length > 0 &&
      lastReadMessageId &&
      latestMessageId !== lastReadMessageId &&
      latestMessageUserId !== currentUserId &&
      !isAtBottomRef.current
    ) {
      setShowNewMarker(true);
    }

    if (hasNewMessage && currentLastMessage) {
      if (currentLastMessage.userId === currentUserId) {
        scrollToLatest(true);
      } else if (isAtBottomRef.current) {
        scrollToLatest(false);
      }
    }

    prevMessagesRef.current = visibleMessages;
  }, [visibleMessages, currentUserId, latestMessageUserId, lastReadMessageId, latestMessageId]);

  const handleScroll = (e: any) => {
    const yOffset = e.nativeEvent.contentOffset.y;
    const contentHeight = e.nativeEvent.contentSize.height;
    const layoutHeight = e.nativeEvent.layoutMeasurement.height;
    const threshold = 90;
    const isAtBottom = contentHeight - layoutHeight - yOffset < threshold;
    isAtBottomRef.current = isAtBottom;
    setShowJump(!isAtBottom);
    if (isAtBottom && latestMessageId) {
      setShowNewMarker(false);
      setLastReadMessageId(latestMessageId);
      markAsReadDM(latestMessageId, Date.now());
    }
  };

  const handleJumpToBottom = () => {
    scrollToLatest(true);
    isAtBottomRef.current = true;
    setShowJump(false);
    setShowNewMarker(false);
    if (latestMessageId) {
      setLastReadMessageId(latestMessageId);
      markAsReadDM(latestMessageId, Date.now());
    }
  };

  const firstUnreadIndex = visibleMessages.findIndex(m => m.id === lastReadMessageId);
  const hasUnreadMarker = showNewMarker && firstUnreadIndex !== -1 && firstUnreadIndex < visibleMessages.length - 1;

  const handleSend = async () => {
    if (isTimedOut) {
      Alert.alert('Timed Out', `You cannot send messages for ${hLeft}h ${mLeft}m.`);
      return;
    }
    const trimmedText = text.trim();
    if (!trimmedText) return;
    const otherUid = otherUser?.uid;
    // Ensure thread document exists so DM inbox can list it
    await firestore()
      .collection('dms')
      .doc(threadId)
      .set(
        {
          participants: [currentUserId, otherUid],
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    await firestore().collection('dms').doc(threadId).collection('messages').add({
      userId: currentUserId,
      text: trimmedText,
      timestamp: firestore.FieldValue.serverTimestamp(),
      reactions: [],
      mediaUrl: '',
    });
    setText('');
    scrollToLatest(true);
  };

  const handleAddReaction = async (msgId: string, emoji: string) => {
    const msgRef = firestore()
      .collection('dms')
      .doc(threadId)
      .collection('messages')
      .doc(msgId);
    const doc = await msgRef.get();
    if (!doc.exists) return;
    const messageUserId = doc.data().userId;
    if (messageUserId === currentUserId) return;
    const reactions = doc.data().reactions || [];
    const existing = reactions.find(r => r.userId === currentUserId);
    let newReactions;
    if (existing) {
      if (existing.emoji === emoji) {
        newReactions = reactions.filter(r => r.userId !== currentUserId);
      } else {
        newReactions = reactions.map(r =>
          r.userId === currentUserId ? { emoji, userId: currentUserId } : r,
        );
      }
    } else {
      newReactions = [...reactions, { emoji, userId: currentUserId }];
    }
    await msgRef.update({ reactions: newReactions });
  };

  const stopActions = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActionTargetId(null);
  }, []);

  const openReportMessage = useCallback((item: any) => {
    setReportReason(MESSAGE_REPORT_REASONS[0]);
    setReportDetails('');
    setReportTargetMessage(item);
    stopActions();
  }, [stopActions]);

  const submitReport = useCallback(async () => {
    if (!currentUserId || !reportTargetMessage?.id || !reportTargetMessage?.userId) return;
    await submitMessageReport({
      dmThreadId: threadId,
      messageId: reportTargetMessage.id,
      messageText: reportTargetMessage.text,
      reportedBy: currentUserId,
      targetUserId: reportTargetMessage.userId,
      reason: reportReason,
      details: reportDetails,
      source: 'DMChat',
    });
    setReportTargetMessage(null);
    setReportDetails('');
    setReportReason(MESSAGE_REPORT_REASONS[0]);
    Alert.alert('Reported', 'Thanks — reviewed within 24 hours.');
  }, [currentUserId, reportDetails, reportReason, reportTargetMessage, threadId]);

  const confirmDelete = (msgId: string) => {
    Alert.alert('Delete Message?', 'Do you want to delete this message?', [
      { text: 'Cancel', style: 'cancel', onPress: stopActions },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await firestore()
            .collection('dms')
            .doc(threadId)
            .collection('messages')
            .doc(msgId)
            .delete();
          stopActions();
        },
      },
    ]);
  };

  return (
    <>
    <WhiteBackgroundWrapper padTop={false} padBottom={false} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="chevron-back" size={32} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPreviewUserId(otherUser?.uid)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <ProfileImage uri={profilePicUrl} style={styles.avatar} />
          <Text style={styles.headerText}>{displayName}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 4 }}>
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={visibleMessages}
                keyExtractor={item => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={() => { if (isAtBottomRef.current) scrollToLatest(false); }}
                  renderItem={({ item, index }) => {
                    const isMe = item.userId === currentUserId;
                    const showUnreadHere = hasUnreadMarker && index === firstUnreadIndex + 1;
                    const reactions = item.reactions || [];
                    const formattedTime = formatTimestamp(item.timestamp);
                    const canAddReaction = !isMe;
                    const showReactionsRow =
                      actionTargetId !== item.id &&
                      (reactions.length > 0 || canAddReaction);
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
                    actionTargetId === item.id && {
                      marginBottom: ACTION_SPACING,
                      marginTop: ACTION_SPACING / 2,
                    },
                  ]}
                >
                  <Pressable
                    onLongPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setActionTargetId(item.id);
                    }}
                  >
                    <View
                      style={[
                        styles.messageBox,
                        isMe && styles.myMessageBox,
                        showReactionsRow && { marginBottom: 2 },
                      ]}
                    >
                      <View style={styles.metaRow}>
                        {isMe ? (
                          <ProfileImage
                            uri={currentUser?.profilePicUrl || ''}
                            style={styles.profilePic}
                            isCurrentUser
                          />
                        ) : (
                          <TouchableOpacity
                            onPress={() => setPreviewUserId(otherUser?.uid)}
                            activeOpacity={0.8}
                          >
                            <ProfileImage
                              uri={profilePicUrl}
                              style={styles.profilePic}
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => setPreviewUserId(otherUser?.uid)}
                          disabled={isMe}
                        >
                          <Text
                            style={[styles.username, isMe && styles.myUsername]}
                          >
                            {isMe ? 'Me' : displayName}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={[styles.messageText, isMe && styles.myMessageText]}
                      >
                        {item.text}
                      </Text>
                      <View
                        style={[
                          styles.footerContainer,
                          showReactionsRow
                            ? styles.footerContainerWithReactions
                            : undefined,
                        ]}
                      >
                        {showReactionsRow && (
                          <View style={[styles.reactionRow, styles.reactionRowWrapper]}>
                            {Array.from(new Set(reactions.map(r => r.emoji))).map(
                              emoji => {
                                const count = reactions.filter(
                                  r => r.emoji === emoji,
                                ).length;
                                const userReacted = reactions.some(
                                  r =>
                                    r.emoji === emoji &&
                                    r.userId === currentUserId,
                                );
                                return (
                                  <TouchableOpacity
                                    key={emoji}
                                    style={[
                                      styles.reactionBubble,
                                      userReacted && styles.reactionHighlight,
                                    ]}
                                    onPress={() =>
                                      !isMe && handleAddReaction(item.id, emoji)
                                    }
                                    disabled={isMe}
                                    activeOpacity={0.6}
                                  >
                                    <Text style={{ fontSize: 15 }}>{emoji}</Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: '#666',
                                        marginLeft: 2,
                                      }}
                                    >
                                      {count}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              },
                            )}
                            {canAddReaction && (
                              <TouchableOpacity
                                onPress={() => setReactionTargetId(item.id)}
                                style={[styles.reactionBubble, styles.reactionAddBtn]}
                              >
                                <Icon
                                  name="add-circle-outline"
                                  size={18}
                                  color="#888"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                        <View style={styles.footerMeta}>
                          <Text
                            style={[styles.timestamp, isMe && styles.myTimestamp]}
                          >
                            {formattedTime}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                  {actionTargetId === item.id && (
                    <>
                      <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={stopActions}
                      />
                      <View style={styles.actionButtons}>
                        {item.userId === currentUserId ? (
                          <Pressable onPress={() => confirmDelete(item.id)} style={styles.actionBtn}>
                            <Icon name="trash-outline" size={22} color={colors.delete} />
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => openReportMessage(item)} style={styles.actionBtn}>
                            <Icon name="flag-outline" size={22} color={colors.warn} />
                          </Pressable>
                        )}
                      </View>
                    </>
                  )}
                </View>

            </>
          );
        }}
        contentContainerStyle={{ padding: 10, paddingBottom: 8 }}
        ListFooterComponent={<View style={{ height: inputBarHeight + keyboardHeight }} />}
              />
            )}
            {!loading && showJump && (
              <AnimatedTouchable
                style={[
                  styles.jumpToBottomBtn,
                  { bottom: Animated.add(keyboardOffset, inputBarHeight + JUMP_BUTTON_OFFSET) },
                ]}
                onPress={handleJumpToBottom}
                activeOpacity={0.88}
              >
                <Icon name="arrow-down-circle" size={24} color={colors.white} />
                <Text style={styles.jumpBtnText}>Jump to latest</Text>
                {showNewMarker && <View style={styles.newBadge} />}
              </AnimatedTouchable>
            )}
            {reactionTargetId && (
              <Modal
                transparent
                animationType="fade"
                visible={!!reactionTargetId}
                onRequestClose={() => setReactionTargetId(null)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setReactionTargetId(null)}
                >
                  <View style={styles.emojiPicker}>
                    <View style={styles.emojiRow}>
                      {EMOJI_LIST.map(e => (
                        <TouchableOpacity
                          key={e}
                          style={styles.emojiBtn}
                          onPress={() => {
                            handleAddReaction(reactionTargetId, e);
                            setReactionTargetId(null);
                          }}
                        >
                          <Text style={styles.emojiText}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setReactionTargetId(null)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}

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
                  <TouchableOpacity activeOpacity={1} style={styles.reportModal} onPress={() => {}}>
                    <Text style={styles.reportModalTitle}>Report Message</Text>
                    <View style={styles.reasonList}>
                      {MESSAGE_REPORT_REASONS.map(reasonOption => {
                        const selected = reasonOption === reportReason;
                        return (
                          <Pressable
                            key={reasonOption}
                            onPress={() => setReportReason(reasonOption)}
                            style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
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
                      <Pressable onPress={submitReport} style={styles.reportSubmitBtn}>
                        <Text style={styles.reportSubmitBtnText}>Submit</Text>
                      </Pressable>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            )}
          </View>
          <Animated.View style={[styles.inputRow, isTimedOut && styles.disabledRow, { marginBottom: keyboardOffset }]}>
            <TextInput
              style={[styles.input, isTimedOut && styles.disabledInput]}
              value={text}
              onChangeText={setText}
              editable={!isTimedOut}
              placeholder={isTimedOut ? `Timed out for ${hLeft}h ${mLeft}m` : 'Type a message…'}
              placeholderTextColor={isTimedOut ? colors.gray : '#aaa'}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={styles.sendBtn}
              activeOpacity={0.85}
              disabled={isTimedOut}
            >
              <LinearGradient
                colors={[colors.accent, colors.accent]}
                style={styles.sendBtnGradient}
              >
                <Icon name="arrow-up" size={22} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      </View>
    </WhiteBackgroundWrapper>
    <UserPreviewModal
      visible={!!previewUserId}
      userId={previewUserId || ''}
      onClose={() => setPreviewUserId(null)}
      onUserBlocked={(blockedUserId: string) => {
        setLocalBlockedIds(prev => (prev.includes(blockedUserId) ? prev : [...prev, blockedUserId]));
      }}
    />
    </>
  );
};

const localStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: colors.grayLight,
  },
  headerText: {
    color: colors.textDark,
    fontWeight: 'bold',
    fontSize: 19,
    marginLeft: 9,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#f6e3ff',
  },
  disabledRow: {
    backgroundColor: colors.grayLight,
  },
  disabledInput: {
    color: colors.gray,
  },
});

const styles = { ...chatStyles, ...localStyles };

export default DMChatScreen;
