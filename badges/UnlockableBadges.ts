export type BadgeKey = 'MINDSET' | 'SCHOLAR' | 'ACCOUNTABILITY' | string;

type BadgeAsset = {
  source: any;
  type: 'image';
  isUnlocked: (u: any) => boolean;
};

const BADGE_CONFIG: Record<string, BadgeAsset> = {
  MINDSET: {
    source: require('../assets/mindset-badge.png'),
    type: 'image',
    isUnlocked: (u: any) => (u?.coursesProgress?.mindset || 0) >= 1,
  },
  SCHOLAR: {
    source: require('../assets/scholar-badge.png'),
    type: 'image',
    isUnlocked: (u: any) =>
      (u?.coursesProgress?.['push-pull-legs'] || 0) >= 1 &&
      (u?.coursesProgress?.welcome || 0) >= 1 &&
      (u?.coursesProgress?.fuel || 0) >= 1,
  },
  ACCOUNTABILITY: {
    source: require('../assets/accountability-badge.png'),
    type: 'image',
    isUnlocked: (u: any) => (u?.accountabilityPoints || 0) >= 5,
  },
};

export const MAX_DISPLAY_BADGES = 3;

export function isValidBadge(key: string): boolean {
  if (!key) return false;
  return !!BADGE_CONFIG[key];
}

export function getBadgeImage(key: string) {
  const asset = BADGE_CONFIG[key];
  return asset?.type === 'image' ? asset.source : null;
}

export function getBadgeAsset(key: string): BadgeAsset | null {
  return BADGE_CONFIG[key] || null;
}

export function getUnlockedBadges(user: any): string[] {
  const badges: string[] = [];
  Object.keys(BADGE_CONFIG).forEach(k => {
    if (BADGE_CONFIG[k].isUnlocked(user)) badges.push(k);
  });
  if (Array.isArray(user?.badges)) {
    user.badges.forEach((b: string) => {
      if (/^Level \d+$/.test(b)) return; // level indicators are not badges
      if (isValidBadge(b) && !badges.includes(b)) badges.push(b);
    });
  }
  return badges;
}

export function enforceSelectedBadges(selected: string[], user: any): string[] {
  const unlocked = getUnlockedBadges(user);
  let result: string[] = [];
  if (Array.isArray(selected)) {
    selected.forEach(b => {
      if (/^Level \d+$/.test(b)) return;
      if (unlocked.includes(b) && !result.includes(b)) result.push(b);
    });
  }
  result = Array.from(new Set(result));
  if (result.length > MAX_DISPLAY_BADGES) result = result.slice(0, MAX_DISPLAY_BADGES);
  return result;
}