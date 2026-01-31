import { Platform } from 'react-native';
import { auth, firestore, storage } from './firebase';

// Generates the full user profile doc for new users
export const getDefaultUserProfile = ({
  uid,
  email,
  firstName,
  lastName,
  role = 'member',
}: {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}) => ({
  uid,
  email,
  firstName,
  lastName,
  role,
  profilePicUrl: '',
  bio: '',
  socials: {},
  chatXP: 0,
  chatLevel: 1,
  accountabilityPoints: 0,
  accountabilityStreak: 0,
  lastAccountabilityDate: '',
  coursesProgress: {},
  lastSeen: firestore.FieldValue.serverTimestamp(),
  lastActive: firestore.FieldValue.serverTimestamp(),
  presence: 'offline',
  showOnlineStatus: true,
  badges: [],
  selectedBadges: [],
  workoutHistory: [],
  createdAt: firestore.FieldValue.serverTimestamp(),
});

// Call on registration or login to create or update
export async function createOrUpdateUserProfile({
  uid,
  email,
  firstName,
  lastName,
  role,
}: {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}) {
  const userDocRef = firestore().collection('users').doc(uid);

  try {
    // Check if profile already exists before writing
    const doc = await userDocRef.get();

    if (!doc.exists) {
      // New user: set full default profile
      await userDocRef.set(
        getDefaultUserProfile({
          uid,
          email,
          firstName,
          lastName,
          role,
        }),
      );
    } else {
      // Existing user: update timestamps and add missing fields
      const data = doc.data() || {};
      const update: any = {
        lastSeen: firestore.FieldValue.serverTimestamp(),
        lastActive: firestore.FieldValue.serverTimestamp(),
        presence: 'online',
      };
      if (!data.firstName && firstName) update.firstName = firstName;
      if (!data.lastName && lastName) update.lastName = lastName;
      if (!data.email && email) update.email = email;
      if (role && !data.role) update.role = role;
      await userDocRef.set(update, { merge: true });
    }
  } catch (err) {
    console.error('Failed to create or update user profile', err);
    throw err;
  }
}

// --- PROFILE PIC UPLOAD ---
// This uploads a profile pic to Firebase Storage and returns the public download URL
export async function uploadProfilePic(localUri: string): Promise<string> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const filename = `profilePics/${uid}/${Date.now()}.jpg`;
  const ref = storage().ref(filename);
  try {
    if (Platform.OS === 'ios' && localUri.startsWith('ph://')) {
      // Lazily import MediaLibrary so Android builds don't attempt to load
      // the module and trigger warnings about missing permissions. The
      // native asset info lookup is only required for iOS when dealing with
      // "ph://" URIs returned by the system picker.
      const MediaLibrary = await import('expo-media-library');
      const assetInfo = await MediaLibrary.getAssetInfoAsync(localUri);
      localUri = assetInfo.localUri || localUri;
    }
    await ref.putFile(localUri);
    return await ref.getDownloadURL();
  } catch (err) {
    console.error('Failed to upload profile picture', err);
    throw err;
  }
}

// Upload a new profile pic and remove any previous pics for this user
export async function replaceProfilePic(localUri: string): Promise<string> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');

  try {
    const list = await storage().ref(`profilePics/${uid}`).listAll();
    await Promise.all(list.items.map((i: any) => i.delete()));
  } catch (err) {
    console.error('Failed to remove old profile pictures', err);
  }

  return uploadProfilePic(localUri);
}
