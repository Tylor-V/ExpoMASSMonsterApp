import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import ChatBar from '../components/ChatBar';
import NewsModal from '../components/NewsModal';
import ProfileModal from '../components/ProfileModal';
import SwipeableTabs from '../components/SwipeableTabs';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import usePresence from '../hooks/usePresence';
import { colors } from '../theme';
import CalendarScreen from './CalendarScreen';
import ClassroomScreen from './ClassroomScreen';
import ProfileScreen from './ProfileScreen';
import StoreScreen from './StoreScreen';

const BACKGROUND_COLOR = colors.black;

const routes = [
  { key: 'chat', title: 'Chat', icon: 'chatbubble-ellipses-outline' },
  { key: 'calendar', title: 'Calendar', icon: 'calendar-outline' },
  { key: 'classroom', title: 'Classroom', icon: 'school-outline' },
  { key: 'store', title: 'Store', icon: 'storefront-outline' },
  { key: 'profile', title: 'Profile', icon: 'person-outline' },
];

const DEFAULT_TAB_INDEX = 1;

const resolveRequestedTab = (value: any) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, 0), routes.length - 1);
};

const MainAppScreen = ({ navigation, route, news, newsLoaded, newsOpen, setNewsOpen }) => {
  const initialTab = resolveRequestedTab(route?.params?.tabIndex) ?? DEFAULT_TAB_INDEX;
  const [tabIndex, setTabIndex] = useState(initialTab);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const user = useCurrentUserDoc();
  usePresence();

  const handleCourseOpenChange = useCallback((open: boolean) => setIsCourseOpen(open), []);

  const handleTabChange = useCallback((index: number) => {
    setTabIndex(index);
    if (index !== 2) {
      setIsCourseOpen(false);
    }
  }, []);

  useEffect(() => {
    const requestedTab = resolveRequestedTab(route?.params?.tabIndex);
    if (requestedTab === null) {
      return;
    }

    if (requestedTab !== tabIndex) {
      handleTabChange(requestedTab);
    }

    navigation.setParams({ tabIndex: undefined });
  }, [handleTabChange, navigation, route?.params?.tabIndex, tabIndex]);

  const ChatScene = useCallback(
    () => (
      <ChatBar
        isActive={tabIndex === 0}
        onOpenDMInbox={() => navigation.navigate('DMInbox')}
        onOpenGymFeed={() => navigation.navigate('GymVideoFeed')}
      />
    ),
    [navigation, tabIndex],
  );

  const ClassroomScene = useCallback(
    () => (
      <ClassroomScreen
        isActive={tabIndex === 2}
        onRequestTabChange={handleTabChange}
        onCourseOpenChange={handleCourseOpenChange}
      />
    ),
    [handleCourseOpenChange, handleTabChange, tabIndex],
  );

  const ProfileScene = useCallback(() => <ProfileScreen />, []);
  const StoreScene = useCallback(
    () => <StoreScreen navigation={navigation} setTabSwipeEnabled={setSwipeEnabled} />,
    [navigation],
  );
  const CalendarScene = useCallback(
    () => <CalendarScreen news={news} newsLoaded={newsLoaded} user={user} />,
    [news, newsLoaded, user],
  );

  const scenes = useMemo(
    () => ({
      chat: ChatScene,
      classroom: ClassroomScene,
      profile: ProfileScene,
      store: StoreScene,
      calendar: CalendarScene,
    }),
    [CalendarScene, ChatScene, ClassroomScene, ProfileScene, StoreScene],
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BACKGROUND_COLOR} />
      <View style={styles.container}>
        <SwipeableTabs
          routes={routes}
          scenes={scenes}
          tabIndex={tabIndex}
          onTabChange={handleTabChange}
          activeTintColor="#FFCC00"
          inactiveTintColor="#aaa"
          tabBarVisible={!isCourseOpen}
          animationEnabled={Platform.OS === 'ios'}
          swipeEnabled={swipeEnabled}
        />

        <NewsModal
          visible={newsOpen}
          onClose={() => setNewsOpen(false)}
          user={user}
          news={news}
          loading={!newsLoaded}
        />

        <ProfileModal
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
});

export default MainAppScreen;
