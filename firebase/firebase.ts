import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  addDoc,
  deleteDoc,
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
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref as stRef,
  uploadBytes,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const authInstance = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);
const storageInstance = getStorage(app);

function wrapDoc(path: string[]): any {
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

function wrapCollection(path: string[]): any {
  let colRef = fsCollection(db, ...path);
  let q: any = colRef;
  const api: any = {
    doc: (id: string) => wrapDoc([...path, id]),
    add: (data: any) => addDoc(colRef, data),
    onSnapshot: (cb: any) => onSnapshot(q, cb),
    where: (field: string, op: any, value: any) => {
      q = fsQuery(q, fsWhere(field, op, value));
@@ -88,26 +95,26 @@ function storageRef(path: string) {
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
  };
}
(firestore as any).FieldValue = { serverTimestamp };

export const auth = () => authInstance;
export const storage = () => ({
  ref: storageRef,
  refFromURL: (url: string) => storageRef(url),
});
export const FieldValue = { serverTimestamp };

export default app;