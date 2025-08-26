import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';

type ProfileImageProps = {
  uri?: string;
  style?: StyleProp<ImageStyle>;
  isCurrentUser?: boolean;
};

function ProfileImage({ uri, style, isCurrentUser }: ProfileImageProps) {
  const source = uri
    ? { uri }
    : isCurrentUser
    ? require('../assets/own-profile-icon.png')
    : require('../assets/profile-icon.png');
  return (
    <Image
      source={source}
      style={[{ borderRadius: 9999, overflow: 'hidden' }, style]}
      contentFit="cover"
    />
  );
}

export default React.memo(ProfileImage);