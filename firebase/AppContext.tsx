import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, AppState } from 'react-native';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { firestore } from './firebase';
import { auth } from './firebase';
import {createOrUpdateUserProfile} from './firebaseUserProfile';
import { hasAcceptedLatest } from '../utils/acceptance';
import { ensurePushRegisteredAndSaved } from './pushNotifications';

const defaultState = {
  appReady: false,
  authUser: null as any,
  user: null as any,
  userError: null as any,
  userLoading: false,
  points: 0,
  workoutHistory: [],
  calendarCarouselIndex: 0,
  setAppStatus: (_: any) => {},
  setCalendarCarouselIndex: (_: number) => {},
  refreshUserData: async () => {},
  retryUserLoad: async () => {},
  signOut: async () => {},
};

const AppContext = createContext(defaultState);

const USER_DATA_LOAD_ERROR = {
  code: 'USER_DATA_LOAD_FAILED',
  message: 'Unable to load account data. Please try again.',
};

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
  const [userError, setUserError] = useState<any | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState([]); // Always an array
  const [calendarCarouselIndex, setCalendarCarouselIndex] = useState(0);
  const pushRegisteredUidRef = useRef<string | null>(null);
  const pushCleanupRef = useRef<(() => void) | null>(null);

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
      firebaseSignOut(auth()).catch(() => {});
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
      console.error('Failed to load user data', error);
      setUserError(USER_DATA_LOAD_ERROR);
    } finally {
      setUserLoading(false);
      setAppReady(true);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    await fetchUserData(authUser);
  }, [authUser, fetchUserData]);

  const retryUserLoad = useCallback(async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  }, [fetchUserData]);

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth());
  }, []);

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
      try {
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
                firebaseSignOut(auth()).catch(() => {});
                return;
              }
              applyUserData(user, data);
              setAppReady(true);
            },
            error => {
              console.error('Failed to sync user data', error);
              setUserError(USER_DATA_LOAD_ERROR);
              setAppReady(true);
            },
          );
      } catch (error) {
        console.error('Failed to attach user listener', error);
        setUserError(USER_DATA_LOAD_ERROR);
        setAppReady(true);
      }
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

  useEffect(() => {
    if (!appReady || !user?.uid || !hasAcceptedLatest(user)) {
      return;
    }

    if (pushRegisteredUidRef.current === user.uid) {
      return;
    }

    pushCleanupRef.current?.();
    pushCleanupRef.current = null;

    pushRegisteredUidRef.current = user.uid;
    let cancelled = false;

    ensurePushRegisteredAndSaved({
      uid: user.uid,
      accepted: true,
      notificationPrefs: user.notificationPrefs,
    })
      .then(cleanup => {
        if (cancelled) {
          cleanup?.();
          return;
        }
        pushCleanupRef.current = cleanup ?? null;
      })
      .catch(error => {
        console.warn('Push notification registration failed', error);
        if (pushRegisteredUidRef.current === user.uid) {
          pushRegisteredUidRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appReady, user]);

  useEffect(() => {
    if (authUser) {
      return;
    }
    pushRegisteredUidRef.current = null;
    pushCleanupRef.current?.();
    pushCleanupRef.current = null;
  }, [authUser]);

  useEffect(
    () => () => {
      pushCleanupRef.current?.();
      pushCleanupRef.current = null;
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        appReady,
        authUser,
        user,
        userError,
        userLoading,
        points,
        workoutHistory,
        calendarCarouselIndex,
        setAppStatus,
        setCalendarCarouselIndex,
        refreshUserData,
        retryUserLoad,
        signOut: signOutUser,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
