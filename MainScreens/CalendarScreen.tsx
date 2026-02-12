import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  InteractionManager,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Linking,
  Modal,
  Platform,
  Pressable,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserBadgeProgress } from '../badges/progressHelpers';
import CarouselNavigator from '../components/CarouselNavigator';
import { TAB_BAR_HEIGHT } from '../components/SwipeableTabs';
import WhiteBackgroundWrapper from '../components/WhiteBackgroundWrapper';
import { LIFT_RATINGS } from '../constants/liftRatings';
import { useAppContext } from '../firebase/AppContext';
import { getDateKey, getTodayKey, parseDateKey } from '../firebase/dateHelpers';
import { auth, firestore } from '../firebase/firebase';
import { postSystemMessage } from '../firebase/systemMessages';
import {
  fetchSharedSplits,
  removeSharedSplit,
  saveCustomSplit,
  saveMySharedSplit,
  saveSharedSplits,
  saveShowWorkout,
  saveWorkoutPlan,
} from '../firebase/userProfileHelpers';
import { colors, fonts } from '../theme';
import {
  ANIM_BUTTON_POP,
  ANIM_BUTTON_PRESS,
  ANIM_MEDIUM
} from '../utils/animations';
import {
  normalizeSharedSplitList,
  normalizeWorkoutPlan,
} from '../utils/splitSharing';
import { formatUserDisplayName } from '../utils/userDisplayName';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const MASS_LOGO = require('../assets/mass-logo.png');
const COMPS_LOGO = require('../assets/comps-logo.png');
const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type IoniconProps = ComponentProps<typeof Ionicons> & {
  style?: any;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
};
const AnimatedIcon = ({ style, pointerEvents, ...rest }: IoniconProps) => (
  <Animated.View style={style} pointerEvents={pointerEvents}>
    <Ionicons {...rest} />
  </Animated.View>
);

const SectionHeader = React.memo(
  ({
    title,
    logo,
    onPrev,
    onNext,
    canPrev = true,
    canNext = true,
    leftSlot,
    rightSlot,
    children,
  }: {
    title?: string;
    logo: any;
    onPrev?: () => void;
    onNext?: () => void;
    canPrev?: boolean;
    canNext?: boolean;
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <View style={styles.massHeaderRow}>
      <View style={styles.massHeaderSide}>
        {leftSlot ?? (onPrev ? (
          <Pressable
            onPress={onPrev}
            disabled={!canPrev}
            hitSlop={10}
            style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.gray} />
          </Pressable>
        ) : null)}
      </View>
      <View style={styles.massHeaderCenter}>
        <RNImage
          source={logo}
          style={styles.massHeaderLogo}
          resizeMode="contain"
        />
        {title ? <Text style={styles.massHeaderTxt}>{title}</Text> : null}
      </View>
      <View style={styles.massHeaderSideRight}>
        {rightSlot ?? children}
        {!rightSlot && onNext ? (
          <Pressable
            onPress={onNext}
            disabled={!canNext}
            hitSlop={10}
            style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.gray} />
          </Pressable>
        ) : null}
      </View>
    </View>
  ),
);

const CAROUSEL_INDEX_KEY = 'calendarCarouselIndex';
// Persist carousel position across component unmounts
let lastCarouselIndex = 0;


// ---------- Types ----------
type SplitDay = {
  title: string;
  lifts: string[];
  notes: string;
};

type WorkoutPlan = {
  name: string;
  startDate: string; // YYYY-MM-DD
  notes?: string;
  days: SplitDay[];
  postponedDates?: string[];
};

// ---------- Default Splits ----------
function getDefaultPPL(): WorkoutPlan {
  const iso = getDateKey(new Date());
  return {
    name: 'Push-Pull-Legs',
    startDate: iso,
    days: [
      {
        title: 'Push Day',
        lifts: [
          'Standard Bench',
          'Incline Bench',
          'Cable Flys',
          'Rope Pulldowns',
          'Rope Overhead Extensions',
          'Kickbacks',
          'Lateral Raises (Cable)',
        ],
        notes: '',
      },
      {
        title: 'Pull Day',
        lifts: [
          'Rope Pulldowns',
          'Rows',
          'Cable Pull-Overs',
          'Face Pulls',
          'Spider Curls/Preacher Curls',
          'Hammer Curls',
          'Drag Curls',
        ],
        notes: '',
      },
      {
        title: 'Leg Day',
        lifts: [
          'Leg Extensions',
          'Squats',
          'Sissy Squats',
          'Leg Curls',
          'Adductors',
          'Abductors',
          'Calf Raises',
        ],
        notes: '',
      },
      {
        title: 'Push Day',
        lifts: [
          'Standard Bench',
          'Incline Bench',
          'Cable Flys',
          'Rope Pulldowns',
          'Rope Overhead Extensions',
          'Dips',
          'Lateral Raises (Cable)',
        ],
        notes: '',
      },
      {
        title: 'Pull Day',
        lifts: [
          'Rope Pulldowns',
          'Rows',
          'Cable Pull-Overs',
          'Face Pulls',
          'Spider Curls/Preacher Curls',
          'Hammer Curls',
          'Drag Curls',
        ],
        notes: '',
      },
      {
        title: 'Leg Day',
        lifts: [
          'Leg Extensions',
          'Squats',
          'Sissy Squats',
          'Leg Curls',
          'Adductors',
          'Abductors',
          'Calf Raises',
        ],
        notes: '',
      },
      { title: 'Rest Day', lifts: [], notes: '' },
    ],
  };
}

function getDefaultBCAL(): WorkoutPlan {
  const iso = getDateKey(new Date());
  return {
    name: 'Back-Chest-Arms-Legs',
    startDate: iso,
    days: [
      {
        title: 'Back Day',
        lifts: [
          'Rope Pulldowns',
          'Rows',
          'Cable Pull-Overs',
          'Face Pulls',
          'Reverse Flys',
        ],
        notes: '',
      },
      {
        title: 'Chest/Delts Day',
        lifts: [
          'Standard Bench',
          'Incline Bench',
          'Cable Flys',
          'Lateral Raises (Cable)',
          'Front Raises',
        ],
        notes: '',
      },
      {
        title: 'Bi/Triceps Day',
        lifts: [
          'Spider Curls/Preacher Curls',
          'Hammer Curls',
          'Drag Curls',
          'Rope Pulldowns',
          'Rope Overhead Extensions',
          'Kickbacks',
          'Dumbbell Twists',
        ],
        notes: '',
      },
      {
        title: 'Leg Day',
        lifts: [
          'Leg Extensions',
          'Squats',
          'Sissy Squats',
          'Leg Curls',
          'Adductors',
          'Abductors',
          'Calf Raises',
        ],
        notes: '',
      },
      { title: 'Rest Day', lifts: [], notes: '' },
    ],
  };
}

// ---------- Helpers ----------
function getNext7Days() {
  const out: { date: Date; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    out.push({
      date: d,
      label: d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    });
  }
  return out;
}

function getCurrentDayIndex(plan: WorkoutPlan): number | null {
  const todayKey = getDateKey(new Date());
  const todayDate = parseDateKey(todayKey);
  const startDate = parseDateKey(plan.startDate);
  if (!todayDate || !startDate) return null;
  const totalDiff = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000);
  const postponed = plan.postponedDates || [];
  const isPostponed = postponed.includes(todayKey);
  const pastSkips = postponed.filter(d => d < todayKey).length;
  const diffIdx = totalDiff - pastSkips;
  if (!isPostponed && diffIdx >= 0) {
    return diffIdx % plan.days.length;
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
    return result as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------- Lift Categories ----------
const MASS_YELLOW = '#FFD700';

const LIFT_CATEGORIES: Record<string, string[]> = {
  'Chest Lifts': [
    'Standard Bench',
    'Incline Bench',
    'Pushups',
    'Chest Flys',
    'Chest-Focused Dips',
  ],
  'Shoulder Lifts': [
    'Lateral Raises (Cable)',
    'Lateral Raises (Dumbell)',
    'Front Raises',
    'Shoulder Press',
    'Face Pulls',
    'Reverse Flys',
  ],
  'Back Lifts': [
    'Pulldowns',
    'Single-Arm Cable Pulldowns',
    'Cable Pull-Overs',
    'Rows',
  ],
  'Triceps Lifts': [
    'Rope Pulldowns',
    'Rope Overhead Extensions',
    'Kickbacks',
    'Dips',
    'Close-Grip Bench/Skull-Crushers',
  ],
  'Biceps Lifts': [
    'Hammer Curls',
    'Spider Curls/Preacher Curls',
    'Drag Curls',
    'Bayesian Curls',
    'Supinating Curls',
  ],
  'Forearm Lifts': [
    'Cable Twist-Ups',
    'Cable Twist-Downs',
    'Dumbbell Twists',
    'Reverse-Grip Curls',
  ],
  'Leg Lifts': [
    'Squats',
    'Bulgarian Split Squat',
    'Sissy Squats',
    'Leg Extensions',
    'RDLs',
    'Leg Curls',
    'Adductors',
    'Abductors',
    'Calf Raises',
  ],
};

const CATEGORY_HEADS: Record<string, string> = {
  'Chest Lifts': 'Heads: Upper, Mid',
  'Shoulder Lifts': 'Heads: Front, Side, Rear Delts',
  'Back Lifts': 'Heads: Lats, Mid Back, Teres Major',
  'Triceps Lifts': 'Heads: Long, Lateral, Medial',
  'Biceps Lifts': 'Heads: Long, Short, Brachialis',
  'Forearm Lifts': 'Heads: Supinators, Pronators, Brachioradialis, Wrist Extensors',
  'Leg Lifts': 'Heads: Quads, Glutes, Hamstrings, Adductors, Abductors',
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  type?: string;
};

// ----- MASS Events -----
const MASS_EVENTS = [
  {
    id: 'coffee',
    name: 'Coffee Hour',
    icon: 'cafe-outline',
    weekday: 0,
    location: 'Zoom',
    link: 'https://zoom.us',
  },
  {
    id: 'orientation',
    name: 'New Member Orientation',
    icon: 'people-outline',
    weekday: 3,
    location: 'Zoom',
    link: 'https://zoom.us',
  },
];

const fakeComps = [
  { id: 'bench', name: 'Bench Press Throwdown', status: 'Coming Soon', color: colors.purple },
  { id: 'bulk', name: 'Bulk King of the Month', status: 'Coming Soon', color: colors.purple },
  { id: 'photo', name: 'Progress Photo Battle', status: 'Coming Soon', color: colors.purple },
];

const DRAWER_HEIGHT = 260;

function getNextOccurrence(weekday: number, hour: number, minute: number) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  const diff = (weekday - now.getDay() + 7) % 7;
  next.setDate(now.getDate() + diff);
  if (diff === 0 && next <= now) next.setDate(next.getDate() + 7);
  return next;
}

function formatCountdown(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h} hr${h > 1 ? 's' : ''} ${m} min`;
  if (h) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

type CalendarScreenProps = {
  news: any[];
  newsLoaded: boolean;
  user: any;
  onNewsAdded?: (item: any) => void;
};

function CalendarScreen({ news, newsLoaded, user, onNewsAdded }: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const timeoutMs = user?.timeoutUntil
    ? (typeof user.timeoutUntil.toMillis === 'function'
        ? user.timeoutUntil.toMillis()
        : user.timeoutUntil) - Date.now()
    : 0;
  const isTimedOut = timeoutMs > 0;
  const hLeft = Math.floor(timeoutMs / 3600000);
  const mLeft = Math.floor((timeoutMs % 3600000) / 60000);
  const [days, setDays] = useState(getNext7Days());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(getDateKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date());

  const [addNewsOpen, setAddNewsOpen] = useState(false);
  const [newsText, setNewsText] = useState('');
  const [savingNews, setSavingNews] = useState(false);

  const [tick, setTick] = useState(0);

  const badgeProgress = useMemo(() => getUserBadgeProgress(user), [user]);
  const mergedNews = useMemo(
    () => [...(news || []), ...badgeProgress],
    [news, badgeProgress]
  );

  const [showWorkout, setShowWorkout] = useState(false);
  const [showWorkoutLoaded, setShowWorkoutLoaded] = useState(false);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [customSplit, setCustomSplit] = useState<WorkoutPlan | null>(null);
  const [customSplitLoaded, setCustomSplitLoaded] = useState(false);
  const [sharedSplits, setSharedSplits] = useState<any[]>([]);
  const [sharedLoaded, setSharedLoaded] = useState(false);
  const uid = auth().currentUser?.uid;
  const customSplitKey = `customSplit_${uid || 'guest'}`;
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);
  const [renderPlanDrawer, setRenderPlanDrawer] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const initialLoadRequestId = useRef(0);
  const planLoadRequestId = useRef(0);

  // Icon animations for Split actions
  const editScale = useRef(new Animated.Value(1)).current;
  const deleteScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;

  const [showWorkoutDrawer, setShowWorkoutDrawer] = useState(false);
  const [renderWorkoutDrawer, setRenderWorkoutDrawer] = useState(false);

  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const dayArrowRef = useRef<TouchableOpacity | null>(null);
  const [dayArrowPos, setDayArrowPos] = useState({ x: 0, y: 0 });
  const [dayDropdownWidth, setDayDropdownWidth] = useState(0);
  const dayMenuOpenedAt = useRef(0);
  const ignoreNextDayMenuPress = useRef(false);
  const chevronScale = useRef(new Animated.Value(1)).current;
  const chevronRotate = useRef(new Animated.Value(0)).current;

  const { width: screenWidth, height: windowHeight } = useWindowDimensions();
  const containerWidth = screenWidth;
  const carouselWidth = containerWidth;
  const pageWidth = carouselWidth;
  const cardOuterPadding = clampValue(screenWidth * 0.03, 8, 14);
  const carouselCardWidth = pageWidth - cardOuterPadding * 2;
  const carouselCardPadding = clampValue(screenWidth * 0.06, 18, 26);
  const padBottom = !renderPlanDrawer;
  const cardMinHeight = useMemo(
    () => clampValue(windowHeight * 0.35, 260, 360),
    [windowHeight],
  );
  const PLAN_DRAWER_HEIGHT = windowHeight * 0.8;
  const WORKOUT_DRAWER_MAX_HEIGHT = windowHeight * 0.6;

  // Styles that depend on carousel width
  const carouselCardStyle = useMemo(
    () => [
      styles.carouselCard,
      {
        width: '100%',
        marginHorizontal: 0,
        flex: 1,
        paddingHorizontal: carouselCardPadding,
      },
    ],
    [carouselCardPadding],
  );
  const carouselChipStyle = useMemo(
    () => [styles.carouselChip, { width: carouselCardWidth - 60 }],
    [carouselCardWidth],
  );
  
  const DRAWER_ANIM_DURATION = ANIM_MEDIUM;
  const planDrawerAnim = useRef(new Animated.Value(PLAN_DRAWER_HEIGHT)).current;
  const planDrawerOverlay = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    planDrawerAnim.setValue(showPlanDrawer ? 0 : PLAN_DRAWER_HEIGHT);
  }, [PLAN_DRAWER_HEIGHT, showPlanDrawer]);
  const [drawerOffset] = useState(DRAWER_HEIGHT);
  const drawerOffsetRef = useRef(DRAWER_HEIGHT);
  const drawerAnim = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const drawerOverlay = useRef(new Animated.Value(0)).current;
  const lastTodayKeyRef = useRef(getTodayKey());

  useEffect(() => {
    Animated.timing(chevronRotate, {
      toValue: dayMenuOpen ? 1 : 0,
      duration: ANIM_MEDIUM,
      useNativeDriver: true,
    }).start();
  }, [dayMenuOpen, chevronRotate]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const workoutOverlayInsets = useMemo(
    () => ({
      top: -insets.top,
      bottom: -insets.bottom,
      left: -insets.left,
      right: -insets.right,
    }),
    [insets],
  );

  const planOverlayInsets = useMemo(
    () => ({
      top: -insets.top,
      bottom: -insets.bottom,
      left: -insets.left,
      right: -insets.right,
    }),
    [insets],
  );

  const {
    workoutHistory,
    calendarCarouselIndex,
    setCalendarCarouselIndex,
  } = useAppContext();
  const todayKey = getTodayKey();
  const hasCheckinToday =
    Array.isArray(workoutHistory) &&
    workoutHistory.some((h: any) =>
      typeof h === 'string' ? h === todayKey : h?.date === todayKey,
    );


  const carouselItems = useMemo(
    () => ['massEvents', 'news', 'comps', 'events'],
    [],
  );
  const carouselIndexPersist = useRef(calendarCarouselIndex);
  const [carouselIndex, setCarouselIndex] = useState(carouselIndexPersist.current);
  const [carouselIndexHydrated, setCarouselIndexHydrated] = useState(false);
  const carouselScrollRef = useRef<ScrollView | null>(null);
  const carouselLockRef = useRef(false);
  const lastRequestedIndexRef = useRef<number | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselHasScrolledRef = useRef(false);
  const carouselUserActionRef = useRef(false);
  const lastScrollIndexRef = useRef<number>(carouselIndex);
  const isCarouselAnimatingRef = useRef(false);
  const carouselUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [carouselPersistTick, setCarouselPersistTick] = useState(0);
  const goToIndex = useCallback(
    (next: number | ((cur: number) => number)) => {
      if (!carouselIndexHydrated) return;
      const baseIndex =
        lastRequestedIndexRef.current ?? lastScrollIndexRef.current ?? carouselIndex;
      const target = typeof next === 'function' ? next(baseIndex) : next;
      const clamped = clampValue(target, 0, carouselItems.length - 1);

      if (carouselLockRef.current) {
        lastRequestedIndexRef.current = clamped;
        return;
      }

      carouselLockRef.current = true;
      isCarouselAnimatingRef.current = true;
      carouselUserActionRef.current = true;
      lastRequestedIndexRef.current = null;
      lastScrollIndexRef.current = clamped;

      if (clamped !== carouselIndex) {
        setCarouselIndex(clamped);
      }

      carouselScrollRef.current?.scrollTo({
        x: clamped * pageWidth,
        animated: true,
      });
    },
    [carouselIndex, carouselIndexHydrated, carouselItems.length, pageWidth],
  );
  const jumpToScene = useCallback(
    (sceneKey: string) => {
      const targetIndex = carouselItems.indexOf(sceneKey);
      if (targetIndex >= 0) {
        goToIndex(targetIndex);
      }
    },
    [carouselItems, goToIndex],
  );
  const loadedCarouselIndex = useRef(false);
  useEffect(() => {
    if (loadedCarouselIndex.current) return;
    let mounted = true;
    const initialIndex = carouselIndexPersist.current;
    AsyncStorage.getItem(CAROUSEL_INDEX_KEY)
      .then(val => {
        if (!mounted) return;
        loadedCarouselIndex.current = true;
        const parsedIdx = val != null ? parseInt(val, 10) : NaN;
        const resolvedIndex = !isNaN(parsedIdx)
          ? Math.min(Math.max(parsedIdx, 0), carouselItems.length - 1)
          : initialIndex;
        carouselIndexPersist.current = resolvedIndex;
        lastScrollIndexRef.current = resolvedIndex;
        lastCarouselIndex = resolvedIndex;
        if (resolvedIndex !== calendarCarouselIndex) {
          setCalendarCarouselIndex(resolvedIndex);
        }
        if (resolvedIndex !== carouselIndex) {
          setCarouselIndex(resolvedIndex);
        }
        setCarouselIndexHydrated(true);
      })
      .catch(() => {
        loadedCarouselIndex.current = true;
        setCarouselIndexHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [calendarCarouselIndex, carouselIndex, carouselItems.length, setCalendarCarouselIndex]);
  useEffect(() => {
    if (!carouselIndexHydrated) return;
    carouselIndexPersist.current = carouselIndex;
    lastCarouselIndex = carouselIndex;
    if (isCarouselAnimatingRef.current || carouselUserActionRef.current) return;
    setCalendarCarouselIndex(carouselIndex);
    AsyncStorage.setItem(CAROUSEL_INDEX_KEY, String(carouselIndex)).catch(err =>
      console.error('Failed to save carousel index', err)
    );
  }, [carouselIndex, carouselIndexHydrated, carouselPersistTick, setCalendarCarouselIndex]);

  useEffect(
    () => () => {
      if (carouselUnlockTimeoutRef.current) {
        clearTimeout(carouselUnlockTimeoutRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    if (!carouselIndexHydrated) return;
    if (!carouselHasScrolledRef.current) {
      carouselScrollRef.current?.scrollTo({
        x: carouselIndex * pageWidth,
        animated: false,
      });
      carouselHasScrolledRef.current = true;
    }
  }, [carouselIndex, carouselIndexHydrated, pageWidth]);
  const lastDayDropdownWidthRef = useRef<number>(0);
  const lastWorkoutContainerHeightRef = useRef<number>(0);

  useEffect(() => {
    drawerOffsetRef.current = drawerOffset;
    if (!showWorkoutDrawer) {
      drawerAnim.setValue(drawerOffset);
    }
  }, [drawerOffset, showWorkoutDrawer]);

  const selectedDate = useMemo(() => {
    if (!days.length) return new Date();
    const safeIndex = Math.min(Math.max(selectedIndex, 0), days.length - 1);
    return days[safeIndex]?.date ?? new Date();
  }, [days, selectedIndex]);

  const refreshDays = useCallback(() => {
    setDays(getNext7Days());
  }, []);

  useEffect(() => {
    if (!days.length) return;
    const matchIndex = days.findIndex(day => getDateKey(day.date) === selectedDateKey);
    if (matchIndex >= 0 && matchIndex !== selectedIndex) {
      setSelectedIndex(matchIndex);
      return;
    }
    if (matchIndex === -1) {
      const todayKey = getTodayKey();
      const todayIndex = days.findIndex(day => getDateKey(day.date) === todayKey);
      const fallbackIndex = todayIndex >= 0 ? todayIndex : 0;
      if (fallbackIndex !== selectedIndex) {
        setSelectedIndex(fallbackIndex);
      }
      setSelectedDateKey(getDateKey(days[fallbackIndex].date));
    }
  }, [days, selectedDateKey, selectedIndex]);

  useEffect(() => {
    const nextKey = getDateKey(selectedDate);
    if (nextKey !== selectedDateKey) {
      setSelectedDateKey(nextKey);
    }
  }, [selectedDate, selectedDateKey]);

  useFocusEffect(
    useCallback(() => {
      refreshDays();
      return () => {
        setDayMenuOpen(false);
        setShowPlanDrawer(false);
        setRenderPlanDrawer(false);
        setShowWorkoutDrawer(false);
        setRenderWorkoutDrawer(false);
        setShowScheduler(false);
        setShowDatePicker(false);
        setShowTimePicker(false);
      };
    }, [refreshDays]),
  );

  const workoutVisible = showWorkout && !!plan;

  const computeEventsForDate = React.useCallback(
    (date: Date): CalendarEvent[] => {
      const dateKey = getDateKey(date);
      const list: CalendarEvent[] = [];
      if (date.getDay() === 0) {
        list.push({
          id: 'coffee',
          title: 'Coffee Hour',
          date: dateKey,
        });
      }
      if (date.getDay() === 3) {
        list.push({
          id: 'orientation',
          title: 'Orientation',
          date: dateKey,
        });
      }
      events.forEach(ev => {
        if (ev.date === dateKey) list.push(ev);
      });
      if (workoutVisible && plan) {
        const startDate = parseDateKey(plan.startDate);
        const currentDate = parseDateKey(dateKey);
        if (startDate && currentDate) {
          const totalDiff = Math.floor(
            (currentDate.getTime() - startDate.getTime()) / 86400000,
          );
          const postponed = plan.postponedDates || [];
          const isPostponed = postponed.includes(dateKey);
          const pastSkips = postponed.filter(d => d < dateKey).length;
          const diff = totalDiff - pastSkips;
          if (!isPostponed && diff >= 0) {
            const workoutDay = plan.days[diff % plan.days.length];
            list.push({
              id: 'workout-' + diff,
              title: workoutDay.title,
              date: dateKey,
              type: 'workout',
            });
          }
        }
      }
      return list;
    },
    [events, workoutVisible, plan],
  );


  useEffect(() => {
    let active = true;
    const requestId = ++initialLoadRequestId.current;
    const safeUpdate = (action: () => void) => {
      if (!isMountedRef.current || !active || requestId !== initialLoadRequestId.current) {
        return;
      }
      action();
    };

    (async () => {
      let custom: WorkoutPlan | null = null;
      let shared: any[] = [];

      try {
        const storedToggle = await AsyncStorage.getItem('showWorkout');
        if (storedToggle) {
          safeUpdate(() => setShowWorkout(storedToggle === 'true'));
        }

        const storedPlan = await AsyncStorage.getItem('workoutPlan');
        if (storedPlan) {
          try {
            safeUpdate(() => setPlan(JSON.parse(storedPlan)));
          } catch {
            await AsyncStorage.removeItem('workoutPlan');
          }
        }

        const storedCustom = await AsyncStorage.getItem(customSplitKey);
        if (storedCustom) {
          try {
            custom = normalizeWorkoutPlan(JSON.parse(storedCustom));
            if (!custom) await AsyncStorage.removeItem(customSplitKey);
          } catch {
            await AsyncStorage.removeItem(customSplitKey);
          }
        }

        const storedShared = await AsyncStorage.getItem('sharedSplits');
        if (storedShared) {
          try {
            shared = normalizeSharedSplitList(JSON.parse(storedShared));
            if (!shared.length) await AsyncStorage.removeItem('sharedSplits');
          } catch {
            await AsyncStorage.removeItem('sharedSplits');
          }
        }

        const uid = auth().currentUser?.uid;
        if (uid) {
          const doc = await withTimeout(
            firestore().collection('users').doc(uid).get(),
            15000,
            'Profile request timed out',
          );
          const remoteToggle = doc.data()?.showWorkout;
          if (typeof remoteToggle === 'boolean') {
            safeUpdate(() => setShowWorkout(remoteToggle));
            await AsyncStorage.setItem('showWorkout', remoteToggle ? 'true' : 'false');
          }
          const remote = normalizeWorkoutPlan(doc.data()?.customSplit);
          if (remote) {
            custom = remote;
            await AsyncStorage.setItem(customSplitKey, JSON.stringify(remote));
          }
          try {
            const remoteShared = await withTimeout(
              fetchSharedSplits(),
              15000,
              'Shared splits request timed out',
            );
            if (remoteShared && Array.isArray(remoteShared)) {
              shared = normalizeSharedSplitList(remoteShared);
              await AsyncStorage.setItem('sharedSplits', JSON.stringify(shared));
            }
          } catch (err) {
            console.error('Failed to fetch shared splits', err);
            safeUpdate(() =>
              setPlanLoadError('Unable to sync shared splits. Using cached data.'),
            );
          }
        }
      } catch (e) {
        console.error('Failed to load profile data from Firestore', e);
        safeUpdate(() =>
          setPlanLoadError('Unable to sync workout data. Using cached data.'),
        );
      }

      safeUpdate(() => {
        if (custom) setCustomSplit(custom);
        if (Array.isArray(shared)) setSharedSplits(shared);
        setSharedLoaded(true);
        setCustomSplitLoaded(true);
        setShowWorkoutLoaded(true);
      });
    })();

    return () => {
      active = false;
    };
  }, [customSplitKey]);

  useEffect(() => {
    if (!showWorkoutLoaded) return;
    AsyncStorage.setItem('showWorkout', showWorkout ? 'true' : 'false');
    saveShowWorkout(showWorkout).catch(err =>
      console.error('Failed to save showWorkout', err)
    );
  }, [showWorkout, showWorkoutLoaded]);

  useEffect(() => {
    if (plan) AsyncStorage.setItem('workoutPlan', JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    if (!customSplitLoaded) return;
    if (customSplit) {
      AsyncStorage.setItem(customSplitKey, JSON.stringify(customSplit));
      saveCustomSplit(customSplit).catch(err =>
        console.error('Failed to save custom split', err)
      );
    } else {
      AsyncStorage.removeItem(customSplitKey);
      saveCustomSplit(null).catch(err =>
        console.error('Failed to clear custom split', err)
      );
    }
  }, [customSplit, customSplitLoaded]);

  useEffect(() => {
    if (!sharedLoaded) return;
    AsyncStorage.setItem('sharedSplits', JSON.stringify(sharedSplits));
    saveSharedSplits(sharedSplits).catch(err =>
      console.error('Failed to save shared splits', err)
    );
  }, [sharedSplits, sharedLoaded]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const todayKey = getTodayKey();
    if (todayKey !== lastTodayKeyRef.current) {
      lastTodayKeyRef.current = todayKey;
      refreshDays();
    }
  }, [tick, refreshDays]);

  const dayEvents = useMemo(
    () => computeEventsForDate(selectedDate),
    [selectedDate, computeEventsForDate],
  );

  const MAX_PREVIEW_ITEMS = 3;
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllMassEvents, setShowAllMassEvents] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const [showAllComps, setShowAllComps] = useState(false);

  const massEvents = useMemo(() => {
    const base = MASS_EVENTS.map(info => {
      const next = getNextOccurrence(info.weekday, 9, 0);
      const diff = next.getTime() - Date.now();
      return { ...info, next, diff };
    });
  
    if (workoutVisible && plan) {
      const todayKey = getDateKey(new Date());
      const todayDate = parseDateKey(todayKey);
      const startDate = parseDateKey(plan.startDate);
      if (todayDate && startDate) {
        const totalDiff = Math.floor(
          (todayDate.getTime() - startDate.getTime()) / 86400000,
        );
        const postponed = plan.postponedDates || [];
        const isPostponed = postponed.includes(todayKey);
        const pastSkips = postponed.filter(d => d < todayKey).length;
        const diffIdx = totalDiff - pastSkips;
        if (!isPostponed && diffIdx >= 0) {
          const workoutDay = plan.days[diffIdx % plan.days.length];
          const todayAtNine = new Date(todayDate);
          todayAtNine.setHours(9, 0, 0, 0);
          base.unshift({
            id: 'workout-today',
            name: workoutDay.title,
            icon: 'barbell-outline',
            weekday: todayAtNine.getDay(),
            location: '',
            link: '',
            next: todayAtNine,
            diff: todayAtNine.getTime() - Date.now(),
            isWorkout: true,
          });
        }
      }
    }

    return base;
  }, [tick, workoutVisible, plan]);

  const eventsPreview = useMemo(
    () => dayEvents.slice(0, MAX_PREVIEW_ITEMS),
    [dayEvents, MAX_PREVIEW_ITEMS],
  );
  const massEventsPreview = useMemo(
    () => massEvents.slice(0, MAX_PREVIEW_ITEMS),
    [massEvents, MAX_PREVIEW_ITEMS],
  );
  const newsPreview = useMemo(
    () => mergedNews.slice(0, MAX_PREVIEW_ITEMS),
    [mergedNews, MAX_PREVIEW_ITEMS],
  );
  const compsPreview = useMemo(
    () => fakeComps.slice(0, MAX_PREVIEW_ITEMS),
    [MAX_PREVIEW_ITEMS],
  );
  const hasMoreEvents = dayEvents.length > MAX_PREVIEW_ITEMS;
  const hasMoreMassEvents = massEvents.length > MAX_PREVIEW_ITEMS;
  const hasMoreNews = mergedNews.length > MAX_PREVIEW_ITEMS;
  const hasMoreComps = fakeComps.length > MAX_PREVIEW_ITEMS;

  const showSplitPlaceholder = !workoutVisible;

  const todayWorkout = useMemo(() => {
    if (!workoutVisible || !plan) return null;
    const todayKey = getDateKey(new Date());
    const todayDate = parseDateKey(todayKey);
    const startDate = parseDateKey(plan.startDate);
    if (!todayDate || !startDate) return null;
    const totalDiff = Math.floor(
      (todayDate.getTime() - startDate.getTime()) / 86400000,
    );
    const postponed = plan.postponedDates || [];
    const isPostponed = postponed.includes(todayKey);
    const pastSkips = postponed.filter(d => d < todayKey).length;
    const diffIdx = totalDiff - pastSkips;
    if (!isPostponed && diffIdx >= 0) {
      return plan.days[diffIdx % plan.days.length];
    }
    return null;
  }, [tick, workoutVisible, plan]);

  const [liftChecks, setLiftChecks] = useState<Record<string, boolean>>({});

  const workoutScrollY = useRef(new Animated.Value(0)).current;
  const [workoutContainerHeight, setWorkoutContainerHeight] = useState(0);
  const [workoutContentHeight, setWorkoutContentHeight] = useState(0);
  const workoutArrowOpacity = useMemo(
    () =>
      workoutScrollY.interpolate({
        inputRange: [0, Math.max(1, workoutContentHeight - workoutContainerHeight)],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [workoutScrollY, workoutContentHeight, workoutContainerHeight],
  );

  useEffect(() => {
    setLiftChecks({});
  }, [selectedIndex]);

  useEffect(() => {
    const currentDrawerOffset = drawerOffsetRef.current;
    if (showWorkoutDrawer) {
      drawerAnim.setValue(currentDrawerOffset);
      drawerOverlay.setValue(0);
      setRenderWorkoutDrawer(true);
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: 0,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(drawerOverlay, {
          toValue: 1,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (renderWorkoutDrawer) {
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: currentDrawerOffset,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(drawerOverlay, {
          toValue: 0,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setRenderWorkoutDrawer(false));
    }
  }, [showWorkoutDrawer, renderWorkoutDrawer]);

  useEffect(() => {
    if (showPlanDrawer) {
      setRenderPlanDrawer(true);
    } else if (renderPlanDrawer) {
      Animated.parallel([
        Animated.timing(planDrawerAnim, {
          toValue: PLAN_DRAWER_HEIGHT,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(planDrawerOverlay, {
          toValue: 0,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setRenderPlanDrawer(false));
    }
  }, [showPlanDrawer, PLAN_DRAWER_HEIGHT]);

  useEffect(() => {
    if (renderPlanDrawer && showPlanDrawer) {
      planDrawerAnim.setValue(PLAN_DRAWER_HEIGHT);
      planDrawerOverlay.setValue(0);
      Animated.parallel([
        Animated.timing(planDrawerAnim, {
          toValue: 0,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(planDrawerOverlay, {
          toValue: 1,
          duration: DRAWER_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [renderPlanDrawer, showPlanDrawer, PLAN_DRAWER_HEIGHT]);

  const planDrawerInteractive = renderPlanDrawer && showPlanDrawer;
  const workoutDrawerInteractive = renderWorkoutDrawer && showWorkoutDrawer;

  useEffect(() => {
    if (!__DEV__) return;
    console.log('CalendarScreen renderPlanDrawer', renderPlanDrawer);
  }, [renderPlanDrawer]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('CalendarScreen renderWorkoutDrawer', renderWorkoutDrawer);
  }, [renderWorkoutDrawer]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('CalendarScreen overlay interactive', {
      plan: planDrawerInteractive,
      workout: workoutDrawerInteractive,
    });
  }, [planDrawerInteractive, workoutDrawerInteractive]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('CalendarScreen dayMenuOpen', dayMenuOpen);
  }, [dayMenuOpen]);

  // ---------- Plan Actions ----------
  const handleTogglePlans = (v: boolean) => {
    if (v) {
      if (!plan) {
        const p = getDefaultPPL();
        setPlan(p);
      }
      setShowWorkout(true);
    } else {
      setShowWorkout(false);
    }
  };

  const selectPlan = (p: WorkoutPlan) => {
    const iso = getDateKey(new Date());
    setPlan({ ...p, startDate: iso });
  };

  const navigation = useNavigation();

  const openCustomBuilder = () => {
    navigation.navigate('SplitEditor', {
      initialSplit: null,
    });
  };

  const handleCustomPlanSaved = (newPlan: WorkoutPlan) => {
    setCustomSplit(newPlan);
    selectPlan(newPlan);
    AsyncStorage.setItem(customSplitKey, JSON.stringify(newPlan)).catch(err =>
      console.error('Failed to save custom split', err)
    );
    saveCustomSplit(newPlan).catch(err =>
      console.error('Failed to save custom split', err)
    );
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('customSplitSaved', handleCustomPlanSaved);
    return () => sub.remove();
  }, [handleCustomPlanSaved]);

  const openPlanDrawerFromButton = async () => {
    setShowWorkoutDrawer(false);
    setDayMenuOpen(false);
    setShowPlanDrawer(true);
    if (planLoading) return;
    const requestId = ++planLoadRequestId.current;
    const safeUpdate = (action: () => void) => {
      if (!isMountedRef.current || requestId !== planLoadRequestId.current) return;
      action();
    };
    safeUpdate(() => {
      setPlanLoadError(null);
      setPlanLoading(true);
    });
    try {
      const uid = auth().currentUser?.uid;
      if (uid) {
        const doc = await withTimeout(
          firestore().collection('users').doc(uid).get(),
          15000,
          'Profile request timed out',
        );
        const remote = normalizeWorkoutPlan(doc.data()?.customSplit);
        if (remote) {
          safeUpdate(() => setCustomSplit(remote));
        }
        try {
          const remoteShared = await withTimeout(
            fetchSharedSplits(),
            15000,
            'Shared splits request timed out',
          );
          if (Array.isArray(remoteShared)) {
            safeUpdate(() => setSharedSplits(normalizeSharedSplitList(remoteShared)));
          }
        } catch (err) {
          console.error('Failed to fetch shared splits', err);
          safeUpdate(() =>
            setPlanLoadError('Unable to refresh shared splits. Try again.'),
          );
        }
      }
    } catch (e) {
      console.error('Failed to fetch customSplit', e);
      safeUpdate(() => setPlanLoadError('Unable to refresh plans. Try again.'));
    } finally {
      safeUpdate(() => setPlanLoading(false));
    }
  };

  const closePlanDrawer = () => {
    setDayMenuOpen(false);
    setShowPlanDrawer(false);
    if (plan)
      saveWorkoutPlan(plan).catch(err =>
        console.error('Failed to save workout plan', err)
      );
  };

  const openEditCustomBuilder = () => {
    if (!customSplit) return;
    navigation.navigate('SplitEditor', {
      initialSplit: customSplit,
    });
  };

  const deleteCustomSplit = () => {
    if (!customSplit) return;
    Alert.alert(
      'Delete Split',
      `Are you sure you want to delete ${customSplit.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCustomSplit(null);
            setPlan(null);
          },
        },
      ],
    );
  };

  const deleteSharedSplit = async (id: string) => {
    const target = sharedSplits.find(s => s.id === id);
    setSharedSplits(list => {
      const updated = list.filter(s => s.id !== id);
      AsyncStorage.setItem('sharedSplits', JSON.stringify(updated));
      saveSharedSplits(updated).catch(err =>
        console.error('Failed to save shared splits', err)
      );
      return updated;
    });
    await removeSharedSplit(id);
    if (target?.msgId) {
      firestore()
        .collection('channels')
        .doc('split-sharing')
        .collection('messages')
        .doc(target.msgId)
        .update({ saveCount: firestore.FieldValue.increment(-1) })
        .catch(err => console.error('Failed to update save count', err));
    }
    DeviceEventEmitter.emit('sharedSplitsUpdated');
  };

  const shareCustomSplit = () => {
    if (!customSplit) return;
    Alert.alert(
      'Share Split',
      'Share your custom split to the Split Sharing channel for others to view and import?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          saveCount: 0,
          onPress: async () => {
            try {
              const uid = auth().currentUser?.uid;
              if (!uid) return;
              const splitCopy = normalizeWorkoutPlan(customSplit);
              if (!splitCopy) {
                Alert.alert('Share Failed', 'This split is missing required details.');
                return;
              }
              const channelDoc = firestore()
                .collection('channels')
                .doc('split-sharing');
              const messagesCollection = channelDoc.collection('messages');

              const existing = await channelDoc
                .collection('messages')
                .where('userId', '==', uid)
                .get();

              if (existing.docs.length) {
                const deleteBatch = firestore().batch();
                existing.docs.forEach(d => deleteBatch.delete(d.ref));
                await deleteBatch.commit();
              }

              const newMessage = messagesCollection.doc();
              await newMessage.set({
                userId: uid,
                split: splitCopy,
                timestamp: firestore.FieldValue.serverTimestamp(),
                reactions: [],
                saveCount: 0,
              });

              await saveMySharedSplit({
                split: splitCopy,
                msgId: newMessage.id,
                sharedAt: Date.now(),
              });

              const displayName = formatUserDisplayName(user);
              await postSystemMessage({
                channelId: 'split-sharing',
                title: 'New Shared Split',
                body: `${displayName} just shared their split!`,
              });

              Alert.alert('Shared!', 'Your split has been posted.');
            } catch (e) {
              Alert.alert('Share Failed', e.message || 'Could not share split.');
            }
          },
        },
      ],
    );
  };

  const animateIcon = (scaleAnim: Animated.Value, action: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: ANIM_BUTTON_POP,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: ANIM_BUTTON_POP,
        useNativeDriver: true,
      }),
    ]).start();
    action();
  };

  const SharedSplitItem = ({ item }: { item: any }) => {
    const iconScale = useRef(new Animated.Value(1)).current;
    return (
      <View style={styles.sharedSplitItemWrapper}>
        <View style={styles.sharedSplitContainer}>
          <Pressable
            onPress={() => selectPlan(item.split)}
            style={({ pressed }) => [
              styles.splitBtn,
              styles.sharedSplitBtn,
              plan?.name === item.split.name && styles.splitBtnActive,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <View style={styles.splitBtnTextContainer}>
              <Text
                style={[
                  styles.splitBtnTxt,
                  plan?.name === item.split.name && styles.splitBtnTxtActive,
                ]}
              >
                {item.split.name}
              </Text>
              {item.split.notes ? (
                <Text
                  style={styles.splitBtnNote}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.split.notes}
                </Text>
              ) : null}
            </View>
          </Pressable>
          <AnimatedTouchable
            onPress={() => animateIcon(iconScale, () => deleteSharedSplit(item.id))}
            style={[styles.iconAction, styles.iconSpacer]}
            accessibilityLabel="Delete shared split"
          >
            <AnimatedIcon
              name="trash-outline"
              size={28}
              color={colors.accentRed}
              style={{ transform: [{ scale: iconScale }] }}
            />
          </AnimatedTouchable>
        </View>
        <View style={styles.sharedInfoRow}>
          <Text style={styles.sharedName}>{item.fromName}</Text>
          <Text style={styles.sharedDate}>{new Date(item.savedAt).toLocaleDateString()}</Text>
        </View>
      </View>
    );
  };


  const addOneOnOne = () => {
    const iso = getDateKey(scheduleDate);
    const time = scheduleDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setEvents(evts => [
      ...evts,
      { id: 'oo-' + Date.now(), title: '1-on-1 with MASS Coach', date: iso, time, type: 'oneonone' },
    ]);
    setShowScheduler(false);
  };

  const saveNews = async () => {
    if (!newsText.trim()) return setAddNewsOpen(false);
    setSavingNews(true);
    try {
      const data = {
        message: newsText.trim(),
        active: true,
        priority: 0,
        created: firestore.FieldValue.serverTimestamp(),
      };
      const doc = await firestore().collection('news').add(data);
      onNewsAdded?.({ id: doc.id, ...data, created: new Date() });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save news.');
    } finally {
      setSavingNews(false);
      setAddNewsOpen(false);
      setNewsText('');
    }
  };

  const cancelEvent = (id: string) => {
    setEvents(evts => evts.filter(ev => ev.id !== id));
  };

  const renderDay = ({ item, index }) => (
    <Pressable
      key={getDateKey(item.date)}
      onPress={() => {
        setSelectedIndex(index);
        setSelectedDateKey(getDateKey(item.date));
      }}
      style={({ pressed }) => [
        styles.dayBtn,
        selectedIndex === index && styles.dayBtnActive,
        { transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Text style={[styles.dayLabel, selectedIndex === index && styles.dayLabelActive]}>
        {item.label}
      </Text>
    </Pressable>
  );

  const onDayDropdownLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (Math.abs(next - lastDayDropdownWidthRef.current) < 2) return;
    lastDayDropdownWidthRef.current = next;
    setDayDropdownWidth(next);
  }, []);

  const onWorkoutContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.height);
    if (Math.abs(next - lastWorkoutContainerHeightRef.current) < 2) return;
    lastWorkoutContainerHeightRef.current = next;
    setWorkoutContainerHeight(next);
  }, []);

  const ChooseSplitButton = () => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.timing(scale, {
        toValue: 1.04,
        duration: ANIM_BUTTON_POP,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.timing(scale, {
        toValue: 1,
        duration: ANIM_BUTTON_POP,
        useNativeDriver: true,
      }).start();
    };

     const [pressed, setPressed] = useState(false);

    const animatedStyle = useMemo(
      () => ({
        transform: [{ scale }],
      }),
      [scale],
    );

    return (
      <AnimatedTouchable
        onPress={openPlanDrawerFromButton}
        onPressIn={() => {
          setPressed(true);
          handlePressIn();
        }}
        onPressOut={() => {
          setPressed(false);
          handlePressOut();
        }}
        style={[
          styles.massTile,
          styles.chooseSplitTile,
          pressed && styles.chooseSplitPressed,
          animatedStyle,
        ]}
      >
        <View style={styles.chooseSplitContent}>
          <View style={styles.chooseSplitRow}>
            <Ionicons
              name="barbell-outline"
              size={22}
              color={colors.purple}
              style={styles.chooseSplitIcon}
            />
            <Text style={styles.chooseSplitTxt}>CHOOSE SPLIT</Text>
          </View>
          <Text style={styles.chooseSplitSubTxt}>
            CREATE OR CHOOSE PREBUILT SPLIT
          </Text>
        </View>
      </AnimatedTouchable>
    );
  };

  const openDayMenu = () => {
    if (!plan || !dayArrowRef.current) return;
    setShowPlanDrawer(false);
    setShowWorkoutDrawer(false);
    dayMenuOpenedAt.current = Date.now();
    ignoreNextDayMenuPress.current = true;
    lastDayDropdownWidthRef.current = 0;
    setDayDropdownWidth(0);
    setDayMenuOpen(true);
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        dayArrowRef.current?.measureInWindow((x, y, width, height) => {
          if (x === 0 && y === 0) {
            setDayMenuOpen(false);
            return;
          }
          setDayArrowPos({ x: x + width / 2, y: y + height });
        });
      });
    });
    setTimeout(() => {
      ignoreNextDayMenuPress.current = false;
    }, 250);
  };

  const closeDayMenu = () => {
    setDayMenuOpen(false);
  };

  const toggleDayMenu = () => {
    if (dayMenuOpen) {
      closeDayMenu();
    } else {
      openDayMenu();
    }
  };

  useEffect(() => {
    if (!dayMenuOpen) return;
    if (dayArrowPos.x === 0 && dayArrowPos.y === 0) {
      setDayMenuOpen(false);
      return;
    }
    if (dayDropdownWidth <= 0) return;
    const left = dayArrowPos.x - dayDropdownWidth / 2;
    const right = left + dayDropdownWidth;
    const top = dayArrowPos.y;
    if (
      left < 8 ||
      right > screenWidth - 8 ||
      top < insets.top ||
      top > windowHeight - insets.bottom - 8
    ) {
      setDayMenuOpen(false);
    }
  }, [
    dayMenuOpen,
    dayArrowPos,
    dayDropdownWidth,
    screenWidth,
    windowHeight,
    insets.top,
    insets.bottom,
  ]);

  const openWorkoutDrawer = useCallback(() => {
    setShowPlanDrawer(false);
    closeDayMenu();
    setShowWorkoutDrawer(true);
  }, []);

  const handleChevronPressIn = () => {
    Animated.timing(chevronScale, {
      toValue: 1.1,
      duration: ANIM_BUTTON_PRESS,
      useNativeDriver: true,
    }).start();
  };

  const handleChevronPressOut = () => {
    Animated.timing(chevronScale, {
      toValue: 1,
      duration: ANIM_BUTTON_PRESS,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectDay = (idx: number) => {
    if (!plan) return;
    const curIdx = getCurrentDayIndex(plan);
    if (curIdx === null || curIdx === idx) {
      setDayMenuOpen(false);
      return;
    }
    const diff = idx - curIdx;
    const startDate = parseDateKey(plan.startDate);
    if (!startDate) {
      setDayMenuOpen(false);
      return;
    }
    startDate.setDate(startDate.getDate() - diff);
    const updated = { ...plan, startDate: getDateKey(startDate) };
    setPlan(updated);
    AsyncStorage.setItem('workoutPlan', JSON.stringify(updated)).catch(err =>
      console.error('Failed to save workout plan', err)
    );
    saveWorkoutPlan(updated).catch(err =>
      console.error('Failed to save workout plan', err)
    );
    setTick(t => t + 1);
    setDayMenuOpen(false);
  };

  const rotation = chevronRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const addNewsButton = useMemo(() => {
    if (user?.role !== 'moderator') return null;
    return (
      <Pressable
        onPress={() => setAddNewsOpen(true)}
        style={styles.addNewsBtn}
        hitSlop={10}
        testID="add-news-btn"
      >
        <Ionicons name="add" size={20} color={colors.accent} />
      </Pressable>
    );
  }, [user?.role]);

  const selectedDayLabel = useMemo(() => {
    const day = days[selectedIndex];
    return day?.label ?? '';
  }, [days, selectedIndex]);

  const summaryText = useMemo(() => {
    const eventCount = dayEvents.length;
    const eventLabel = `${eventCount} event${eventCount === 1 ? '' : 's'}`;
    return selectedDayLabel ? `${selectedDayLabel} • ${eventLabel}` : eventLabel;
  }, [dayEvents.length, selectedDayLabel]);

  const ViewAllButton = ({
    onPress,
    label = 'View all',
  }: {
    onPress: () => void;
    label?: string;
  }) => (
    <TouchableOpacity onPress={onPress} style={styles.viewAllBtn}>
      <Text style={styles.viewAllText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.accent} />
    </TouchableOpacity>
  );

  const FullListModal = ({
    visible,
    title,
    onClose,
    children,
  }: {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.fullModalOverlay}>
        <View style={styles.fullModalCard}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.fullModalCloseBtn}>
              <Ionicons name="close" size={22} color={colors.textDark} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.fullModalScroll}
            contentContainerStyle={styles.fullModalContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const MassEventsBody = () => (
    <View style={styles.sceneBody}>
      {showSplitPlaceholder && <ChooseSplitButton />}
      {massEventsPreview.map((ev, idx) => {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][ev.weekday];
        const countdown = formatCountdown(ev.diff);
        return (
          <View
            key={ev.id}
            style={[
              carouselChipStyle,
              ev.isWorkout && styles.massWorkoutTile,
              idx !== 0 && styles.massTileSpacing,
            ]}
          >
            <View style={[styles.massTileHeader, ev.isWorkout && styles.massWorkoutHeader]}>
              <Ionicons name={ev.icon} size={22} color={colors.yellow} style={{ marginRight: 8 }} />
              <Text style={styles.massTileTitle}>{ev.name.toUpperCase()}</Text>
              {ev.isWorkout && (
                <AnimatedTouchable
                  ref={dayArrowRef}
                  onPress={toggleDayMenu}
                  onPressIn={handleChevronPressIn}
                  onPressOut={handleChevronPressOut}
                  style={styles.dayMenuBtn}
                >
                  <AnimatedIcon
                    name="chevron-down-outline"
                    size={20}
                    color={colors.blue}
                    style={{ transform: [{ scale: chevronScale }, { rotate: rotation }] }}
                  />
                </AnimatedTouchable>
              )}
            </View>
            {ev.isWorkout ? (
              <View style={styles.massDetailsRow}>
                <View style={{ flex: 1 }}>
                  {plan && (
                    <Text style={styles.workoutSplitName}>{plan.name}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={openWorkoutDrawer}
                  style={styles.zoomBtn}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={26}
                    color={colors.blue}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.massDetailsRow}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
                  <Text style={styles.massTileWhen}>{`Every ${dayName} @ 9 AM`}</Text>
                  <Text style={styles.massCountdown}>{`Starts in ${countdown}`}</Text>
                </View>
                {ev.link ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(ev.link)}
                    style={styles.zoomBtn}
                  >
                    <MaterialIcons name="north-east" size={26} color={colors.blue} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
      {hasMoreMassEvents && (
        <ViewAllButton onPress={() => setShowAllMassEvents(true)} />
      )}
    </View>
  );

  const NewsBody = () => (
    <>
      {newsLoaded ? (
        mergedNews.length ? (
          <View style={styles.sceneBody}>
            {newsPreview.map((item, index) =>
              item.message ? (
                <View
                  key={item.id || `badge-${index}`}
                  style={[
                    carouselChipStyle,
                    styles.newsTile,
                    index !== 0 && styles.massTileSpacing,
                  ]}
                >
                  <Text style={styles.massTileTitle}>{item.message ?? item.title}</Text>
                </View>
              ) : (
                <View
                  key={item.id || `badge-${index}`}
                  style={[
                    carouselChipStyle,
                    styles.newsTile,
                    index !== 0 && styles.massTileSpacing,
                  ]}
                >
                  <View style={styles.massTileHeader}>
                    <Image source={item.image} style={styles.badgeImage} />
                    <Text style={styles.massTileTitle}>{item.id} Badge</Text>
                  </View>
                  <View style={styles.badgeRowCarousel}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${Math.round(item.progress * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.badgePercent}>{Math.round(item.progress * 100)}%</Text>
                  </View>
                  <Text style={styles.requirements}>{item.requirements}</Text>
                </View>
              )
            )}
            {hasMoreNews && (
              <ViewAllButton onPress={() => setShowAllNews(true)} />
            )}
          </View>
        ) : (
          <Text style={styles.newsEmptyText}>No New MASS News</Text>
        )
      ) : (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 30 }} />
      )}
    </>
  );

  const CompetitionsBody = () => (
    <View style={styles.sceneBody}>
      {compsPreview.map((c, idx) => (
        <View key={c.id} style={[
          carouselChipStyle,
          styles.compTile,
          idx !== 0 && styles.compTileSpacing,
        ]}>
          <View style={styles.massTileHeader}>
            <Ionicons name="flame-outline" size={22} color={colors.purple} style={{ marginRight: 8 }} />
            <Text style={styles.compTileTitle}>{c.name}</Text>
          </View>
          <Text style={styles.compComingSoon}>{c.status}</Text>
        </View>
      ))}
      {hasMoreComps && (
        <ViewAllButton onPress={() => setShowAllComps(true)} />
      )}
    </View>
  );

  const EventsBody = () => (
    <View style={styles.sceneBody}>
      {eventsPreview.length ? (
        eventsPreview.map(item => (
          <View key={item.id} style={[styles.eventCard, styles.eventCardCompact, styles.sceneEventCard]}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.purple}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              {item.time && <Text style={styles.eventTime}>{item.time}</Text>}
            </View>
            {item.type === 'oneonone' && (
              <TouchableOpacity
                onPress={() => cancelEvent(item.id)}
                style={styles.cancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel one on one"
              >
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No events</Text>
      )}
      {hasMoreEvents && (
        <ViewAllButton onPress={() => setShowAllEvents(true)} />
      )}
    </View>
  );

  const settleCarouselAtOffset = useCallback(
    (offsetX: number) => {
      const nextIndex = clampValue(
        Math.round(offsetX / pageWidth),
        0,
        carouselItems.length - 1,
      );
      lastScrollIndexRef.current = nextIndex;
      isCarouselAnimatingRef.current = false;
      carouselUserActionRef.current = false;
      carouselLockRef.current = false;
      if (carouselUnlockTimeoutRef.current) {
        clearTimeout(carouselUnlockTimeoutRef.current);
        carouselUnlockTimeoutRef.current = null;
      }
      if (nextIndex !== carouselIndex) {
        setCarouselIndex(nextIndex);
      }
      setCarouselPersistTick(tick => tick + 1);

      const queuedIndex = lastRequestedIndexRef.current;
      lastRequestedIndexRef.current = null;
      if (queuedIndex != null && queuedIndex !== nextIndex) {
        carouselLockRef.current = true;
        isCarouselAnimatingRef.current = true;
        carouselUserActionRef.current = true;
        lastScrollIndexRef.current = queuedIndex;
        setCarouselIndex(queuedIndex);
        carouselScrollRef.current?.scrollTo({
          x: queuedIndex * pageWidth,
          animated: true,
        });
      }
    },
    [carouselIndex, carouselItems.length, pageWidth],
  );

  const handleCarouselScrollEnd = useCallback(
    (event: any) => {
      if (!carouselIndexHydrated) return;
      settleCarouselAtOffset(event.nativeEvent.contentOffset.x);
    },
    [carouselIndexHydrated, settleCarouselAtOffset],
  );

  const handleCarouselScroll = useCallback(
    (event: any) => {
      if (!carouselIndexHydrated) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = clampValue(
        Math.round(offsetX / pageWidth),
        0,
        carouselItems.length - 1,
      );
      if (nextIndex !== lastScrollIndexRef.current) {
        lastScrollIndexRef.current = nextIndex;
        setCarouselIndex(nextIndex);
      }
    },
    [carouselIndexHydrated, carouselItems.length, pageWidth],
  );

  const handleCarouselScrollBeginDrag = useCallback(() => {
    if (!carouselIndexHydrated) return;
    isCarouselAnimatingRef.current = true;
    carouselLockRef.current = true;
    if (carouselUnlockTimeoutRef.current) {
      clearTimeout(carouselUnlockTimeoutRef.current);
      carouselUnlockTimeoutRef.current = null;
    }
  }, [carouselIndexHydrated]);

  const handleCarouselScrollEndDrag = useCallback(
    (event: any) => {
      if (!carouselIndexHydrated) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = clampValue(
        Math.round(offsetX / pageWidth),
        0,
        carouselItems.length - 1,
      );
      if (nextIndex !== lastScrollIndexRef.current) {
        lastScrollIndexRef.current = nextIndex;
        setCarouselIndex(nextIndex);
      }
      if (carouselUnlockTimeoutRef.current) {
        clearTimeout(carouselUnlockTimeoutRef.current);
      }
      carouselUnlockTimeoutRef.current = setTimeout(() => {
        settleCarouselAtOffset(offsetX);
      }, 140);
    },
    [carouselIndexHydrated, carouselItems.length, pageWidth, settleCarouselAtOffset],
  );

  const handleCarouselAnimatedScroll = useMemo(
    () => Animated.event(
      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
      {
        useNativeDriver: true,
        listener: handleCarouselScroll,
      },
    ),
    [handleCarouselScroll, scrollX],
  );

  const renderCarouselItem = (sceneKey: string) => {
    if (sceneKey === 'massEvents') return <MassEventsBody />;
    if (sceneKey === 'news') return <NewsBody />;
    if (sceneKey === 'comps') return <CompetitionsBody />;
    return <EventsBody />;
  };

  const getHeaderForScene = useCallback(
    (sceneKey: string) => {
      if (sceneKey === 'news') {
        return { title: 'NEWS', logo: MASS_LOGO, trailing: addNewsButton };
      }
      if (sceneKey === 'comps') {
        return { title: undefined, logo: COMPS_LOGO, trailing: null };
      }
      if (sceneKey === 'events') {
        return { title: 'EVENTS', logo: MASS_LOGO, trailing: null };
      }
      return { title: 'MASS', logo: MASS_LOGO, trailing: null };
    },
    [addNewsButton],
  );

  // ---------- UI ----------
  return (
    <WhiteBackgroundWrapper style={styles.wrapper} padBottom={padBottom}>
      <View style={styles.root}>
        <View style={styles.topRegion}>
          <View style={{ paddingTop: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
            >
              {days.map((item, i) => renderDay({ item, index: i }))}
            </ScrollView>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.summaryRow,
              pressed && styles.summaryRowPressed,
            ]}
            onPress={() => jumpToScene('events')}
            accessibilityRole="button"
            accessibilityHint="Opens events"
          >
            <Text style={styles.summaryText}>{summaryText}</Text>
          </Pressable>
        </View>

        <View style={styles.middleRegion}>
          <View
            style={[
              styles.carouselContainer,
              {
                width: carouselWidth,
                minHeight: cardMinHeight,
              },
            ]}
          >
            {carouselIndexHydrated ? (
              <>
                <View style={styles.carouselCardArea}>
                  <View style={styles.carouselCardFrame}>
                    <View style={styles.carouselCardOuter}>
                      <Animated.ScrollView
                      ref={carouselScrollRef}
                      horizontal
                      pagingEnabled
                      removeClippedSubviews={false}
                      decelerationRate="fast"
                      snapToInterval={pageWidth}
                      snapToAlignment="start"
                      disableIntervalMomentum
                      disableScrollViewPanResponder={false}
                      showsHorizontalScrollIndicator={false}
                      onScroll={handleCarouselAnimatedScroll}
                      onScrollBeginDrag={handleCarouselScrollBeginDrag}
                      onScrollEndDrag={handleCarouselScrollEndDrag}
                      onMomentumScrollEnd={handleCarouselScrollEnd}
                      scrollEventThrottle={16}
                      scrollEnabled={carouselItems.length > 1}
                      style={[styles.carouselScrollView, { width: pageWidth }]}
                      contentContainerStyle={styles.carouselScrollContent}
                      >
                      {carouselItems.map(item => {
                      const header = getHeaderForScene(item);
                      const isNews = item === 'news';
                      const canPrev = carouselIndex > 0;
                      const canNext = carouselIndex < carouselItems.length - 1;
                      return (
                        <View
                          key={item}
                          style={{ width: pageWidth, paddingHorizontal: cardOuterPadding }}
                        >
                          <View style={[carouselCardStyle, { minHeight: cardMinHeight }]}>
                            <SectionHeader
                              title={header.title}
                              logo={header.logo}
                              leftSlot={(
                                <Pressable
                                  onPress={() => goToIndex(cur => cur - 1)}
                                  disabled={!canPrev}
                                  hitSlop={10}
                                  style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
                                >
                                  <Ionicons name="chevron-back" size={20} color={colors.gray} />
                                </Pressable>
                              )}
                              rightSlot={(
                                <View style={styles.headerRightControls}>
                                  {isNews ? header.trailing : null}
                                  <Pressable
                                    onPress={() => goToIndex(cur => cur + 1)}
                                    disabled={!canNext}
                                    hitSlop={10}
                                    style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
                                  >
                                    <Ionicons name="chevron-forward" size={20} color={colors.gray} />
                                  </Pressable>
                                </View>
                              )}
                            >
                              {header.trailing}
                            </SectionHeader>
                            <View style={styles.carouselBody}>
                              {renderCarouselItem(item)}
                            </View>
                          </View>
                        </View>
                      );
                      })}
                      </Animated.ScrollView>
                    </View>
                  </View>
                </View>
                {carouselItems.length > 1 && carouselIndexHydrated && (
                  <View style={styles.carouselDotsWrap}>
                    <CarouselNavigator
                      index={carouselIndex}
                      length={carouselItems.length}
                      onIndexChange={goToIndex}
                      dotsRowStyle={styles.carouselDotsRow}
                      arrowSize={36}
                      dotSize={12}
                      showArrows={false}
                      layout="inline"
                    />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.carouselCardArea}>
                <View style={styles.carouselCardFrame}>
                  <View style={{ width: pageWidth, paddingHorizontal: cardOuterPadding }}>
                    <View style={[carouselCardStyle, { minHeight: cardMinHeight }]} />
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.bottomRegion,
            {
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowScheduler(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addBtnTxt}>Schedule 1-on-1</Text>
          </TouchableOpacity>
          <View style={styles.workoutToggleRow}>
            <Text style={styles.workoutToggleLabel}>Workout Splits</Text>
            <Switch value={showWorkout} onValueChange={handleTogglePlans} />
            <TouchableOpacity
              style={styles.editBtn}
              onPress={openPlanDrawerFromButton}
            >
              <Text style={styles.editBtnTxt}>Splits</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showAllEvents && (
          <FullListModal
            visible={showAllEvents}
            title={selectedDayLabel ? `${selectedDayLabel} Events` : 'Events'}
            onClose={() => setShowAllEvents(false)}
          >
            {dayEvents.length ? (
              dayEvents.map(item => (
                <View key={item.id} style={[styles.eventCard, styles.eventCardCompact, styles.fullModalEventCard]}>
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={colors.purple}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    {item.time && <Text style={styles.eventTime}>{item.time}</Text>}
                  </View>
                  {item.type === 'oneonone' && (
                    <TouchableOpacity
                      onPress={() => cancelEvent(item.id)}
                      style={styles.cancelBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel one on one"
                    >
                      <Text style={styles.cancelBtnTxt}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No events</Text>
            )}
          </FullListModal>
        )}

        {showAllMassEvents && (
          <FullListModal
            visible={showAllMassEvents}
            title="Mass Events"
            onClose={() => setShowAllMassEvents(false)}
          >
            {showSplitPlaceholder && <ChooseSplitButton />}
            {massEvents.map((ev, idx) => {
              const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][ev.weekday];
              const countdown = formatCountdown(ev.diff);
              return (
                <View
                  key={ev.id}
                  style={[
                    carouselChipStyle,
                    styles.modalChip,
                    ev.isWorkout && styles.massWorkoutTile,
                    idx !== 0 && styles.massTileSpacing,
                  ]}
                >
                  <View style={[styles.massTileHeader, ev.isWorkout && styles.massWorkoutHeader]}>
                    <Ionicons name={ev.icon} size={22} color={colors.yellow} style={{ marginRight: 8 }} />
                    <Text style={styles.massTileTitle}>{ev.name.toUpperCase()}</Text>
                    {ev.isWorkout && (
                      <AnimatedTouchable
                        ref={dayArrowRef}
                        onPress={toggleDayMenu}
                        onPressIn={handleChevronPressIn}
                        onPressOut={handleChevronPressOut}
                        style={styles.dayMenuBtn}
                      >
                        <AnimatedIcon
                          name="chevron-down-outline"
                          size={20}
                          color={colors.blue}
                          style={{ transform: [{ scale: chevronScale }, { rotate: rotation }] }}
                        />
                      </AnimatedTouchable>
                    )}
                  </View>
                  {ev.isWorkout ? (
                    <View style={styles.massDetailsRow}>
                      <View style={{ flex: 1 }}>
                        {plan && (
                          <Text style={styles.workoutSplitName}>{plan.name}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={openWorkoutDrawer}
                        style={styles.zoomBtn}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={26}
                          color={colors.blue}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.massDetailsRow}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
                        <Text style={styles.massTileWhen}>{`Every ${dayName} @ 9 AM`}</Text>
                        <Text style={styles.massCountdown}>{`Starts in ${countdown}`}</Text>
                      </View>
                      {ev.link ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(ev.link)}
                          style={styles.zoomBtn}
                        >
                          <MaterialIcons name="north-east" size={26} color={colors.blue} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
          </FullListModal>
        )}

        {showAllNews && (
          <FullListModal
            visible={showAllNews}
            title="All News"
            onClose={() => setShowAllNews(false)}
          >
            {newsLoaded ? (
              mergedNews.length ? (
                mergedNews.map((item, index) =>
                  item.message ? (
                    <View
                      key={item.id || `badge-${index}`}
                      style={[
                        carouselChipStyle,
                        styles.modalChip,
                        styles.newsTile,
                        index !== 0 && styles.massTileSpacing,
                      ]}
                    >
                      <Text style={styles.massTileTitle}>{item.message ?? item.title}</Text>
                    </View>
                  ) : (
                    <View
                      key={item.id || `badge-${index}`}
                      style={[
                        carouselChipStyle,
                        styles.modalChip,
                        styles.newsTile,
                        index !== 0 && styles.massTileSpacing,
                      ]}
                    >
                      <View style={styles.massTileHeader}>
                        <Image source={item.image} style={styles.badgeImage} />
                        <Text style={styles.massTileTitle}>{item.id} Badge</Text>
                      </View>
                      <View style={styles.badgeRowCarousel}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${Math.round(item.progress * 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.badgePercent}>{Math.round(item.progress * 100)}%</Text>
                      </View>
                      <Text style={styles.requirements}>{item.requirements}</Text>
                    </View>
                  )
                )
              ) : (
                <Text style={styles.newsEmptyText}>No New MASS News</Text>
              )
            ) : (
              <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 30 }} />
            )}
          </FullListModal>
        )}

        {showAllComps && (
          <FullListModal
            visible={showAllComps}
            title="Competitions"
            onClose={() => setShowAllComps(false)}
          >
            {fakeComps.map((c, idx) => (
              <View key={c.id} style={[
                carouselChipStyle,
                styles.modalChip,
                styles.compTile,
                idx !== 0 && styles.compTileSpacing,
              ]}>
                <View style={styles.massTileHeader}>
                  <Ionicons name="flame-outline" size={22} color={colors.purple} style={{ marginRight: 8 }} />
                  <Text style={styles.compTileTitle}>{c.name}</Text>
                </View>
                <Text style={styles.compComingSoon}>{c.status}</Text>
              </View>
            ))}
          </FullListModal>
        )}

        {plan && dayMenuOpen && (
          <Modal
            visible={dayMenuOpen}
            transparent
            animationType="fade"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={() => setDayMenuOpen(false)}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (ignoreNextDayMenuPress.current) {
                  ignoreNextDayMenuPress.current = false;
                  return;
                }
                if (Date.now() - dayMenuOpenedAt.current < 250) return;
                closeDayMenu();
              }}
            >
              <Pressable
                style={[
                  styles.dayDropdown,
                  {
                    top: dayArrowPos.y,
                    left: dayArrowPos.x - dayDropdownWidth / 2,
                  },
                ]}
                onLayout={onDayDropdownLayout}
                onPress={e => e.stopPropagation()}
              >
                {plan.days.map((d, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dayDropdownItem}
                    onPress={() => handleSelectDay(idx)}
                  >
                    <Text
                      style={[
                        styles.dayDropdownItemText,
                        idx === getCurrentDayIndex(plan) &&
                          styles.dayDropdownItemTextActive,
                      ]}
                    >
                      {d.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {showScheduler && (
        <Modal visible={showScheduler} transparent animationType="slide">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Pick Date & Time</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.pickerBtnTxt}>{scheduleDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.pickerBtnTxt}>
                  {scheduleDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={scheduleDate}
                onConfirm={d => {
                  setShowDatePicker(false);
                  setScheduleDate(d);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
              <DateTimePickerModal
                isVisible={showTimePicker}
                mode="time"
                date={scheduleDate}
                onConfirm={d => {
                  setShowTimePicker(false);
                  setScheduleDate(d);
                }}
                onCancel={() => setShowTimePicker(false)}
              />
              <TouchableOpacity style={styles.modalBtn} onPress={addOneOnOne}>
                <Text style={styles.modalBtnTxt}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowScheduler(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {addNewsOpen && (
        <Modal
          visible={addNewsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAddNewsOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setAddNewsOpen(false)}
          >
            <View style={styles.modalBox} pointerEvents="box-none">
              <TextInput
                style={styles.newsInput}
                value={newsText}
                onChangeText={setNewsText}
                placeholder="Enter announcement"
                placeholderTextColor="#888"
                editable={!savingNews}
                multiline
              />
              <View style={styles.newsActionRow}>
                <TouchableOpacity
                  onPress={() => setAddNewsOpen(false)}
                  disabled={savingNews}
                >
                  <Text style={styles.newsCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveNews}
                  disabled={savingNews}
                  style={{ marginLeft: 20 }}
                >
                  <Text style={styles.newsSaveTxt}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {renderPlanDrawer && (
        <>
          <AnimatedTouchable
            style={[styles.drawerOverlay, planOverlayInsets, { opacity: planDrawerOverlay }]}
            onPress={closePlanDrawer}
            accessibilityRole="button"
            accessibilityLabel="Close plan drawer"
            pointerEvents={planDrawerInteractive ? 'auto' : 'none'}
          />
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: 'flex-end' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Animated.View
              style={[
                styles.builderDrawer,
                {
                  bottom: TAB_BAR_HEIGHT + 2,
                  height: PLAN_DRAWER_HEIGHT,
                  transform: [{ translateY: planDrawerAnim }],
                },
              ]}
            >
            <ScrollView contentContainerStyle={[
                styles.planModalBox,
                planLoading && styles.planModalLoading,
              ]}>
              {planLoading ? (
                <ActivityIndicator
                  color={colors.accent}
                  size="large"
                />
              ) : (
              <>
              {planLoadError ? (
                <View style={styles.planErrorBox}>
                  <Text style={styles.planErrorText}>{planLoadError}</Text>
                  <TouchableOpacity
                    style={styles.planRetryButton}
                    onPress={openPlanDrawerFromButton}
                  >
                    <Text style={styles.planRetryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Text style={styles.planDivider}>Pre-Built Splits</Text>
                <Pressable
                  onPress={() => selectPlan(getDefaultPPL())}
                  style={({ pressed }) => [
                    styles.splitBtn,
                    plan?.name === 'Push-Pull-Legs' && styles.splitBtnActive,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.splitBtnTxt,
                      plan?.name === 'Push-Pull-Legs' && styles.splitBtnTxtActive,
                    ]}
                  >
                    Push-Pull-Legs
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => selectPlan(getDefaultBCAL())}
                  style={({ pressed }) => [
                    styles.splitBtn,
                    plan?.name === 'Back-Chest-Arms-Legs' && styles.splitBtnActive,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.splitBtnTxt,
                      plan?.name === 'Back-Chest-Arms-Legs' && styles.splitBtnTxtActive,
                    ]}
                  >
                    Back-Chest-Arms-Legs
                  </Text>
                </Pressable>
                <Text style={styles.planDivider}>My Custom Split</Text>
                {customSplit ? (
                  <View style={styles.customSplitContainer}>
                    <Pressable
                      onPress={() => selectPlan(customSplit)}
                      style={({ pressed }) => [
                        styles.splitBtn,
                        styles.customSplitBtn,
                        plan?.name === customSplit.name && styles.splitBtnActive,
                        { transform: [{ scale: pressed ? 0.96 : 1 }] },
                      ]}
                    >
                      <View style={styles.splitBtnTextContainer}>
                        <Text
                          style={[
                            styles.splitBtnTxt,
                            plan?.name === customSplit.name && styles.splitBtnTxtActive,
                          ]}
                        >
                          {customSplit.name}
                        </Text>
                        {customSplit.notes ? (
                          <Text
                            style={styles.splitBtnNote}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {customSplit.notes}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                    <View style={styles.customSplitIcons}>
                      <AnimatedTouchable
                        onPress={() => animateIcon(editScale, openEditCustomBuilder)}
                        style={styles.iconAction}
                        accessibilityLabel="Edit split"
                      >
                        <AnimatedIcon
                          name="create-outline"
                          size={28}
                          color={colors.success}
                          style={{ transform: [{ scale: editScale }] }}
                        />
                      </AnimatedTouchable>
                      <AnimatedTouchable
                        onPress={() => animateIcon(deleteScale, deleteCustomSplit)}
                        style={[styles.iconAction, styles.iconSpacer]}
                        accessibilityLabel="Delete split"
                      >
                        <AnimatedIcon
                          name="trash-outline"
                          size={28}
                          color={colors.accentRed}
                          style={{ transform: [{ scale: deleteScale }] }}
                        />
                      </AnimatedTouchable>
                      <AnimatedTouchable
                        onPress={() =>
                          isTimedOut
                            ? Alert.alert('Cannot Share', 'cannot share splits while timed out.')
                            : animateIcon(shareScale, shareCustomSplit)
                        }
                        style={[
                          styles.iconAction,
                          styles.iconSpacer,
                          isTimedOut && { opacity: 0.5 },
                        ]}
                        accessibilityLabel="Share split"
                        disabled={isTimedOut}
                      >
                        <AnimatedIcon
                          name="share-social-outline"
                          size={28}
                          color={colors.accent}
                          style={{ transform: [{ scale: shareScale }] }}
                        />
                      </AnimatedTouchable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={openCustomBuilder}
                    style={({ pressed }) => [
                      styles.splitBtn,
                      { transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    <View style={styles.splitBtnTextContainer}>
                      <Text style={styles.splitBtnTxt}>Create a Custom Split</Text>
                    </View>
                  </Pressable>
                )}
                <Text style={styles.sharedTitle}>Shared with Me</Text>
                <Text style={styles.sharedSub}>Save up to 3 Shared Splits</Text>
                {sharedSplits.map(s => (
                  <SharedSplitItem key={s.id} item={s} />
                ))}
                <Pressable
                  onPress={closePlanDrawer}
                  style={({ pressed }) => [
                    styles.drawerClose,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <Text style={styles.drawerCloseTxt}>Close</Text>
                </Pressable>
              </>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
        </>
      )}
      {renderWorkoutDrawer && (
        <>
          <AnimatedTouchable
            style={[styles.drawerOverlay, workoutOverlayInsets, { opacity: drawerOverlay }]}
            onPress={() => setShowWorkoutDrawer(false)}
            accessibilityRole="button"
            accessibilityLabel="Close workout drawer"
            pointerEvents={workoutDrawerInteractive ? 'auto' : 'none'}
          />
          <Animated.View
            style={[
              styles.workoutDrawer,
              { transform: [{ translateY: drawerAnim }], maxHeight: WORKOUT_DRAWER_MAX_HEIGHT },
            ]}
          >
            <Animated.ScrollView
              onLayout={onWorkoutContainerLayout}
              onContentSizeChange={(w, h) => setWorkoutContentHeight(h)}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: workoutScrollY } } }],
                { useNativeDriver: false },
              )}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingBottom: insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerHeader}>Today's Workouts</Text>
              {todayWorkout?.notes ? (
                <Text style={styles.workoutNote}>{todayWorkout.notes}</Text>
              ) : null}
              {todayWorkout && todayWorkout.lifts.length ? (
                Object.entries(
                  todayWorkout.lifts.reduce<Record<string, string[]>>((map, lift) => {
                  const cat = Object.keys(LIFT_CATEGORIES).find(c =>
                    LIFT_CATEGORIES[c].includes(lift),
                  );
                  if (cat) {
                    if (!map[cat]) map[cat] = [];
                    map[cat].push(lift);
                  }
                  return map;
                }, {}),
              ).map(([cat, lifts]) => {
                const headRatings: Record<string, number> = {};
                lifts.forEach(l => {
                  const ratings = LIFT_RATINGS[cat]?.[l];
                  if (!ratings) return;
                  Object.entries(ratings).forEach(([head, rating]) => {
                    if (rating > 0) {
                      headRatings[head] = Math.max(headRatings[head] || 0, rating);
                    }
                  });
                });
                return (
                  <View key={cat} style={styles.categorySection}>
                    <Text style={styles.categoryHeader}>{cat}</Text>
                    {Object.keys(headRatings).length > 0 && (
                      <View style={styles.headRatingsRow}>
                        {Object.entries(headRatings).map(([head, rating]) => (
                          <View key={head} style={styles.headRatingItem}>
                            <Text style={styles.headRatingText}>{head} {rating}</Text>
                            <Ionicons
                              name="star"
                              size={14}
                              color={colors.gold}
                              style={{ marginLeft: 2 }}
                            />
                          </View>
                        ))}
                      </View>
                    )}
                    {lifts.map(l => (
                      <View key={l} style={styles.workoutRow}>
                        <Pressable
                          onPress={() =>
                            setLiftChecks(c => ({ ...c, [l]: !c[l] }))
                          }
                          style={[styles.checkbox, liftChecks[l] && styles.checkboxChecked]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: !!liftChecks[l] }}
                        >
                          {liftChecks[l] && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            Linking.openURL(`https://youtube.com/?v=${encodeURIComponent(l)}`)
                          }
                          style={styles.helpBtn}
                        >
                          <Ionicons name="help-circle-outline" size={22} color={colors.blue} />
                        </Pressable>
                        <Text style={styles.workoutName}>{l}</Text>
                      </View>
                    ))}
                  </View>
                );
              })
            ) : (
              <Text style={styles.eventNote}>No lifts added.</Text>
            )}
            <TouchableOpacity
                style={[styles.checkInBtn, hasCheckinToday && styles.checkInBtnDisabled]}
                disabled={hasCheckinToday}
                onPress={() => {
                  if (!hasCheckinToday) navigation.navigate('AccountabilityForm');
                }}
              >
                <Text
                  style={[styles.checkInBtnTxt, hasCheckinToday && styles.checkInBtnTxtDisabled]}
                >
                  {hasCheckinToday ? 'Check In Completed' : 'Check In'}
                </Text>
              </TouchableOpacity>
            </Animated.ScrollView>
            {workoutContentHeight > workoutContainerHeight && (
              <AnimatedIcon
                pointerEvents="none"
                name="chevron-down-outline"
                size={24}
                color={colors.background}
                style={[styles.workoutScrollArrow, { opacity: workoutArrowOpacity }]}
              />
            )}
          </Animated.View>
        </>
      )}
      </View>
    </WhiteBackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-start' },
  root: { flex: 1 },
  topRegion: { flexShrink: 0 },
  middleRegion: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  bottomRegion: {
    flexShrink: 0,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  calendarTop: {
    paddingBottom: 4,
  },
  daysRow: { paddingHorizontal: 12 },
  summaryRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  summaryRowPressed: {
    opacity: 0.72,
  },
  summaryText: {
    color: colors.textDark,
    fontWeight: '600',
    fontSize: 14,
  },
  dayBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnActive: { backgroundColor: colors.accent },
  dayLabel: { color: '#232323', fontWeight: 'bold' },
  dayLabelActive: { color: '#232323' },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 6,
    borderLeftColor: colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  eventCardCompact: {
    flex: 1,
    marginHorizontal: 4,
  },
  sceneEventCard: {
    marginBottom: 8,
  },
  eventTitle: { fontWeight: 'bold', color: '#232323', marginBottom: 2, fontSize: 17 },
  eventTime: { color: colors.purple, fontSize: 13, marginBottom: 2 },
  cancelBtn: {
    backgroundColor: colors.error,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  cancelBtnTxt: { color: colors.white, fontWeight: 'bold' },
  eventNote: { color: '#232323', fontSize: 13 },
  workoutNote: {
    color: colors.textDark,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'left',
    marginLeft: 12,
  },
  emptyText: { color: '#888', alignSelf: 'center', marginTop: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 12,
  },
  addBtnTxt: { color: colors.white, fontWeight: 'bold', marginLeft: 8 },
  workoutToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  workoutToggleLabel: { marginRight: 8, color: colors.background, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: { color: colors.accent, fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  modalBtn: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  savePlanBtn: { backgroundColor: colors.success },
  modalBtnTxt: { color: colors.background, fontWeight: 'bold' },
  modalCancel: { marginTop: 10 },
  modalCancelTxt: { color: colors.background },
  planDivider: {
    color: '#232323',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  pickerBtn: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  pickerBtnTxt: { color: colors.background, fontWeight: 'bold' },
  planModalBox: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  planModalLoading: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planErrorBox: {
    backgroundColor: colors.grayLight,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  planErrorText: {
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  planRetryButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  planRetryText: {
    color: colors.background,
    fontWeight: 'bold',
  },
  planDayBox: { marginBottom: 12 },
  label: {
    color: '#232323',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 1,
    fontSize: 16,
  },
  planInput: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    color: '#232323',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  dayTitleContainer: { position: 'relative' },
  dayTitleInput: { paddingRight: 40 },
  dayTitleSuffix: {
    position: 'absolute',
    right: 16,
    top: 8,
    color: '#888',
    pointerEvents: 'none',
  },
  inputError: {
    borderColor: 'red',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
  },
  editBtn: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  customSplitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingLeft: 20,
    paddingRight: 26,
    marginVertical: 13,
  },
  customSplitIcons: {
    flexDirection: 'row',
    marginLeft: 10,
    alignItems: 'center',
  },
  customSplitBtn: {
    flex: 1,
    minWidth: 0,
    marginVertical: 0,
  },
  sharedSplitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingLeft: 20,
    paddingRight: 26,
    marginVertical: 13,
  },
  sharedSplitItemWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  sharedSplitBtn: {
    flex: 1,
    minWidth: 0,
    marginVertical: 0,
  },
  sharedTitle: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  sharedSub: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  sharedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: -4,
  },
  sharedName: { color: colors.black, fontWeight: 'bold', fontSize: 15 },
  sharedDate: { color: '#888', fontSize: 13, marginLeft: 4 },
  actionBtn: {
    width: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  editBtnAction: { backgroundColor: '#FFE680', marginRight: 10 },
  deleteBtnAction: { backgroundColor: '#E06275' },
  shareBtnAction: { backgroundColor: colors.accent },
  editActionTxt: { color: '#232323', fontWeight: 'bold' },
  iconAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: { marginLeft: 12 },
  drawerClose: { marginTop: 16 },
  drawerCloseTxt: { color: '#232323', fontWeight: '600', fontSize: 15 },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#232323',
    marginTop: 18,
    marginBottom: 6,
    fontSize: 14,
    marginLeft: 18,
  },
  massCard: {
    alignSelf: 'center',
    width: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 30,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    marginBottom: 14,
    marginTop: 8,
  },
  carouselCard: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    width: '100%',
    flex: 1,
  },
  massLogo: {
    position: 'absolute',
    width: 38,
    height: 38,
    right: 30,
    top: 24,
    opacity: 0.14,
  },
  massHeaderLogo: {
    width: 100,
    height: 60,
    marginRight: 8,
  },
  massHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 6,
  },
  massHeaderSide: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  massHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  massHeaderSideRight: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  massHeaderTxt: {
    color: colors.yellow,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  massTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 19,
    borderLeftWidth: 8,
    borderLeftColor: colors.yellow,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  carouselChip: {
    borderRadius: 20,
    marginVertical: 10,
    marginHorizontal: 0,
    paddingVertical: 12,
    paddingHorizontal: 19,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    backgroundColor: '#fff',
  },
  massWorkoutTile: {
    paddingVertical: 4,
  },
  newsTile: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
    margin: 3,
  },
  massWorkoutHeader: { marginBottom: -4 },
  massTileSpacing: {
    marginTop: 18,
  },
  massTileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  massTileTitle: {
    color: colors.yellow,
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutSplitName: {
    color: '#232323',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '900',
    fontFamily: fonts.semiBold,
    marginTop: 3,
  },
  massDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  massTileWhen: {
    color: '#232323',
    fontSize: 15,
    fontWeight: 'bold',
  },
  massCountdown: {
    color: colors.yellow,
    fontSize: 15,
    fontWeight: 'bold',
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compTileTitle: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: 'bold',
  },
  compComingSoon: {
    color: colors.purple,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginLeft: 30,
  },
  compCard: {
    paddingVertical: 24,
    marginTop: 8,
  },
  compTile: {
    paddingVertical: 14,
  },
  compTileSpacing: {
    marginTop: 14,
  },
  carouselContainer: {
    flex: 1,
    position: 'relative',
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCardArea: {
    flex: 1,
    width: '100%',
    paddingBottom: 10,
  },
  carouselCardFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
  },
  carouselCardOuter: {
    flex: 1,
    paddingBottom: 12,
  },
  carouselDotsWrap: {
    flexShrink: 0,
    marginTop: 4,
    paddingTop: 8,
  },
  carouselBody: {
    flex: 1,
  },
  carouselScrollContent: {
    alignItems: 'stretch',
  },
  carouselScrollView: {
    flex: 1,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 2,
    paddingBottom: 4,
  },
  sceneBody: {
    flex: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: colors.accent,
    fontWeight: '600',
    marginRight: 4,
  },
  modalChip: {
    width: '100%',
  },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullModalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fullModalTitle: {
    color: colors.textDark,
    fontWeight: '700',
    fontSize: 18,
  },
  fullModalCloseBtn: {
    padding: 4,
  },
  fullModalScroll: {
    flexGrow: 0,
  },
  fullModalContent: {
    paddingBottom: 16,
  },
  fullModalEventCard: {
    marginBottom: 10,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 40,
  },
  builderDrawer: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: '92%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 50,
  },
  workoutDrawer: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: '92%',
    backgroundColor: colors.accent,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    zIndex: 50,
    borderTopWidth: 2,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.grayLight,
  },
  workoutScrollArrow: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
  },
  drawerHeader: {
    color: colors.background,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 4,
  },
  checkInBtn: {
    backgroundColor: colors.purple,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  checkInBtnDisabled: {
    backgroundColor: colors.grayLight,
    borderColor: colors.gray,
    borderWidth: 1,
  },
  checkInBtnTxt: { color: colors.white, fontWeight: 'bold' },
  checkInBtnTxtDisabled: { color: colors.textDark },
  builderTitle: {
    textAlign: 'center',
    color: '#232323',
    fontWeight: 'bold',
    fontSize: 20,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  liftLimitNote: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginTop: -12,
    marginBottom: 12,
  },
  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginHorizontal: 8,
  },
  stepCircleActive: {
    backgroundColor: '#FFD700',
    borderWidth: 0,
  },
  splitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    minHeight: 52,
    minWidth: '80%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 13,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  splitBtnActive: {
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.goldGlow,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  splitBtnTxt: {
    color: '#232323',
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  splitBtnNote: {
    color: colors.gray,
    fontStyle: 'italic',
    fontSize: 13,
  },
  splitBtnTxtActive: { color: colors.gold },
  splitCheck: { position: 'absolute', right: 16 },
  categoryScrollContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  categoryRow: { flexDirection: 'row', paddingHorizontal: 10 },
  categoryBtn: { paddingVertical: 6, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 16 },
  categoryBtnActive: {},
  categoryBtnPressed: { backgroundColor: '#eee', transform: [{ scale: 0.95 }] },
  categoryBtnText: { fontSize: 15, fontWeight: 'bold', color: '#888' },
  categoryBtnTextActive: { color: colors.accent },
  catArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 24,
  },
  catArrowLeft: { left: 0 },
  catArrowRight: { right: 0, alignItems: 'flex-end' },
  categoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#232323',
    textDecorationLine: 'underline',
    textDecorationColor: MASS_YELLOW,
    marginTop: 12,
  },
  categorySub: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#888',
    marginBottom: 6,
  },
  liftCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  liftCardSelected: {
    borderWidth: 2,
    borderColor: MASS_YELLOW,
  },
  liftCardDisabled: {
    opacity: 0.4,
  },
  liftName: { fontSize: 16, fontWeight: 'bold', color: '#232323' },
  starRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  starLabel: { fontSize: 12, color: '#888', marginRight: 4 },
  categorySection: { marginBottom: 16 },
  headRatingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 6,
  },
  headRatingItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4 },
  headRatingText: { fontSize: 12, color: colors.textDark },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: MASS_YELLOW,
  },
  dayDivider: {
    height: 2,
    backgroundColor: MASS_YELLOW,
    marginVertical: 14,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: MASS_YELLOW,
  },
  helpBtn: { marginRight: 8 },
  workoutName: { fontSize: 16, fontWeight: 'bold', color: '#232323', flexShrink: 1 },
  badgeRowCarousel: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  badgeImage: { width: 24, height: 24, marginRight: 8 },
  progressTrack: {
    height: 8,
    flex: 1,
    backgroundColor: colors.gray,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  badgePercent: { color: colors.accent, fontWeight: 'bold', fontSize: 14 },
  requirements: { color: colors.textDark, fontSize: 13 },
  newsEmptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 28,
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: fonts.regular,
  },
  placeholderChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  placeholderChipTxt: {
    color: colors.background,
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  chooseSplitTile: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 18,
  },
  chooseSplitContent: {
    alignItems: 'flex-start',
  },
  chooseSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chooseSplitIcon: {
    marginRight: 8,
    marginBottom: 5,
  },
  chooseSplitTxt: {
    color: colors.purple,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
  },
  chooseSplitSubTxt: {
    color: colors.gray,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: 2,
    marginBottom: 9,
  },
  chooseSplitPressed: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  dayMenuBtn: { marginLeft: 4, alignSelf: 'center', padding: 2 },
  dayDropdown: {
    position: 'absolute',
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.27,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 50,
  },
  dayDropdownItem: { paddingVertical: 4 },
  dayDropdownItemText: { fontSize: 14, fontWeight: 'bold', color: colors.background },
  dayDropdownItemTextActive: { color: colors.accent },
  addNewsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginRight: 8,
  },
  newsInput: {
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '94%',
    minHeight: 80,
    color: colors.textDark,
  },
  newsActionRow: { flexDirection: 'row', marginTop: 12 },
  newsCancelTxt: {
    color: colors.gray,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  newsSaveTxt: {
    color: colors.yellow,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});

export default React.memo(CalendarScreen);
