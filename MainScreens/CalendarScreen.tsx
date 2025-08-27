import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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
  FlatList,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import { getTodayKey } from '../firebase/dateHelpers';
import { auth, firestore } from '../firebase/firebase';
import {
  fetchSharedSplits,
  removeSharedSplit,
  saveCustomSplit,
  saveMySharedSplit,
  saveSharedSplits,
  saveShowWorkout,
  saveWorkoutPlan
} from '../firebase/userProfileHelpers';
import { colors, fonts } from '../theme';
import {
  ANIM_BUTTON_POP,
  ANIM_BUTTON_PRESS,
  ANIM_MEDIUM
} from '../utils/animations';

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

type IoniconProps = ComponentProps<typeof Ionicons> & {
  style?: any;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
};
const AnimatedIcon = ({ style, pointerEvents, ...rest }: IoniconProps) => (
  <Animated.View style={style} pointerEvents={pointerEvents}>
    <Ionicons {...rest} />
  </Animated.View>
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
  const iso = new Date().toISOString().slice(0, 10);
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
  const iso = new Date().toISOString().slice(0, 10);
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
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  const iso = today.toISOString().slice(0, 10);
  const totalDiff = Math.floor(
    (today.getTime() - new Date(plan.startDate).getTime()) / 86400000,
  );
  const postponed = plan.postponedDates || [];
  const isPostponed = postponed.includes(iso);
  const pastSkips = postponed.filter(d => d < iso).length;
  const diffIdx = totalDiff - pastSkips;
  if (!isPostponed && diffIdx >= 0) {
    return diffIdx % plan.days.length;
  }
  return null;
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
  const [days] = useState(getNext7Days());
  const [selectedIndex, setSelectedIndex] = useState(0);
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
  const chevronScale = useRef(new Animated.Value(1)).current;
  const chevronRotate = useRef(new Animated.Value(0)).current;

  const { width: screenWidth, height: windowHeight } = useWindowDimensions();
  const CAROUSEL_CARD_MARGIN = 12;
  const containerWidth = screenWidth;
  const carouselWidth = containerWidth;
  const PLAN_DRAWER_HEIGHT = windowHeight * 0.8;
  const WORKOUT_DRAWER_MAX_HEIGHT = windowHeight * 0.6;

  // Styles that depend on carousel width
  const carouselCardStyle = useMemo(
    () => [
      styles.carouselCard,
      {
        width: carouselWidth - CAROUSEL_CARD_MARGIN * 2,
        marginHorizontal: CAROUSEL_CARD_MARGIN,
      },
    ],
    [carouselWidth],
  );
  const carouselChipStyle = useMemo(
    () => [styles.carouselChip, { width: carouselWidth - CAROUSEL_CARD_MARGIN * 2 - 60 }],
    [carouselWidth],
  );
  
  const DRAWER_ANIM_DURATION = ANIM_MEDIUM;
  const planDrawerAnim = useRef(new Animated.Value(PLAN_DRAWER_HEIGHT)).current;
  const planDrawerOverlay = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    planDrawerAnim.setValue(showPlanDrawer ? 0 : PLAN_DRAWER_HEIGHT);
  }, [PLAN_DRAWER_HEIGHT, showPlanDrawer]);
  const [rootHeight, setRootHeight] = useState(0);
  const [massCardTop, setMassCardTop] = useState<number | null>(null);
  const [daysRowHeight, setDaysRowHeight] = useState(0);
  const [eventListMaxHeight, setEventListMaxHeight] = useState<number>();
  const [drawerOffset, setDrawerOffset] = useState(DRAWER_HEIGHT);
  const drawerAnim = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const drawerOverlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronRotate, {
      toValue: dayMenuOpen ? 1 : 0,
      duration: ANIM_MEDIUM,
      useNativeDriver: true,
    }).start();
  }, [dayMenuOpen, chevronRotate]);

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
    () => ['massEvents', 'news', 'comps'],
    [],
  );
  const carouselIndexPersist = useRef(calendarCarouselIndex);
  const [carouselIndex, setCarouselIndex] = useState(carouselIndexPersist.current);
  const carouselRef = useRef<ScrollView>(null);
  const goToIndex = useCallback(
    (next: number | ((cur: number) => number)) => {
      setCarouselIndex(cur => {
        const target = typeof next === 'function' ? next(cur) : next;
        const clamped = Math.min(Math.max(target, 0), carouselItems.length - 1);
        return clamped;
      });
    },
    [carouselItems.length],
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
        if (val != null) {
          const idx = parseInt(val, 10);
          if (
            !isNaN(idx) &&
            idx !== initialIndex &&
            carouselIndexPersist.current === initialIndex
          ) {
            carouselIndexPersist.current = idx;
            lastCarouselIndex = idx;
            setCalendarCarouselIndex(idx);
            setCarouselIndex(idx);
          }
        }
      })
      .catch(() => {
        loadedCarouselIndex.current = true;
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    carouselRef.current?.scrollTo({ x: carouselWidth * carouselIndex, animated: true });
    carouselIndexPersist.current = carouselIndex;
    lastCarouselIndex = carouselIndex;
    setCalendarCarouselIndex(carouselIndex);
    AsyncStorage.setItem(CAROUSEL_INDEX_KEY, String(carouselIndex)).catch(err =>
      console.error('Failed to save carousel index', err)
    );
  }, [carouselIndex, carouselWidth]);
  const [carouselHeight, setCarouselHeight] = useState<number | undefined>();

  useEffect(() => {
    if (rootHeight && massCardTop !== null) {
      const h = rootHeight - massCardTop;
      if (h > 0) {
        setDrawerOffset(h);
      }
    }
  }, [rootHeight, massCardTop]);

  useEffect(() => {
    if (massCardTop !== null) {
      const avail = massCardTop - daysRowHeight;
      if (avail > 0) {
        setEventListMaxHeight(avail);
      }
    }
  }, [massCardTop, daysRowHeight]);

  useEffect(() => {
    drawerAnim.setValue(drawerOffset);
  }, [drawerOffset, showPlanDrawer, PLAN_DRAWER_HEIGHT]);

  const selectedDate = days[selectedIndex].date;

  const computeEventsForDate = React.useCallback(
    (date: Date): CalendarEvent[] => {
      const iso = date.toISOString().slice(0, 10);
      const list: CalendarEvent[] = [];
      if (date.getDay() === 0) {
        list.push({
          id: 'coffee',
          title: 'Coffee Hour',
          date: iso,
        });
      }
      if (date.getDay() === 3) {
        list.push({
          id: 'orientation',
          title: 'Orientation',
          date: iso,
        });
      }
      events.forEach(ev => {
        if (ev.date === iso) list.push(ev);
      });
      if (showWorkout && plan) {
        const totalDiff = Math.floor(
          (date.getTime() - new Date(plan.startDate).getTime()) / 86400000,
        );
        const postponed = plan.postponedDates || [];
        const isPostponed = postponed.includes(iso);
        const pastSkips = postponed.filter(d => d < iso).length;
        const diff = totalDiff - pastSkips;
        if (!isPostponed && diff >= 0) {
          const workoutDay = plan.days[diff % plan.days.length];
          list.push({
            id: 'workout-' + diff,
            title: workoutDay.title,
            date: iso,
            type: 'workout',
          });
        }
      }
      return list;
    },
    [events, showWorkout, plan],
  );


  useEffect(() => {
    (async () => {
      const storedToggle = await AsyncStorage.getItem('showWorkout');
      if (storedToggle) setShowWorkout(storedToggle === 'true');

      const storedPlan = await AsyncStorage.getItem('workoutPlan');
      if (storedPlan) {
        try {
          setPlan(JSON.parse(storedPlan));
        } catch {
          await AsyncStorage.removeItem('workoutPlan');
        }
      }

      const storedCustom = await AsyncStorage.getItem(customSplitKey);
      let custom = null;
      if (storedCustom) {
        try {
          custom = JSON.parse(storedCustom);
        } catch {
          await AsyncStorage.removeItem(customSplitKey);
        }
      }

      const storedShared = await AsyncStorage.getItem('sharedSplits');
      let shared: any[] = [];
      if (storedShared) {
        try {
          shared = JSON.parse(storedShared);
        } catch {
          await AsyncStorage.removeItem('sharedSplits');
        }
      }
      try {
        const uid = auth().currentUser?.uid;
        if (uid) {
          const doc = await firestore().collection('users').doc(uid).get();
          const remoteToggle = doc.data()?.showWorkout;
          if (typeof remoteToggle === 'boolean') {
            setShowWorkout(remoteToggle);
            await AsyncStorage.setItem('showWorkout', remoteToggle ? 'true' : 'false');
          }
          const remote = doc.data()?.customSplit;
          if (remote) {
            custom = remote;
            await AsyncStorage.setItem(customSplitKey, JSON.stringify(remote));
          }
          try {
            const remoteShared = await fetchSharedSplits();
            if (remoteShared && Array.isArray(remoteShared)) {
              shared = remoteShared;
              await AsyncStorage.setItem('sharedSplits', JSON.stringify(remoteShared));
            }
          } catch (err) {
            console.error('Failed to fetch shared splits', err);
          }
        }
      } catch (e) {
        console.error('Failed to load profile data from Firestore', e);
      }
      if (custom) setCustomSplit(custom);
      if (Array.isArray(shared)) setSharedSplits(shared);
      setSharedLoaded(true);
      setCustomSplitLoaded(true);
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('showWorkout', showWorkout ? 'true' : 'false');
    saveShowWorkout(showWorkout).catch(err =>
      console.error('Failed to save showWorkout', err)
    );
  }, [showWorkout]);

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

  const dayEvents = useMemo(
    () => computeEventsForDate(selectedDate),
    [selectedDate, computeEventsForDate],
  );

  const eventNumColumns = dayEvents.length > 1 ? 2 : 1;
  const eventListScrollable =
    dayEvents.length > eventNumColumns * 2 || !!eventListMaxHeight;

  const massEvents = useMemo(() => {
    const base = MASS_EVENTS.map(info => {
      const next = getNextOccurrence(info.weekday, 9, 0);
      const diff = next.getTime() - Date.now();
      return { ...info, next, diff };
    });
  
    if (showWorkout && plan) {
      const today = new Date();
      today.setHours(9, 0, 0, 0);
      const iso = today.toISOString().slice(0, 10);
      const totalDiff = Math.floor(
        (today.getTime() - new Date(plan.startDate).getTime()) / 86400000,
      );
      const postponed = plan.postponedDates || [];
      const isPostponed = postponed.includes(iso);
      const pastSkips = postponed.filter(d => d < iso).length;
      const diffIdx = totalDiff - pastSkips;
      if (!isPostponed && diffIdx >= 0) {
        const workoutDay = plan.days[diffIdx % plan.days.length];
        base.unshift({
          id: 'workout-today',
          name: workoutDay.title,
          icon: 'barbell-outline',
          weekday: today.getDay(),
          location: '',
          link: '',
          next: today,
          diff: today.getTime() - Date.now(),
          isWorkout: true,
        });
      }
    }

    return base;
  }, [tick, showWorkout, plan]);

  const showSplitPlaceholder = !showWorkout || !plan;

  const todayWorkout = useMemo(() => {
    if (!showWorkout || !plan) return null;
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const iso = today.toISOString().slice(0, 10);
    const totalDiff = Math.floor(
      (today.getTime() - new Date(plan.startDate).getTime()) / 86400000,
    );
    const postponed = plan.postponedDates || [];
    const isPostponed = postponed.includes(iso);
    const pastSkips = postponed.filter(d => d < iso).length;
    const diffIdx = totalDiff - pastSkips;
    if (!isPostponed && diffIdx >= 0) {
      return plan.days[diffIdx % plan.days.length];
    }
    return null;
  }, [tick, showWorkout, plan]);

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
    if (showWorkoutDrawer) {
      drawerAnim.setValue(drawerOffset);
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
          toValue: drawerOffset,
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
  }, [showWorkoutDrawer, drawerOffset]);

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
    saveShowWorkout(v).catch(err => console.error('Failed to save showWorkout', err));
  };

  const selectPlan = (p: WorkoutPlan) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const iso = start.toISOString().slice(0, 10);
    setPlan({ ...p, startDate: iso });
  };

  const navigation = useNavigation();

  const openCustomBuilder = () => {
    navigation.navigate('SplitEditor', {
      initialSplit: null,
      onSave: handleCustomPlanSaved,
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

  const openPlanDrawerFromButton = async () => {
    setShowPlanDrawer(true);
    setPlanLoading(true);
    try {
      const uid = auth().currentUser?.uid;
      if (uid) {
        const doc = await firestore().collection('users').doc(uid).get();
        const remote = doc.data()?.customSplit;
        if (remote) setCustomSplit(remote);
        try {
          const remoteShared = await fetchSharedSplits();
          if (Array.isArray(remoteShared)) setSharedSplits(remoteShared);
        } catch (err) {
          console.error('Failed to fetch shared splits', err);
        }
      }
    } catch (e) {
      console.error('Failed to fetch customSplit', e);
    }
    setPlanLoading(false);
  };

  const closePlanDrawer = () => {
    if (!showWorkout) {
      setShowWorkout(true);
    }
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
      onSave: handleCustomPlanSaved,
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
              const splitCopy = JSON.parse(JSON.stringify(customSplit));
              const ref = firestore()
                .collection('channels')
                .doc('split-sharing')
                .collection('messages');
              
                const old = await ref.where('userId', '==', uid).get();
              const batch = firestore().batch();
              old.docs.forEach(d => batch.delete(d.ref));

              const newRef = ref.doc();
              batch.set(newRef.ref, {
                userId: uid,
                split: splitCopy,
                timestamp: firestore.FieldValue.serverTimestamp(),
                reactions: [],
              });
              
              await batch.commit();

              await saveMySharedSplit({
                split: splitCopy,
                msgId: newRef.id,
                sharedAt: Date.now(),
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
    const iso = scheduleDate.toISOString().slice(0, 10);
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
      key={item.date.toISOString()}
      onPress={() => setSelectedIndex(index)}
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

  const renderEvent = ({ item }: { item: typeof dayEvents[0] }) => (
    <View style={[styles.eventCard, styles.eventCardCompact]}
    >
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
  );

  const onMassCardLayout = useCallback((e) => {
  const layout = e?.nativeEvent?.layout;
  if (layout) {
    setMassCardTop(prev => (prev === null ? layout.y : prev));
  }
}, []);


  const onCarouselItemLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h && h !== carouselHeight) {
        setCarouselHeight(h);
      }
    },
    [carouselHeight],
  );

  useEffect(() => {
    setCarouselHeight(undefined);
  }, [carouselWidth]);

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

  const toggleDayMenu = () => {
    dayArrowRef.current?.measureInWindow((x, y, width, height) => {
      setDayArrowPos({ x: x + width / 2, y: y + height });
    });
    setDayMenuOpen(x => !x);
  };

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
    const start = new Date(plan.startDate);
    start.setDate(start.getDate() - diff);
    const iso = start.toISOString().slice(0, 10);
    const updated = { ...plan, startDate: iso };
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

  const MassEventsSection = () => (
    <View style={carouselCardStyle} onLayout={onMassCardLayout}>
      <View style={styles.massHeaderRow}>
        <Image
          source={require('../assets/mass-logo.png')}
          style={styles.massHeaderLogo}
          contentFit="contain"
        />
        <Text style={styles.massHeaderTxt}>EVENTS</Text>
      </View>
      {showSplitPlaceholder && <ChooseSplitButton />}
      {massEvents.map((ev, idx) => {
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
                    color={colors.yellow}
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
                  onPress={() => setShowWorkoutDrawer(true)}
                  style={styles.zoomBtn}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={26}
                    color="#407BFF"
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
                    <MaterialIcons name="north-east" size={26} color="#407BFF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
      {plan && (
        <Modal
          visible={dayMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDayMenuOpen(false)}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDayMenuOpen(false)}
          >
            <View
              style={[
                styles.dayDropdown,
                {
                  top: dayArrowPos.y,
                  left: dayArrowPos.x - dayDropdownWidth / 2,
                },
              ]}
              onLayout={e => setDayDropdownWidth(e.nativeEvent.layout.width)}
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
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );

  const NewsSection = () => (
    <View style={carouselCardStyle}>
      <View style={styles.massHeaderRow}>
        <Image
          source={require('../assets/mass-logo.png')}
          style={styles.massHeaderLogo}
          contentFit="contain"
        />
        <Text style={styles.massHeaderTxt}>NEWS</Text>
        {user?.role === 'moderator' && (
          <TouchableOpacity
            onPress={() => setAddNewsOpen(true)}
            style={styles.addNewsBtn}
            testID="add-news-btn"
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>
        {newsLoaded ? (
          mergedNews.length ? (
            <ScrollView
              style={{ flexGrow: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {mergedNews.map((item, index) =>
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
            </ScrollView>
          ) : (
            <Text style={styles.newsEmptyText}>No New MASS News</Text>
          )
        ) : (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 30 }} />
        )}
      </View>
    );

  const CompetitionsSection = () => (
    <View style={carouselCardStyle}>
      <View style={styles.massHeaderRow}>
        <Image
          source={require('../assets/comps-logo.png')}
          style={styles.massHeaderLogo}
          contentFit="contain"
        />
      </View>
      {fakeComps.map((c, idx) => (
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
    </View>
  );


  const renderCarouselItem = (item: string, idx: number) => (
    <View
      key={item}
      style={{ width: carouselWidth, alignItems: 'center' }}
      onLayout={onCarouselItemLayout}
    >
      {item === 'massEvents' ? (
        <MassEventsSection />
      ) : item === 'news' ? (
        <NewsSection />
      ) : (
        <CompetitionsSection />
      )}
    </View>
  );

  // ---------- UI ----------
  return (
    <WhiteBackgroundWrapper style={{ flex: 1 }} padBottom={!renderPlanDrawer}>
      <View
        style={{ flex: 1 }}
        onLayout={e => setRootHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {/* Zone 1: days and events */}
          <View>
            <View
              style={{ paddingTop: 12 }}
              onLayout={e => setDaysRowHeight(e.nativeEvent.layout.height)}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daysRow}
              >
                {days.map((item, i) => renderDay({ item, index: i }))}
              </ScrollView>
            </View>
            <FlatList
              style={[
                { flexGrow: 0, flexShrink: 0 },
                eventListMaxHeight ? { maxHeight: eventListMaxHeight } : null,
              ]}
              data={dayEvents}
              keyExtractor={item => item.id}
              key={`event-columns-${eventNumColumns}`}
              renderItem={renderEvent}
              ListEmptyComponent={<Text style={styles.emptyText}>No events</Text>}
              contentContainerStyle={{
                paddingTop: 10,
                paddingHorizontal: 6,
                paddingBottom: 16,
              }}
              numColumns={eventNumColumns}
              columnWrapperStyle={
                eventNumColumns > 1 ? { justifyContent: 'space-between' } : undefined
              }
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={eventListScrollable}
            />
          </View>

          {/* Zone 2: carousel */}
          <View
            style={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={[
                styles.carouselContainer,
                {
                  width: carouselWidth,
                  minHeight: carouselHeight,
                },
              ]}
            >
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                scrollEnabled={false} // disables swipe, navigation is via arrows/dots
                showsHorizontalScrollIndicator={false}
              >
                {carouselItems.map(renderCarouselItem)}
              </ScrollView>
              {carouselItems.length > 1 && (
                <CarouselNavigator
                  index={carouselIndex}
                  length={carouselItems.length}
                  onIndexChange={goToIndex}
                  dotsRowStyle={styles.carouselDotsRow}
                  arrowSize={36}
                  dotSize={16}
                  // Optionally add leftOffset/rightOffset/inactiveColor/maxDots as in SplitSharing
                />
              )}
            </View>
          </View>

          {/* Zone 3: bottom actions */}
          <View
            style={[
              styles.bottomRow,
              {
                paddingLeft: insets.left,
                paddingRight: insets.right,
                marginTop: 16,
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
        </View>

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
          />
          <Animated.View
            style={[
              styles.workoutDrawer,
              { transform: [{ translateY: drawerAnim }], maxHeight: WORKOUT_DRAWER_MAX_HEIGHT },
            ]}
          >
            <Animated.ScrollView
              onLayout={e => setWorkoutContainerHeight(e.nativeEvent.layout.height)}
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
                          <Ionicons name="help-circle-outline" size={22} color="#407BFF" />
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
  daysRow: { paddingHorizontal: 12 },
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
  bottomRow: {
    paddingHorizontal: 0,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
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
    minHeight: 340,
    maxHeight: 420,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    marginTop: 22,
    marginBottom: 27,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 30,
    paddingVertical: 24,
    width: '100%',
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
    height: 80,
    marginRight: 8,
    marginTop: -20,
    marginBottom: -20,
  },
  massHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
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
    position: 'relative',
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: 2,
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
  addNewsBtn: { marginLeft: 'auto' },
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