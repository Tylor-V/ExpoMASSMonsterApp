export const CATEGORY_MAP = {
  'Energy/Focus': 'Energy',
  'General Health': 'Health',
  'Muscle Recovery': 'Recovery',
  'Strength/Performance': 'Performance',
} as const;

export const CATEGORY_LABELS = Object.values(CATEGORY_MAP);

export type CategoryLabel = (typeof CATEGORY_LABELS)[number];
export type CategoryRatings = Partial<Record<CategoryLabel, number>>;

export const CATEGORY_ICONS: Record<CategoryLabel, string> = {
  Energy: 'flash-outline',
  Health: 'heart-outline',
  Recovery: 'refresh-circle-outline',
  Performance: 'barbell-outline',
};

// Parse product description for category ratings like "Energy/Focus: 4 stars"
export function parseCategoryRatings(description?: string): CategoryRatings {
  const ratings: CategoryRatings = {};
  if (!description) return ratings;
  Object.entries(CATEGORY_MAP).forEach(([fullLabel, shortLabel]) => {
    const escLabel = fullLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escLabel}\\s*:\\s*(\\d)`, 'i');
    const match = description.match(regex);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 0 && value <= 5) {
        ratings[shortLabel as CategoryLabel] = value;
      }
    }
  });
  return ratings;
}

// Remove rating text like "Energy/Focus: 4 stars" from descriptions
export function stripCategoryRatings(description?: string): string {
  if (!description) return '';
  let result = description;
  Object.keys(CATEGORY_MAP).forEach(fullLabel => {
    const escLabel = fullLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `${escLabel}\\s*:\\s*\\d\\s*stars?\\s*`,
      'gi',
    );
    result = result.replace(regex, '');
  });
  return result.trim();
}