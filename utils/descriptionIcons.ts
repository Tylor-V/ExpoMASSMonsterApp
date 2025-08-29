export type DescriptionIcon = { text: string; asset: any };

export const DESCRIPTION_ICONS: DescriptionIcon[] = [
  { text: 'Bovine gelatin capsule', asset: require('../assets/bovine-gelatine-capsules.svg') },
  { text: 'Contains soy', asset: require('../assets/icon-allergy-Soy.svg') },
  { text: 'Vegetable capsule', asset: require('../assets/vegetarian-capsules.svg') },
  { text: 'non-GMO', asset: require('../assets/gmo_icon.svg') },
  { text: 'Vegetarian-friendly', asset: require('../assets/icon-allergy-Vegan.svg') },
  { text: 'Kosher', asset: require('../assets/icon-halal-free.svg') },
];

export function getDescriptionIcons(description: string | undefined): DescriptionIcon[] {
  if (!description) return [];
  const lower = description.toLowerCase();
  return DESCRIPTION_ICONS.filter(icon => lower.includes(icon.text.toLowerCase()));
}