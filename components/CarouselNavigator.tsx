import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme';

type Props = {
  index: number;
  length: number;
  onIndexChange: (idx: number) => void;
  leftOffset?: number;
  rightOffset?: number;
  dotsRowStyle?: ViewStyle;
  activeColor?: string;
  inactiveColor?: string;
  maxDots?: number;
  /** Size of the navigation chevron icons */
  arrowSize?: number;
  /** Diameter of the dots shown below the carousel */
  dotSize?: number;
};

export default function CarouselNavigator({
  index,
  length,
  onIndexChange,
  leftOffset = -2,
  rightOffset = -2,
  dotsRowStyle,
  activeColor = colors.accent,
  inactiveColor = colors.gray,
  maxDots,
  arrowSize = 24,
  dotSize = 10,
}: Props) {
  const dots = Array.from({ length: maxDots ? Math.min(length, maxDots) : length });
  return (
    <>
      <TouchableOpacity
        style={[styles.arrow, { left: leftOffset, marginTop: -arrowSize * 0.75 }]}
        onPress={() => onIndexChange(i => i - 1)}
        disabled={index === 0}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon
          name="chevron-back"
          size={arrowSize}
          color={colors.gray}
          style={{ opacity: index === 0 ? 0.3 : 1 }}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.arrow, { right: rightOffset, marginTop: -arrowSize * 0.75 }]}
        onPress={() => onIndexChange(i => i + 1)}
        disabled={index === length - 1}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon
          name="chevron-forward"
          size={arrowSize}
          color={colors.gray}
          style={{ opacity: index === length - 1 ? 0.3 : 1 }}
        />
      </TouchableOpacity>
      <View style={[styles.dotsRow, dotsRowStyle]}>
        {dots.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onIndexChange(i)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: i === index ? activeColor : inactiveColor,
              },
            ]}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginHorizontal: 4,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    zIndex: 10,
    padding: 4,
  },
});