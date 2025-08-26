import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export const TAB_BAR_HEIGHT = 76;

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
}

export default function SwipeableTabs({
  routes,
  scenes,
  tabIndex = 0,
  onTabChange,
  activeTintColor = colors.yellow,
  inactiveTintColor = '#aaa',
  tabBarVisible = true,
  animationEnabled = false,
}: SwipeableTabsProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<FlatList<Route>>(null);
  const tabIndexRef = useRef(tabIndex);

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
  }, [tabIndex, width, animationEnabled]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      if (newIndex !== tabIndexRef.current) {
        tabIndexRef.current = newIndex;
        onTabChange?.(newIndex);
      }
    },
    [width, onTabChange],
  );

  const jumpTo = (key: string) => {
    const idx = routes.findIndex(r => r.key === key);
    scrollRef.current?.scrollToOffset({ offset: width * idx, animated: animationEnabled });
    onTabChange?.(idx);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={scrollRef}
        data={routes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1 }}>{renderScene(item)}</View>
        )}
        keyExtractor={item => item.key}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
                <Icon
                  name={route.icon}
                  size={32}
                  color={i === tabIndex ? activeTintColor : inactiveTintColor}
                />
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: colors.accent, opacity: i === tabIndex ? 1 : 0 },
                  ]}
                />
                {i === tabIndex && (
                  <Text
                    testID={`tab-label-${route.key}`}
                    style={[styles.tabLabel, { color: activeTintColor }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {route.title}
                  </Text>
                )}
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