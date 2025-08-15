import React from 'react';
import { StyleSheet, ViewStyle, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

type ScreenContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padBottom?: boolean;
  padTop?: boolean;
};

export default function ScreenContainer({
  children,
  style,
  padBottom = true,
  padTop = true,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const wrap = (child: React.ReactNode) =>
    typeof child === 'string' ? <Text>{child}</Text> : child;
  const renderChildren =
    typeof children === 'function'
      ? children
      : React.Children.map(children, wrap);
  return (
    <View
      style={[
        styles.container,
        style,
        padTop && { paddingTop: insets.top },
        padBottom && { paddingBottom: insets.bottom },
      ]}
    >
      {renderChildren}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});