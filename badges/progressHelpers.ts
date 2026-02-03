type BadgeProgress = {
  id: string;
  progress: number; // 0-1
  requirements: string;
  image: any;
};

import { getBadgeAsset, getUnlockedBadges } from './UnlockableBadges';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function getUserBadgeProgress(user: any): BadgeProgress[] {
  if (!user) return [];
  const progressItems: BadgeProgress[] = [];
  const { coursesProgress = {}, accountabilityPoints = 0 } = user;
  const unlocked = getUnlockedBadges(user);

  // Scholar Badge progress - show until unlocked
  if (!unlocked.includes('SCHOLAR')) {
    const combined =
      clamp01(coursesProgress['welcome'] || 0) +
      clamp01(coursesProgress['push-pull-legs'] || 0) +
      clamp01(coursesProgress['fuel'] || 0);
    const progress = clamp01(combined / 3);
    const asset = getBadgeAsset('SCHOLAR');
    if (asset?.type === 'image') {
      progressItems.push({
        id: 'SCHOLAR',
        progress,
        requirements: 'Complete the Welcome, Push Pull Legs, and Fuel courses',
        image: asset.source,
      });
    }
  }

  // Mindset Badge
  const mindsetProg = clamp01(coursesProgress['mindset'] || 0);
  if (mindsetProg > 0 && !unlocked.includes('MINDSET')) {
    const asset = getBadgeAsset('MINDSET');
    if (asset?.type === 'image') {
      progressItems.push({
        id: 'MINDSET',
        progress: mindsetProg,
        requirements: 'Complete the Mindset Course',
        image: asset.source,
      });
    }
  }

  // Accountability Badge
  const accProg = Math.min(1, (accountabilityPoints || 0) / 5);
  if (accProg > 0 && !unlocked.includes('ACCOUNTABILITY')) {
    const asset = getBadgeAsset('ACCOUNTABILITY');
    if (asset?.type === 'image') {
      progressItems.push({
        id: 'ACCOUNTABILITY',
        progress: accProg,
        requirements: 'Complete 5 accountability check-ins',
        image: asset.source,
      });
    }
  }

  return progressItems;
}
