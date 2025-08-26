import { ImageBackground } from 'expo-image'
import React from 'react'
import { StyleSheet, Text, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_BAR_HEIGHT } from './SwipeableTabs'

type BackgroundWrapperProps = {
  children: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  padBottom?: boolean;
  padTop?: boolean;
}

export default function BackgroundWrapper({children, style, padBottom = true, padTop = true}: BackgroundWrapperProps) {
  const insets = useSafeAreaInsets()
  const wrap = (child: React.ReactNode) =>
    typeof child === 'string' ? <Text>{child}</Text> : child
  const renderChildren =
    typeof children === 'function'
      ? children
      : React.Children.map(children, wrap)
  return (
    <ImageBackground
      source={require('../assets/gym-background.png')}
      style={[
        styles.background,
        style,
        padTop && { paddingTop: insets.top },
        padBottom && {paddingBottom: TAB_BAR_HEIGHT + insets.bottom},
      ]}
      contentFit="cover"
    >
      {renderChildren}
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  background: {flex: 1, justifyContent: 'center'},
})