import React, { useCallback, useMemo, useState } from 'react';
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

const MainAppScreen = ({ navigation, news, newsLoaded }) => {
  const [tabIndex, setTabIndex] = useState(1); // Start on Calendar tab
  // -- NEW STATE --
  const [isCourseOpen, setIsCourseOpen] = useState(false);

  // Modal/Popup state
  const [newsOpen, setNewsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const user = useCurrentUserDoc();
  usePresence();

  // Stories viewer state (can add userId, initialIndex for advanced use)

  // ---------
  // Pass a callback to ClassroomScreen so it can inform us if a course is open/closed
  const handleCourseOpenChange = useCallback((open) => setIsCourseOpen(open), []);
  // ---------

  const ChatScene = useCallback(
    () => (
      <ChatBar
        isActive={tabIndex === 0}
        onOpenDMInbox={() => navigation.navigate('DMInbox')}
        onOpenGymFeed={() => navigation.navigate('GymVideoFeed')}
      />
    ),
    [tabIndex, navigation]
  );

  const ClassroomScene = useCallback(
    () => (
      <ClassroomScreen
        onRequestTabChange={setTabIndex}
        onCourseOpenChange={handleCourseOpenChange} // <-- ADD THIS PROP
      />
    ),
    [handleCourseOpenChange]
  );

  const ProfileScene = useCallback(() => <ProfileScreen />, []);
  const StoreScene = useCallback(
    () => <StoreScreen navigation={navigation} />,
    [navigation],
  );
  const CalendarScene = useCallback(
    () => (
      <CalendarScreen news={news} newsLoaded={newsLoaded} user={user} />
    ),
    [news, newsLoaded, user]
  );

  const scenes = useMemo(
    () => ({
      chat: ChatScene,
      classroom: ClassroomScene,
      profile: ProfileScene,
      store: StoreScene,
      calendar: CalendarScene,
    }),
    [ChatScene, ClassroomScene, ProfileScene, StoreScene, CalendarScene]
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'}
        backgroundColor={BACKGROUND_COLOR}
      />
      <View style={styles.container}>
        {/* Main Tabs */}
        <SwipeableTabs
          routes={routes}
          scenes={scenes}
          tabIndex={tabIndex}
          onTabChange={setTabIndex}
          activeTintColor="#FFCC00"
          inactiveTintColor="#aaa"
          tabBarVisible={!isCourseOpen}
        />

        {/* NEWS MODAL */}
        <NewsModal
          visible={newsOpen}
          onClose={() => setNewsOpen(false)}
          user={user}
          news={news}
          loading={!newsLoaded}
        />

        {/* PROFILE MODAL */}
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
