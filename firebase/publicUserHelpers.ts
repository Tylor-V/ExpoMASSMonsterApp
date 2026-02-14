import { firestore } from './firebase';

export type PublicUser = {
  uid: string;
  firstName: string;
  lastName: string;
  profilePicUrl?: string;
  chatLevel?: number;
  selectedBadges?: any[];
  role?: string;
  accountabilityStreak?: number;
  bio?: string;
  socials?: any;
  lastActive?: any;
  showOnlineStatus?: boolean;
  timeoutUntil?: any;
  badges?: any;
};

type RetryOptions = {
  suppressAlert?: boolean;
};

const PUBLIC_USER_FIELDS = [
  'firstName',
  'lastName',
  'profilePicUrl',
  'chatLevel',
  'selectedBadges',
  'role',
  'accountabilityStreak',
  'bio',
  'socials',
  'lastActive',
  'showOnlineStatus',
  'timeoutUntil',
  'badges',
] as const;

export function buildPublicUserPayload(data: any): Partial<PublicUser> {
  const source = data || {};
  const payload: any = {};

  PUBLIC_USER_FIELDS.forEach((field) => {
    if (source[field] !== undefined) {
      payload[field] = source[field];
    }
  });

  if (source.uid !== undefined) {
    payload.uid = source.uid;
  }

  return payload;
}

export function pickPublicUser(data: any, id: string) {
  const source = data || {};
  return {
    id,
    firstName: source.firstName || '',
    lastName: source.lastName || '',
    profilePicUrl: source.profilePicUrl || '',
    chatLevel: source.chatLevel,
    role: source.role,
    selectedBadges: Array.isArray(source.selectedBadges) ? source.selectedBadges : [],
    badges: Array.isArray(source.badges) ? source.badges : [],
    bio: source.bio || '',
    socials: source.socials || {},
    lastActive: source.lastActive,
    showOnlineStatus: source.showOnlineStatus,
    accountabilityStreak: source.accountabilityStreak,
    timeoutUntil: source.timeoutUntil,
  };
}

export async function upsertPublicUser(
  uid: string,
  partialPublicPayload: Partial<PublicUser>,
  options: { merge?: boolean } = { merge: true },
  retryOptions?: RetryOptions,
): Promise<boolean> {
  try {
    await firestore()
      .collection('publicUsers')
      .doc(uid)
      .set(
        { uid, ...buildPublicUserPayload(partialPublicPayload) },
        { merge: options.merge !== false },
        retryOptions,
      );
    return true;
  } catch (err) {
    console.error('Failed to upsert public user', err);
    return false;
  }
}
