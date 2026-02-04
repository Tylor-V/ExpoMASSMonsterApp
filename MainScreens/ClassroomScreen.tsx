import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FuelBanner from '../assets/fuel-banner.jpg';
import MassUniversityLogo from '../assets/mass-univeristy-logo.png';
import MindsetBanner from '../assets/mindset-banner.jpg';
import PPLBanner from '../assets/ppl-banner.jpg';
import WelcomeBanner from '../assets/welcome-banner.jpg';
import WhiteBackgroundWrapper from '../components/WhiteBackgroundWrapper';
import FuelCourse from '../courses/FuelCourse';
import MindsetCourse from '../courses/MindsetCourse';
import PushPullLegsCourse from '../courses/PushPullLegsCourse';
import WelcomeCourse from '../courses/WelcomeCourse';
import LoadingOverlay from '../components/LoadingOverlay';
import StateMessage from '../components/StateMessage';
import { useCurrentUserStatus } from '../hooks/useCurrentUserStatus';
import { colors } from '../theme';

const { width } = Dimensions.get('window');

const COURSES = [
  {
    id: 'welcome',
    title: "Welcome to MASS Monster",
    bannerImage: WelcomeBanner,
    description: "WELCOME! This is the first step - an orientation course.",
    component: WelcomeCourse,
  },
  {
    id: 'push-pull-legs',
    title: "Push-Pull-Legs",
    bannerImage: PPLBanner,
    description: "Maximize muscle growth, recovery, and results.",
    component: PushPullLegsCourse,
  },
  {
    id: 'fuel',
    title: 'Fuel',
    bannerImage: FuelBanner,
    description: 'Your science-backed clean bulk blueprint.',
    component: FuelCourse,
  },
  {
    id: 'mindset',
    title: 'Mindset',
    bannerImage: MindsetBanner,
    description: 'STOP being a P***Y and find your “WHY.”',
    component: MindsetCourse,
  },
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function ClassroomScreen({ isActive = true, onRequestTabChange, onCourseOpenChange }) {
  const [openCourseId, setOpenCourseId] = useState(null);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [restartCourse, setRestartCourse] = useState(false);
  const { user, loading, error, refreshUserData } = useCurrentUserStatus();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: currentCourse ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [currentCourse]);

  useEffect(() => {
    if (!onCourseOpenChange) return;
    if (isActive && currentCourse) {
      onCourseOpenChange(true);
    } else if (!isActive) {
      onCourseOpenChange(false);
    }
  }, [currentCourse, isActive, onCourseOpenChange]);

  const listTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  });

  const courseTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  const CourseComponent = currentCourse?.component;

  const renderCourses = () => (
    <Animated.View style={{ flex: 1, transform: [{ translateX: listTranslate }] }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 2, paddingBottom: 36 }}
        data={COURSES}
        keyExtractor={item => item.id}
        ListEmptyComponent={() => (
          <View style={styles.inlineStateContainer}>
            <StateMessage
              title="No courses available"
              message="Check back soon for new classroom content."
            />
          </View>
        )}
        renderItem={({ item }) => {
          const expanded = openCourseId === item.id;
          const progress = clamp01(user?.coursesProgress?.[item.id] || 0);
          const percent = Math.round(progress * 100);
          return (
            <View style={[styles.classCard, expanded && styles.expandedCard]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setOpenCourseId(expanded ? null : item.id)}
                disabled={expanded}
              >
                <View style={styles.titleRow}>
                  <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
                  {progress >= 1 && (
                    <Ionicons name="star" size={20} color={colors.accent} />
                  )}
                </View>
                <Image
                  source={item.bannerImage}
                  style={styles.courseBanner}
                  contentFit="cover"
                />
                <Text style={styles.courseDesc}>{item.description}</Text>
              </TouchableOpacity>
              {expanded && (
                <View style={{ marginTop: 10, paddingHorizontal: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressBar, { width: `${percent}%` }]} />
                    </View>
                    <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 14 }}>
                      {percent}% Complete
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.goToCourseBtn}
                    onPress={() => {
                      setOpenCourseId(null);
                      setRestartCourse(false);
                      setCurrentCourse(item);
                      if (onCourseOpenChange) onCourseOpenChange(true);
                    }}
                  >
                    <Text style={styles.goToCourseText}>Go to Course</Text>
                  </TouchableOpacity>
                  {progress > 0 && (
                    <TouchableOpacity
                      style={styles.restartCourseBtn}
                      onPress={() => {
                        setOpenCourseId(null);
                        setRestartCourse(true);
                        setCurrentCourse(item);
                        if (onCourseOpenChange) onCourseOpenChange(true);
                      }}
                    >
                      <Text style={styles.restartCourseText}>Restart Course</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </Animated.View>
  );

  const renderStatus = () => {
    if (loading) {
      return <LoadingOverlay />;
    }
    if (error && user) {
      return (
        <View style={{ flex: 1 }}>
          <View style={styles.inlineStateContainer}>
            <StateMessage
              title="Courses may be out of date"
              message={error.message || 'We could not refresh your progress.'}
              actionLabel="Retry"
              onAction={refreshUserData}
            />
          </View>
          {renderCourses()}
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.stateContainer}>
          <StateMessage
            title="Courses unavailable"
            message={error.message || 'We ran into a problem loading your courses.'}
            actionLabel="Retry"
            onAction={refreshUserData}
          />
        </View>
      );
    }
    if (!user) {
      return (
        <View style={styles.stateContainer}>
          <StateMessage
            title="No courses yet"
            message="Sign in to track course progress and pick up where you left off."
          />
        </View>
      );
    }
    return renderCourses();
  };

  return (
    <WhiteBackgroundWrapper style={{ flex: 1 }} padBottom={!currentCourse}>
      {!currentCourse && (
        <View style={styles.headerContainer}>
          <Image
            source={MassUniversityLogo}
            style={styles.headerImage}
            contentFit="contain"
          />
        </View>
      )}
      {!currentCourse && renderStatus()}
      {CourseComponent && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: courseTranslate }] }]}>
          <CourseComponent
            onBack={isActive ? () => {
              setCurrentCourse(null);
              setOpenCourseId(null);
              setRestartCourse(false);
              if (onCourseOpenChange) onCourseOpenChange(false);
              if (onRequestTabChange) onRequestTabChange(2);
            } : undefined}
            restart={restartCourse}
          />
        </Animated.View>
      )}
    </WhiteBackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.background,
  },
  headerImage: {
    width: width - 20,
    height: (width -20)/2.6,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inlineStateContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  classCard: {
    marginVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 12,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  expandedCard: {
    borderColor: colors.accent,
    shadowOpacity: 0.22,
    elevation: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  courseTitle: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: 'bold',
  },
  courseBanner: {
    width: '100%',
    height: 130,
    borderRadius: 20,
    marginBottom: 6,
    backgroundColor: colors.black
  },
  courseDesc: {
    color: colors.textDark,
    fontSize: 16,
    marginLeft: 5,
    marginBottom: 5,
  },
  progressTrack: {
    height: 8,
    flex: 1,
    backgroundColor: colors.gray,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  goToCourseBtn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 14,
    width: '100%',
  },
  goToCourseText: {
    color: colors.textDark,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
    },
  restartCourseBtn: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 14,
    width: '100%',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  restartCourseText: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  }
});

export default React.memo(ClassroomScreen);
