// jest.setup.js

global.__DEV__ = true;
const { Platform } = require('react-native');
Platform.OS = 'android';
Platform.select = (objs) => objs.android ?? objs.default;

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  DefaultTheme: {
    dark: false,
    colors: {},
    fonts: {
      regular: { fontFamily: 'System', fontWeight: 'normal' },
      medium: { fontFamily: 'System', fontWeight: 'normal' },
      light: { fontFamily: 'System', fontWeight: 'normal' },
      thin: { fontFamily: 'System', fontWeight: 'normal' },
    },
  },
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb) => {
    const React = require('react');
    return React.useEffect(cb, []);
  },
  useTheme: () => ({
    dark: false,
    colors: {},
    fonts: {
      regular: { fontFamily: 'System', fontWeight: 'normal' },
      medium: { fontFamily: 'System', fontWeight: 'normal' },
      light: { fontFamily: 'System', fontWeight: 'normal' },
      thin: { fontFamily: 'System', fontWeight: 'normal' },
    },
  }),
}));

jest.mock('react-native-gesture-handler', () => {
  const RNGestureHandler = require('react-native-gesture-handler/jestSetup');
  return {
    ...RNGestureHandler,
    State: {
      UNDETERMINED: -1,
      FAILED: 0,
      BEGAN: 1,
      ACTIVE: 2,
      CANCELLED: 3,
      END: 4,
    },
    Directions: RNGestureHandler.Directions,
  };
});

jest.mock('react-native-reanimated', () =>
  require('./__mocks__/react-native-reanimated.js')
);

jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));

// 🔧 Added Mocks for Firebase and App-specific logic

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
  getReactNativePersistence: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('firebase/firestore', () => ({
  collection: () => ({
    where: () => ({
      orderBy: () => ({
        get: () => Promise.resolve({
          docs: [{ id: '1', data: () => ({ title: 'News Title' }) }],
        }),
      }),
      get: () => Promise.resolve({
        docs: [{ id: '1', data: () => ({ title: 'News Title' }) }],
      }),
    }),
  }),
}));

jest.mock('./hooks/useCurrentUserDoc', () => ({
  useCurrentUserDoc: () => ({
    id: 'mock-user',
    firstName: 'Mock',
    lastName: 'User',
    profilePicUrl: '',
    bio: '',
    badges: [],
    coursesProgress: {},
    mindsetChapterCompleted: 1,
    chatLevel: 1,
    chatXP: 0,
  }),
}));

jest.mock('./hooks/useCurrentUserStatus', () => ({
  useCurrentUserStatus: () => ({
    user: {
      id: 'mock-user',
      firstName: 'Mock',
      lastName: 'User',
      profilePicUrl: '',
      bio: '',
      badges: [],
      coursesProgress: {},
      mindsetChapterCompleted: 1,
      chatLevel: 1,
      chatXP: 0,
    },
    loading: false,
    error: null,
    refreshUserData: jest.fn(),
  }),
}));

jest.mock('./components/NewsModal', () => 'NewsModal');
jest.mock('./components/ProfileModal', () => 'ProfileModal');
jest.mock('./screens/StoriesViewer', () => 'StoriesViewer');
jest.mock('./components/OnlineUsersSidebar', () => 'OnlineUsersSidebar');
