import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
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
import { Platform } from 'react-native';
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

const app = initializeApp(firebaseConfig);
let authInstance = getAuth(app);
if (Platform.OS !== 'web') {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
const db = getFirestore(app);
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

function wrapDoc(path: string[]) {
  const ref = fsDoc(db, ...path);
  return {
    get: () => getDoc(ref),
    set: (data: any, options?: any) => setDoc(ref, data, options),
    update: (data: any) => updateDoc(ref, data),
    delete: () => deleteDoc(ref),
    onSnapshot: (cb: any) => onSnapshot(ref, cb),
    collection: (name: string) => wrapCollection([...path, name]),
    ref,
  };
}

function wrapCollection(path: string[]) {
  const colRef = fsCollection(db, ...path);
  let q: any = colRef;
  const api: any = {
    doc: (id: string) => wrapDoc([...path, id]),
    add: (data: any) => addDoc(colRef, data),
    get: () => getDocs(q),
    onSnapshot: (cb: any) => onSnapshot(q, cb),
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
    put: (blob: Blob) => uploadBytes(ref, blob),
    putFile: async (uri: string) => {
      const res = await fetch(uri);
      const blob = await res.blob();
      return uploadBytes(ref, blob);
    },
    getDownloadURL: () => getDownloadURL(ref),
    listAll: () => listAll(ref),
    delete: () => deleteObject(ref),
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