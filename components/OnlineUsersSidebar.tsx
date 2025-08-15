import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import ProfileImage from './ProfileImage';
import { useChatInputBarHeight } from '../MainScreens/ChatScreen';
import UserPreviewModal from './UserPreviewModal';
import { fonts, colors, radius } from '../theme';
import { ROLE_COLORS, ROLE_TAGS } from '../constants/roles';
import {
  getBadgeImage,
  getBadgeAsset,
  enforceSelectedBadges,
  type BadgeKey,
} from '../badges/UnlockableBadges';
import { ANIM_MEDIUM } from '../animations';

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIDEBAR_WIDTH = 300;
const ONLINE_THRESHOLD = 10 * 60 * 1000; // 10 minutes in ms


function OnlineUsersSidebar({ visible, onClose, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [render, setRender] = useState(visible);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Dynamic input bar height (matches ChatScreen)
  const inputBarHeight = useChatInputBarHeight();

   // Get current user id from Firebase if not passed
  const uid = currentUserId || auth().currentUser?.uid;

  // Real-time Firestore subscription for users collection
  useEffect(() => {
    if (!render) return;
    const unsubscribe = firestore()
      .collection('users')
      .onSnapshot(snap => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(arr);
      });
    return unsubscribe;
  }, [visible, render]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (render) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SIDEBAR_WIDTH,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true
        }),
      ]).start(() => setRender(false));
    }
  }, [visible]);

  // Online/offline logic using lastActive
  const now = Date.now();
  const toMillis = (ts: any) => {
    if (!ts) return 0;
    // Firestore Timestamp object
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    return typeof ts === 'number' ? ts : 0;
  };
  
  const isUserOnline = (user: any) => {
    const last = toMillis(user.lastActive);
    return !!last && now - last <= ONLINE_THRESHOLD;
  };

  const isOnlineForDisplay = (user: any) =>
    isUserOnline(user) && user.showOnlineStatus !== false;

  const online = React.useMemo(() => users.filter(isOnlineForDisplay), [users]);
  const offline = React.useMemo(() => users.filter(u => !isOnlineForDisplay(u)), [users]);
  const term = search.trim().toLowerCase();
  const nameMatches = React.useCallback(
    (name: string) =>
      name
        .split(/[\s-]+/)
        .some(part => part.toLowerCase().startsWith(term)),
    [term]
  );
  const filterUser = React.useCallback(
    (user: any) => {
      const matches =
        !term || nameMatches(user.firstName || '') || nameMatches(user.lastName || '');
      return term ? matches && user.id !== uid : matches;
    },
    [term, nameMatches, uid]
  );
  const filteredOnline = React.useMemo(() => online.filter(filterUser), [online, filterUser]);
  const filteredOffline = React.useMemo(() => offline.filter(filterUser), [offline, filterUser]);
  // Find current user for display
  const currentUser = users.find(u => u.id === uid);

  const renderUser = React.useCallback((user) => {
    const isCurrent = user.id === uid;
    const displayName = isCurrent
      ? 'Me'
      : `${user.firstName ?? ''} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`;
    const badges = enforceSelectedBadges(
      user.selectedBadges || [],
      user,
    );
    const level = user.chatLevel || 1;

    return (
      <AnimatedPressable
        key={user.id}
        style={({ pressed }) => [
          styles.userRow,
          { transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
        onPress={() => !isCurrent && setPreviewUserId(user.id)}
      >
        <View style={styles.avatarContainer}>
          <ProfileImage
            uri={user.profilePicUrl}
            style={[
              styles.avatar,
               isCurrent
                ? { borderWidth: 0 }
                : { borderColor: isOnlineForDisplay(user) ? colors.yellow : '#EAEAEA' },
            ]}
            isCurrentUser={isCurrent}
          />
          {isOnlineForDisplay(user) && (
            <View
              style={[styles.presenceDot, { backgroundColor: '#48E776' }]}
            />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                styles.name,
                { color: isOnlineForDisplay(user) ? colors.yellow : '#A5A5A5' },
                isCurrent && { textDecorationLine: 'underline' },
              ]}
            >
              {displayName}
            </Text>
            <View style={styles.levelIndicator}>
              <Text style={styles.levelIndicatorTxt}>Lv{level}</Text>
            </View>
            {user.accountabilityStreak > 0 && (
              <View style={styles.levelIndicator}>
                <Text style={styles.levelIndicatorTxt}>🔥{user.accountabilityStreak}</Text>
              </View>
            )}
            {ROLE_TAGS[user.role] && (
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] }]}>
                <Text style={styles.roleBadgeTxt}>{ROLE_TAGS[user.role]}</Text>
              </View>
            )}
            {badges.length > 0 && (
              <View style={styles.badgesRow}>
                {badges.map((b, i) => {
                  const asset = getBadgeAsset(b);
                  if (asset?.type === 'image') {
                    return (
                      <Image
                        key={i}
                        source={asset.source}
                        style={[styles.roleImage, styles.badgeHighlight]}
                      />
                    );
                  }
                  return null;
                })}
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }, [uid]);

  if (!render) return null;

  return (
    <>
      {/* Gray overlay: closes sidebar on tap */}
      <AnimatedTouchable
        activeOpacity={1}
        onPress={onClose}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      />
      <Animated.View
        style={[
          styles.sidebar,
          {
            right: 0,
            transform: [{ translateX: slideAnim }],
            top: 0,
            bottom: 0,
            paddingBottom: inputBarHeight,
          },
        ]}
      >
        <ScrollView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/members-logo.png')}
            style={styles.headerLogo}
          />
        </View>
        <View style={styles.searchBar}>
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#B0B0B0"
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setTimeout(() => searchRef.current?.focus(), 0);
              }}
              style={{ padding: 4 }}
            >
              <Icon name="close-circle" size={23} color="#8B5CF6" />
            </TouchableOpacity>
          ) : (
            <Icon name="search-outline" size={21} color="#B0B0B0" />
          )}
        </View>
        {/* Online */}
        <FlatList
          data={filteredOnline}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderUser(item)}
          ListHeaderComponent={
            <Text style={styles.sectionHeader}>Online ({filteredOnline.length})</Text>
          }
          ListEmptyComponent={<Text style={styles.emptyTxt}>No users online.</Text>}
          style={{ marginBottom: 13 }}
          scrollEnabled={false}
        />
        {/* Offline */}
        <FlatList
          data={filteredOffline}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderUser(item)}
          ListHeaderComponent={
            <Text style={styles.sectionHeader}>Offline ({filteredOffline.length})</Text>
          }
          ListEmptyComponent={<Text style={styles.emptyTxt}>No users offline.</Text>}
          scrollEnabled={false}
        />
        {filteredOnline.length === 0 && filteredOffline.length === 0 && !!term && (
          <Text style={styles.noUsersTxt}>No users found</Text>
        )}
        </ScrollView>
      </Animated.View>
      <UserPreviewModal
        visible={!!previewUserId}
        userId={previewUserId || ''}
        onClose={() => setPreviewUserId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(20,20,20,0.85)',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 150,
  },
  sidebar: {
    position: 'absolute',
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.white,
    opacity: 0.8,
    borderLeftWidth: 2,
    borderLeftColor: colors.yellow,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 222,
    paddingTop: 18,
    paddingHorizontal: 10,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginTop: 28,
    paddingRight: 58,
    marginLeft: 28,
  },
  headerLogo: {
    flex: 1,
    height: 120,
    resizeMode: 'contain',
  },
  sectionHeader: {
    color: '#232323',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 7,
    marginLeft: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    marginBottom: 8,
    paddingHorizontal: 18,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 23,
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 7,
  },
  roleTxt: {
    color: '#bbb',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  badgesRow: { flexDirection: 'row', marginLeft: 4 },
  badgeDot: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  badgeTxt: {
    color: '#232323',
    fontWeight: 'bold',
    fontSize: 10,
  },
  levelIndicator: {
    backgroundColor: colors.yellow,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingBottom: 1,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 2,
  },
  levelIndicatorTxt: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '500',
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  roleBadge: {
    borderRadius: 2,
    paddingHorizontal: 6,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 2,
  },
  roleBadgeTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  roleImage: {
    width: 16,
    height: 16,
    aspectRatio: 1,
    marginLeft: 7,
    marginRight: 4,
  },
  badgeHighlight: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 8,
  },
  avatarContainer: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  presenceDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 10,
    height: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.white,
  },
  emptyTxt: {
    color: '#CCCCCC',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 15,
    fontWeight: '500',
  },
  searchBar: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: 16,
    height: 38,
    marginTop: 8,
    marginBottom: 10,
    marginHorizontal: 4,
    paddingLeft: 13,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: '#232323',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  noUsersTxt: {
    color: '#A1A1AA',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 20,
    fontWeight: '400',
  },
});
export default React.memo(OnlineUsersSidebar);