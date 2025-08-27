import { Image, ImageProps } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function ThemedImage({ style, ...rest }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[style, { overflow: 'hidden' }]}> 
      <Image {...rest} style={StyleSheet.absoluteFill} onLoadEnd={() => setLoaded(true)} />
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});