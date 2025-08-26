import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { getBadgeImage, type BadgeKey } from '../badges/UnlockableBadges';

type BadgeImageProps = {
  badgeKey: BadgeKey;
  style?: StyleProp<ImageStyle>;
};

function BadgeImage({ badgeKey, style }: BadgeImageProps) {
  const source = getBadgeImage(badgeKey);
  if (!source) return null;
  return <Image source={source} style={style} cachePolicy="memory-disk" transition={0} />;
}

export default React.memo(BadgeImage);