import { Ionicons as Icon } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { firestore } from '../firebase/firebase';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image } from 'expo-image';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    getBadgeAsset,
    getUnlockedBadges
} from '../badges/UnlockableBadges';
import { levelThresholds } from '../firebase/chatXPHelpers';
import { colors } from '../theme';
import { clearUserCache } from '../utils/clearUserCache';
import ProfileImage from './ProfileImage';

// Capitalize first letter
function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ProfileModal({
  visible,
  onClose,
  user,
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  if (!user) return null;

  const {
    profilePicUrl,
    firstName,
    lastName,
    bio,
    badges,
    socials,
    chatXP,
    accountabilityPoints,
    coursesProgress,
    chatLevel,
    role,
  } = user;

  // Level logic
  const currLevel = chatLevel || 1;
  const xp = chatXP || 0;
  const currLevelXP = levelThresholds[currLevel - 1] || 0;
  const nextLevelXP = levelThresholds[currLevel] || currLevelXP + 100;
  const percent = Math.max(
    0,
    Math.min(100, ((xp - currLevelXP) / (nextLevelXP - currLevelXP)) * 100)
  );

  // Courses completed count (handles null/undefined)
  const coursesCompleted =
    coursesProgress && typeof coursesProgress === 'object'
      ? Object.values(coursesProgress).filter((p) => p === 1).length
      : 0;

      const displayBadges = getUnlockedBadges({ badges, role });

  // SIGN OUT LOGIC HERE
  const handleSignOut = async () => {
    try {
      const uid = auth().currentUser?.uid;
      if (uid) {
        await firestore().collection('users').doc(uid).update({
          presence: 'offline',
          lastActive: firestore.FieldValue.serverTimestamp(),
        });
      }
      await signOut(auth());
      await clearUserCache(uid);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        })
      );
    } catch (e) {
      Alert.alert('Sign Out Failed', e.message || 'Could not sign out.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.drawer, { paddingBottom: insets.bottom + 19 }]}>
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 16 }]}
            onPress={onClose}
          >
            <Icon name="close" size={28} color="#232323" />
          </TouchableOpacity>
          <ScrollView>
            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <ProfileImage uri={profilePicUrl} style={styles.avatar} isCurrentUser />
              <Text style={styles.nameTxt}>
                {firstName} {lastName}
              </Text>
              <Text style={styles.bioTxt}>{bio || 'No bio yet.'}</Text>

              <Text style={styles.levelTxt}>
                Chat Level: <Text style={{ color: colors.accent }}>Lv{currLevel}</Text>
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={{
                    backgroundColor: colors.accent,
                    height: 9,
                    borderRadius: 7,
                    width: `${percent}%`,
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: '#888',
                  marginTop: -2,
                  marginBottom: 6,
                }}
              >
                {xp - currLevelXP} / {nextLevelXP - currLevelXP} XP to Lv
                {currLevel + 1}
              </Text>

              <Text style={styles.sectionTitle}>Badges</Text>
              <View style={styles.badgeRow}>
                {displayBadges.length ? (
                  displayBadges.map((b, i) => {
                    const asset = getBadgeAsset(b as string);
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
                  })
                ) : (
                  <Text style={{ color: '#aaa' }}>No badges yet.</Text>
                )}
              </View>

              <Text style={styles.sectionTitle}>Socials</Text>
              <View style={styles.socialsRow}>
                {Object.entries(socials || {}).map(
                  ([platform, { handle, hidden }]) =>
                    !hidden && (
                      <View key={platform} style={styles.socialTag}>
                        <Text>
                          {capitalize(platform)}: {handle}
                        </Text>
                      </View>
                    )
                )}
              </View>

              <Text style={styles.sectionTitle}>
                Accountability Points: <Text style={{ color: colors.accent }}>{accountabilityPoints || 0}</Text>
              </Text>
              <Text style={styles.sectionTitle}>
                Courses Completed: {coursesCompleted}
              </Text>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
              >
                <Icon name="log-out-outline" size={19} color="#fff" />
                <Text style={styles.signOutBtnTxt}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.85)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    minHeight: '82%',
    paddingBottom: 19,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 18,
    zIndex: 2,
    padding: 4,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  nameTxt: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#232323',
    marginTop: 6,
  },
  bioTxt: {
    color: '#888',
    marginBottom: 7,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  levelTxt: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#232323',
    marginTop: 3,
    marginBottom: 3,
  },
  progressBar: {
    width: 95,
    height: 9,
    backgroundColor: '#eee',
    borderRadius: 7,
    marginVertical: 3,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#232323',
    marginTop: 18,
    marginBottom: 5,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 7,
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingVertical: 4,
    paddingHorizontal: 10,
    margin: 2,
  },
  badgeIcon: {
    width: 20,
    height: 20,
    aspectRatio: 1,
    margin: 2,
  },
  socialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 11,
  },
  socialTag: {
    backgroundColor: '#f9f6e5',
    borderRadius: 8,
    padding: 7,
    margin: 3,
  },
  signOutBtn: {
    backgroundColor: '#E83D5E',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 27,
    marginTop: 2,
  },
  signOutBtnTxt: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 7,
  },
});
export default React.memo(ProfileModal);