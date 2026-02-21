import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import ProfileImage from '../components/ProfileImage';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import ResponsivePressable from '../components/ResponsivePressable';
import { firestore } from '../firebase/firebase';
import { pickPublicUser } from '../firebase/publicUserHelpers';
import { auth } from '../firebase/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import WhiteBackgroundWrapper from '../components/WhiteBackgroundWrapper';
import { formatDisplayName } from '../utils/displayName';
import { useBlockedUserIds } from '../hooks/useBlockedUserIds';
import { useReportedUserIds } from '../hooks/useReportedUserIds';
import UserPreviewModal from '../components/UserPreviewModal';

const DMsInboxScreen = ({ navigation }) => {
  const currentUserId = auth().currentUser?.uid;
  const [threads, setThreads] = useState([]); // [{threadId, otherUser, lastMsg, isUnread}]
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const { blockedSet } = useBlockedUserIds();
  const { reportedUserSet } = useReportedUserIds();
  const publicUserCacheRef = useRef<Map<string, any>>(new Map());

  const searchTerm = search.trim();
  const term = searchTerm.toLowerCase();

  const toMillis = (value: any) => {
    if (typeof value?.toMillis === 'function') return value.toMillis();
    return typeof value === 'number' ? value : 0;
  };

  const resolveThreadId = useCallback(async (otherUserId: string) => {
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
      return aTs >= bTs ? idA : idB;
    }
    if (docA.exists) return idA;
    if (docB.exists) return idB;
    return idA;
  }, [currentUserId]);

  const buildThreads = useCallback(async (threadDocs) => {
    const hydrated = await Promise.all(threadDocs.map(async doc => {
      try {
        const threadId = doc.id;
        const participants = doc.data()?.participants || [];
        const otherUid = participants.find((uid: string) => uid !== currentUserId) || '';
        const updatedAtRaw = doc.data()?.updatedAt;
        const updatedAt = updatedAtRaw?.toMillis ? updatedAtRaw.toMillis() : updatedAtRaw || 0;

        const cachedUser = publicUserCacheRef.current.get(otherUid);
        const userPromise = cachedUser
          ? Promise.resolve(cachedUser)
          : firestore().collection('publicUsers').doc(otherUid).get().then(userSnap => {
            const userData = {
              firstName: userSnap?.data()?.firstName || 'User',
              lastName: userSnap?.data()?.lastName || '',
              profilePicUrl: userSnap?.data()?.profilePicUrl || '',
            };
            publicUserCacheRef.current.set(otherUid, userData);
            return userData;
          }).catch(() => {
            const fallbackUser = { firstName: 'User', lastName: '', profilePicUrl: '' };
            publicUserCacheRef.current.set(otherUid, fallbackUser);
            return fallbackUser;
          });
        const lastReadPromise = firestore()
          .collection('users')
          .doc(currentUserId)
          .collection('lastReadDMs')
          .doc(threadId)
          .get();
        const latestMsgSnap = await firestore()
          .collection('dms')
          .doc(threadId)
          .collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        let lastMsgDoc = latestMsgSnap.docs[0];
        if (lastMsgDoc) {
          const data = lastMsgDoc.data();
          if (data?.status === 'removed' || data?.isRemoved) {
            const fallbackMsgSnap = await firestore()
              .collection('dms')
              .doc(threadId)
              .collection('messages')
              .orderBy('timestamp', 'desc')
              .limit(5)
              .get();
            lastMsgDoc = fallbackMsgSnap.docs.find(msgDoc => {
              const msg = msgDoc.data();
              return !(msg?.status === 'removed' || msg?.isRemoved);
            });
          }
        }

        const [otherUser, lastReadSnap] = await Promise.all([userPromise, lastReadPromise]);
        const lastMsg = lastMsgDoc?.data() || {};
        const lastMsgTs = lastMsg.timestamp?.toMillis
          ? lastMsg.timestamp.toMillis()
          : lastMsg.timestamp || 0;
        const lastReadTsRaw = lastReadSnap.data()?.timestamp;
        const lastReadTs = lastReadTsRaw?.toMillis
          ? lastReadTsRaw.toMillis()
          : lastReadTsRaw || 0;
        const isUnread =
          !!lastMsg.userId && lastMsg.userId !== currentUserId && lastMsgTs > lastReadTs;
        return {
          threadId,
          updatedAt,
          otherUser: {
            uid: otherUid,
            ...otherUser,
          },
          lastMsg,
          isUnread,
        };
      } catch (err) {
        console.warn('Failed to hydrate DM thread', doc.id, err);
        return null;
      }
    }));
    const dedupedByPair = new Map<string, any>();
    hydrated.filter(Boolean).forEach((thread: any) => {
      const uidA = String(currentUserId || '');
      const uidB = String(thread?.otherUser?.uid || '');
      const pairKey = uidA && uidB ? [uidA, uidB].sort().join('_') : thread.threadId;
      const existing = dedupedByPair.get(pairKey);
      if (!existing) {
        dedupedByPair.set(pairKey, thread);
        return;
      }

      const existingUpdated = Number(existing.updatedAt || 0);
      const candidateUpdated = Number(thread.updatedAt || 0);
      if (candidateUpdated !== existingUpdated) {
        if (candidateUpdated > existingUpdated) {
          dedupedByPair.set(pairKey, thread);
        }
        return;
      }

      const existingScore = (existing.otherUser?.uid ? 1 : 0) + (existing.lastMsg?.text ? 1 : 0);
      const candidateScore = (thread.otherUser?.uid ? 1 : 0) + (thread.lastMsg?.text ? 1 : 0);
      if (candidateScore > existingScore) {
        dedupedByPair.set(pairKey, thread);
      }
    });

    return Array.from(dedupedByPair.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [currentUserId]);

  useEffect(() => {
    if (!searchTerm || !currentUserId) {
      setUsers([]);
      return;
    }
    let isActive = true;
    const fetchUsers = async () => {
      try {
        const firstNameQuery = firestore()
          .collection('publicUsers')
          .orderBy('firstName')
          .startAt(searchTerm)
          .endAt(`${searchTerm}\uf8ff`)
          .limit(10)
          .get();
        const lastNameQuery = firestore()
          .collection('publicUsers')
          .orderBy('lastName')
          .startAt(searchTerm)
          .endAt(`${searchTerm}\uf8ff`)
          .limit(10)
          .get();
        const [firstSnap, lastSnap] = await Promise.all([
          firstNameQuery,
          lastNameQuery,
        ]);
        if (!isActive) return;
        const merged = new Map<string, any>();
        const mapDoc = (doc: any) => pickPublicUser(doc.data(), doc.id);
        firstSnap.docs.forEach(doc => merged.set(doc.id, mapDoc(doc)));
        lastSnap.docs.forEach(doc => merged.set(doc.id, mapDoc(doc)));
        setUsers(Array.from(merged.values()));
      } catch (err) {
        console.warn('Failed to search users', err);
        if (isActive) {
          setUsers([]);
        }
      }
    };
    fetchUsers();
    return () => {
      isActive = false;
    };
  }, [searchTerm, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      if (!currentUserId) return;
      setLoading(true);
      const unsubscribe = firestore()
        .collection('dms')
        .where('participants', 'array-contains', currentUserId)
        .onSnapshot(async snap => {
          try {
            const sorted = await buildThreads(snap.docs);
            setThreads(sorted);
          } catch (err) {
            console.warn('Failed to load DMs', err);
          } finally {
            setLoading(false);
          }
        });
      return unsubscribe;
    }, [buildThreads, currentUserId]),
  );

  const filteredThreads = threads.filter(t => {
    const otherUid = String(t.otherUser.uid || '');
    if (blockedSet.has(otherUid) || reportedUserSet.has(otherUid)) return false;
    const name = `${t.otherUser.firstName} ${t.otherUser.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const nameMatches = React.useCallback(
    (name: string) =>
      name
        .split(/[\s-]+/)
        .some(part => part.toLowerCase().startsWith(term)),
    [term],
  );

  const filteredUsers = users.filter(u => {
    const userId = String(u.id || '');
    if (blockedSet.has(userId) || reportedUserSet.has(userId)) return false;
    const matches =
      nameMatches(u.firstName || '') || nameMatches(u.lastName || '');
    return term && u.id !== currentUserId ? matches : false;
  });


  const insets = useSafeAreaInsets();

  const openUser = async (user: any) => {
    if (!currentUserId) return;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const threadId = await resolveThreadId(user.id);
    const doc = await firestore().collection('dms').doc(threadId).get();
=======
    const otherUid = user?.id;
    if (!currentUserId || !otherUid || otherUid === currentUserId) {
      Alert.alert('Unable to start DM', 'Please try again.');
      return;
    }
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    const idA = `${currentUserId}_${user.id}`;
    const idB = `${user.id}_${currentUserId}`;
    let threadId = idA;
    let doc = await firestore().collection('dms').doc(idA).get();
    if (!doc.exists) {
      doc = await firestore().collection('dms').doc(idB).get();
      if (doc.exists) {
        threadId = idB;
      }
    }
>>>>>>> theirs
    if (!doc.exists) {
      await firestore()
        .collection('dms')
        .doc(threadId)
        .set({
          participants: [currentUserId, user.id],
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    }
    requestAnimationFrame(() =>
      navigation.navigate('DMChat', {
        threadId,
        otherUser: {
          uid: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicUrl: user.profilePicUrl,
        },
      })
    );
  };

  const openThread = (item) => {
    requestAnimationFrame(() =>
      navigation.navigate('DMChat', {
        threadId: item.threadId,
        otherUser: item.otherUser,
      })
    );
  };

  const openUserPreview = (userId: string) => {
    if (!userId || userId === currentUserId) return;
    setPreviewUserId(userId);
    setIsPreviewVisible(true);
  };

  const handleUserBlocked = (blockedUserId: string) => {
    if (!blockedUserId) return;
    setThreads(prev => prev.filter(thread => thread.otherUser.uid !== blockedUserId));
  };

  return (
    <WhiteBackgroundWrapper padTop={false} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={32} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/mass-inbox.png')}
            style={styles.headerImage}
            contentFit="contain"
          />
        </View>
        <View style={styles.searchBar}>
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
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
              <Ionicons name="close-circle" size={23} color={colors.purple} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search-outline" size={21} color={colors.textMuted} />
          )}
        </View>
        {loading && !term ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 26 }} />
        ) : (
          <FlatList
            data={term ? filteredUsers : filteredThreads}
            keyExtractor={item => (term ? item.id : item.threadId)}
            style={{ marginTop: 10 }}
            renderItem={({ item }) =>
              term ? (
                <ResponsivePressable
                  noRadius
                  style={styles.dmRow}
                  onPress={() => openUser(item)}
                >
                  <ProfileImage uri={item.profilePicUrl} style={styles.avatar} />
                  <Text style={styles.nameText}>{formatDisplayName(item.firstName, item.lastName)}</Text>
                </ResponsivePressable>
              ) : (
                <ResponsivePressable
                  noRadius
                  style={styles.dmRow}
                  onPress={() => openThread(item)}
                >
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      openUserPreview(item.otherUser.uid);
                    }}
                    style={styles.avatarPressable}
                  >
                    <ProfileImage uri={item.otherUser.profilePicUrl} style={styles.avatar} />
                  </Pressable>
                  <View style={styles.threadInfo}>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        openUserPreview(item.otherUser.uid);
                      }}
                      style={styles.namePressable}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {item.isUnread && <View style={styles.newDot} />}
                        <Text style={styles.nameText}>{formatDisplayName(item.otherUser.firstName, item.otherUser.lastName)}</Text>
                      </View>
                    </Pressable>
                    <Text style={styles.lastMsgText} numberOfLines={1}>{item.lastMsg.text || ''}</Text>
                  </View>
                </ResponsivePressable>
              )
            }
            ListEmptyComponent={
              <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 34 }}>
                {term ? 'No users found.' : 'No DMs yet.'}
              </Text>
            }
          />
        )}
      </View>
      <UserPreviewModal
        visible={isPreviewVisible}
        userId={previewUserId}
        onClose={() => setIsPreviewVisible(false)}
        onUserBlocked={handleUserBlocked}
      />
    </WhiteBackgroundWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  backBtn: {
    marginBottom: 10,
    width: 40,
    alignItems: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1.2,
    borderColor: colors.grayLight,
    paddingBottom: 7,
  },
  headerText: {
    color: colors.accent,
    fontSize: 21,
    fontWeight: 'bold',
    letterSpacing: 0.7,
  },
  headerImage: {
    width: 150,
    height: 85,
  },
  searchBar: {
    backgroundColor: colors.white,
    borderColor: colors.grayLight,
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
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 3,
    paddingVertical: 8,
    paddingHorizontal: 9,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarPressable: {
    marginRight: 11,
  },
  threadInfo: {
    flex: 1,
  },
  namePressable: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#EDE4C6',
  },
  nameText: {
    color: colors.textDark,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  lastMsgText: {
    color: '#aaa',
    fontSize: 14,
    maxWidth: 150,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
    marginRight: 6,
  },
});

export default DMsInboxScreen;
