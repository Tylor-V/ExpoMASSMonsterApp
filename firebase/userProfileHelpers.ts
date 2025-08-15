// firebase/userProfileHelpers.ts
import { firestore } from './firebase';
import { auth } from './firebase';
import { getTodayKey } from './dateHelpers';

function buildSocialUrl(platform: string, handle: string) {
  if (!handle) return '';
  if (handle.startsWith('http')) return handle;
  const cleaned = handle.replace(/^@/, '');
  const map: Record<string, string> = {
    insta: `https://www.instagram.com/${cleaned}`,
    fb: `https://www.facebook.com/${cleaned}`,
    tiktok: `https://www.tiktok.com/@${cleaned}`,
    yt: `https://www.youtube.com/${cleaned.startsWith('@') ? cleaned : `@${cleaned}`}`,
    twitch: `https://www.twitch.tv/${cleaned}`,
  };
  return map[platform] || handle;
}

// Update a single, top-level profile field (bio, profilePicUrl, etc)
export async function updateProfileField(field: string, value: any) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  await firestore().collection('users').doc(uid).update({ [field]: value });
}

// Update a nested field (e.g., socials)
export async function updateSocialLink(
  platform: string,
  handle: string,
  hidden: boolean,
) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  await firestore()
    .collection('users')
    .doc(uid)
    .update({
      [`socials.${platform}`]: {
        handle: buildSocialUrl(platform, handle),
        hidden,
      },
    });
}

// Update course progress value (0-1) for given course
export async function updateCourseProgress(courseId: string, progress: number) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  
  const ref = firestore().collection('users').doc(uid);
  const doc = await ref.get();
  const current = doc.data()?.coursesProgress?.[courseId] || 0;
  if (progress <= current) return;

  await ref.set(
    { coursesProgress: { [courseId]: progress } },
    { merge: true },
  );

  if (courseId === 'mindset' && progress >= 1) {
    await unlockBadge('MINDSET');
  }

  await checkScholarBadge({
    ...(doc.data()?.coursesProgress || {}),
    [courseId]: progress,
  });
}

// Update the highest completed chapter for the Mindset course
export async function updateMindsetChapter(chapter: number) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');

  const ref = firestore().collection('users').doc(uid);
  const doc = await ref.get();
  const current = doc.data()?.mindsetChapterCompleted || 0;
  if (chapter <= current) return;

  await ref.set({ mindsetChapterCompleted: chapter }, { merge: true });
}

// Increment accountability points by 1 for the current user
export async function addAccountabilityPoint(info?: {
  gymName?: string;
  coords?: { lat: number; lng: number } | null;
  homeWorkout?: boolean;
}) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');

  const entry = {
    date: getTodayKey(),
    // Use client timestamp here because serverTimestamp cannot be nested
    // inside arrayUnion entries
    ts: Date.now(),
    gymName: info?.gymName || '',
    homeWorkout: !!info?.homeWorkout,
    coords: info?.coords || null,
  };

  const userRef = firestore().collection('users').doc(uid);
  const doc = await userRef.get();
  const data = doc.data() || {};

  const todayKey = getTodayKey();
  if (data.lastAccountabilityDate === todayKey) {
    // Already checked in today, no additional points
    return;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toLocaleDateString('en-CA');

  let streak = 1;
  if (data.lastAccountabilityDate === yesterdayKey) {
    streak = (data.accountabilityStreak || 0) + 1;
  }

  await userRef.set(
    {
      accountabilityPoints: firestore.FieldValue.increment(1),
      workoutHistory: firestore.FieldValue.arrayUnion(entry),
      accountabilityStreak: streak,
      lastAccountabilityDate: todayKey,
    },
    { merge: true },
  );
}

// Reset the accountability streak if the user has missed 3 days
export async function checkAccountabilityStreak(uid: string) {
  const ref = firestore().collection('users').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) return;
  const data = doc.data() || {};
  const streak = data.accountabilityStreak || 0;
  const lastDate = data.lastAccountabilityDate;
  if (!streak || !lastDate) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastDate);
  last.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
  if (diff >= 3) {
    await ref.update({ accountabilityStreak: 0 });
  }
}

// Save or remove the user's custom workout split
export async function saveCustomSplit(split: any | null) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const ref = firestore().collection('users').doc(uid);
  if (split) {
    await ref.update({ customSplit: split });
  } else {
    await ref.update({ customSplit: firestore.FieldValue.delete() });
  }
}

// Persist the user's preference for displaying workout plans
export async function saveShowWorkout(value: boolean) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  await firestore().collection('users').doc(uid).set({ showWorkout: value }, { merge: true });
}

export async function saveSharedSplits(splits: any[]) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  
  const colRef = firestore().collection('users').doc(uid).collection('sharedSplits');
  const existing = await colRef.get();
  const batch = firestore().batch();

  existing.forEach(doc => batch.delete(doc.ref));

  splits.forEach((s: any) => {
    const id = s.msgId || s.id;
    if (!id) return;
    batch.set(colRef.doc(id), s);
  });

  await batch.commit();
}

export async function fetchSharedSplits() {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const snap = await firestore()
    .collection('users')
    .doc(uid)
    .collection('sharedSplits')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addSharedSplit(info: any) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const id = info.msgId || info.id;
  if (!id) return;
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('sharedSplits')
    .doc(id)
    .set(info);
}

export async function removeSharedSplit(id: string) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('sharedSplits')
    .doc(id)
    .delete();
}

export async function saveMySharedSplit(info: any | null) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const ref = firestore().collection('users').doc(uid);
  if (info) {
    await ref.update({ mySharedSplit: info });
  } else {
    await ref.update({ mySharedSplit: firestore.FieldValue.delete() });
  }
}

export async function saveWorkoutPlan(plan: any | null) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  const ref = firestore().collection('users').doc(uid);
  if (plan) {
    await ref.update({ workoutPlan: plan });
  } else {
    await ref.update({ workoutPlan: firestore.FieldValue.delete() });
  }
}
// Grant the Mindset role and badge to the current user
import {
  enforceSelectedBadges,
  MAX_DISPLAY_BADGES,
  type BadgeKey,
} from '../badges/UnlockableBadges';

export async function unlockBadge(badge: string) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');

  const ref = firestore().collection('users').doc(uid);
  const doc = await ref.get();
  const data = doc.data() || {};

  let badges: string[] = Array.isArray(data.badges) ? data.badges : [];
  if (!badges.includes(badge)) badges.push(badge);

  let selected: string[] = Array.isArray(data.selectedBadges)
    ? data.selectedBadges
    : [];
  if (!selected.includes(badge) && selected.length < MAX_DISPLAY_BADGES) {
    selected.push(badge);
  }
  selected = enforceSelectedBadges(selected, { ...data, badges });
  await ref.update({ badges, selectedBadges: selected });
}

export async function saveSelectedBadges(selected: string[]) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');

  const ref = firestore().collection('users').doc(uid);
  const doc = await ref.get();
  const data = doc.data() || {};
  const finalSel = enforceSelectedBadges(selected, data);
  await ref.update({ selectedBadges: finalSel });
}

export async function grantMindsetBadge() {
  await unlockBadge('MINDSET');
  }

export async function checkScholarBadge(progress: Record<string, number>) {
  if (
    (progress['push-pull-legs'] || 0) >= 1 &&
    (progress['welcome'] || 0) >= 1 &&
    (progress['fuel'] || 0) >= 1
  ) {
    await unlockBadge('SCHOLAR');
  }
}