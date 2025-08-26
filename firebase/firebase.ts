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
  increment,
  onSnapshot,
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
const db = getFirestore(app);
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

async function withRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && error?.code === 'unavailable') {
      Alert.alert('Offline', 'Network unavailable, retrying...');
      await new Promise((res) => setTimeout(res, 1000));
      return withRetry(operation, retries - 1);
    }
    console.error('Firebase operation failed:', error);
    Alert.alert('Error', 'Something went wrong. Please try again later.');
    throw error;
  }
}

function wrapDoc(path: string[]) {
  const ref = fsDoc(db, ...path);
  return {
    get: () => withRetry(() => getDoc(ref)),
    set: (data: any, options?: any) => withRetry(() => setDoc(ref, data, options)),
    update: (data: any) => withRetry(() => updateDoc(ref, data)),
    delete: () => withRetry(() => deleteDoc(ref)),
    onSnapshot: (cb: any) => {
      try {
        return onSnapshot(ref, cb);
      } catch (error) {
        console.error('Firestore onSnapshot error:', error);
        throw error;
      }
    },
    collection: (name: string) => wrapCollection([...path, name]),
    ref,
  };
}

function wrapCollection(path: string[]) {
  const colRef = fsCollection(db, ...path);
  let q: any = colRef;
  const api: any = {
    doc: (id: string) => wrapDoc([...path, id]),
    add: (data: any) => withRetry(() => addDoc(colRef, data)),
    get: () => withRetry(() => getDocs(q)),
    onSnapshot: (cb: any) => {
      try {
        return onSnapshot(q, cb);
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
  return {
    put: (blob: Blob) => withRetry(() => uploadBytes(ref, blob)),
    putFile: async (uri: string) =>
      withRetry(async () => {
        const res = await fetch(uri);
        const blob = await res.blob();
        return uploadBytes(ref, blob);
      }),
    getDownloadURL: () => withRetry(() => getDownloadURL(ref)),
    listAll: () => withRetry(() => listAll(ref)),
    delete: () => withRetry(() => deleteObject(ref)),
    child: (name: string) => storageRef(`${path}/${name}`),
    ref,
  };
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