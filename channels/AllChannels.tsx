import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BadgeImage from "../components/BadgeImage";
import ChannelWrapper from "../components/ChannelWrapper";
import ProfileImage from "../components/ProfileImage";
import UserPreviewModal from "../components/UserPreviewModal";
import { ROLE_COLORS, ROLE_TAGS } from "../constants/roles";
import { awardStreakXP, awardXP } from "../firebase/chatXPHelpers";
import { auth, firestore } from "../firebase/firebase";
import { useLastRead } from "../firebase/userChatReadHelpers";
import { useCurrentUserDoc } from "../hooks/useCurrentUserDoc";
import { useKeyboardAnimation } from "../hooks/useKeyboardAnimation";
import { colors, fonts, gradients } from "../theme";
import { ANIM_BUTTON_POP, ANIM_SHORT, ANIM_WIGGLE } from "../utils/animations";
import { getChatLevelColor } from "../utils/chatLevel";
import { dedupeById } from "../utils/dedupeById";

import {
  enforceSelectedBadges,
  MAX_DISPLAY_BADGES,
} from "../badges/UnlockableBadges";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const EMOJI_LIST = ["💪", "🔥", "😂", "👏", "😎", "🥇", "😍"];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function parseSelectedBadges(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") return Object.values(val);
  return [];
}

function parseBadges(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") return Object.values(val);
  return [];
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTION_SPACING = 60;

// Vertical offset for the "Jump to Latest" button
export const JUMP_BUTTON_OFFSET = 80;

type UserInfo = {
  firstName: string;
  lastName: string;
  role: string;
  chatLevel?: number;
  profilePicUrl?: string;
  bio?: string;
  badges?: string[];
  socials?: any;
  selectedBadges?: string[];
};
type UserMap = {
  [key: string]: UserInfo;
};
export type CustomRenderParams = {
  item: any;
  index: number;
  /** True when this is the most recent message */
  isLast: boolean;
  isOwnMessage: boolean;
  showUnreadHere: boolean;
  user: UserInfo | undefined;
  addReaction: (emoji: string) => void;
  openReactionPicker: () => void;
};

type ChatScreenProps = {
  channelId: string;
  channelName: string;
  isActive?: boolean;
  onHeightChange?: (height: number) => void;
  readOnly?: boolean;
  renderCustomMessage?: (
    params: CustomRenderParams,
  ) => React.ReactElement | null;
  onPinnedMessagesChange?: (msgs: any[]) => void;
  onRegisterScrollToMessage?: (fn: (id: string) => void) => void;
};
export function useChatInputBarHeight() {
  const insets = useSafeAreaInsets();
  return 32 + (insets?.bottom || 0);
}
// Use solid black background per MASS Monster theme
const BG_GRADIENT = gradients.chat;

const formatTimestamp = (ts: any) => {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate())} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const AllChannels: React.FC<ChatScreenProps> = ({
  channelId,
  channelName,
  isActive = true,
  readOnly = false,
  renderCustomMessage,
  onPinnedMessagesChange,
  onRegisterScrollToMessage,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [text, setText] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const currentUser = useCurrentUserDoc();
  const timeoutMs = currentUser?.timeoutUntil
    ? (typeof currentUser.timeoutUntil.toMillis === "function"
        ? currentUser.timeoutUntil.toMillis()
        : currentUser.timeoutUntil) - Date.now()
    : 0;
  const isTimedOut = timeoutMs > 0;
  const hLeft = Math.floor(timeoutMs / 3600000);
  const mLeft = Math.floor((timeoutMs % 3600000) / 60000);
  const [showJump, setShowJump] = useState(false);
  const [showNewMarker, setShowNewMarker] = useState(false);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(
    null,
  );
  const [lastRead, markAsRead] = useLastRead(channelId);
  const initialLastReadLoaded = useRef(false);
  const initialScrollDone = useRef(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [limitCaption, setLimitCaption] = useState(false);
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const reactionOpacityMap = useRef<Record<string, Animated.Value>>({}).current;
  const prevActionIdRef = useRef<string | null>(null);
  const prevActiveRef = useRef(isActive);
  const userListenersRef = useRef<Record<string, () => void>>({});

  const insets = useSafeAreaInsets();
  const inputBarHeight = useChatInputBarHeight();
  const [keyboardOffset] = useKeyboardAnimation(-10);

  const currentUserId = auth().currentUser?.uid;
  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);

  const scrollToLatest = useCallback((animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
    isAtBottomRef.current = true;
  }, []);

  const scrollToMessage = useCallback(
    (msgId: string | number) => {
      const targetId = String(msgId);
      const index = messages.findIndex((m) => String(m.id) === targetId);
      if (index !== -1 && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: Number(index),
            animated: true,
          });
        } catch (err) {
          console.warn("Failed to scroll to pinned message", err);
        }
      }
    },
    [messages],
  );

  useEffect(() => {
    onRegisterScrollToMessage?.(scrollToMessage);
  }, [scrollToMessage, onRegisterScrollToMessage]);

  const latestMessageId = messages.length
    ? messages[messages.length - 1]?.id
    : null;
  const latestMessageUserId = messages.length
    ? messages[messages.length - 1]?.userId
    : null;

  // Fetch pinned messages
  useEffect(() => {
    if (!channelId) return;
    const unsubscribe = firestore()
      .collection("channels")
      .doc(channelId)
      .collection("messages")
      .where("pinned", "==", true)
      .onSnapshot((snapshot) => {
        if (snapshot && snapshot.docs) {
          const pins = dedupeById(
            snapshot.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: String(doc.id),
                  ...data,
                  timestamp: data.timestamp?.toMillis
                    ? data.timestamp.toMillis()
                    : data.timestamp,
                  pinnedAt: data.pinnedAt?.toMillis
                    ? data.pinnedAt.toMillis()
                    : data.pinnedAt,
                };
              })
              .sort((a, b) => {
                const getMillis = (v: any) =>
                  typeof v === "number"
                    ? v
                    : v?.toMillis
                      ? v.toMillis()
                      : v
                        ? new Date(v).getTime()
                        : 0;
                return getMillis(a.pinnedAt) - getMillis(b.pinnedAt);
              }),
          );
          setPinnedMessages(pins);
          onPinnedMessagesChange?.(pins);
        } else {
          setPinnedMessages([]);
          onPinnedMessagesChange?.([]);
        }
      });
    return unsubscribe;
  }, [channelId]);

  // Fetch messages in real-time
  useEffect(() => {
    if (!channelId) return;
    const unsubscribe = firestore()
      .collection("channels")
      .doc(channelId)
      .collection("messages")
      // Load newest messages first
      .orderBy("timestamp", "desc")
      .onSnapshot((snapshot) => {
        if (snapshot && snapshot.docs) {
          const getMillis = (ts: any) => {
            if (!ts) return Number.MAX_SAFE_INTEGER;
            if (ts.toMillis) return ts.toMillis();
            return new Date(ts).getTime();
          };
          const msgs = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));
          setMessages(dedupeById(msgs));
        } else {
          setMessages([]);
        }
      });
    return unsubscribe;
  }, [channelId]);

  // Fetch user info for every message sender and listen for updates
  useEffect(() => {
    if (!messages.length) return;
    const uniqueUids = [...new Set(messages.map((m) => m.userId))];

    uniqueUids.forEach((uid) => {
      if (!userListenersRef.current[uid]) {
        const userRef = firestore().collection("users").doc(uid);

        // Prefetch data for instant display
        userRef
          .get()
          .then((doc) => {
            if (doc.exists) {
              const data = doc.data() || {};
              setUserMap((prev) => ({
                ...prev,
                [uid]: {
                  ...(prev[uid] || {}),
                  ...data,
                  badges: parseBadges(data.badges),
                  selectedBadges: parseSelectedBadges(data.selectedBadges),
                },
              }));
            }
          })
          .catch((err) => console.error("Failed to fetch user data", err));

        userListenersRef.current[uid] = userRef.onSnapshot((doc) => {
          if (doc.exists) {
            const data = doc.data() || {};
            setUserMap((prev) => ({
              ...prev,
              [uid]: {
                ...(prev[uid] || {}),
                ...data,
                badges: parseBadges(data.badges),
                selectedBadges: parseSelectedBadges(data.selectedBadges),
              },
            }));
          }
        });
      }
    });

    // eslint-disable-next-line
  }, [messages]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = firestore()
      .collection("users")
      .doc(currentUserId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data() || {};
          setCurrentUserRole(data.role || "member");
          setUserMap((prev) => ({
            ...prev,
            [currentUserId]: {
              ...(prev[currentUserId] || {}),
              ...data,
              badges: parseBadges(data.badges),
              selectedBadges: parseSelectedBadges(data.selectedBadges),
            },
          }));
        }
      });
    return unsubscribe;
  }, [currentUserId]);

  // Re-scroll to bottom when additional data changes height of messages
  useEffect(() => {
    if (isActive && messages.length > 0 && isAtBottomRef.current) {
      scrollToLatest(false);
    }
  }, [userMap, pinnedMessages]);

  // Reset state when channel changes
  useEffect(() => {
    initialLastReadLoaded.current = false;
    initialScrollDone.current = false;
    setLastReadMessageId(null);
    isAtBottomRef.current = true;
    setShowJump(false);
    setShowNewMarker(false);
  }, [channelId]);

  useEffect(() => {
    return () => {
      Object.values(userListenersRef.current).forEach((unsub) => unsub());
      userListenersRef.current = {};
    };
  }, [channelId]);

  // Load initial lastRead from Firestore
  useEffect(() => {
    if (!initialLastReadLoaded.current && lastRead) {
      setLastReadMessageId(lastRead.messageId);
      initialLastReadLoaded.current = true;
    }
  }, [lastRead, channelId]);

  // Scroll to latest once messages load initially
  useEffect(() => {
    if (!messages.length || !isActive || initialScrollDone.current) return;
    scrollToLatest(false);
    initialScrollDone.current = true;
  }, [messages, isActive]);

  // Auto-scroll to bottom on initial load, channel change, or when tab becomes active
  useEffect(() => {
    if (isActive && messages.length > 0) {
      scrollToLatest(true);
      setShowJump(false);
      setShowNewMarker(false);
      if (latestMessageId) {
        setLastReadMessageId(latestMessageId);
        markAsRead(latestMessageId, Date.now());
      }
    }
    // eslint-disable-next-line
  }, [channelId, isActive]);

  // Update last read when leaving the channel
  useEffect(() => {
    if (prevActiveRef.current && !isActive && latestMessageId) {
      setLastReadMessageId(latestMessageId);
      markAsRead(latestMessageId, Date.now());
    }
    prevActiveRef.current = isActive;
  }, [isActive, latestMessageId]);

  useEffect(() => {
    return () => {
      if (latestMessageId) {
        markAsRead(latestMessageId, Date.now());
      }
    };
  }, [channelId, latestMessageId]);

  // Ensure we show latest messages when tab becomes active
  useEffect(() => {
    if (isActive) {
      scrollToLatest(false);
    }
  }, [isActive]);

  // When new messages arrive from others, show "new messages" marker if user is not at bottom
  useEffect(() => {
    if (
      messages.length > 0 &&
      lastReadMessageId &&
      latestMessageId !== lastReadMessageId &&
      latestMessageUserId !== currentUserId
    ) {
      setShowNewMarker(true);
    }
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.userId === currentUserId) {
        scrollToLatest(true);
      } else if (isAtBottomRef.current) {
        scrollToLatest(false);
      }
    }
    // eslint-disable-next-line
  }, [
    messages,
    currentUserId,
    latestMessageUserId,
    lastReadMessageId,
    latestMessageId,
  ]);

  // FlatList scroll event: detect if user is not at the bottom
  const handleScroll = (e: any) => {
    const yOffset = e.nativeEvent.contentOffset.y;
    const contentHeight = e.nativeEvent.contentSize.height;
    const layoutHeight = e.nativeEvent.layoutMeasurement.height;
    const threshold = 90;
    const isAtBottom = contentHeight - layoutHeight - yOffset < threshold;
    isAtBottomRef.current = isAtBottom;
    setShowJump(!isAtBottom);
    if (isAtBottom) {
      setShowNewMarker(false);
      if (latestMessageId) {
        setLastReadMessageId(latestMessageId);
        markAsRead(latestMessageId, Date.now());
      }
    }
  };

  const handleJumpToBottom = () => {
    scrollToLatest(true);
    isAtBottomRef.current = true;
    setShowJump(false);
    setShowNewMarker(false);
    if (latestMessageId) {
      setLastReadMessageId(latestMessageId);
      markAsRead(latestMessageId, Date.now());
    }
  };

  // --- MESSAGE SEND LOGIC ---
  const sendMessage = async () => {
    if (isTimedOut) {
      Alert.alert(
        "Timed Out",
        `You cannot send messages for ${hLeft}h ${mLeft}m.`,
      );
      return;
    }
    if (readOnly) {
      Alert.alert(
        "Read Only",
        "You can only share splits here from the Calendar.",
      );
      return;
    }
    if (text.trim() === "") {
      Alert.alert("Empty message", "Please type something to send.");
      return;
    }
    if (!currentUserId) {
      Alert.alert("Not logged in", "Please log in to send messages.");
      return;
    }
    if (!channelId) {
      Alert.alert("No channel selected", "Please select a chat channel.");
      return;
    }

    try {
      // Add message to Firestore
      await firestore()
        .collection("channels")
        .doc(channelId)
        .collection("messages")
        .add({
          userId: currentUserId,
          text: text.trim(),
          timestamp: firestore.FieldValue.serverTimestamp(),
          reactions: [],
          pinned: false,
          mediaUrl: "",
        });
      // Award XP for message (spam-protected)
      await awardXP(currentUserId, "message");
      // Award streak XP (once per day)
      await awardStreakXP(currentUserId);

      setText("");
      scrollToLatest(true);
    } catch (e) {
      console.error("Failed to send message:", e);
      Alert.alert("Send Error", e.message || "Could not send your message.");
    }
  };

  // --- HANDLE REACTIONS ---
  const handleAddReaction = async (msgId: string, emoji: string) => {
    const msgRef = firestore()
      .collection("channels")
      .doc(channelId)
      .collection("messages")
      .doc(msgId);
    const doc = await msgRef.get();
    if (!doc.exists) return;
    const messageUserId = doc.data().userId;
    if (messageUserId === currentUserId) return;
    const reactions = doc.data().reactions || [];
    const existing = reactions.find((r) => r.userId === currentUserId);
    let newReactions;
    if (existing) {
      if (existing.emoji === emoji) {
        // Remove current reaction
        newReactions = reactions.filter((r) => r.userId !== currentUserId);
      } else {
        // Replace with new emoji
        newReactions = reactions.map((r) =>
          r.userId === currentUserId ? { emoji, userId: currentUserId } : r,
        );
      }
    } else {
      newReactions = [...reactions, { emoji, userId: currentUserId }];
    }
    await msgRef.update({ reactions: newReactions });

    // Award XP to message owner (not self), unique per user per message
    if (messageUserId && messageUserId !== currentUserId) {
      await awardXP(messageUserId, "reaction", {
        reactorId: currentUserId,
        messageId: msgId,
      });
    }
  };

  // --- PIN / DELETE LOGIC ---
  const handleLongPress = useCallback(
    (msgId: string, item: any) => {
      if (currentUserRole !== "moderator" && item.userId !== currentUserId) {
        return;
      }
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
        ]),
      ).start();
    },
    [channelId, currentUserRole, currentUserId],
  );

  const stopActions = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    wiggleAnim.stopAnimation();
    wiggleAnim.setValue(0);
    setActionTargetId(null);
  }, [wiggleAnim]);

  useEffect(() => {
    const prevId = prevActionIdRef.current;
    if (prevId && reactionOpacityMap[prevId]) {
      Animated.timing(reactionOpacityMap[prevId], {
        toValue: 1,
        duration: ANIM_SHORT,
        useNativeDriver: true,
      }).start();
    }
    if (actionTargetId && reactionOpacityMap[actionTargetId]) {
      Animated.timing(reactionOpacityMap[actionTargetId], {
        toValue: 0,
        duration: ANIM_SHORT,
        useNativeDriver: true,
      }).start();
    }
    prevActionIdRef.current = actionTargetId;
  }, [actionTargetId, reactionOpacityMap]);

  const pinMessage = async (msgId: string, pinned: boolean) => {
    if (!pinned && pinnedMessages.length >= 5) {
      setLimitCaption(true);
      setTimeout(() => setLimitCaption(false), 1300);
      return;
    }
    await firestore()
      .collection("channels")
      .doc(channelId)
      .collection("messages")
      .doc(msgId)
      .update(
        pinned
          ? { pinned: false, pinnedAt: firestore.FieldValue.delete() }
          : { pinned: true, pinnedAt: firestore.FieldValue.serverTimestamp() },
      );
    stopActions();
  };

  const confirmDelete = (msgId: string) => {
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel", onPress: stopActions },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await firestore()
            .collection("channels")
            .doc(channelId)
            .collection("messages")
            .doc(msgId)
            .delete();
          stopActions();
        },
      },
    ]);
  };

  // --- USERNAME HOLD: PROFILE / REPORT / INFO ---
  const handleUserPreview = (userId: string) => {
    if (userId && userId !== currentUserId) {
      setPreviewUserId(userId);
    }
  };

  const firstUnreadIndex = messages.findIndex(
    (m) => m.id === lastReadMessageId,
  );
  const hasUnreadMarker =
    showNewMarker &&
    firstUnreadIndex !== -1 &&
    firstUnreadIndex < messages.length - 1;

  // --- UI COLOR SCHEME ---
  const ChatMessage = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const user = userMap[item.userId];
      let displayName = "Unknown";
      let isModerator = false;
      let chatLevel = 1;
      let profilePicUrl = "";
      let badges: string[] = [];
      if (user) {
        displayName = `${user.firstName} ${user.lastName?.charAt(0) || ""}.`;
        isModerator = user.role === "moderator";
        chatLevel = user.chatLevel || 1;
        profilePicUrl = user.profilePicUrl || "";
        badges = enforceSelectedBadges(
          Array.isArray(user.selectedBadges) ? user.selectedBadges : [],
          user,
        );
      }
      const isOwnMessage = item.userId === currentUserId;
      const nameColor = isOwnMessage
        ? colors.white
        : isModerator
          ? colors.accent
          : colors.black;
      const messageDate = item.timestamp?.toDate
        ? item.timestamp.toDate()
        : new Date(item.timestamp);
      const formattedTime = `${String(messageDate.getMonth() + 1).padStart(2, "0")}/${String(messageDate.getDate()).padStart(2, "0")} ${messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      const showUnreadHere = hasUnreadMarker && index === firstUnreadIndex + 1;
      if (renderCustomMessage) {
        const custom = renderCustomMessage({
          item,
          index,
          isLast: index === messages.length - 1,
          isOwnMessage,
          showUnreadHere,
          user,
          addReaction: (emoji: string) => handleAddReaction(item.id, emoji),
          openReactionPicker: () => setReactionTargetId(item.id),
        });
        if (custom) {
          return custom;
        }
      }
      const reactions = item.reactions || [];
      if (!reactionOpacityMap[item.id]) {
        reactionOpacityMap[item.id] = new Animated.Value(1);
      }

      const pinnedScale = useRef(
        new Animated.Value(item.pinned ? 1 : 0),
      ).current;
      const prevPinned = useRef(item.pinned);

      useEffect(() => {
        if (item.pinned && !prevPinned.current) {
          Animated.sequence([
            Animated.timing(pinnedScale, {
              toValue: 1.2,
              duration: ANIM_BUTTON_POP,
              useNativeDriver: true,
            }),
            Animated.timing(pinnedScale, {
              toValue: 1,
              duration: ANIM_BUTTON_POP,
              useNativeDriver: true,
            }),
          ]).start();
        } else if (!item.pinned && prevPinned.current) {
          Animated.timing(pinnedScale, {
            toValue: 0,
            duration: ANIM_SHORT,
            useNativeDriver: true,
          }).start();
        }
        prevPinned.current = item.pinned;
      }, [item.pinned, pinnedScale]);

      return (
        <>
          {showUnreadHere && (
            <View style={chatStyles.unreadMarkerRow}>
              <View style={chatStyles.unreadMarker}>
                <Text style={chatStyles.unreadMarkerText}>New Messages</Text>
              </View>
            </View>
          )}
          <View
            style={[
              chatStyles.messageContainer,
              actionTargetId === item.id && {
                marginBottom: ACTION_SPACING,
                marginTop: ACTION_SPACING / 2,
              },
            ]}
          >
            <TouchableOpacity
              onLongPress={() => handleLongPress(item.id, item)}
              delayLongPress={400}
              activeOpacity={1}
              style={[
                chatStyles.messageBox,
                isOwnMessage && chatStyles.myMessageBox,
                reactions.length > 0 && { marginBottom: 2 },
                item.pinned && chatStyles.pinnedMessage,
                actionTargetId === item.id && {
                  transform: [
                    {
                      rotate: wiggleAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ["-2deg", "2deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={chatStyles.metaRow}>
                {!isOwnMessage && (
                  <TouchableOpacity
                    onPress={() => handleUserPreview(item.userId)}
                    activeOpacity={0.8}
                  >
                    <ProfileImage
                      uri={profilePicUrl}
                      style={chatStyles.profilePic}
                      isCurrentUser={false}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleUserPreview(item.userId)}
                  disabled={isOwnMessage}
                >
                  <Text
                    style={[
                      chatStyles.username,
                      { color: nameColor },
                      isOwnMessage && { textAlign: "right" },
                      isOwnMessage && chatStyles.myUsername,
                    ]}
                  >
                    {isOwnMessage ? "Me" : displayName}
                  </Text>
                </TouchableOpacity>
                {badges && badges.length > 0 && (
                  <View style={{ flexDirection: "row", marginLeft: 5 }}>
                    {badges.slice(0, MAX_DISPLAY_BADGES).map((b, i) => (
                      <BadgeImage
                        key={b}
                        badgeKey={b}
                        style={[
                          { width: 19, height: 19, marginLeft: i ? 4 : 0 },
                          chatStyles.badgeHighlight,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
              <Text
                style={[
                  chatStyles.messageText,
                  isOwnMessage && chatStyles.myMessageText,
                ]}
              >
                {item.text}
              </Text>
              <View>
                <View style={chatStyles.footerRow}>
                    <View
                      style={{
                        backgroundColor: getChatLevelColor(chatLevel),
                        borderRadius: 2,
                        paddingHorizontal: 4,
                        marginRight: 3,
                        marginLeft: 1,
                        paddingVertical: 2,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.white,
                          fontSize: 12,
                          fontWeight: "bold",
                          letterSpacing: 0.8,
                        }}
                      >
                        Lv{chatLevel}
                      </Text>
                    </View>
                    {user?.accountabilityStreak > 0 && (
                      <View
                        style={{
                          backgroundColor: colors.yellow,
                          borderRadius: 2,
                          paddingHorizontal: 4,
                          marginRight: 3,
                          paddingVertical: 2,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.black,
                            fontSize: 12,
                            fontWeight: "bold",
                            letterSpacing: 0.8,
                          }}
                        >
                          🔥{user.accountabilityStreak}
                        </Text>
                      </View>
                    )}
                    {ROLE_TAGS[user?.role] && (
                      <View
                        style={{
                          backgroundColor: ROLE_COLORS[user.role],
                          borderRadius: 2,
                          paddingHorizontal: 4,
                          marginRight: 3,
                          paddingVertical: 2,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.white,
                            fontSize: 12,
                            fontWeight: "bold",
                            letterSpacing: 0.8,
                          }}
                        >
                          {ROLE_TAGS[user.role]}
                        </Text>
                      </View>
                    )}
                  </View>
                <View style={chatStyles.reactionTimestampRow}>
                  {actionTargetId !== item.id &&
                    (reactions.length > 0 ||
                      (!isOwnMessage &&
                        !reactions.some((r) => r.userId === currentUserId))) && (
                        <Animated.View
                          pointerEvents={
                            actionTargetId === item.id ? "none" : "auto"
                          }
                          style={[
                            chatStyles.reactionRow,
                            { opacity: reactionOpacityMap[item.id] || 1 },
                          ]}
                        >
                          {Array.from(new Set(reactions.map((r) => r.emoji))).map(
                            (emoji) => {
                              const count = reactions.filter(
                                (r) => r.emoji === emoji,
                              ).length;
                              const userReacted = reactions.some(
                                (r) =>
                                  r.emoji === emoji &&
                                  r.userId === currentUserId,
                              );
                              return (
                                <TouchableOpacity
                                  key={emoji}
                                  style={[
                                    chatStyles.reactionBubble,
                                    userReacted && chatStyles.reactionHighlight,
                                  ]}
                                  onPress={() => {
                                    if (!isOwnMessage)
                                      handleAddReaction(item.id, emoji);
                                  }}
                                  disabled={isOwnMessage}
                                  activeOpacity={0.6}
                                >
                                  <Text style={{ fontSize: 15 }}>{emoji}</Text>
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      color: "#666",
                                      marginLeft: 2,
                                    }}
                                  >
                                    {count}
                                  </Text>
                                </TouchableOpacity>
                              );
                            },
                          )}
                          {!isOwnMessage &&
                            !reactions.some(
                              (r) => r.userId === currentUserId,
                            ) && (
                              <TouchableOpacity
                                onPress={() => setReactionTargetId(item.id)}
                                style={[
                                  chatStyles.reactionBubble,
                                  chatStyles.reactionAddBtn,
                                ]}
                              >
                                <Ionicons
                                  name="add-circle-outline"
                                  size={18}
                                  color="#888"
                                />
                              </TouchableOpacity>
                            )}
                        </Animated.View>
                      )}
                  <Text
                    style={[
                      chatStyles.timestamp,
                      isOwnMessage && chatStyles.myTimestamp,
                    ]}
                  >
                    {formattedTime}
                  </Text>
                </View>
              </View>
              {item.pinned && (
                <Animated.View
                  pointerEvents="none"
                    style={[
                      chatStyles.pinnedIconWrap,
                      { transform: [{ scale: pinnedScale }] },
                    ]}
                  >
                    <FontAwesome
                      name="thumb-tack"
                      size={18}
                      color={colors.gold}
                    />
                  </Animated.View>
                )}
              </TouchableOpacity>
              {actionTargetId === item.id && (
                <>
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={stopActions}
                  />
                  <View style={chatStyles.actionButtons}>
                    {currentUserRole === "moderator" && (
                      <Pressable
                        onPress={() => {
                          pinMessage(item.id, item.pinned);
                        }}
                        style={chatStyles.actionBtn}
                      >
                        <FontAwesome
                          name="thumb-tack"
                          size={22}
                          color={colors.gold}
                        />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => confirmDelete(item.id)}
                      style={chatStyles.actionBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color={colors.delete}
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
        </>
      );
    },
    [
      userMap,
      currentUserId,
      hasUnreadMarker,
      firstUnreadIndex,
      renderCustomMessage,
      messages.length,
      handleAddReaction,
      setReactionTargetId,
      reactionOpacityMap,
      actionTargetId,
      wiggleAnim,
      currentUserRole,
      pinMessage,
      confirmDelete,
      stopActions,
      handleUserPreview,
      handleLongPress,
    ],
  );

  const MemoizedChatMessage = useMemo(() => memo(ChatMessage), [ChatMessage]);

  const renderMessage = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <MemoizedChatMessage item={item} index={index} />
    ),
    [MemoizedChatMessage],
  );

  return (
    <ChannelWrapper padTop={false} padBottom style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              extraData={userMap}
              contentContainerStyle={{
                paddingTop: 12,
                // Keep a small gap below the final message
                // while avoiding the large padding previously used
                paddingBottom: 8,
              }}
              ListFooterComponent={
                <View
                  style={{ height: readOnly ? insets.bottom : inputBarHeight }}
                />
              }
              onScroll={handleScroll}
              onContentSizeChange={() => {
                if (isActive && isAtBottomRef.current) {
                  scrollToLatest(false);
                }
              }}
            />
            {/* JUMP TO LATEST BUTTON */}
            {showJump && (
              <AnimatedTouchable
                style={[
                  chatStyles.jumpToBottomBtn,
                  {
                    bottom: Animated.add(
                      keyboardOffset,
                      inputBarHeight + JUMP_BUTTON_OFFSET,
                    ),
                  },
                ]}
                onPress={handleJumpToBottom}
                activeOpacity={0.88}
              >
                <Ionicons
                  name="arrow-down"
                  size={28}
                  color={colors.background}
                />
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
                  style={chatStyles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setReactionTargetId(null)}
                >
                  <View style={chatStyles.emojiPicker}>
                    <View style={chatStyles.emojiRow}>
                      {EMOJI_LIST.map((e) => (
                        <TouchableOpacity
                          key={e}
                          style={chatStyles.emojiBtn}
                          onPress={() => {
                            handleAddReaction(reactionTargetId, e);
                            setReactionTargetId(null);
                          }}
                        >
                          <Text style={chatStyles.emojiText}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={chatStyles.cancelBtn}
                      onPress={() => setReactionTargetId(null)}
                    >
                      <Text style={chatStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </View>
          {!readOnly && (
            <Animated.View
              style={[
                chatStyles.inputRow,
                chatStyles.floatingInputRow,
                isTimedOut && chatStyles.disabledRow,
                { bottom: keyboardOffset },
              ]}
            >
              <TextInput
                style={[
                  chatStyles.input,
                  isTimedOut && chatStyles.disabledInput,
                ]}
                value={text}
                onChangeText={setText}
                editable={!isTimedOut}
                placeholder={
                  isTimedOut
                    ? `Timed out for ${hLeft}h ${mLeft}m`
                    : "Type a message…"
                }
                placeholderTextColor={isTimedOut ? colors.gray : "#888"}
                maxLength={512}
              />
              <TouchableOpacity
                style={chatStyles.sendBtn}
                onPress={sendMessage}
                activeOpacity={0.85}
                disabled={isTimedOut}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accent]}
                  style={chatStyles.sendBtnGradient}
                >
                  <Ionicons name="arrow-up" size={22} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
      <UserPreviewModal
        visible={!!previewUserId}
        userId={previewUserId || ""}
        onClose={() => setPreviewUserId(null)}
      />
    </ChannelWrapper>
  );
};

export const chatStyles = StyleSheet.create({
  messageContainer: {
    marginBottom: 11,
  },
  messageBox: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: colors.white,
  },
  myMessageBox: {
    backgroundColor: colors.grayLight,
  },
  pinnedMessage: {
    borderWidth: 4,
    borderColor: colors.accent,
  },
  messageText: {
    color: colors.textDark,
    fontSize: 16,
    lineHeight: 22,
    marginVertical: 3,
    marginLeft: 2,
    flexShrink: 1,
    flexWrap: "wrap",
    textAlign: "left",
  },
  username: {
    fontWeight: "bold",
    fontSize: 18,
    marginVertical: 2,
    marginLeft: 2,
  },
  myMessageText: {
    color: colors.black,
  },
  myUsername: {
    color: colors.black,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 8,
    marginLeft: 26,
  },
  reactionTimestampRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    width: "100%",
  },
  timestamp: {
    color: colors.gray,
    fontSize: 10,
    fontWeight: "400",
    fontFamily: fonts.regular,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: "auto",
    marginRight: 2,
    textAlign: "right",
  },
  myTimestamp: {
    color: colors.textLight,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 24,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 20,
    elevation: 2,
  },
  floatingInputRow: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 2,
  },
  input: {
    flex: 1,
    maxWidth: 320,
    backgroundColor: colors.white,
    color: colors.textDark,
    fontFamily: fonts.regular,
    borderRadius: 14,
    padding: 11,
    marginRight: 9,
    fontSize: 15,
  },
  disabledRow: {
    backgroundColor: colors.grayLight,
  },
  sendBtn: {
    backgroundColor: "transparent",
    marginLeft: 2,
  },
  sendBtnGradient: {
    padding: 10,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
  },
  disabledInput: {
    color: colors.gray,
  },
  jumpToBottomBtn: {
    position: "absolute",
    right: 26,
    backgroundColor: colors.accent,
    borderRadius: 26,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    shadowColor: colors.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 3,
    elevation: 2,
  },
  jumpBtnText: {
    color: colors.background,
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 2,
  },
  newBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: 5,
    marginTop: 1,
  },
  unreadMarkerRow: {
    flexDirection: "row",
    justifyContent: "center",
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
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 3,
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 0,
    marginTop: 0,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  reactionHighlight: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  badgeHighlight: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 24,
  },
  reactionAddBtn: {
    backgroundColor: colors.white,
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 18,
    marginTop: -6,
    borderWidth: 1,
    borderColor: colors.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiPicker: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: 240,
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
  },
  emojiBtn: {
    margin: 6,
  },
  emojiText: {
    fontSize: 28,
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f2fa",
  },
  cancelText: {
    fontWeight: "bold",
    color: "#333",
  },
  pinnedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.accent,
    alignSelf: "stretch",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  pinnedBarText: {
    color: colors.black,
    fontSize: 20,
    fontWeight: "bold",
  },
  pinnedDropdown: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 4,
    alignSelf: "stretch",
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  pinnedPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  pinnedPreviewIcon: {
    marginRight: 8,
    textShadowColor: colors.gold,
    textShadowRadius: 2,
  },
  pinnedPreviewText: {
    fontSize: 16,
    color: colors.textDark,
    fontFamily: fonts.regular,
  },
  pinnedPreviewSender: {
    fontSize: 14,
    color: colors.gray,
    fontStyle: "italic",
  },
  pinnedPreviewTime: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  pinnedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pinnedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  pinnedIconWrap: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    zIndex: 5,
  },
  limitCaption: {
    position: "absolute",
    top: -22,
    alignSelf: "center",
  },
  limitCaptionText: {
    color: colors.accent,
    fontSize: 14,
    opacity: 0.9,
    fontFamily: fonts.regular,
  },
  actionButtons: {
    position: "absolute",
    flexDirection: "row",
    bottom: -34,
    left: 0,
    right: 0,
    justifyContent: "center",
    zIndex: 30,
    elevation: 30,
  },
  actionBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 7,
    backgroundColor: "#f6e3ff",
    borderWidth: 1,
    borderColor: "#ececec",
  },
});

export default AllChannels;
