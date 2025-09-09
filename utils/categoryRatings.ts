export const CATEGORY_LABELS = [
  'Muscle Building',
  'Recovery',
  'Performance',
  'Energy',
  'Health',
] as const;

export type CategoryLabel = typeof CATEGORY_LABELS[number];
export type CategoryRatings = Partial<Record<CategoryLabel, number>>;

// Parse product description for category ratings like "Energy/Focus: 4 stars"
export function parseCategoryRatings(description?: string): CategoryRatings {
  const ratings: CategoryRatings = {};
  if (!description) return ratings;
  CATEGORY_LABELS.forEach(label => {
    const escLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escLabel}\\s*:\\s*(\\d)`, 'i');
    const match = description.match(regex);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 0 && value <= 5) {
        ratings[label] = value;
      }
    }
  });
  return ratings;
}
