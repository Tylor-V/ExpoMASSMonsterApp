import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';

interface ProductImageProps {
  uri?: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export default function ProductImage({ uri, style, contentFit = 'cover' }: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imageStyle = StyleSheet.flatten(style);

  if (!uri) {
    return (
      <View style={[imageStyle, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={imageStyle}>
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ActivityIndicator />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, imageStyle]}
        contentFit={contentFit}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
