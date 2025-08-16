import React, {useRef, useMemo} from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';
import Color from 'color';
import {colors, fonts} from '../theme';
import {ANIM_BUTTON_POP} from '../utils/animations';

interface PillButtonProps
  extends React.ComponentProps<typeof Pressable> {
  backgroundColor?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PillButton({
  backgroundColor = colors.accent,
  iconOnly = false,
  disabled = false,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: PillButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  const lighter = useMemo(() => Color(backgroundColor).lighten(0.15).hex(), [backgroundColor]);

  const handlePressIn = (e: any) => {
    if (!disabled) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: iconOnly ? 1.15 : 1.07,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: true,
        }),
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: false,
        }),
      ]).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disabled) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: true,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: false,
        }),
      ]).start();
    }
    onPressOut?.(e);
  };

  const bgStyle = iconOnly
    ? 'transparent'
    : colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [backgroundColor, lighter],
      });

  const content = useMemo(() => {
    if (iconOnly && React.isValidElement(children)) {
      const AnimatedIcon = Animated.createAnimatedComponent((children as any).type);
      const animatedColor = colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          (children as any).props.color || colors.white,
          colors.gold,
        ],
      });
      return (
        <AnimatedIcon
          {...(children as any).props}
          style={[(children as any).props.style, {color: animatedColor}]}
        />
      );
    }
    return children;
  }, [children, iconOnly, colorAnim]);

  return (
    <Animated.View style={[style, styles.wrapper, {transform: [{scale}]}]}>
      <AnimatedPressable
        {...rest}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          {backgroundColor: bgStyle},
          disabled && styles.disabled,
        ]}
        hitSlop={8}
      >
        {typeof children === 'string' ? (
          <Text style={styles.text}>{children}</Text>
        ) : (
          content
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  base: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontWeight: 'bold',
    color: colors.black,
    fontSize: 16,
  },
});