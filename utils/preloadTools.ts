import {Image} from 'react-native';
import * as Anim from '../animations';
import {colors, fonts, gradients, radius} from '../theme';
import {getBadgeAsset, BadgeKey} from '../badges/UnlockableBadges';

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

const PRELOAD_BADGES: BadgeKey[] = ['MINDSET', 'SCHOLAR', 'ACCOUNTABILITY'];
export const badgeAssets: Record<BadgeKey, any> = {} as any;

export function preloadGlobals() {
  PRELOAD_BADGES.forEach(key => {
    const asset = getBadgeAsset(key);
    if (asset?.type === 'image') {
      const uri = Image.resolveAssetSource(asset.source).uri;
      Image.prefetch(uri);
      badgeAssets[key] = asset.source;
    }
  });
}