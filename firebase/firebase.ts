import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const authInstance = getAuth(app);
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
    get: () => getDocs(q),
  };
  return api;
}

function storageRef(path: string) {
  const ref = stRef(storageInstance, path);
  return {
    putFile: async (uri: string) => {
      const response = await fetch(uri);
      const blob = await response.blob();
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