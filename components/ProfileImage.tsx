import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';

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
    />
  );
}

export default React.memo(ProfileImage);