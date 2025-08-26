import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { BADGE_CONFIG, type BadgeKey } from '../badges/UnlockableBadges';
import { colors, fonts, gradients, radius } from '../theme';
import * as Anim from './animations';

export const palette = {...colors};
export const fontFaces = {...fonts};
export const gradientPresets = {...gradients};
export const radiusPresets = {...radius};
export const animationTiming = {...Anim};

export const textPresets = {
  header: {fontFamily: fonts.bold, fontSize: 22, color: colors.white},
  sectionTitle: {fontFamily: fonts.bold, fontSize: 18, color: colors.textDark},
  body: {fontFamily: fonts.regular, fontSize: 15, color: colors.textDark},
};

const PRELOAD_BADGES: BadgeKey[] = Object.keys(BADGE_CONFIG) as BadgeKey[];
export const badgeAssets: Record<BadgeKey, any> = {} as any;

export async function preloadGlobals() {
  const badgePromises = PRELOAD_BADGES.map(async key => {
    const asset = BADGE_CONFIG[key];
    if (asset?.type === 'image') {
      const moduleAsset = Asset.fromModule(asset.source);
      badgeAssets[key] = asset.source;
      await moduleAsset.downloadAsync();
    }
  });

  await Promise.all([Font.loadAsync(Ionicons.font), ...badgePromises]);
}