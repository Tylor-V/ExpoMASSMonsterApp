import React from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Text,
} from 'react-native';
import { colors, radius } from '../theme';

interface ResponsivePressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** Remove default rounded corners */
  noRadius?: boolean;
}

export default function ResponsivePressable({
  onPress,
  style,
  children,
  noRadius = false,
  ...rest
}: ResponsivePressableProps & React.ComponentProps<typeof Pressable>) {
  const wrap = (child: React.ReactNode) =>
    typeof child === 'string' ? <Text>{child}</Text> : child;
  const renderChildren =
    typeof children === 'function'
      ? children
      : React.Children.map(children, wrap);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      delayPressIn={0}
      style={({ pressed }) => [
        style,
        !noRadius && styles.base,
        {
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      {...rest}
    >
      {renderChildren}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    overflow: 'hidden',
  },
});