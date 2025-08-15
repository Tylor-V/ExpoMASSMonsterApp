import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  ScrollView,
  TextInput,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { auth } from '../firebase/firebase';
import { firestore } from '../firebase/firebase';
import { useAppContext } from '../firebase/AppContext';
import { getTodayKey } from '../firebase/dateHelpers';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import { colors, fonts } from '../theme';
import ProfileImage from '../components/ProfileImage';
import { ANIM_INSTANT, ANIM_MEDIUM } from '../animations';
import { levelThresholds } from '../firebase/chatXPHelpers';
import * as ImagePicker from 'expo-image-picker';
import {
  updateProfileField,
  updateSocialLink,
saveSelectedBadges,
} from '../firebase/userProfileHelpers';
import {
  getUnlockedBadges,
  getBadgeImage,
  getBadgeAsset,
  enforceSelectedBadges,
  isValidBadge,
  MAX_DISPLAY_BADGES,
  type BadgeKey,
} from '../badges/UnlockableBadges';
import { replaceProfilePic } from '../firebase/firebaseUserProfile';
import { clearUserCache } from '../utils/clearUserCache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../components/SwipeableTabs';

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

const SOCIALS = [
  { key: 'insta', label: 'Instagram', icon: 'logo-instagram' },
  { key: 'fb', label: 'Facebook', icon: 'logo-facebook' },
  { key: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
  { key: 'yt', label: 'YouTube', icon: 'logo-youtube' },
  { key: 'twitch', label: 'Twitch', icon: 'logo-twitch' },
];

const buildSocialUrl = (platform: string, handle: string) => {
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
};

const getSocialHandleDisplay = (platform: string, handle: string) => {
  if (!handle) return '';
  if (!handle.startsWith('http')) return handle;
  try {
    const { pathname } = new URL(handle);
    let part = pathname.replace(/^\//, '').replace(/\/$/, '');
    const segs = part.split('/');
    if (segs.length > 1) part = segs[segs.length - 1];
    part = part.replace(/^@/, '');
    if (platform === 'tiktok' || platform === 'yt') return `@${part}`;
    return part;
  } catch {
    const seg = handle.split('/').pop() || handle;
    return seg.replace(/^@/, '');
  }
};

const ProfileScreen = () => {
  const appContext = useAppContext();
  const user = useCurrentUserDoc();
  const { setAppStatus, points, workoutHistory } = appContext;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Refresh user data on initial render
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    const ref: any = firestore().collection('users');
    if (typeof ref.doc !== 'function') return;
    ref
      .doc(uid)
      .get()
      .then((doc: any) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        setAppStatus({
          user: data,
          points: data.accountabilityPoints ?? 0,
          workoutHistory: Array.isArray(data.workoutHistory)
            ? data.workoutHistory
            : [],
        });
      })
      .catch(() => {});
  }, []);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const arrowRef = useRef<View | null>(null);
  const [arrowCenterX, setArrowCenterX] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [draftPic, setDraftPic] = useState<string>('');
  const [bioInput, setBioInput] = useState('');
  const [socialInputs, setSocialInputs] = useState<any>({});
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [showBadgeCaption, setShowBadgeCaption] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const windowHeight = Dimensions.get('window').height;
  const DEFAULT_DRAWER_HEIGHT = Math.min(windowHeight * 0.7, 420);
  const MAX_DRAWER_HEIGHT = windowHeight * 0.9;
  const [infoDrawerHeight, setInfoDrawerHeight] = useState(0);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [renderInfoDrawer, setRenderInfoDrawer] = useState(false);
  const infoDrawerAnim = useRef(new Animated.Value(DEFAULT_DRAWER_HEIGHT)).current;
  const infoOverlayAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: ANIM_INSTANT, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: ANIM_INSTANT, useNativeDriver: true }),
    ]).start();
    setShowBadgeCaption(true);
    setTimeout(() => setShowBadgeCaption(false), 1300);
  };

  const [todayStr, setTodayStr] = useState(getTodayKey());
  const hasCheckinToday =
    Array.isArray(workoutHistory) &&
    workoutHistory.some((h: any) =>
      typeof h === 'string' ? h === todayStr : h?.date === todayStr,
    );

  useEffect(() => {
    if (editMode && user) {
      setDraftPic(user.profilePicUrl || '');
      setBioInput(user.bio || '');
      const socialsObj: any = {};
      SOCIALS.forEach((s) => {
        const curr = user.socials?.[s.key] || { handle: '', hidden: true };
        socialsObj[s.key] = { handle: curr.handle || '', hidden: curr.hidden ?? true };
      });
      setSocialInputs(socialsObj);
      const allBadges = getUnlockedBadges(user);
      const sel = enforceSelectedBadges(
        Array.isArray(user.selectedBadges) ? user.selectedBadges : allBadges,
        user,
      ).filter(b => !/^Level /.test(b));
      setSelectedBadges(sel);
    }
  }, [editMode, user]);

  useEffect(() => {
    if (!editMode && user) {
      const sel = enforceSelectedBadges(
        Array.isArray(user.selectedBadges)
          ? user.selectedBadges
          : getUnlockedBadges(user),
        user,
      ).filter(b => !/^Level /.test(b));
      setSelectedBadges(prev =>
        JSON.stringify(prev) === JSON.stringify(sel) ? prev : sel,
      );
    }
  }, [user, editMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newStr = getTodayKey();
      if (newStr !== todayStr) setTodayStr(newStr);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [todayStr]);

  useEffect(() => {
    const height = infoDrawerHeight || DEFAULT_DRAWER_HEIGHT;
    if (infoDrawerOpen) {
      infoDrawerAnim.setValue(height);
      infoOverlayAnim.setValue(0);
      setRenderInfoDrawer(true);
      Animated.parallel([
        Animated.timing(infoDrawerAnim, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(infoOverlayAnim, {
          toValue: 1,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (renderInfoDrawer) {
      Animated.parallel([
        Animated.timing(infoDrawerAnim, {
          toValue: height,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(infoOverlayAnim, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
      ]).start(() => setRenderInfoDrawer(false));
    }
  }, [infoDrawerOpen, infoDrawerHeight, renderInfoDrawer]);

  // If user is not loaded, show a loading state
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerName}>Profile</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  const coursesCompleted =
    user.coursesProgress && typeof user.coursesProgress === 'object'
      ? Object.values(user.coursesProgress).filter((p) => p === 1).length
      : 0;
  const badges = getUnlockedBadges(user)
    .filter(isValidBadge)
    .filter(b => !/^Level /.test(b));
  const displayBadges = editMode
    ? badges
    : (() => {
        const ordered: string[] = [];
        selectedBadges.forEach(b => {
          if (badges.includes(b) && !ordered.includes(b)) {
            ordered.push(b);
          }
        });
        badges.forEach(b => {
          if (!ordered.includes(b)) ordered.push(b);
        });
        return ordered;
      })();
  const bio = user.bio || '"Your bio here..."';
  const chatLevel = user.chatLevel || 1;
  const xp = user.chatXP || 0;
  const currLevelXP = levelThresholds[chatLevel - 1] || 0;
  const nextLevelXP = levelThresholds[chatLevel] || currLevelXP + 100;
  const percent = Math.max(
    0,
    Math.min(1, (xp - currLevelXP) / (nextLevelXP - currLevelXP))
  );

  const badgeProgress = useMemo(() => {
    const cp = user.coursesProgress || {};
    const unlocked = getUnlockedBadges(user);
    return {
      SCHOLAR: unlocked.includes('SCHOLAR')
        ? 1
        : ((cp['welcome'] || 0) + (cp['push-pull-legs'] || 0) + (cp['fuel'] || 0)) /
          3,
      MINDSET: unlocked.includes('MINDSET') ? 1 : cp['mindset'] || 0,
      ACCOUNTABILITY: unlocked.includes('ACCOUNTABILITY')
        ? 1
        : Math.min(1, (user.accountabilityPoints || 0) / 5),
    };
  }, [user]);

  const handleCheckin = () => {
    if (!hasCheckinToday) navigation.navigate('AccountabilityForm');
  };

  const handleSignOut = async () => {
    try {
      const uid = auth().currentUser?.uid;
      if (uid) {
        await firestore().collection('users').doc(uid).update({
          presence: 'offline',
          lastActive: firestore.FieldValue.serverTimestamp(),
        });
      }
      await auth().signOut();
      setAppStatus({ user: null, points: 0, workoutHistory: [] }); // Clear context
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        })
      );
    } catch (e: any) {
      Alert.alert('Sign Out Failed', e.message || 'Could not sign out.');
    }
  };

  const startEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const selectProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access to update your profile picture.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      setDraftPic(result.assets[0].uri);
    }
  };

  const openSocialLink = (platform: string, handle: string) => {
    if (!handle) return;
    const url = buildSocialUrl(platform, handle);
    Linking.openURL(url);
  };

  const toggleSocialHidden = async (
    platform: string,
    handle: string,
    hidden: boolean,
  ) => {
    if (!handle) return;
    try {
      await updateSocialLink(platform, handle, hidden);
    } catch (e) {}
  };

  const handleSave = async () => {
    try {
      if (draftPic && draftPic !== user.profilePicUrl) {
        const url = draftPic.startsWith('http') ? draftPic : await replaceProfilePic(draftPic);
        await updateProfileField('profilePicUrl', url);
      }
      if (bioInput !== (user.bio || '')) {
        await updateProfileField('bio', bioInput);
      }
      const socialsWithLinks: any = {};
      Object.keys(socialInputs).forEach(k => {
        const { handle, hidden } = socialInputs[k] || {};
        socialsWithLinks[k] = { handle: buildSocialUrl(k, handle), hidden };
      });
      await updateProfileField('socials', socialsWithLinks);
      await saveSelectedBadges(
        enforceSelectedBadges(
          selectedBadges.filter(b => !/^Level /.test(b)),
          user,
        ),
      );
      setEditMode(false);
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Could not update profile.');
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, height: 60 + insets.top },
        ]}
      >
        <Pressable
          style={styles.headerLeft}
          onPress={() => {
            arrowRef.current?.measureInWindow((x, _y, width) => {
              setArrowCenterX(x + width / 2);
            });
            setMenuOpen(!menuOpen);
          }}
        >
          <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          <View
            ref={arrowRef}
            onLayout={(e) => {
              if (!menuOpen) {
                setArrowCenterX(
                  e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2,
                );
              }
            }}
          >
            <Ionicons
              name={menuOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#000"
              style={{ marginLeft: 6 }}
            />
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          <TouchableOpacity
            testID="open-map-btn"
            style={{ marginRight: 12 }}
          >
            <Ionicons name="map" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="menu" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {menuOpen && (
        <TouchableOpacity
          style={[
            styles.signOutDropdown,
            {
              top: insets.top + 60,
              left: arrowCenterX - dropdownWidth / 2,
            },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.8}
          onLayout={(e) => setDropdownWidth(e.nativeEvent.layout.width)}
        >
          <Text style={styles.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>
      )}

      <View style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}>
        <View style={styles.profileRow}>
          {editMode ? (
            <TouchableOpacity onPress={selectProfileImage} activeOpacity={0.8}>
               <View style={{ alignItems: 'center' }}>
                <ProfileImage uri={draftPic} style={styles.avatar} isCurrentUser />
                <Text style={styles.changePicTxt}>Change</Text>
              </View>
            </TouchableOpacity>
          ) : user.profilePicUrl ? (
            <ProfileImage uri={user.profilePicUrl} style={styles.avatar} isCurrentUser />
          ) : (
            <ProfileImage style={styles.avatar} isCurrentUser />
          )}
          <View style={styles.statsCol}>
            <Text style={styles.statText}>Courses Completed: {coursesCompleted}</Text>
            <View style={styles.badgesLabelRow}>
              <Text style={[styles.statText, { marginTop: 4 }]}>{editMode ? 'Select up to 3 Badges' : 'Badges'}</Text>
              {!editMode && (
                <TouchableOpacity
                  onPress={() => setInfoDrawerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Badge info"
                >
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color="#FFCC00"
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              )}
            </View>
            {displayBadges.length ? (
              <>
              {showBadgeCaption && (
                <Text style={styles.badgeCaption}>Select up to 3 display badges</Text>
              )}
              <Animated.View
                style={[
                  styles.badgesRow,
                  { transform: [{ translateX: shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) }] },
                ]}
              >
                {displayBadges.map((b, i) => {
                  const selected = selectedBadges.includes(b);
                  const asset = getBadgeAsset(b);
                  return (
                    <TouchableOpacity
                      key={b + i}
                      activeOpacity={editMode ? 0.6 : 0.8}
                      onPress={() => {
                        if (!editMode) return;
                        if (selected) {
                          setSelectedBadges(prev => prev.filter(bb => bb !== b));
                        } else if (selectedBadges.length < MAX_DISPLAY_BADGES) {
                          setSelectedBadges(prev => [...prev, b]);
                        } else {
                          triggerShake();
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.badgeImageWrapper,
                          selected && styles.badgeImageWrapperSelectedBorder,
                          selected && styles.badgeImageWrapperSelected,
                          selected && styles.badgeSelected,
                        ]}
                      >
                        {asset?.type === 'image' ? (
                          <Image source={asset.source} style={styles.badgeImage} />
                        ) : /^Level /.test(b) ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{b.replace(/^Level /, 'Lv')}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
              </>
            ) : (
              <Text style={styles.noBadges}>No badges yet.</Text>
            )}
          </View>
        </View>

        {editMode ? (
          <TextInput
            style={styles.bioInput}
            multiline
            maxLength={160}
            placeholder="Your bio here..."
            placeholderTextColor={colors.gray}
            value={bioInput}
            onChangeText={setBioInput}
          />
        ) : (
          <Text style={styles.bio}>{bio}</Text>
        )}

        <Text style={styles.chatLevel}>Chat Level: <Text style={{ color: colors.gold }}>Lv{chatLevel}</Text></Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent * 100}%` }]} />
        </View>
        <Text style={styles.xpCaption}>{xp - currLevelXP} / {nextLevelXP - currLevelXP} XP to Lv{chatLevel + 1}</Text>

        <View style={styles.mainRow}>
          <TouchableOpacity
            style={[
              styles.checkinBtn,
              hasCheckinToday && styles.checkinBtnDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleCheckin}
            disabled={hasCheckinToday}
          >
            <Ionicons name="add-circle" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text
              style={[styles.checkinTxt, hasCheckinToday && styles.checkinTxtDisabled]}
            >
              {hasCheckinToday ? 'Check In Completed' : 'Accountability Check-In'}
            </Text>
          </TouchableOpacity>
          <View style={styles.pointsBox}>
            <Text style={styles.pointsNum}>{points}</Text>
            <Text style={styles.pointsLabel}>Points</Text>
          </View>
        </View>

        <View style={styles.secondaryRow}>
          {editMode ? (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleSave}>
                <Text style={styles.secondaryTxt}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel}>
                <Text style={styles.secondaryTxt}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={startEdit}>
                <Text style={styles.secondaryTxt}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Text style={styles.secondaryTxt}>Refer-a-Friend</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <ScrollView
          style={[styles.socialsScroll, { marginBottom: 0 }]}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {SOCIALS.map((s) => {
            const val = (editMode
              ? socialInputs[s.key]
              : user.socials?.[s.key]) || { handle: '', hidden: true };
            if (!editMode && !val.handle) return null;
            const showHandle = val.handle && !val.hidden;
            return (
              <View key={s.key} style={styles.socialRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name={s.icon} size={24} color={colors.gold} style={{ marginRight: 12 }} />
                  {editMode ? (
                    <TextInput
                      style={styles.socialInput}
                      placeholder={`Enter your ${s.label} @`}
                      placeholderTextColor="#888"
                      value={val.handle}
                      onChangeText={(t) =>
                        setSocialInputs((prev: any) => ({ ...prev, [s.key]: { ...prev[s.key], handle: t } }))
                      }
                    />
                  ) : showHandle ? (
                    <TouchableOpacity onPress={() => openSocialLink(s.key, val.handle)}>
                      <Text style={styles.socialHandle}>{getSocialHandleDisplay(s.key, val.handle)}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.socialPlaceholder}>{s.label}</Text>
                  )}
                </View>
                {val.handle || editMode ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (editMode) {
                        setSocialInputs((prev: any) => ({
                          ...prev,
                          [s.key]: { ...prev[s.key], hidden: !prev[s.key].hidden },
                        }));
                      } else {
                        toggleSocialHidden(s.key, val.handle, !val.hidden);
                      }
                    }}
                  >
                    <Ionicons
                      name={val.hidden ? 'eye-off' : 'eye'}
                      size={24}
                      color={val.hidden ? '#B0B0B0' : colors.gold}
                    />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="eye-off" size={24} color="#B0B0B0" />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
      {renderInfoDrawer && (
      <>
        <AnimatedTouchable
          style={[styles.drawerOverlay, { opacity: infoOverlayAnim }]}
          onPress={() => setInfoDrawerOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close badge info"
        />
        <Animated.View
          onLayout={(e) =>
            setInfoDrawerHeight(Math.min(e.nativeEvent.layout.height, MAX_DRAWER_HEIGHT))
          }
          style={[
            styles.infoDrawer,
            {
              transform: [{ translateY: infoDrawerAnim }],
              maxHeight: MAX_DRAWER_HEIGHT,
              paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.infoContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.infoHeader}>Badge Requirements</Text>
            <View style={styles.infoRow}>
              <Image source={getBadgeImage('SCHOLAR')} style={styles.infoIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Scholar Badge</Text>
                <Text style={styles.infoDesc}>Complete the Welcome Course, Push Pull Legs Course, and Fuel Course.</Text>
                <View style={styles.infoProgressRow}>
                  <View style={styles.infoProgressTrack}>
                    <View
                      style={[
                        styles.infoProgressBar,
                        { width: `${Math.round(badgeProgress.SCHOLAR * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.infoProgressPercent}>{Math.round(badgeProgress.SCHOLAR * 100)}%</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Image source={getBadgeImage('MINDSET')} style={styles.infoIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Mindset Badge</Text>
                <Text style={styles.infoDesc}>Complete the Mindset Course.</Text>
                <View style={styles.infoProgressRow}>
                  <View style={styles.infoProgressTrack}>
                    <View
                      style={[
                        styles.infoProgressBar,
                        { width: `${Math.round(badgeProgress.MINDSET * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.infoProgressPercent}>{Math.round(badgeProgress.MINDSET * 100)}%</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Image source={getBadgeImage('ACCOUNTABILITY')} style={styles.infoIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Accountability Badge</Text>
                <Text style={styles.infoDesc}>Submit 5 accountability check-ins.</Text>
                <View style={styles.infoProgressRow}>
                  <View style={styles.infoProgressTrack}>
                    <View
                      style={[
                        styles.infoProgressBar,
                        { width: `${Math.round(badgeProgress.ACCOUNTABILITY * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.infoProgressPercent}>{Math.round(badgeProgress.ACCOUNTABILITY * 100)}%</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <Text style={styles.infoRule}>You can select up to 3 badges to display on your profile and in chats.</Text>
          </ScrollView>
        </Animated.View>
      </>
    )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'stretch',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  changePicTxt: {
    fontSize: 12,
    color: colors.gold,
    marginTop: 4,
  },
  statsCol: {
    marginLeft: 16,
    flex: 1,
  },
  statText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'left',
    marginTop: 12,
  },
  badge: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  badgeSelected: {
    transform: [{ scale: 1.25 }],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  badgeImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  badgeImageWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderWidth: 3,
    borderColor: colors.grayOutline,
  },
  badgeImageWrapperSelectedBorder: {
    borderColor: 'transparent',
  },
  badgeImageWrapperSelected: {
    backgroundColor: colors.yellow,
  },
  badgeCaption: {
    fontSize: 13,
    color: colors.gold,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  noBadges: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  bio: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.gray,
    marginHorizontal: 16,
    marginTop: 12,
  },
  bioInput: {
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  chatLevel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginHorizontal: 16,
    marginTop: 16,
  },
  progressTrack: {
    width: 200,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 6,
    marginHorizontal: 16,
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.gold,
  },
  xpCaption: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
    marginHorizontal: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
  },
  checkinBtn: {
    flex: 1,
    marginRight: 12,
    height: 48,
    backgroundColor: colors.gold,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinBtnDisabled: {
    backgroundColor: colors.grayLight,
    borderColor: colors.gray,
    borderWidth: 1,
  },
  checkinTxt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  checkinTxtDisabled: {
    color: colors.textDark,
  },
  pointsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    width: 72,
  },
  pointsNum: {
    fontSize: 44,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  pointsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginTop: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  secondaryBtn: {
    width: '48%',
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  socialsScroll: {
    flex: 1,
    marginTop: 4,
  },
  socialRow: {
    height: 48,
    backgroundColor: '#232323',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginHorizontal: 16,
  },
  socialLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#B0B0B0',
  },
  socialPlaceholder: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#B0B0B0',
  },
  socialHandle: {
    fontSize: 16,
    color: colors.gold,
  },
  socialInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    color: '#000',
  },
  signOutDropdown: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
  signOutTxt: {
    color: '#E83D5E',
    fontWeight: 'bold',
    fontSize: 16,
  },
badgesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 40,
  },
  infoDrawer: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: '92%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    zIndex: 50,
  },
  infoContent: {
    paddingBottom: 20,
  },
  infoHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.textDark,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  infoIcon: {
    width: 46,
    height: 46,
    marginRight: 12,
    resizeMode: 'contain',
    borderRadius: 23,
    overflow: 'hidden',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  infoDesc: {
    fontSize: 14,
    color: colors.textDark,
  },
  infoProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoProgressTrack: {
    height: 8,
    flex: 1,
    backgroundColor: colors.gray,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  infoProgressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  infoProgressPercent: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoLink: {
    fontSize: 14,
    color: '#407BFF',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginVertical: 12,
  },
  infoRule: {
    fontSize: 14,
    color: colors.textDark,
  },
});

export default React.memo(ProfileScreen);