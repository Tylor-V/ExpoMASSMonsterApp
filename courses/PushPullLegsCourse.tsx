import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import CourseNav from '../components/CourseNav';
import CoursePager, { CoursePagerHandle } from '../components/CoursePager';
import LoadingOverlay from '../components/LoadingOverlay';
import ThemedImage from '../components/ThemedImage';
import { LIFT_RATINGS, type RatingMap } from '../constants/liftRatings';
import { updateCourseProgress } from '../firebase/userProfileHelpers';
import useCourseTopPad from "../hooks/useCourseTopPad";
import useSavedCoursePage from '../hooks/useSavedCoursePage';
import { colors } from '../theme';

const {width} = Dimensions.get('window');

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const pushDayImg = require('../assets/push-day.png');
const pullDayImg = require('../assets/pull-day.png');
const legDayImg = require('../assets/leg-day.png');
const introImg = require('../assets/PPL-intro-page.png');
// Intro video embed for the first page
const introVideoUrl =
  'https://www.youtube-nocookie.com/embed/VEZVUNnhTtM?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0';

const HERO_ASPECT = 800 / 260; // matches your hero image style

const EXERCISE_RATINGS: Record<string, RatingMap> = {
  'Flat Bench Press': LIFT_RATINGS['Chest Lifts']['Standard Bench'],
  'Incline Bench Press': LIFT_RATINGS['Chest Lifts']['Incline Bench'],
  'Cable Flys': LIFT_RATINGS['Chest Lifts']['Chest Flys'],
  'Rope Pulldowns': LIFT_RATINGS['Triceps Lifts']['Rope Pulldowns'],
  'Tricep Kickbacks': LIFT_RATINGS['Triceps Lifts']['Kickbacks'],
  'Rope Overhead Extensions': LIFT_RATINGS['Triceps Lifts']['Rope Overhead Extensions'],
  'Lateral Cable Raises': LIFT_RATINGS['Shoulder Lifts']['Lateral Raises (Cable)'],
  'Close-Grip Pulldowns': LIFT_RATINGS['Back Lifts']['Pulldowns'],
  'Seated Cable Rows': LIFT_RATINGS['Back Lifts']['Rows'],
  'Cable Pullovers': LIFT_RATINGS['Back Lifts']['Cable Pull-Overs'],
  'Face-Pulls': LIFT_RATINGS['Shoulder Lifts']['Face Pulls'],
  'Hammer Curls': LIFT_RATINGS['Biceps Lifts']['Hammer Curls'],
  'Preacher Curls': LIFT_RATINGS['Biceps Lifts']['Spider Curls/Preacher Curls'],
  'Drag Curls': LIFT_RATINGS['Biceps Lifts']['Drag Curls'],
  'Cable Wrist Curls': LIFT_RATINGS['Forearm Lifts']['Cable Twist-Downs'],
  'Cable Reverse Wrist Curls': LIFT_RATINGS['Forearm Lifts']['Cable Twist-Ups'],
  'Leg Extension': LIFT_RATINGS['Leg Lifts']['Leg Extensions'],
  'Barbell Squats': LIFT_RATINGS['Leg Lifts']['Squats'],
  'Sissy Squats': LIFT_RATINGS['Leg Lifts']['Sissy Squats'],
  'Leg Curls': LIFT_RATINGS['Leg Lifts']['Leg Curls'],
  'Adductor Machine': LIFT_RATINGS['Leg Lifts']['Adductors'],
  'Abductor Machine': LIFT_RATINGS['Leg Lifts']['Abductors'],
  'Standing Calf Raises': LIFT_RATINGS['Leg Lifts']['Calf Raises'],
};

const Expandable = ({title, children, defaultOpen = false}) => {
  const [open, setOpen] = useState(defaultOpen);
  const wrap = (child: React.ReactNode) =>
    typeof child === 'string' ? <Text>{child}</Text> : child;
  const renderChildren =
    typeof children === 'function'
      ? children
      : React.Children.map(children, wrap);
  return (
    <View style={styles.expandable}>
      <TouchableOpacity
        style={styles.expandHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen(!open);
        }}
        activeOpacity={0.8}>
        <Text style={styles.expandTitle}>{title}</Text>
        <Icon
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={26}
          color="#FFCC00"
        />
      </TouchableOpacity>
      {open && <View style={styles.expandContent}>{renderChildren}</View>}
    </View>
  );
};

const PAGES = [
  {
    fullImage: introImg,
  },
  {
    header: 'PUSH-PULL-LEGS: The Proven Split for Real Gains',
    lines: [
      'Push-Pull-Legs maximizes muscle growth and recovery.',
      'Push days: Chest, shoulders, triceps.',
      'Pull days: Back, biceps, forearms.',
      'Leg days: Full lower-body focus.',
      'Each group is trained efficiently, with ample recovery for steady, balanced gains.',
      'Smart, effective, and built for results.',
    ],
    videoUrl: introVideoUrl,
    showProgramOverview: true,
    program: [
      'Day 1: Push',
      'Day 2: Pull',
      'Day 3: Legs',
      'Day 4: Push',
      'Day 5: Pull',
      'Day 6: Legs',
      'Day 7: Rest',
    ],
  },
  {
    header: 'Why Push-Pull-Legs?',
    icon: 'help-circle-outline',
    lines: [
      '• Better Recovery & Growth: Target muscles, give them time to recover and grow.',
      '• Higher Intensity: Fewer muscles/day = better focus, stronger lifts.',
      '• Lower Risk of Overtraining: Rest & balance for long-term progress.',
      '• All Levels Welcome: Great for beginners and advanced.',
      '• Consistent, Sustainable Gains: A schedule you can stick with for life.',
    ],
  },
  {
    header: '🔥 Push Day: Chest, Shoulders, Triceps',
    image: pushDayImg,
    modalAspect: HERO_ASPECT,
    subtitle: 'Pectoral Milkers • Tricep Croissants • Boulder Shoulders',
    anatomyLabel: 'Chest, Shoulders, Triceps',
    routines: [
      {
        group: 'Chest',
        exercises: [
          {
            name: 'Flat Bench Press',
            detail: '3 sets',
          },
          {name: 'Incline Bench Press', detail: '2 sets'},
          {
            name: 'Cable Flys',
            detail: '2 sets',
          },
        ],
        tip: 'Full stretch/contraction and progressive overload.',
      },
      {
        group: 'Triceps',
        exercises: [
          {name: 'Rope Pulldowns', detail: '2 sets'},
          {name: 'Tricep Kickbacks', detail: '2 sets'},
          {name: 'Rope Overhead Extensions', detail: '2 sets'},
        ],
        tip: 'Full range + strict form for max growth.',
      },
      {
        group: 'Shoulders',
        exercises: [
          {name: 'Lateral Cable Raises', detail: '5 sets'},
        ],
        tip: 'Don’t rush—control every rep!',
      },
    ],
  },
  {
    header: '🔥 Pull Day: Back, Biceps, Forearms',
    image: pullDayImg,
    modalAspect: HERO_ASPECT,
    subtitle: 'Dorito Chip Back • Popeye Arms • Grippers',
    anatomyLabel: 'Back, Biceps, Forearms',
    routines: [
      {
        group: 'Back',
        exercises: [
          {name: 'Pulldowns', detail: '3 sets'},
          {name: 'Rows', detail: '3 sets'},
          {name: 'Cable Pull-Overs', detail: '3 sets'},
        ],
      },
      {
        group: 'Rear Delts',
        exercises: [
          {name: 'Face Pulls', detail: '4 sets'},
        ],
      },
      {
        group: 'Biceps',
        exercises: [
          {name: 'Hammer Curls', detail: '3 sets'},
          {name: 'Preacher Curls', detail: '3 sets'},
          {name: 'Drag Curls', detail: '2 sets'},
        ],
      },
    ],
  },
  {
    header: '🔥 Leg Day: Quads, Hams/Glutes, Calves',
    image: legDayImg,
    modalAspect: HERO_ASPECT,
    subtitle: 'Tree Trunk Thunder Thighs • Badonka-Donk',
    anatomyLabel: 'Quads, Hams/Glutes, Calves',
    routines: [
      {
        group: 'Quads',
        exercises: [
          {name: 'Leg Extension', detail: '3 sets'},
          {name: 'Barbell Squats', detail: '3 sets'},
          {name: 'Sissy Squats', detail: '5 sets'},
        ],
      },
      {
        group: 'Hams/Glutes',
        exercises: [
          {name: 'Leg Curls', detail: '3 sets'},
        ],
      },
      {
        group: 'Ductors',
        exercises: [
          {name: 'Adductor Machine', detail: '2 sets'},
          {name: 'Abductor Machine', detail: '2 sets'},
        ],
      },
      {
        group: 'Calves',
        exercises: [
          {name: 'Standing Calf Raises', detail: '3 sets'},
        ],
      },
    ],
  },
  {
    header: 'Next Steps',
    icon: 'rocket-outline',
    lines: [
      'Choose: Push, Pull, or Legs Split to add to your calendar',
      'Log your session with the Check-In button.',
      'Ask questions/share your win in the Community.',
      'Consistency is everything—show up, get MASSive.',
    ],
  },
  {
    fullImage: require('../assets/ppl-last-page.png'),
  },
];

export default function PushPullLegsCourse({ onBack, restart = false }) {
  const [page, setPage] = useState(0);
  const pagerRef = useRef<CoursePagerHandle>(null);
  const topPad = useCourseTopPad();
  const insets = useSafeAreaInsets();
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const pageCount = PAGES.length;
  const { startPage, ready } = useSavedCoursePage('push-pull-legs', pageCount, restart);

  useEffect(() => {
    if (ready) {
      setPage(startPage);
      pagerRef.current?.goToPageWithoutAnimation(startPage);
    }
  }, [ready, startPage]);

  const finish = () => {
    updateCourseProgress('push-pull-legs', 1);
    onBack && onBack();
  };

  const handlePageChange = (idx: number) => {
    setPage(idx);
    updateCourseProgress('push-pull-legs', (idx + 1) / pageCount);
  };

  if (!ready) {
    return <LoadingOverlay />;
  }
  
  const RoutineCards = routines =>
    routines.map((r, i) => (
      <Expandable title={r.group} key={r.group + i} defaultOpen={i === 0}>
        {r.exercises.map((ex, j) => {
          const rating = EXERCISE_RATINGS[ex.name];
          return (
            <View key={ex.name + j} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              {ex.detail ? (
                <Text style={styles.exerciseDetail}>{ex.detail}</Text>
              ) : null}
              {rating &&
                Object.keys(rating).map(h => (
                  <View key={h} style={styles.starRow}>
                    <Text style={styles.starLabel}>{h}</Text>
                    {[0, 1, 2, 3, 4].map(i => (
                      <Icon
                        key={i}
                        name={i < rating[h] ? 'star' : 'star-outline'}
                        size={14}
                        color={i < rating[h] ? colors.gold : '#ECECEC'}
                        style={{marginHorizontal: 1}}
                      />
                    ))}
                  </View>
                ))}
            </View>
          );
        })}
        {r.tip && <Text style={styles.tipText}>💡 {r.tip}</Text>}
      </Expandable>
    ));

  const pages = PAGES.map((p, idx) => {
    if (p.fullImage) {
      return (
        <TouchableOpacity
          key={idx}
          style={styles.fullScreenPage}
          activeOpacity={1}
          onPress={() => pagerRef.current?.goToPage(idx + 1)}>
          <ThemedImage
            source={p.fullImage}
            style={styles.fullPageImg}
            contentFit="cover"
          />
        </TouchableOpacity>
      );
    }
    return (
        <ScrollView
          key={idx}
          style={[styles.page, {paddingTop: topPad}]}
          contentContainerStyle={{paddingBottom: insets.bottom + 48}}>
            {/* HERO IMAGE: only on pages with anatomy art, never on intro */}
            {p.image && (
              <TouchableOpacity
                onPress={() =>
                  setFullscreenMedia({
                    type: 'image',
                    source: p.image,
                    aspect: p.modalAspect || HERO_ASPECT,
                  })
                }>
                <View style={styles.heroContainer}>
                  <ThemedImage
                    source={p.image}
                    style={styles.heroImg}
                    contentFit="contain"
                  />
                  {p.anatomyLabel && (
                    <Text style={styles.anatomyLabel}>{p.anatomyLabel}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            {/* VIDEO: autoplay on intro page only */}
            {p.videoUrl && idx === 0 && page === 0 && (
              <WebView
                source={{uri: p.videoUrl}}
                style={styles.heroVideo}
                allowsFullscreenVideo={false}
                mediaPlaybackRequiresUserAction={false}
                startInLoadingState
                renderLoading={() => (
                  <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222'}}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                )}
              />
            )}
            {/* PROGRAM CHIPS: Only on intro page */}
            {p.program && (
              <View style={styles.programOverview}>
                <Text style={styles.programHeader}>How It Works</Text>
                <View style={styles.programDays}>
                  {p.program.map((d, i) => (
                    <View style={styles.programDay} key={i}>
                      <Text style={styles.programDayText}>{d}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <Text style={styles.header}>{p.header}</Text>
            {p.subtitle && <Text style={styles.subtitle}>{p.subtitle}</Text>}
            {p.routines && (
              <View style={{width: '100%', marginVertical: 12}}>
                {RoutineCards(p.routines)}
              </View>
            )}
            {p.lines && (
              <View style={styles.textBlock}>
                {p.lines.map((line, i) => (
                  <Text style={styles.text} key={i}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
            {p.referenceLabel && (
              <Text style={styles.refLabel}>{p.referenceLabel}</Text>
            )}
            {p.referenceImg && (
              <TouchableOpacity
                onPress={() =>
                  setFullscreenMedia({
                    type: 'image',
                    source: p.referenceImg,
                  })
                }>
                <ThemedImage
                  source={p.referenceImg}
                  style={styles.refImg}
                  contentFit="contain"
                />
              </TouchableOpacity>
            )}
            <CourseNav
              showPrev={idx > 0}
              showNext={idx < PAGES.length - 1}
              onPrev={() => pagerRef.current?.goToPage(idx - 1)}
              onNext={() => pagerRef.current?.goToPage(idx + 1)}
              onFinish={idx === PAGES.length - 1 ? finish : undefined}
            />
        </ScrollView>
      );
  });

  return (
    <View style={{flex: 1}}>
      <CoursePager
        ref={pagerRef}
        pages={pages}
        onPageChange={handlePageChange}
        onFinish={finish}
        onBack={onBack}
        fullScreenPages={[0, PAGES.length - 1]}
      />

      {/* Fullscreen Modal for Image/Video */}
      <Modal
        visible={!!fullscreenMedia}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFullscreenMedia(null)}>
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={[styles.fullscreenBack, {top: insets.top + 36}]}
            onPress={() => setFullscreenMedia(null)}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
            <Icon name="arrow-back" size={32} color="#fff" />
          </TouchableOpacity>
          {fullscreenMedia?.type === 'image' && (
            <ThemedImage
              source={fullscreenMedia.source}
              style={[
                styles.fullscreenImg,
                {aspectRatio: fullscreenMedia.aspect || 1},
              ]}
              contentFit="contain"
            />
          )}
          {fullscreenMedia?.type === 'web' && (
            <WebView
              source={{uri: fullscreenMedia.source}}
              allowsFullscreenVideo
              style={styles.fullscreenVideo}
              startInLoadingState
              renderLoading={() => (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  heroImg: {
    width: width - 48,
    height: 260,
    borderRadius: 20,
    marginBottom: 3,
    backgroundColor: '#101010',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 16,
    elevation: 8,
  },
  anatomyLabel: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroVideo: {
    width: width - 40,
    aspectRatio: 9 / 16,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#222',
    alignSelf: 'center',
  },
  programOverview: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  programHeader: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 3,
  },
  programDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 4,
  },
  programDay: {
    backgroundColor: '#232323',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  programDayText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  programNote: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  header: {
    color: '#FFCC00',
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#FF5050',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  textBlock: {
    marginBottom: 12,
    width: '100%',
  },
  text: {
    color: '#232323',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 7,
    lineHeight: 24,
  },
  fullScreenPage: {
    flex: 1,
    backgroundColor: colors.white,
  },
  fullPageImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  refLabel: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 6,
    textAlign: 'center',
  },
  refImg: {
    width: width - 52,
    height: 220,
    borderRadius: 12,
    marginTop: 0,
    marginBottom: 14,
    alignSelf: 'center',
    backgroundColor: '#232323',
  },
  expandable: {
    backgroundColor: '#232323',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  expandTitle: {
    color: '#FFCC00',
    fontSize: 19,
    fontWeight: 'bold',
  },
  expandContent: {
    borderTopWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 15,
    paddingBottom: 8,
    paddingTop: 2,
  },
  exerciseRow: {
    marginBottom: 5,
    flexDirection: 'column',
  },
  exerciseName: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16.5,
    marginBottom: 0,
  },
  exerciseDetail: {
    color: '#aaa',
    fontSize: 14.5,
    marginLeft: 2,
    marginBottom: 3,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  starLabel: { fontSize: 12, color: '#888', marginRight: 4 },
  tipText: {
    color: '#FFCC00',
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 2,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBack: {
    position: 'absolute',
    top: 36,
    left: 18,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
    padding: 7,
  },
  fullscreenImg: {
    width: width,
    alignSelf: 'center',
    // aspectRatio set dynamically!
  },
  fullscreenVideo: {
    width: width,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    backgroundColor: '#000',
  },
});