import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
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
  const scrollRef = useRef<ScrollView>(null);

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
    scrollRef.current?.scrollTo({ x: width * tabIndex, animated: animationEnabled });
  }, [tabIndex, width, animationEnabled]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      if (newIndex !== tabIndex) {
        onTabChange?.(newIndex);
      }
    },
    [width, tabIndex, onTabChange],
  );

  const jumpTo = (key: string) => {
    const idx = routes.findIndex(r => r.key === key);
    scrollRef.current?.scrollTo({ x: width * idx, animated: animationEnabled });
    onTabChange?.(idx);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {routes.map(route => (
          <View key={route.key} style={{ width, flex: 1 }}>
            {renderScene(route)}
          </View>
        ))}
      </ScrollView>
      {tabBarVisible && (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.tabBar}>
            {routes.map((route, i) => (
              <Pressable
                key={route.key}
                delayPressIn={0}
                onPress={() => jumpTo(route.key)}
                style={styles.tabItem}
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
                <Text
                  style={[
                    styles.tabLabel,
                    { color: i === tabIndex ? activeTintColor : inactiveTintColor },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {route.title}
                </Text>
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