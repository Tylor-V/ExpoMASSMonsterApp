import React, {createContext, useContext, useState, useEffect} from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {createOrUpdateUserProfile} from './firebaseUserProfile';

const defaultState = {
  appReady: false,
  user: null,
  points: 0,
  workoutHistory: [],
  calendarCarouselIndex: 0,
  setAppStatus: (_: any) => {},
  setCalendarCarouselIndex: (_: number) => {},
};

const AppContext = createContext(defaultState);

const userDefaults = {
  role: 'member',
  profilePicUrl: '',
  bio: '',
  socials: {},
  chatXP: 0,
  chatLevel: 1,
  accountabilityPoints: 0,
  accountabilityStreak: 0,
  lastAccountabilityDate: '',
  coursesProgress: {},
  mindsetChapterCompleted: 0,
  lastSeen: Date.now(),
  lastActive: Date.now(),
  presence: 'offline',
  showOnlineStatus: true,
  badges: [],
  selectedBadges: [],
  workoutHistory: [],
};

export function AppContextProvider({children}) {
  const [appReady, setAppReady] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [points, setPoints] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState([]); // Always an array
  const [calendarCarouselIndex, setCalendarCarouselIndex] = useState(0);

  function setAppStatus({ user: u, points, workoutHistory }: any) {
    setUser(u ?? null);
    setPoints(points ?? 0);
    setWorkoutHistory(Array.isArray(workoutHistory) ? workoutHistory : []);
    setAppReady(true);
  }

  // Subscribe to auth changes and load user data accordingly
  useEffect(() => {
    let userUnsub: (() => void) | null = null;
    const authUnsub = auth().onAuthStateChanged(async user => {
      // Always reset state until new user data loads
      userUnsub?.();
      setAppReady(false);
      setUser(null);
      setPoints(0);
      setWorkoutHistory([]);
      if (user) {
        await createOrUpdateUserProfile({
          uid: user.uid,
          email: user.email || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        });
        // Fetch user data once immediately so UI updates even if snapshot is delayed
        try {
          const snap = await firestore().collection('users').doc(user.uid).get();
          const data = { ...userDefaults, ...(snap.data() || {}) };
          setUser(data);
          setPoints(data.accountabilityPoints ?? 0);
          const history = data.workoutHistory;
          setWorkoutHistory(Array.isArray(history) ? history : []);
          setAppReady(true);
        } catch {
          // Ignore fetch errors - real-time listener will update later
        }
        userUnsub = firestore()
          .collection('users')
          .doc(user.uid)
          .onSnapshot(doc => {
            const data = { ...userDefaults, ...(doc.data() || {}) };
            setUser(data);
            setPoints(data.accountabilityPoints ?? 0);
            const history = data.workoutHistory;
            setWorkoutHistory(Array.isArray(history) ? history : []);
            setAppReady(true);
          });
      } else {
        userUnsub?.();
        userUnsub = null;
        setUser(null);
        setPoints(0);
        setWorkoutHistory([]);
        setAppReady(true);
      }
    });
    return () => {
      authUnsub();
      userUnsub?.();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        appReady,
        user,
        points,
        workoutHistory,
        calendarCarouselIndex,
        setAppStatus,
        setCalendarCarouselIndex,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}