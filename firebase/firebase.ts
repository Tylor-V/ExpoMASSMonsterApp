import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  collection as fsCollection,
  doc as fsDoc,
  limit as fsLimit,
  orderBy as fsOrderBy,
  query as fsQuery,
  runTransaction as fsRunTransaction,
  where as fsWhere,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  increment,
  onSnapshot,
  setLogLevel,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref as stRef,
  uploadBytes,
} from 'firebase/storage';
import { Alert, Platform } from 'react-native';
import env from '../utils/env';

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  measurementId: env.FIREBASE_MEASUREMENT_ID,
};


const requiredFirebaseConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

const missingFirebaseConfigKeys = requiredFirebaseConfigKeys.filter(
  key => !firebaseConfig[key],
);

if (missingFirebaseConfigKeys.length > 0) {
  const message = `Missing required Firebase config keys: ${missingFirebaseConfigKeys.join(', ')}`;
  console.error(message);
  Alert.alert(
    'Firebase Configuration Missing',
    'Required Firebase configuration is missing. The app cannot continue.',
  );
  throw new Error(message);
}

// Ensure the Firebase app and auth are initialized only once
const existingApps = getApps();
const app = existingApps.length ? getApp() : initializeApp(firebaseConfig);
let authInstance;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  authInstance = existingApps.length
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
}
let db;
if (Platform.OS === 'web') {
  db = getFirestore(app);
} else {
  try {
    db = initializeFirestore(app, {
      // Auto-detect long polling to prevent WebChannel transport errors in RN
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });
  } catch (err) {
    db = getFirestore(app);
  }
}
// Reduce Firestore internal logging to errors only
setLogLevel('error');
if (Platform.OS === 'web') {
  // Enable offline persistence on supported browsers
  import('firebase/firestore').then(({ enableIndexedDbPersistence }) => {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn('Persistence enablement failed', err);
    });
  });
}
const storageInstance = getStorage(app);

// Analytics is only available on web; load lazily to remain Expo compatible
let analyticsInstance: any;
if (Platform.OS === 'web') {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    isSupported().then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    });
  });
}

type RetryOptions = {
  suppressAlert?: boolean;
};

async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 1,
  options: RetryOptions = {},
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && error?.code === 'unavailable') {
      if (!options.suppressAlert) {
        Alert.alert('Offline', 'Network unavailable, retrying...');
      }
      await new Promise((res) => setTimeout(res, 1000));
      return withRetry(operation, retries - 1, options);
    }
    console.error('Firebase operation failed:', error);
    if (!options.suppressAlert) {
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    }
    throw error;
  }
}

function wrapDoc(path: string[], existingRef?: any) {
  const ref = existingRef || fsDoc(db, ...path);
  const fullPath = [...path];
  return {
    get: (retryOptions?: RetryOptions) => withRetry(() => getDoc(ref), 1, retryOptions),
    set: (data: any, options?: any, retryOptions?: RetryOptions) => withRetry(() => setDoc(ref, data, options), 1, retryOptions),
    update: (data: any, retryOptions?: RetryOptions) => withRetry(() => updateDoc(ref, data), 1, retryOptions),
    delete: (retryOptions?: RetryOptions) => withRetry(() => deleteDoc(ref), 1, retryOptions),
    onSnapshot: (cb: any, onError?: any) => {
      try {
        return onSnapshot(ref, cb, onError || ((error: any) => {
          console.error('Firestore onSnapshot error:', error);
        }));
      } catch (error) {
        console.error('Firestore onSnapshot error:', error);
        throw error;
      }
    },
    collection: (name: string) => wrapCollection([...fullPath, name]),
    ref,
    id: ref.id,
    path: ref.path,
  };
}

function wrapCollection(path: string[]) {
  const colRef = fsCollection(db, ...path);
  let q: any = colRef;
  const api: any = {
    doc: (id?: string) => {
      const docRef = id ? fsDoc(db, ...path, id) : fsDoc(colRef);
      return wrapDoc([...path, docRef.id], docRef);
    },
    add: (data: any, retryOptions?: RetryOptions) => withRetry(() => addDoc(colRef, data), 1, retryOptions),
    get: (retryOptions?: RetryOptions) => withRetry(() => getDocs(q), 1, retryOptions),
    onSnapshot: (cb: any, onError?: any) => {
      try {
        return onSnapshot(q, cb, onError || ((error: any) => {
          console.error('Firestore onSnapshot error:', error);
        }));
      } catch (error) {
        console.error('Firestore onSnapshot error:', error);
        throw error;
      }
    },
    where: (field: string, op: any, value: any) => {
      q = fsQuery(q, fsWhere(field, op, value));
      return api;
    },
    orderBy: (field: string, dir?: any) => {
      q = fsQuery(q, fsOrderBy(field, dir));
      return api;
    },
    limit: (n: number) => {
      q = fsQuery(q, fsLimit(n));
      return api;
    },
  };
  return api;
}

function storageRef(path: string) {
  const ref = stRef(storageInstance, path);
  const api: any = {
    put: (blob: Blob) => withRetry(() => uploadBytes(ref, blob)),
    putFile: async (uri: string, metadata?: any) =>
      withRetry(async () => {
        const res = await fetch(uri);
        const blob = await res.blob();
        return uploadBytes(ref, blob, metadata);
      }),
    getDownloadURL: () => withRetry(() => getDownloadURL(ref)),
    listAll: () =>
      withRetry(async () => {
        const res = await listAll(ref);
        return {
          ...res,
          items: res.items.map((item) => storageRef(item.fullPath)),
          prefixes: res.prefixes.map((item) => storageRef(item.fullPath)),
        };
      }),
    delete: () => withRetry(() => deleteObject(ref)),
    child: (name: string) => storageRef(`${path}/${name}`),
    ref,
    fullPath: ref.fullPath,
  };
  return api;
}

export function firestore() {
  return {
    collection: (name: string) => wrapCollection([name]),
    runTransaction: (updateFunction: any) => fsRunTransaction(db, updateFunction),
    batch: () => writeBatch(db),
  };
}

export const FieldValue = {
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  delete: deleteField,
};
(firestore as any).FieldValue = FieldValue;

export const auth = () => authInstance;
export const storage = () => ({
  ref: storageRef,
  refFromURL: (url: string) => storageRef(url),
});

export const analytics = () => analyticsInstance;

export default app;
