import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import useCourseTopPad from "../hooks/useCourseTopPad";
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import CoursePager, {CoursePagerHandle} from '../components/CoursePager';
import CourseNav from '../components/CourseNav';
import { Ionicons } from '@expo/vector-icons';
import {updateCourseProgress} from '../firebase/userProfileHelpers';
import {colors} from '../theme';

const {width} = Dimensions.get('window');

const heroImages = [
  require('../assets/welcome-hero1.jpg'),
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

const introImg = require('../assets/welcome-intro-page.png');

const PAGES = [
  {
    fullImage: introImg,
  },
  {
    header: 'Welcome to MASS Monster',
    image: heroImages[0],
    icon: 'body-outline',
    lines: [
      'You’re Officially a MASS Member.',
      'MASS Monster isn’t just a program—it’s your new system for building real muscle and lasting results.',
      'No more guessing. No more going it alone.',
      'We’re lifters who wasted years on the wrong advice, and we built this for YOU to skip the struggle.',
      'Let’s get MASSive. Swipe to see how MASS Monster will change your game.',
    ],
  },
  {
    header: 'The MASS Monster Simple System',
    icon: 'construct-outline',
    lines: [
      'Everything You Need. All in One Place.',
      '• Proven Workout Splits for steady muscle gains.',
      '• Easy-to-follow Nutrition Guides (bulking, cutting, everything in between).',
      '• Accountability & Rewards for showing up.',
      '• Motivating Community always in your corner.',
      'Your only job? Show up and execute. We handle the rest.',
    ],
  },
  {
    header: 'Community = Progress',
    icon: 'people-circle-outline',
    lines: [
      'You’re Never Doing This Alone.',
      'Ask questions. Share wins and struggles. Compete, connect, and get pushed to be your best.',
      'Every member wants to grow. That’s the MASS Monster difference.',
    ],
  },
  {
    header: 'Find Your Why',
    icon: 'bulb-outline',
    lines: [
      'What’s Driving You?',
      'Maybe you want to get stronger, look better, or just prove you can do it.',
      'Whatever your reason, hold on to it—it’ll push you through tough days.',
      'Struggle = Growth. Pride in progress = Real happiness.',
    ],
  },
  {
    header: 'Using the MASS Monster App',
    icon: 'apps-outline',
    lines: [
      'Your Fitness Command Center',
      '• Courses Tab: Unlock step-by-step programs and guides.',
      '• Community Tab: Chat, connect, and level up together.',
      '• Shop Tab: Grab everything you need—gear, supps, and more.',
      '• Accountability Tab: Log your workouts. Get paid for discipline.',
      'Tip: Turn on notifications so you never miss a challenge, update, or reward.',
    ],
  },
  {
    header: 'MASS Monster Shop',
    icon: 'cart-outline',
    lines: [
      'More info coming soon!',
      'We’re building the ultimate shop for lifters—rewards, deals, and exclusive gear—all inside the app.',
      'Stay tuned for new features and MASSive perks!',
    ],
  },
  {
    header: 'Accountability Pays',
    icon: 'pricetags-outline',
    lines: [
      'Get Paid to Show Up',
      'Log your gym sessions with our Accountability Form.',
      'Earn Discipline Points (convert to shop rewards).',
      'Track your streak, location, and progress.',
      'One submission per day. Honesty is required. Cheaters get nothing.',
    ],
  },
  {
    header: 'Next Steps',
    icon: 'arrow-forward-circle-outline',
    lines: [
      'Earn your first Discipline Point: Complete a gym session and log it!',
      'Say what’s up: Introduce yourself in the community chat.',
      'Start your first program: Check out Workout Splits, Lifts Library, or Calories = MASS.',
      'Progress starts NOW.',
    ],
  },
  {
    header: 'Rules of MASS Monster',
    icon: 'shield-checkmark-outline',
    lines: [
      'Positivity is non-negotiable.',
      'Respect the grind and the group.',
      'No spam or toxic behavior.',
      'Keep it in English.',
      'No politics or religion.',
      'Self-promo allowed only where it helps the community.',
      'Break the rules, lose your spot. Lift each other up. Iron sharpens iron.',
    ],
  },
  {
    header: 'Need Help?',
    icon: 'help-buoy-outline',
    lines: [
      'Questions about your account, rewards, or orders?',
      'Contact: support@massmonster.life',
    ],
  },
  {
    fullImage: require('../assets/welcome-last-page.png'),
  },
];

export default function WelcomeCourse({onBack}) {

  const [page, setPage] = useState(0);
  const pagerRef = useRef<CoursePagerHandle>(null);
  const topPad = useCourseTopPad();

  const handlePageChange = (idx: number) => {
    setPage(idx);
    updateCourseProgress('welcome', (idx + 1) / PAGES.length);
  };

  const handleFinish = () => {
    updateCourseProgress('welcome', 1);
    if (onBack) onBack();
  };

  const pages = PAGES.map((p, idx) => {
    if (p.fullImage) {
      const handlePress = () => {
        if (idx < PAGES.length - 1) {
          pagerRef.current?.goToPage(idx + 1);
        } else {
          handleFinish();
        }
      };
      return (
        <TouchableOpacity
          key={idx}
          style={styles.fullScreenPage}
          activeOpacity={1}
          onPress={handlePress}>
          <Image
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
        contentContainerStyle={{alignItems: 'center', justifyContent: 'flex-start', paddingBottom: 48}}>
        {p.image ? (
          <Image
            source={p.image}
            style={styles.heroImg}
            contentFit="cover"
          />
        ) : (
          <Ionicons
            name={p.icon}
            size={66}
            color="#FFCC00"
            style={{marginBottom: 16}}
          />
        )}
        <Text style={styles.header}>{p.header}</Text>
        <View style={styles.textBlock}>
          {p.lines.map((line, i) => (
            <Text style={styles.text} key={i}>
              {line}
            </Text>
          ))}
        </View>
        <CourseNav
          showPrev={idx > 0}
          showNext={idx < PAGES.length - 1}
          onPrev={() => pagerRef.current?.goToPage(idx - 1)}
          onNext={() => pagerRef.current?.goToPage(idx + 1)}
          onFinish={idx === PAGES.length - 1 ? handleFinish : undefined}
          finishLabel="Get to it!"
        />
      </ScrollView>
    );
  });

  return (
    <CoursePager
      ref={pagerRef}
      pages={pages}
      onBack={onBack}
      onFinish={handleFinish}
      onPageChange={handlePageChange}
      fullScreenPages={[0, PAGES.length - 1]}
      finishLabel="Get to it!"
    />
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
  },
  heroImg: {
    width: width - 80,
    height: 140,
    borderRadius: 18,
    marginBottom: 18,
  },
  header: {
    color: '#FFCC00',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 1.1,
  },
  textBlock: {
    marginBottom: 26,
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
});