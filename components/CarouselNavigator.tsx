import { Ionicons as Icon } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

type Props = {
  index: number;
  length: number;
  // Allow callers to provide either an absolute index or a function that
  // derives the next index from the current one. This prevents stale values
  // when multiple navigation actions fire before re-render.
  onIndexChange: (idx: number | ((cur: number) => number)) => void;
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
  /** Render arrows or dots when a split layout is needed */
  showArrows?: boolean;
  showDots?: boolean;
  /** Overlay keeps the legacy absolute-fill behavior */
  layout?: 'overlay' | 'inline' | 'gutter';
  /** In inline layout, optionally overlay arrows over the viewport */
  overlayArrows?: boolean;
  /** When in gutter layout, flip arrow to next direction */
  invertArrows?: boolean;
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
  showArrows = true,
  showDots = true,
  layout = 'overlay',
  overlayArrows = layout === 'overlay',
  invertArrows = false,
}: Props) {
  const dots = Array.from({ length: maxDots ? Math.min(length, maxDots) : length });
  const arrowOffset = arrowSize / 2 + 4; // center arrow including padding
  const isOverlay = layout === 'overlay';
  const isGutter = layout === 'gutter';
  if (isGutter) {
    if (!showArrows) return null;
    const isNext = invertArrows;
    const disabled = isNext ? index === length - 1 : index === 0;
    return (
      <TouchableOpacity
        testID={isNext ? 'next-arrow' : 'prev-arrow'}
        style={[styles.gutterArrow, disabled && styles.gutterArrowDisabled]}
        onPress={() => onIndexChange(cur => cur + (isNext ? 1 : -1))}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name={isNext ? 'chevron-forward' : 'chevron-back'}
          size={arrowSize}
          color={colors.gray}
        />
      </TouchableOpacity>
    );
  }
  return (
    <View
      pointerEvents="box-none"
      style={[
        isOverlay ? styles.container : styles.inlineContainer,
        !isOverlay && overlayArrows && !showDots && styles.inlineOverlayContainer,
      ]}
    >
      {showArrows && (
        <View
          pointerEvents="box-none"
          style={isOverlay || overlayArrows ? styles.arrowOverlay : styles.inlineArrowRow}
        >
          <TouchableOpacity
            testID="prev-arrow"
            style={[
              isOverlay || overlayArrows ? styles.arrow : styles.inlineArrow,
              (isOverlay || overlayArrows) && {
                left: leftOffset,
                transform: [{ translateY: -arrowOffset }],
              },
            ]}
            pointerEvents="auto"
            onPress={() => onIndexChange(cur => cur - 1)}
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
            testID="next-arrow"
            style={[
              isOverlay || overlayArrows ? styles.arrow : styles.inlineArrow,
              (isOverlay || overlayArrows) && {
                right: rightOffset,
                transform: [{ translateY: -arrowOffset }],
              },
            ]}
            pointerEvents="auto"
            onPress={() => onIndexChange(cur => cur + 1)}
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
        </View>
      )}
      {showDots && (
        <View style={[isOverlay ? styles.dotsRow : styles.inlineDotsRow, dotsRowStyle]}>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  inlineContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inlineOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  arrowOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  inlineDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    zIndex: 10,
    padding: 4,
  },
  inlineArrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  inlineArrow: {
    padding: 4,
  },
  gutterArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E9E9E9',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gutterArrowDisabled: {
    opacity: 0.3,
  },
});
