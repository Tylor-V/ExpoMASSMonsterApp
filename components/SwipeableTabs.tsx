import { Ionicons as Icon } from '@expo/vector-icons';
import * as React from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';
import { colors } from '../theme';
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedIcon = Animated.createAnimatedComponent(Icon);

export const TAB_BAR_HEIGHT = 76;
const initialLayout = { width: Dimensions.get('window').width };

export default function SwipeableTabs({
  routes,
  scenes,
  tabIndex = 0,
  onTabChange,
  // Use bright yellow for the active tab color
  activeTintColor = colors.yellow,
  inactiveTintColor = '#aaa',
  swipeEnabled = true,
  tabBarVisible = true,
  animationEnabled = false,
}) {
  const insets = useSafeAreaInsets();

  const handleIndexChange = React.useCallback(
    (nextIndex: number) => {
      onTabChange?.(nextIndex);
    },
    [onTabChange],
  );

  const renderScene = React.useMemo(
    () =>
      ({ route }) => {
        switch (route.key) {
          case 'chat':
            return scenes.chat();
          case 'classroom':
            return scenes.classroom();
          case 'profile':
            return scenes.profile();
          case 'store':
            return scenes.store();
          case 'calendar':
            return scenes.calendar();
          default:
            return null;
        }
      },
    [scenes],
  );

  const renderTabBar = React.useCallback(
    (
      props: {
        navigationState: { index: number; routes: typeof routes };
        position: Animated.AnimatedInterpolation<number>;
        jumpTo: (key: string) => void;
      }
    ) => {
      if (!tabBarVisible) return null;
      const { navigationState, jumpTo, position } = props;
      return (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}> 
          <View style={styles.tabBar}>
            {navigationState.routes.map((route, i) => {
              const progress = position.interpolate({
                inputRange: [i - 0.5, i - 0.5 + 0.0001, i + 0.5, i + 0.5 + 0.0001],
                outputRange: [0, 1, 1, 0],
                extrapolate: 'clamp',
              });
              const textOpacity = progress;
              const indicatorStyle = {
                opacity: progress,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 0],
                    }),
                  },
                ],
              };
              return (
                <Pressable
                  key={route.key}
                  delayPressIn={0}
                  onPress={() => jumpTo(route.key)}
                  style={styles.tabItem}
                >
                  {/* Show yellow icon exactly when tab becomes active */}
                  <View style={{ width: 32, height: 32 }}>
                    <Animated.View
                      style={[StyleSheet.absoluteFill, { opacity: progress }]}
                    >
                      <Icon
                        name={route.icon}
                        size={32}
                        color={activeTintColor}
                      />
                    </Animated.View>
                    <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                      <Icon
                        name={route.icon}
                        size={32}
                        color={inactiveTintColor}
                      />
                    </Animated.View>
                  </View>
                  <Animated.View
                    style={[styles.indicator, { backgroundColor: colors.accent }, indicatorStyle]}
                  />
                  <AnimatedText
                    style={[styles.tabLabel, { color: activeTintColor, opacity: textOpacity }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {route.title}
                  </AnimatedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    },
    [
      tabBarVisible,
      insets.bottom,
      routes,
      activeTintColor,
      inactiveTintColor,
      onTabChange,
    ],
  );

  return (
    <TabView
      navigationState={{ index: tabIndex, routes }}
      renderScene={renderScene}
      onIndexChange={handleIndexChange}
      initialLayout={initialLayout}
      renderTabBar={renderTabBar}
      swipeEnabled={swipeEnabled}
      animationEnabled={animationEnabled}
      /* Preload all scenes for snappier tab transitions */
      lazy={false}
      lazyPreloadDistance={0}
    />
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 10,
    zIndex: 100,
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    minHeight: 48,
    minWidth: 48,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 0,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});