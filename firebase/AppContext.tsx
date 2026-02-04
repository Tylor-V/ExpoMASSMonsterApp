import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { firestore } from './firebase';
import { auth } from './firebase';
import {createOrUpdateUserProfile} from './firebaseUserProfile';

const defaultState = {
  appReady: false,
  user: null,
  userError: null,
  points: 0,
  workoutHistory: [],
  calendarCarouselIndex: 0,
  setAppStatus: (_: any) => {},
  setCalendarCarouselIndex: (_: number) => {},
  refreshUserData: async () => {},
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
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userError, setUserError] = useState<Error | null>(null);
  const [points, setPoints] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState([]); // Always an array
  const [calendarCarouselIndex, setCalendarCarouselIndex] = useState(0);

  function setAppStatus({ user: u, points, workoutHistory }: any) {
    setUser(u ?? null);
    setPoints(points ?? 0);
    setWorkoutHistory(Array.isArray(workoutHistory) ? workoutHistory : []);
    setAppReady(true);
  }

  const buildUserData = (authUser: any, data: any) => {
    const displayName = authUser?.displayName || '';
    const firstName = displayName.split(' ')[0] || '';
    const lastName = displayName.split(' ').slice(1).join(' ') || '';
    return {
      ...userDefaults,
      uid: authUser?.uid || '',
      email: authUser?.email || '',
      firstName,
      lastName,
      ...(data || {}),
    };
  };

  const applyUserData = (authUser: any, data: any) => {
    const built = buildUserData(authUser, data);
    setUser(built);
    setPoints(built.accountabilityPoints ?? 0);
    const history = built.workoutHistory;
    setWorkoutHistory(Array.isArray(history) ? history : []);
  };

  const fetchUserData = useCallback(async (currentUser: any | null) => {
    if (!currentUser) {
      setUser(null);
      setPoints(0);
      setWorkoutHistory([]);
      setUserError(null);
      setAppReady(true);
      return;
    }
    setUserError(null);
    try {
      const snap = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      applyUserData(currentUser, snap.data());
      setAppReady(true);
    } catch (error) {
      setUserError(
        error instanceof Error ? error : new Error('Failed to load user data.'),
      );
      setAppReady(true);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    await fetchUserData(authUser);
  }, [authUser, fetchUserData]);

  // Subscribe to auth changes and load user data accordingly
  useEffect(() => {
    let userUnsub: (() => void) | null = null;
    const authUnsub = auth().onAuthStateChanged(async user => {
      // Always reset state until new user data loads
      userUnsub?.();
      setAppReady(false);
      setUserError(null);
      setAuthUser(user);
      setUser(null);
      setPoints(0);
      setWorkoutHistory([]);
      if (user) {
        try {
          await createOrUpdateUserProfile({
            uid: user.uid,
            email: user.email || '',
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          });
        } catch (error) {
          setUserError(
            error instanceof Error
              ? error
              : new Error('Failed to initialize user profile.'),
          );
        }
        // Fetch user data once immediately so UI updates even if snapshot is delayed
        await fetchUserData(user);
        userUnsub = firestore()
          .collection('users')
          .doc(user.uid)
          .onSnapshot(
            doc => {
              setUserError(null);
              applyUserData(user, doc.data());
              setAppReady(true);
            },
            error => {
              setUserError(
                error instanceof Error
                  ? error
                  : new Error('Failed to sync user data.'),
              );
              setAppReady(true);
            },
          );
      } else {
        userUnsub?.();
        userUnsub = null;
        setUser(null);
        setPoints(0);
        setWorkoutHistory([]);
        setUserError(null);
        setAppReady(true);
      }
    });
    return () => {
      authUnsub();
      userUnsub?.();
    };
  }, [fetchUserData]);

  return (
    <AppContext.Provider
      value={{
        appReady,
        user,
        userError,
        points,
        workoutHistory,
        calendarCarouselIndex,
        setAppStatus,
        setCalendarCarouselIndex,
        refreshUserData,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
