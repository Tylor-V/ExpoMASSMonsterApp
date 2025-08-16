import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fonts } from '../theme';
import { ANIM_MEDIUM } from '../utils/animations';

type RollingNumberProps = {
  /** Numeric value to display */
  value: number;
  /** Optional style applied to the container */
  style?: any;
};

const DIGIT_HEIGHT = 24;

export default function RollingNumber({ value, style }: RollingNumberProps) {
  const formatted = useMemo(() => {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  }, [value]);
  const digits = useMemo(() => formatted.split(''), [formatted]);
  const animValuesRef = useRef<Animated.Value[]>([]);

  // Ensure we have an animated value for each digit before rendering
  if (animValuesRef.current.length < digits.length) {
    for (let i = animValuesRef.current.length; i < digits.length; i++) {
      animValuesRef.current.push(new Animated.Value(0));
    }
  } else if (animValuesRef.current.length > digits.length) {
    animValuesRef.current.splice(digits.length);
  }
  const animValues = animValuesRef.current;

  useEffect(() => {
    if (Array.isArray(digits)) {
      digits.forEach((d, i) => {
        if (/\d/.test(d)) {
          Animated.timing(animValues[i], {
            toValue: -Number(d) * DIGIT_HEIGHT,
            duration: ANIM_MEDIUM,
            useNativeDriver: true,
          }).start();
        }
      });
    }
  }, [digits.join('')]);

  return (
    <View style={styles.row}>
      {digits.map((d, i) =>
        /\d/.test(d) ? (
          <View key={i} style={{ height: DIGIT_HEIGHT, overflow: 'hidden' }}>
            <Animated.View style={{ transform: [{ translateY: animValues[i] }] }}>
              {Array.from({ length: 10 }).map((_, j) => (
                <Text key={j} style={[styles.digit, style]}>
                  {j}
                </Text>
              ))}
            </Animated.View>
          </View>
        ) : (
          <Text key={i} style={[styles.digit, style]}>
            {d}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  digit: {
    height: DIGIT_HEIGHT,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.black,
  },
});