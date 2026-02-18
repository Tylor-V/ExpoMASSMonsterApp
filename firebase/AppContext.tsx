import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert, AppState } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { firestore } from './firebase';
import { auth } from './firebase';
import {createOrUpdateUserProfile} from './firebaseUserProfile';

const defaultState = {
  appReady: false,
  user: null,
  userError: null,
  userLoading: false,
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
  acceptedAt: null,
  acceptedTermsVersion: '',
  acceptedGuidelinesVersion: '',
};

export function AppContextProvider({children}) {
  const [appReady, setAppReady] = useState(false);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userError, setUserError] = useState<Error | null>(null);
  const [userLoading, setUserLoading] = useState(false);
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
    if (built?.isBanned) {
      Alert.alert('Account Disabled', 'Your account has been disabled.');
      setUser(null);
      setPoints(0);
      setWorkoutHistory([]);
      setAppReady(true);
      signOut(auth()).catch(() => {});
      return;
    }
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
      setUserLoading(false);
      setAppReady(true);
      return;
    }
    setUserLoading(true);
    setUserError(null);
    try {
      const snap = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      applyUserData(currentUser, snap.data());
    } catch (error) {
      setUserError(
        error instanceof Error ? error : new Error('Failed to load user data.'),
      );
    } finally {
      setUserLoading(false);
      setAppReady(true);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    await fetchUserData(authUser);
  }, [authUser, fetchUserData]);

  // Subscribe to auth changes and load user data accordingly
  useEffect(() => {
    let userUnsub: (() => void) | null = null;
    let currentAuthUser: any | null = null;
    let appState = AppState.currentState;

    const detachUserListener = () => {
      userUnsub?.();
      userUnsub = null;
    };

    const attachUserListener = (user: any) => {
      if (!user || appState !== 'active') {
        return;
      }
      detachUserListener();
      userUnsub = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          doc => {
            setUserError(null);
            const data = doc.data();
            if (data?.isBanned) {
              Alert.alert('Account Disabled', 'Your account has been disabled.');
              setUser(null);
              setPoints(0);
              setWorkoutHistory([]);
              setAppReady(true);
              signOut(auth()).catch(() => {});
              return;
            }
            applyUserData(user, data);
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
    };

    const appStateSub = AppState.addEventListener('change', nextState => {
      appState = nextState;
      if (nextState === 'active' && currentAuthUser) {
        fetchUserData(currentAuthUser);
        attachUserListener(currentAuthUser);
      }
      if (nextState.match(/inactive|background/)) {
        detachUserListener();
      }
    });

    const authUnsub = onAuthStateChanged(auth(), async user => {
      currentAuthUser = user;
      // Always reset state until new user data loads
      detachUserListener();
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
        attachUserListener(user);
      } else {
        detachUserListener();
        setUser(null);
        setPoints(0);
        setWorkoutHistory([]);
        setUserError(null);
        setAppReady(true);
      }
    });
    return () => {
      appStateSub.remove();
      authUnsub();
      detachUserListener();
    };
  }, [fetchUserData]);

  return (
    <AppContext.Provider
      value={{
        appReady,
        user,
        userError,
        userLoading,
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
