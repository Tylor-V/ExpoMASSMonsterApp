import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

export default function ComingSoonOverlay() {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.banner}>
        <Text style={styles.text}>Coming Soon!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  banner: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 26,
    color: colors.white,
  },
});