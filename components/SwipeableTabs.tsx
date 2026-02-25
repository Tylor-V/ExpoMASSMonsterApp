import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export const TAB_BAR_HEIGHT = 56;

interface Route {
  key: string;
  title: string;
  icon: any;
}

interface Scenes {
  chat: () => React.ReactNode;
  classroom: () => React.ReactNode;
  profile: () => React.ReactNode;
  store: () => React.ReactNode;
  calendar: () => React.ReactNode;
}

interface SwipeableTabsProps {
  routes: Route[];
  scenes: Scenes;
  tabIndex?: number;
  onTabChange?: (index: number) => void;
  activeTintColor?: string;
  inactiveTintColor?: string;
  tabBarVisible?: boolean;
  animationEnabled?: boolean;
  swipeEnabled?: boolean;
}

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

interface TabIconProps {
  index: number;
  name: string;
  scrollX: Animated.SharedValue<number>;
  width: number;
  activeTintColor: string;
  inactiveTintColor: string;
}

function TabIcon({
  index,
  name,
  scrollX,
  width,
  activeTintColor,
  inactiveTintColor,
}: TabIconProps) {
  const progress = useDerivedValue(() => scrollX.value / width);
  const activeAmount = useDerivedValue(() => {
    const distance = Math.abs(progress.value - index);
    return Math.max(0, 1 - distance);
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeAmount.value, [0, 1], [0.55, 1], Extrapolate.CLAMP),
    transform: [
      {
        scale: interpolate(activeAmount.value, [0, 1], [0.95, 1.06], Extrapolate.CLAMP),
      },
    ],
  }));

  const animatedProps = useAnimatedProps(() => ({
    color: interpolateColor(
      activeAmount.value,
      [0, 1],
      [inactiveTintColor, activeTintColor],
    ),
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedIcon name={name} size={36} animatedProps={animatedProps} />
    </Animated.View>
  );
}

export default function SwipeableTabs({
  routes,
  scenes,
  tabIndex = 0,
  onTabChange,
  activeTintColor = colors.yellow,
  inactiveTintColor = '#000',
  tabBarVisible = true,
  animationEnabled = false,
  swipeEnabled = true,
}: SwipeableTabsProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<FlatList<Route>>(null);
  const tabIndexRef = useRef(tabIndex);
  const scrollX = useSharedValue(0);

  useEffect(() => {
    tabIndexRef.current = tabIndex;
  }, [tabIndex]);

  const renderScene = React.useCallback(
    (route: Route) => {
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

  useEffect(() => {
    scrollRef.current?.scrollToOffset({ offset: width * tabIndex, animated: animationEnabled });
    scrollX.value = width * tabIndex;
  }, [tabIndex, width, animationEnabled]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const settledIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      if (settledIndex !== tabIndexRef.current) {
        tabIndexRef.current = settledIndex;
        onTabChange?.(settledIndex);
      }
    },
    [width, onTabChange],
  );

  const jumpTo = (key: string) => {
    const idx = routes.findIndex(r => r.key === key);
    scrollRef.current?.scrollToOffset({ offset: width * idx, animated: animationEnabled });
    if (!animationEnabled) {
      tabIndexRef.current = idx;
      onTabChange?.(idx);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.FlatList
        ref={scrollRef}
        data={routes}
        horizontal
        pagingEnabled
        scrollEnabled={swipeEnabled}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1 }}>{renderScene(item)}</View>
        )}
        keyExtractor={item => item.key}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={e => {
          if (!e.nativeEvent.velocity?.x) {
            handleScrollEnd(e);
          }
        }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        testID="swipeable-tabs-list"
      />
      {tabBarVisible && (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.tabBar}>
            {routes.map((route, i) => (
              <Pressable
                key={route.key}
                delayPressIn={0}
                onPress={() => jumpTo(route.key)}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel={route.title}
              >
                <TabIcon
                  index={i}
                  name={route.icon}
                  scrollX={scrollX}
                  width={width}
                  activeTintColor={activeTintColor}
                  inactiveTintColor={inactiveTintColor}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
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
});
