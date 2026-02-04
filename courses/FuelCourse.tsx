import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  ActivityIndicator,
} from 'react-native';
import ThemedImage from '../components/ThemedImage';
import LoadingOverlay from '../components/LoadingOverlay';
import StateMessage from '../components/StateMessage';
import useCourseTopPad from "../hooks/useCourseTopPad";
import useSavedCoursePage from '../hooks/useSavedCoursePage';

import CoursePager, {CoursePagerHandle} from '../components/CoursePager';
import CourseNav from '../components/CourseNav';
import {colors} from '../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import {WebView} from 'react-native-webview';
import {updateCourseProgress} from '../firebase/userProfileHelpers';

const {width} = Dimensions.get('window');

const massLogo = require('../assets/mass-logo.png');
const caloriesImg = require('../assets/calories-mass.png');
const caloricMathImg = require('../assets/caloric-math.png');
const bricksImg = require('../assets/protein-bricks.png');
const factsImg = require('../assets/nutrition-facts.jpg');
const wheyImg = require('../assets/ptype-whey.png');
const caseinImg = require('../assets/ptype-casein.png');
const plantImg = require('../assets/ptype-plant.png');
const blendImg = require('../assets/ptype-blend.png');
const preImg = require('../assets/anabolic-pre.png');
const postImg = require('../assets/anabolic-post.png');
const introImg = require('../assets/fuel-intro-page.png');

const introVideoUrl =
  'https://www.youtube-nocookie.com/embed/0XpQA1KMjHA?si=KVl22KLgECNplwUW&controls=0&autoplay=1&playsinline=1&modestbranding=1&rel=0';

const PAGES = [
  'splash',
  'intro',
  'calories',
  'blueprint',
  'protein',
  'foods',
  'whey',
  'casein',
  'plant',
  'pre',
  'post',
  'boost',
  'track',
  'final',
];

export default function FuelCourse({ onBack, restart = false }) {
  const [page, setPage] = useState(0);
  const pagerRef = useRef<CoursePagerHandle>(null);
  const maxPageRef = useRef(0);
  const [calories, setCalories] = useState(2500);
  const [showBolt, setShowBolt] = useState(false);
  const [mealStep, setMealStep] = useState(0);
  const [bricks, setBricks] = useState(0);
  const [introPlaying, setIntroPlaying] = useState(false);
  const pageCount = PAGES.length;
  const topPad = useCourseTopPad();
  const insets = useSafeAreaInsets();
  const {
    startPage,
    ready,
    loading,
    error,
    hasUser,
    retry,
  } = useSavedCoursePage('fuel', pageCount, restart);

  useEffect(() => {
    if (ready) {
      maxPageRef.current = startPage;
      setPage(startPage);
      pagerRef.current?.goToPageWithoutAnimation(startPage);
    }
  }, [ready, startPage]);

  const handlePageChange = (idx: number) => {
    setPage(idx);
    if (hasUser && idx >= maxPageRef.current) {
      maxPageRef.current = idx;
      updateCourseProgress('fuel', (idx + 1) / pageCount);
    }
  };

  if (loading || !ready) {
    return <LoadingOverlay />;
  }
  if (error) {
    return (
      <View style={styles.stateWrapper}>
        <StateMessage
          title="Fuel course unavailable"
          message={error.message || 'We were unable to load your progress.'}
          actionLabel="Retry"
          onAction={retry}
        />
      </View>
    );
  }

  const renderMeals = () => (
    <View style={{flexDirection: 'row', marginVertical: 10}}>
      {Array.from({length: 6}).map((_, i) => (
        <View
          key={i}
          style={[styles.mealSeg, i < mealStep && {backgroundColor: '#FFCC00'}]}
        />
      ))}
    </View>
  );

  const renderBricks = () => (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10}}>
      {Array.from({length: bricks}).map((_, i) => (
        <View key={i} style={styles.brick} />
      ))}
    </View>
  );

  const renderPage = type => {
    switch (type) {
      case 'intro':
        return (
          <View style={[styles.introPage, {paddingTop: 0}]}>
            <Text
              style={[styles.introHeadline, introPlaying && {opacity: 0.3}]}>
              FUEL
            </Text>
            <Text style={[styles.introSub, introPlaying && {opacity: 0.3}]}>
              Your Science-Backed Clean Bulk Blueprint
            </Text>
            <WebView
              source={{uri: introVideoUrl}}
              style={styles.heroVideo}
              allowsFullscreenVideo={false}
              mediaPlaybackRequiresUserAction={false}
              onLoad={() => setIntroPlaying(true)}
              startInLoadingState
              renderLoading={() => (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222'}}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              )}
            />
            <Text style={[styles.introTeaser, introPlaying && {opacity: 0.3}]}>
              Get ready to fuel your gains with proven strategies for a clean
              bulk.
            </Text>
          </View>
        );
      case 'calories':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={caloriesImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.text}>
              "Every rep tears muscle. Calories rebuild it bigger. Without a
              surplus, your body cannibalizes lean tissue."
            </Text>
            <Text style={styles.text}>
              Helms’ data show that 10–20% body-fat bulks optimize lean gains
              vs. dirty bulks.
            </Text>
            <Slider
              style={{width: width - 60, marginVertical: 10}}
              minimumValue={0}
              maximumValue={5000}
              step={100}
              minimumTrackTintColor="#FFCC00"
              value={calories}
              onValueChange={setCalories}
            />
            <ThemedImage
              source={massLogo}
              style={[
                styles.massLogo,
                {transform: [{scale: 1 + calories / 5000}]},
              ]}
              contentFit="contain"
            />
            <TouchableOpacity onPress={() => setShowBolt(!showBolt)}>
              <Text style={styles.bolt}>⚡</Text>
            </TouchableOpacity>
            {showBolt && (
              <Text style={styles.tipText}>
                Active males burn ~4,400 kcal/day at maintenance (Nippard 2023).
              </Text>
            )}
            {calories >= 5000 && (
              <Text style={styles.badge}>Surplus Unlocked!</Text>
            )}
          </View>
        );
      case 'blueprint':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={caloricMathImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>The 5,000-Calorie Blueprint</Text>
            <Text style={styles.text}>
              "5,000 kcal/day is your baseline. Split over 5–6 meals (~1,000
              kcal each). Even if you’re already chunky, a surplus ensures lean
              mass, not fat."
            </Text>
            {renderMeals()}
            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setMealStep(Math.min(mealStep + 1, 6));
              }}
              style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>Log Meal</Text>
            </TouchableOpacity>
          </View>
        );
      case 'protein':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={bricksImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Protein = Muscle Bricks</Text>
            <Text style={styles.text}>
              "200 g protein/day gives your body the amino acids to build new
              fibers."
            </Text>
            <Text style={styles.text}>
              Hitting ≥1.6 g/kg (Helms et al.) is non-negotiable—even for
              heavier beginners.
            </Text>
            {renderBricks()}
            <TouchableOpacity
              onPress={() => setBricks(bricks + 1)}
              onLongPress={() =>
                alert('Aim for 30–50 g protein per meal (Nuckols)')
              }
              style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>Add 20 g</Text>
            </TouchableOpacity>
          </View>
        );
      case 'foods':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={factsImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Easy High-Protein Foods</Text>
            <Text style={styles.text}>
              Real food first, shakes second. Build your 200 g from chicken,
              eggs, Greek yogurt—and plug gaps with shakes.
            </Text>
          </View>
        );
      case 'whey':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={wheyImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Whey Protein Power</Text>
            <Text style={styles.text}>
              Fast-digesting, high BCAA—your post-training go-to.
            </Text>
            <Text style={styles.text}>
              Concentrate (70–80% prot) • Isolate (≥90% prot) • Hydrolysate
              (pre-digested)
            </Text>
          </View>
        );
      case 'casein':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={caseinImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Casein: Nighttime Builder</Text>
            <Text style={styles.text}>
              Slow-release micellar casein feeds muscles up to 8h —ideal before
              bed or long gaps.
            </Text>
          </View>
        );
      case 'plant':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={plantImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Plant & Blended Proteins</Text>
            <Text style={styles.text}>
              Plant: Pea, rice, hemp blends—vegan, high-fiber.
            </Text>
            <ThemedImage
              source={blendImg}
              style={[styles.heroImg, {marginTop: 8}]}
              contentFit="contain"
            />
            <Text style={styles.text}>
              Blended: Whey + casein + plant—balanced release & added nutrients.
            </Text>
          </View>
        );
      case 'pre':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={preImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Pre-Workout Fuel</Text>
            <Text style={styles.text}>
              30–60 min pre-session: carbs + protein boost energy, reduce muscle
              breakdown. Ex: banana + peanut butter + oats.
            </Text>
          </View>
        );
      case 'post':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={postImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Post-Workout Recovery</Text>
            <Text style={styles.text}>
              Within 1–2 h post-lift: fast carbs + whey to refill glycogen &
              spark protein synthesis. Ex: shake + rice cake.
            </Text>
          </View>
        );
      case 'boost':
        return (
          <View style={{alignItems: 'center'}}>
            <ThemedImage
              source={caloricMathImg}
              style={styles.heroImg}
              contentFit="contain"
            />
            <Text style={styles.header}>Calorie Boosters & Hacks</Text>
            <Text style={styles.text}>
              Struggling to hit 5,000? Use calorie-dense foods (nuts, oils),
              smoothies, and cooking hacks like extra olive oil or cheese.
            </Text>
          </View>
        );
      case 'track':
        return (
          <View style={{alignItems: 'center'}}>
            <Text style={styles.header}>Track & Win with Consistency</Text>
            <Text style={styles.text}>
              Discipline &gt; perfection. Miss a meal? Make it up tomorrow.
              Track to hit your 5,000 kcal & 200 g protein targets every day.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                updateCourseProgress('fuel', 1);
                onBack && onBack();
              }}>
              <Text style={styles.primaryBtnText}>Lock in My Bulk</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const pages = PAGES.map((t, idx) => {
    if (t === 'splash') {
      return (
        <TouchableOpacity
          key="splash"
          style={styles.fullScreenPage}
          activeOpacity={1}
          onPress={() => pagerRef.current?.goToPage(idx + 1)}>
          <ThemedImage source={introImg} style={styles.fullPageImg} contentFit="cover" />
        </TouchableOpacity>
      );
    }
    if (t === 'final') {
      return (
        <TouchableOpacity
          key="final"
          style={styles.fullScreenPage}
          activeOpacity={1}
          onPress={() => {
            updateCourseProgress('fuel', 1);
            onBack && onBack();
          }}>
          <ThemedImage
            source={require('../assets/fuel-last-page.png')}
            style={styles.fullPageImg}
            contentFit="cover"
          />
        </TouchableOpacity>
      );
    }
    return (
      <ScrollView
        key={t}
        style={[styles.page, {paddingTop: topPad}]}
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom: insets.bottom + 48,
        }}>
        {renderPage(t)}
        <CourseNav
          showPrev={idx > 0}
          showNext={idx < PAGES.length - 1}
          onPrev={() => pagerRef.current?.goToPage(idx - 1)}
          onNext={() => pagerRef.current?.goToPage(idx + 1)}
        />
      </ScrollView>
    );
  });

  return (
    <CoursePager
      ref={pagerRef}
      pages={pages}
      onBack={onBack}
      onPageChange={handlePageChange}
      fullScreenPages={[0, PAGES.length - 1]}
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
    width: width - 48,
    height: 240,
    borderRadius: 18,
    marginBottom: 12,
  },
  heroVideo: {
    width: width - 40,
    aspectRatio: 9 / 16,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#222',
    alignSelf: 'center',
  },
  header: {
    color: '#FFCC00',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    color: '#232323',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  massLogo: {width: 80, height: 40, marginVertical: 6},
  bolt: {fontSize: 28, color: '#FFCC00', marginVertical: 6},
  badge: {color: '#FF5050', fontWeight: 'bold', marginTop: 6},
  stepBtn: {
    backgroundColor: '#FFCC00',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
  },
  stepBtnText: {color: '#181818', fontWeight: 'bold'},
  mealSeg: {
    flex: 1,
    height: 10,
    marginHorizontal: 2,
    backgroundColor: '#ccc',
    borderRadius: 4,
  },
  brick: {
    width: 30,
    height: 15,
    backgroundColor: '#FF5050',
    margin: 2,
  },
  tipText: {color: '#FF5050', textAlign: 'center', marginTop: 4},
  primaryBtn: {
    backgroundColor: '#FFCC00',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 20,
  },
  introPage: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  introHeadline: {
    color: '#EBBC00',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  introSub: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 12,
    textAlign: 'center',
  },
  introTeaser: {
    color: '#EEEEEE',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    paddingVertical: 16,
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
  stateWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
});
