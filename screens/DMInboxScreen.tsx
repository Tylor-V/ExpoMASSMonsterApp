import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import ProfileImage from '../components/ProfileImage';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, fonts } from '../theme';
import ResponsivePressable from '../components/ResponsivePressable';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import WhiteBackgroundWrapper from '../components/WhiteBackgroundWrapper';
import { formatDisplayName } from '../utils/displayName';

const DMsInboxScreen = ({ navigation }) => {
  const currentUserId = auth().currentUser?.uid;
  const [threads, setThreads] = useState([]); // [{threadId, otherUser, lastMsg, isUnread}]
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  const fetchDMs = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const dmsSnap = await firestore()
        .collection('dms')
        .where('participants', 'array-contains', currentUserId)
        .get();
      const threadDocs = dmsSnap.docs;

    const promises = threadDocs.map(async doc => {
      const threadId = doc.id;
      const participants = doc.data()?.participants || [];
      const otherUid = participants.find((uid: string) => uid !== currentUserId) || '';
      const updatedAtRaw = doc.data()?.updatedAt;
      const updatedAt = updatedAtRaw?.toMillis ? updatedAtRaw.toMillis() : updatedAtRaw || 0;

      const userPromise = firestore().collection('users').doc(otherUid).get();
      const lastMsgPromise = firestore()
        .collection('dms')
        .doc(threadId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      const lastReadPromise = firestore()
        .collection('users')
        .doc(currentUserId)
        .collection('lastReadDMs')
        .doc(threadId)
        .get();

      const [userSnap, lastMsgSnap, lastReadSnap] = await Promise.all([
        userPromise,
        lastMsgPromise,
        lastReadPromise,
      ]);
      const lastMsg = lastMsgSnap.docs[0]?.data() || {};
      const lastMsgTs = lastMsg.timestamp?.toMillis
        ? lastMsg.timestamp.toMillis()
        : lastMsg.timestamp || 0;
      const lastReadTsRaw = lastReadSnap.data()?.timestamp;
      const lastReadTs = lastReadTsRaw?.toMillis
        ? lastReadTsRaw.toMillis()
        : lastReadTsRaw || 0;
      const isUnread = lastMsg.userId !== currentUserId && lastMsgTs > lastReadTs;
      return {
        threadId,
        updatedAt,
        otherUser: {
          uid: otherUid,
          firstName: userSnap.data()?.firstName || 'User',
          lastName: userSnap.data()?.lastName || '',
          profilePicUrl: userSnap.data()?.profilePicUrl || '',
        },
        lastMsg,
        isUnread,
      };
    });

    const result = await Promise.all(promises);
      const sorted = result.sort((a, b) => b.updatedAt - a.updatedAt);
      setThreads(sorted);
    } catch (err) {
      console.warn('Failed to load DMs', err);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const unsub = firestore()
      .collection('users')
      .onSnapshot(snap => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(arr);
      });
    return unsub;
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDMs();
    }, [fetchDMs]),
  );

  const filteredThreads = threads.filter(t => {
    const name = `${t.otherUser.firstName} ${t.otherUser.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const term = search.trim().toLowerCase();
  const nameMatches = React.useCallback(
    (name: string) =>
      name
        .split(/[\s-]+/)
        .some(part => part.toLowerCase().startsWith(term)),
    [term],
  );

  const filteredUsers = users.filter(u => {
    const matches =
      nameMatches(u.firstName || '') || nameMatches(u.lastName || '');
    return term && u.id !== currentUserId ? matches : false;
  });


  const insets = useSafeAreaInsets();

  const openUser = async (user: any) => {
    if (!currentUserId) return;
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
    if (!doc.exists) {
      await firestore()
        .collection('dms')
        .doc(idA)
        .set({
          participants: [currentUserId, user.id],
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      threadId = idA;
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

  return (
    <WhiteBackgroundWrapper padTop={false} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={32} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/mass-inbox.png')}
            style={styles.headerImage}
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
              <Icon name="close-circle" size={23} color={colors.purple} />
            </TouchableOpacity>
          ) : (
            <Icon name="search-outline" size={21} color={colors.textMuted} />
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
                  <ProfileImage uri={item.otherUser.profilePicUrl} style={styles.avatar} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item.isUnread && <View style={styles.newDot} />}
                      <Text style={styles.nameText}>{formatDisplayName(item.otherUser.firstName, item.otherUser.lastName)}</Text>
                    </View>
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
    resizeMode: 'contain',
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 11,
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
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 9,
    paddingHorizontal: 6,
    minWidth: 17,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  unreadTxt: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
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