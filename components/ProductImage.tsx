import React, { useEffect, useState } from 'react';
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
  const placeholder = require('../assets/mass-logo.png');

  // Reset loading state and prefetch whenever the URI changes so images are
  // available immediately when the component mounts or is reused in a list.
  useEffect(() => {
    setLoaded(false);
    if (uri && typeof Image.prefetch === 'function') {
      // Fire-and-forget; the component will use the cached image once loaded.
      const result = Image.prefetch(uri);
      // Image.prefetch returns a promise on native but can return void in tests.
      if (result && typeof (result as any).catch === 'function') {
        (result as any).catch(() => {});
      }
    }
  }, [uri]);

  if (!uri) {
    return (
      <View style={[imageStyle, styles.center]}>
        <Image source={placeholder} style={[StyleSheet.absoluteFill, imageStyle]} contentFit="contain" />
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
        cachePolicy="memory-disk"
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
