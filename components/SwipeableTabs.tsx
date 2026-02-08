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
                <Icon
                  name={route.icon}
                  size={36}
                  color={i === tabIndex ? activeTintColor : inactiveTintColor}
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
