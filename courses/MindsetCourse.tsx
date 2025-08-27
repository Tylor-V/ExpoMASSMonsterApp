import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Share,
  ActivityIndicator,
} from 'react-native';
import ThemedImage from '../components/ThemedImage';
import CoursePager, {CoursePagerHandle} from '../components/CoursePager';
import CourseNav from '../components/CourseNav';
import CourseOutlineSidebar from '../components/CourseOutlineSidebar';
import {WebView} from 'react-native-webview';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import useCourseTopPad from '../hooks/useCourseTopPad';
import {
  updateCourseProgress,
  addAccountabilityPoint,
  updateMindsetChapter,
  grantMindsetBadge,
} from '../firebase/userProfileHelpers';
import {useCurrentUserDoc} from '../hooks/useCurrentUserDoc';
import {colors} from '../theme';
import { ANIM_FAST, ANIM_SLOW, ANIM_SHORT, ANIM_INSTANT, ANIM_EXTRA_SLOW } from '../utils/animations';
import AccordionList from '../components/AccordionList';
import ChipFlip from '../components/ChipFlip';

const Quote = ({text}: {text: string}) => {
  const dashIndex = text.lastIndexOf(' -');
  let quoteText = text.trim();
  let author = '';
  if (dashIndex > 0 && dashIndex < text.length - 2) {
    quoteText = text.slice(0, dashIndex).trim();
    author = '-' + text.slice(dashIndex + 2).trim();
  }
  const isShort = quoteText.length < 80;
  const rightIconStyle = [styles.quoteIconRight];
  if (author) {
    // shift icon up so it aligns with the last line of the quote text
    rightIconStyle.push({bottom: 44});
  }
  return (
    <View style={styles.quoteContainer}>
      <FontAwesome name="quote-left" size={18} style={styles.quoteIconLeft} />
      <Text
        style={[styles.quoteText, {textAlign: isShort ? 'center' : 'left'}]}>
        {quoteText}
      </Text>
      {author ? <Text style={styles.quoteAuthor}>{author}</Text> : null}
      <FontAwesome name="quote-right" size={18} style={rightIconStyle} />
    </View>
  );
};

const renderLines = (str: string, style = styles.text) => {
  return str.split('\n').map((line, idx) => (
    <Text key={idx} style={style}>
      {line}
    </Text>
  ));
};

const Checklist = ({items}: {items: string[]}) => {
  const [anims] = useState(items.map(() => new Animated.Value(0)));
  useEffect(() => {
    anims.forEach((anim, idx) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIM_EXTRA_SLOW,
        delay: (idx + 1) * 2000,
        useNativeDriver: true,
      }).start();
    });
  }, [anims]);
  return (
    <View style={styles.textBlock}>
      {items.map((t, i) => (
        <Animated.View key={i} style={[styles.checkItem, {opacity: anims[i]}]}>
          <Ionicons name="checkbox" size={22} color="#FFCC00" />
          <Text style={[styles.text, {marginLeft: 8}]}>{t}</Text>
        </Animated.View>
      ))}
    </View>
  );
};

interface ProblemButtonProps {
  items: string[];
  onComplete?: () => void;
}

const ProblemButton = ({items, onComplete}: ProblemButtonProps) => {
  const [index, setIndex] = useState(-1);
  const itemAnims = useRef(items.map(() => new Animated.Value(0))).current;
  const btnAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    const next = index + 1;
    if (next < items.length) {
      setIndex(next);
      Animated.spring(itemAnims[next], {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
      if (next === items.length - 1) {
        Animated.timing(btnAnim, {
          toValue: 0,
          duration: ANIM_FAST,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished) {
            onComplete?.();
          }
        });
      }
    }
  };

  return (
    <View style={[styles.problemArea, {paddingBottom: insets.bottom + 16}]}>
      <View style={{width: '92%'}}>
        {items.map((t, i) => {
          const scale = itemAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.problemItem,
                {
                  opacity: i <= index ? itemAnims[i] : 0,
                  transform: [{scale}],
                },
              ]}>
              <Ionicons
                name="close"
                size={20}
                color={colors.error}
                style={{marginRight: 8}}
              />
              <Text style={styles.text}>{t}</Text>
            </Animated.View>
          );
        })}
      </View>
      <Animated.View style={{opacity: btnAnim, marginTop: 12}}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.problemBtn}
          disabled={index >= items.length - 1}>
          <Text style={styles.problemBtnText}>PROBLEM</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const {width} = Dimensions.get('window');

const PAGES = [
  //--------------------- Chapter 1 Intro ---------------------
  {
    chapter: 1,
    fullImage: require('../assets/chapter-1-page.png'),
  },
  {
    chapter: 1, //Chapter 1 Card 1
    header: "The Winner's Mindset",
    video:
      'https://www.youtube-nocookie.com/embed/Cw0hZQ8Na_Y?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
    landscape: true,
    footer:
      'Designed to help you build the discipline, and resilience to overcome challenges in fitness and life.',
  },
  {
    chapter: 1, //Chapter 1 Card 2
    header: 'The Secret:',
    chipFlipTitle: [
      'Pride',
      'Motivation',
      'Discipline',
      'Mental Regulation',
      'The Big Picture',
    ],
    chipFlipContent: [
      'Use self-esteem to fuel more accomplishments.',
      'Know why you want to reach your goals.',
      'Delete all the excuses that hold you back.',
      'Take control of your thoughts.',
      'Become a winner in fitness and in life.',
    ],
  },
  {
    chapter: 1, //Chapter 1 Card 3
    header: 'Why This Works',
    sub: 'This is not a quick fix, but can be a framework.',
    checklist: [
      'Evidence-Based: Backed with studies on habit formation and mental resilience.',
      'Action-Oriented: Practical steps and tools.',
    ],
  },

  //--------------------- Chapter 2 Pride ---------------------
  {
    chapter: 2,
    fullImage: require('../assets/chapter-2-page.png'),
  },
  {
    chapter: 2, //Chapter 2 Card 1
    header: 'Pride > "Happiness"',
    quote:
      "Being proud of who you have become doesn't mean you're perfect; it means you're aware of your growth and potential.",
    quoteAuthor: 'Peter Wong',
    video:
      'https://www.youtube-nocookie.com/embed/r74UACw6dOE?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
  },
  {
    chapter: 2, //Chapter 2 Card 2
    header: 'Self Pride is Vital',
    sub: 'Pride = Your Accomplishment Resume.',
    accordionBlock: [
      'High Pride = Drive: When you go into something imagining success, you look for ways to win.\nYour mind shifts away from finding reasons to stop, and towards finding opportunities to push forward.',
      'Low Pride = The Inverse: Entering any challenge with low confidence creates a mental lens where you subconsciously look for ways to fail.',
    ],
    quote:
      "Men tend to associate happiness with accomplishments and the attainment of goals, whereas women often link happiness to interpersonal relationships and communal experiences.",
    quoteAuthor: 'Journal of Personality and Social Psychology',
  },
  {
    chapter: 2, //Chapter 2 Card 3
    header: 'Winners Know Their Worth',
    sub: 'Glass half full or half empty?',
    footer: "Life will throw obstacles your way. Winners don't stop at the problem.",
    checklist: [
      'Optimists - "Half full." Acknowledge the water and what you could do with it.',
      'Pessimists - "Half empty/missing."',
    ],
  },
  {
    chapter: 2, //Chapter 2 Card 4
    header: 'Acknowledge Your Dubs',
    sub: "Progress isn't always huge or flashy, but every improvement adds to your confidence.",
    checklist: [
      'Showing up to the gym',
      'Progressively lifting more weight',
      'Sticking to your nutrition plan',
    ],
  },
  
  //--------------------- Chapter 3 Motivation ---------------------
  {
    chapter: 3,
    fullImage: require('../assets/chapter-3-page.png'),
  },
  {
    chapter: 3, //Chapter 3 Card 1
    header: 'Motivation: What is Your "Why?"',
    quote:
      "If you really want to do something, you'll find a way. If you don't, you'll find an excuse.",
    quoteAuthor: 'Jim Rohn',
    video:
      'https://www.youtube-nocookie.com/embed/lHZ54TBXbiI?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
  },
  {
    chapter: 3, //Chapter 3 Card 2
    image: require('../assets/focus-hero-image.png'),
    header: 'Why This Matters',
    sub: 'The Truth',
    text: 'If you don’t know WHY you start something, you WILL quit.\nMaybe not today,\nmaybe not tomorrow,\n...but you will.',
    footer: 'If you can’t stick with tough things here, you’ll find excuses everywhere in life.',
  },
  {
    chapter: 3, //Chapter 3 Card 3
    header: '5 Surface Reasons',
    sub: 'But Not the Real "Why."',
    chipFlipTitle: [
      'Physical Appearance',
      'Health',
      'Confidence',
      'Stress Relief',
      'Social',
    ],
    chipFlipContent: [
      'Motivated by societal standards or personal aspirations for their ideal body.',
      'Improving overall well-being, cardiovascular health, increased energy, etc.',
      'Enhancing self-image, leading to greater confidence in social environments.',
      'Reducing stress, anxiety, and depression while improving mental clarity and emotional stability.',
      'Connecting with others, fostering community, and engaging in activities.',
    ],
    footer: 'These are valid reasons to start, but they’re not enough.',
  },
  {
    chapter: 3, //Chapter 3 Card 4
    header: 'Step 1️⃣',
    sub: 'The Starting Point',
    problemBlock: [
      '"I feel insecure about my body."',
      '"I’m not respected or taken seriously."',
      '"I quit everything I start."',
      '"I want a girl, but it never works out."',
    ],
    quote: 'What isn’t right in my life?',
    quoteAuthor: 'Ask Yourself',
  },
  {
    chapter: 3, //Chapter 3 Card 5
    header: 'Step 2️⃣',
    sub: 'The Solution?',
    text: 'Example: "I want to get bigger because I’m skinny."',
    footer: 'That’s your spark. But we’re just getting started.',
    headerQuote: 'What do I need to change?',
    headerQuoteAuthor: 'Ask Yourself',
  },
  {
    chapter: 3, //Chapter 3 Card 6
    header: 'Step 3️⃣',
    sub: 'Dig Deeper — Find your Real "Why."',
    textBlock: [
      'Example: "I feel awkward in public..."',
      '"... because I’m small, and I want to be confident. I’m tired of walking into a room and feeling invisible."',
    ],
    headerQuote: 'Why does this change matter?',
    headerQuoteAuthor: 'Ask Yourself',
    footer: 'This is where most people shy away. They don’t want to admit the deeper reasons because it’s uncomfortable.',
  },
  {
    chapter: 3, //Chapter 3 Card 7
    header: 'Step 4️⃣',
    sub: 'Visualize Your Endgame',
    textBlock: [
      'Example: "I will be the man who can walk into any room with self-pride..."',
      '"... Knowing I’ve earned respect."',
    ],
    headerQuote: 'What happens if I succeed?',
    headerQuoteAuthor: 'Ask Yourself',
    footer: 'This is what gets you out of bed when you’re sore... This is what keeps you going when you feel like quitting.',
  },
  {
    chapter: 3, //Chapter 3 Card 8
    header: 'Step 5️⃣',
    sub: 'Solidify It',
    headerQuote: 'People who write down their goals are 42% more likely to achieve them.',
    headerQuoteAuthor: 'Dr. Gail Matthews || Dominican University',
    footer: '✍️ Now, make it real.',
  },

  //--------------------- Chapter 4 Discipline ---------------------
  {
    chapter: 4,
    fullImage: require('../assets/chapter-4-page.png'),
  },
  {
    chapter: 4, //Chapter 4 Card 1
    header: 'Discipline',
    sub: 'Delete your "Why-Nots."',
    quote: 'Discipline is the bridge between goals and accomplishment.',
    quoteAuthor: 'Jim Rohn',
    video: 'https://www.youtube-nocookie.com/embed/W1YnBL-Haeg?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
  },
  {
    chapter: 4, //Chapter 4 Card 2
    header: 'Excuses Will Ruin You',
    sub: 'It’s easy to plan when you’re comfortable...',
    text: '... But when the real world hits,  excuses become very sharp,  very painful,  and very real.',
    quote: 'You never fail until you stop trying.',
    quoteAuthor: 'Albert Einstein',
    footer: 'Perseverance is a choice. A choice that winners continue to make.',
  },
  {
    chapter: 4, //Chapter 4 Card 3
    header: 'Love the Challenges',
    video: 'https://www.youtube-nocookie.com/embed/AWPq4QgAPBM?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
    landscape: true,
    quote: 'I trust myself because I’ve researched every possible angle… when things get hard, I already have an answer.',
    quoteAuthor: 'Lebron James',
    footer: 'Create backup plans and contigencies. Every obstacle you overcome, puts you ahead of everyone else.'
  },
  {
    chapter: 4, //Chapter 4 Card 4
    header: 'Reasons to Quit',
    chipFlipTitle: [
      'Time',
      'Priorities',
      'Accessibility',
      'Expectations',
      'Uncertainty',
      'Motivation',
      'Health',
      'Finances',
    ],
    chipFlipContent: [
      'Work/school commitments, limited flexibility, responsibilities, social commitments...',
      'Shifting interests, new career, new hobbies or activities…',
      'Uncomfortable atmosphere, location, time-of-day inconveniences…',
      'Slow progress, self-comparison to others…',
      'Lack of knowledge, confusion over workouts, nutrition missteps…',
      'Plateau-effect, burnout, frustration…',
      'Sudden injuries, specific health conditions…',
      'Other priority expenses, unexpected costs...',
      
    ],
  },
  {
    chapter: 4, //Chapter 4 Card 5
    header: 'The Goggins Mentality',
    sub: 'Hard times is where the growth happens.',
    video: 'https://www.youtube-nocookie.com/embed/dh4K1iCio70?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
    landscape: true,
    quote: 'You have to build calluses on your brain. If you quit, you’re done.',
    quoteAuthor: 'David Goggins',
  },
  {
    chapter: 4, //Chapter 4 Card 6
    header: '✔️ Action Task',
    sub: 'Create a list of your most common excuses.',
    checklist: [
      'Then shred that list of excuses...',
      'Then burn those shreds in a campfire...',
      'While making smores...',
    ],
    quote: 'Any excuse, no matter how valid, only weakens the character of a man.',
    quoteAuthor: 'Thomas S. Monson',
  },

  //--------------------- Chapter 5 Mental Control ---------------------
  {
    chapter: 5,
    fullImage: require('../assets/chapter-5-page.png'),
  },
  {
    chapter: 5, //Chapter 5 Card 1
    header: 'Mental Regulation',
    sub: 'Your mind is your most powerful tool—or your biggest enemy.',
    video: 'https://www.youtube-nocookie.com/embed/rppZk2Rctb4?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
    landscape: true,
  },
  {
    chapter: 5, //Chapter 5 Card 2
    header: 'Thoughts',
    sub: 'Control what lives in your head...',
    accordionBlock: [
      'Throw Out Negative Thoughts: Negative thoughts are like weeds—they grow fast and take over your mental-garden. Be aware as they arise, and actively reject them.',
      'Amplify Positive Thoughts: When you think, "I’m stronger than yesterday," or "I crushed that workout," hold onto that energy.',
    ],
    footer: 'Decide you’ve won, and every day you will win. Your goals will then become reality.',
  },
  {
    chapter: 5, //Chapter 5 Card 4
    header: 'Mental Conditioning',
    sub: 'Every time you overcome an obstacle, your mind becomes stronger.',
    chipFlipTitle: [
      'Overcome today’s obstacles',
      'Do what others WON’T do',
    ],
    chipFlipContent: [
      'So that you can be the person that succeeds regardless of the obstacles tomorrow.',
      'So that you can do what others CAN’T do later.',
    ],
    quote: 'How you do one thing is how you do everything.',
    quoteAuthor: 'T. Harv Eker',
  },
  {
    chapter: 5, //Chapter 5 Card 5
    header: 'Never Stop',
    checklist: [
      'Treat every challenge as a test of discipline.',
      'Add every success to your "mental resume."',
      'Remember:  "I don’t quit. I always win."',
    ],
  },

  //--------------------- Chapter 6 Resources ---------------------
  {
    chapter: 6,
    fullImage: require('../assets/chapter-6-page.png'),
  },
  {
    chapter: 6, //Chapter 6 Card 1
    header: 'Tools for Winning – Practical Strategies',
    accordionBlock: [
      'Journaling: a) Become more self aware;\nb) Reflect on setbacks;\nc) Adjust your perspective.',
      'Win-Loss Sheet: Wins: ‘Someone complimented me.’\nLosses: ‘Skipped a workout’\nChances are, you win more than you lose.',
      'Before-After Photos: Many lifters struggle to see their own progress.\nAdmire your growth.',
    ],
    quote: 'Interventions that included self-monitoring were significantly more effective than those that did not.',
    quoteAuthor: 'Michie, S. || Health Psychology',
  },
  {
    chapter: 6, //Chapter 6 Card 2
    header: 'Community',
    video: 'https://www.youtube-nocookie.com/embed/QZFq78ZQRro?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
    quote: 'Studies show that accountability increases goal success rates by 65%. Add check-ins with peers, and success jumps to 95%',
    quoteAuthor: 'American Society of Training and Development',
    footer: 'Use accountability to your advantage.',
  },
  {
    chapter: 6, //Chapter 6 Card 3
    header: 'The MASS Culture:',
    checklist: [
      'Post your dubs and pics.',
      'Encourage others:  “Iron sharpens iron.”',
      'SHUT DOWN NEGATIVITY:  "Misery loves company."',
    ],
    quote:
      'With a culture of driven people, WE ALL WILL BE MASSIVE. WE ALL WILL BE SUCCESSFUL. It’s not going to be easy... and that’s good.',
    quoteAuthor: 'MASS Monster',
  },
  {
    chapter: 6, //Chapter 6 Card 4
    header: 'Friends',
    sub: '= Accountability',
    inviteButton: true, //invite a friend button
    quote: 'Participants who were incentivized to attend the gym with a friend increased their attendance by 35% compared to those who went alone.',
    quoteAuthor: 'Gershon, Cryder & Milkman',
  },

  //--------------------- Chapter 7 Life ---------------------
  {
    chapter: 7,
    fullImage: require('../assets/chapter-7-page.png'),
  },
  {
    chapter: 7, //Chapter 7 Card 1
    header: 'LIFE Changing Conclusion',
    quote: 'I’ve already won. I’ve decided.',
    quoteAuthor: 'Tylor VanDenBroeke',
    video: 'https://www.youtube-nocookie.com/embed/7Oxz060iedY?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
    landscape: true,
  },
  {
    chapter: 7, //Chapter 7 Card 2
    header: 'The Framework for Life',
    sub: 'What you’ve built here goes beyond lifting weights or tracking meals...',
    text: '    The discipline,  mental resilience,  and problem-solving skills you develop in the gym will help you face the challenges in your career, relationships, and your personal growth.',
    footer: 'The simple truth: Winners aren’t born; they’re made.',
  },
  {
    chapter: 7, //Chapter 7 Card 3
    header: 'The Final Challenge',
    textBlock: [
      '1)  Hold yourself accountable:  Make your bio your "WHY," Let it fuel you.',
      '2)  Face every obstacle with confidence, and refuse to give excuses any power.',
      '3)  Build your pride by tracking your wins, lifting up others, and statying positive.',
    ],
    footer: 'Go win... Every single day...',
  },

  //--------------------- Chapter 8 Quiz ---------------------
  {
    chapter: 8,
    fullImage: require('../assets/chapter-8-page.png'),
  },
  {
    chapter: 8, //Chapter 8 Card 1
    header: 'Reflection Quiz',
    text: '    If you complete the quiz, you are awarded 1 Accountability Point, and the “Mindset” Role & Badge.',
    footer: 'Answers are private, and will not be saved.',
  },
  {
    chapter: 8, //Chapter 8 Card 2
    header: 'Question 1',
    sub: 'What problem in your life do you need to solve?',
    input: 'I no longer want to...',
    key: 'q1',
  },
  {
    chapter: 8, //Chapter 8 Card 3
    header: 'Question 2',
    sub: 'What is the changing factor that solves or starts to solve the problem(s)?',
    input: 'The solution is...',
    key: 'q2',
  },
  {
    chapter: 8, //Chapter 8 Card 4
    header: 'Question 3',
    sub: 'Why does that matter? What does your new life look like?',
    input: 'My new life will look like...',
    key: 'q3',
  },
  {
    chapter: 8, //Chapter 8 Card 5
    header: 'Sharpen the Axe',
    sub: 'Mentally overcome your struggles.',
    text: 'DISCIPLINE won’t be easy...  it’s a skill found in STRUGGLE.',
    footer: 'Tap ‘Next’ to move on to the final question.',
  },
  {
    chapter: 8, //Chapter 8 Card 6
    header: 'Question 4 (Final)',
    sub: 'ARE YOU GOING TO REACH YOUR GOALS?',
    footer: 'Who are you going to be when it gets rough?',
    final: true,
  },
  {
    chapter: 8,
    fullImage: require('../assets/mindset-last-page.png'),
  },
];

const CHAPTER_COUNT = 8;
const CHAPTER_TITLES = [
  'Chapter 1: Intro',
  'Chapter 2: Pride',
  'Chapter 3: Motivation',
  'Chapter 4: Discipline',
  'Chapter 5: Mental Control',
  'Chapter 6: Resources',
  'Chapter 7: Life',
  'Chapter 8: Reflect',
];
const CHAPTER_PAGES: number[][] = Array.from({length: CHAPTER_COUNT}, () => []);
PAGES.forEach((p, idx) => {
  CHAPTER_PAGES[p.chapter - 1].push(idx);
});
const FULLSCREEN_PAGES = PAGES.map((p, i) => (p.fullImage ? i : -1)).filter(
  i => i !== -1,
);
const PROBLEM_PAGE_INDEX = PAGES.findIndex(p => p.problemBlock);

export default function MindsetCourse({onBack}) {
  const [page, setPage] = useState(0);
  const pagerRef = useRef<CoursePagerHandle>(null);
  const scrollRefs = useRef<Array<ScrollView | null>>([]);
  const user = useCurrentUserDoc();
  const [initialSet, setInitialSet] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [quiz, setQuiz] = useState({
    q1: '',
    q2: '',
    q3: '',
  });
  const [inputHeights, setInputHeights] = useState<{[k: string]: number}>({});
  const [inputErrors, setInputErrors] = useState<{[k: string]: boolean}>({});
  const [problemComplete, setProblemComplete] = useState(false);
  const [navEnabled, setNavEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chaptersCompleted, setChaptersCompleted] = useState<boolean[]>(
    Array(CHAPTER_COUNT).fill(false),
  );
  const menuOpacity = useRef(new Animated.Value(0.8)).current;
  const insets = useSafeAreaInsets();
  const navAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pageCount = PAGES.length;
  const topPad = useCourseTopPad();
  const isFullImagePage = !!PAGES[page].fullImage;

  useEffect(() => {
    if (isFullImagePage && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isFullImagePage, sidebarOpen]);

  // Initialize from saved progress
  useEffect(() => {
    if (!user || initialSet) return;
    const last = user.mindsetChapterCompleted || 1;
    setChaptersCompleted(
      Array(CHAPTER_COUNT)
        .fill(false)
        .map((_, i) => i < last),
    );
    const start = CHAPTER_PAGES[last - 1][0];
    setPage(start);
    if (last < 1) updateMindsetChapter(1);
    setInitialSet(true);
  }, [user, initialSet]);

  useEffect(() => {
    if (initialSet) {
      pagerRef.current?.goToPageWithoutAnimation(page);
    }
  }, [initialSet, page]);

  const currentChapter = PAGES[page].chapter;
  const chapterPages = CHAPTER_PAGES[currentChapter - 1];
  const pageIdxInChapter = chapterPages.indexOf(page);
  const chapterProgress = (pageIdxInChapter + 1) / chapterPages.length;

  useEffect(() => {
    const p = PAGES[page];
    if (p.fullImage) {
      setChaptersCompleted(prev => {
        if (prev[p.chapter - 1]) return prev;
        const arr = [...prev];
        arr[p.chapter - 1] = true;
        updateMindsetChapter(p.chapter);
        return arr;
      });
    }
  }, [page]);

  useEffect(() => {
    const shouldShow = page !== PROBLEM_PAGE_INDEX || problemComplete;
    Animated.timing(navAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: ANIM_SLOW,
      useNativeDriver: true,
    }).start();
  }, [page, problemComplete]);

  useEffect(() => {
    if (problemComplete) {
      setNavEnabled(false);
      const t = setTimeout(() => setNavEnabled(true), 250);
      return () => clearTimeout(t);
    }
    setNavEnabled(false);
  }, [problemComplete]);

  const handlePageChange = (idx: number) => {
    const prevChapter = PAGES[page].chapter;
    const nextChapter = PAGES[idx].chapter;
    if (nextChapter !== prevChapter && idx > page) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setPage(idx);
    scrollRefs.current[idx]?.scrollTo({y: 0, animated: false});
    updateCourseProgress('mindset', (idx + 1) / pageCount);
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on the MASS Monster app: https://massmonster.life',
      });
    } catch (e) {
      console.error('Invite error', e);
    }
  };

  const handleFinish = () => {
    updateCourseProgress('mindset', 1);
    updateMindsetChapter(CHAPTER_COUNT);
    if (onBack) onBack();
  };

  const openSidebar = () => {
    if (isFullImagePage) return;
    Animated.sequence([
      Animated.timing(menuOpacity, {
        toValue: 0.6,
        duration: ANIM_SHORT,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: 0.8,
        duration: ANIM_SHORT,
        useNativeDriver: true,
      }),
    ]).start(() => setSidebarOpen(true));
  };

  const handleSelectChapter = (idx: number) => {
    setSidebarOpen(false);
    pagerRef.current?.goToPage(CHAPTER_PAGES[idx][0]);
  };

  const submitQuiz = () => {
    addAccountabilityPoint();
    grantMindsetBadge();
    handleFinish();
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: ANIM_INSTANT,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -1,
        duration: ANIM_INSTANT,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: ANIM_INSTANT,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: ANIM_INSTANT,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = (idx: number) => {
    const p = PAGES[idx];
    if (p.input) {
      const text = (quiz as any)[p.key] || '';
      if (text.trim().length < 20) {
        setInputErrors({...inputErrors, [p.key]: true});
        triggerShake();
        return;
      }
    }
    pagerRef.current?.goToPage(idx + 1);
  };

  useEffect(() => {
    return () => {
      const last = chaptersCompleted.lastIndexOf(true) + 1;
      if (last > 0) updateMindsetChapter(last);
    };
  }, [chaptersCompleted]);

  const renderContent = (p, idx) => {
    if (p.video) {
      if (page !== idx) {
        return null;
      }
      const videoStyle = p.landscape
        ? styles.heroVideoLandscape
        : styles.heroVideo;
      return (
        <View style={videoStyle}>
          <WebView
            source={{uri: p.video}}
            style={StyleSheet.absoluteFillObject}
            allowsFullscreenVideo={false}
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      );
    }
    if (p.reveal) {
      return (
        <TouchableOpacity onPress={() => setReveal(!reveal)}>
          {renderLines(p.text)}
          {reveal && renderLines(p.reveal)}
        </TouchableOpacity>
      );
    }
    if (p.textBlock) {
      return (
        <View style={styles.textBlock}>
          {p.textBlock.map((t, i) => (
            <React.Fragment key={i}>{renderLines(t)}</React.Fragment>
          ))}
        </View>
      );
    }
    if (p.accordionBlock) {
      const items = p.accordionBlock.map(t => {
        const parts = t.split(':');
        return parts.length > 1
          ? {
              title: parts[0] + ':',
              description: parts.slice(1).join(':').trim(),
            }
          : {title: t, description: ''};
      });
      return <AccordionList items={items} />;
    }
    if (p.bulletBlock) {
      return (
        <View style={styles.textBlock}>
          {p.bulletBlock.map((t, i) => (
            <Text style={styles.text} key={i}>
              • {t}
            </Text>
          ))}
        </View>
      );
    }
    if (p.checklist) {
      return <Checklist items={p.checklist} />;
    }
    if (p.chipFlipTitle && p.chipFlipContent) {
      return <ChipFlip titles={p.chipFlipTitle} contents={p.chipFlipContent} />;
    }
    if (p.inviteButton) {
      return (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleInvite}>
          <Text style={styles.primaryBtnText}>INVITE A FRIEND</Text>
        </TouchableOpacity>
      );
    }
    if (p.input) {
      const height = Math.max(44, inputHeights[p.key] || 44);
      return (
        <>
          <TextInput
            multiline
            maxLength={500}
            style={[
              styles.input,
              {height},
              inputErrors[p.key] && styles.inputError,
            ]}
            placeholder={p.input}
            placeholderTextColor="#888"
            value={(quiz as any)[p.key] || ''}
            onChangeText={t => {
              setQuiz({...quiz, [p.key]: t});
              if (t.trim().length >= 20 && inputErrors[p.key]) {
                setInputErrors({...inputErrors, [p.key]: false});
              }
            }}
            onContentSizeChange={e =>
              setInputHeights({
                ...inputHeights,
                [p.key]: e.nativeEvent.contentSize.height,
              })
            }
          />
          <Text style={styles.inputHint}>
            Must be between 20-500 characters
          </Text>
        </>
      );
    }
    if (p.final) {
      return (
        <View style={{marginTop: 12}}>
          <TouchableOpacity
            style={[styles.choice, {backgroundColor: colors.success}]}
            onPress={submitQuiz}>
            <Text style={[styles.choiceText, {color: '#fff'}]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.choice, {marginTop: 10}]}>
            <Text style={[styles.choiceText, {color: '#646464'}]}>NO</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (p.text) {
      return <>{renderLines(p.text)}</>;
    }
    return null;
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
          <ThemedImage
            source={p.fullImage}
            style={styles.fullPageImg}
            contentFit="cover"
          />
        </TouchableOpacity>
      );
    }

    const isProblemPage = idx === PROBLEM_PAGE_INDEX;
    return (
      <ScrollView
        key={idx}
        ref={el => {
          scrollRefs.current[idx] = el;
        }}
        style={[styles.page, {paddingTop: topPad}]}
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: 48,
          paddingBottom: insets.bottom + 180,
        }}>
          {p.image && (
          <ThemedImage
            source={p.image}
            style={styles.heroImg}
            contentFit="cover"
          />
        )}
        <Text style={styles.header}>{p.header}</Text>
        {p.video && renderContent(p, idx)}
        {p.sub && renderLines(p.sub, styles.sub)}
        {p.headerQuote && (
          <Quote
            text={`${p.headerQuote}${
              p.headerQuoteAuthor ? ' - ' + p.headerQuoteAuthor : ''
            }`}
          />
        )}
        {!p.video && renderContent(p, idx)}
        {p.quote && (
          <Quote
            text={`${p.quote}${p.quoteAuthor ? ' - ' + p.quoteAuthor : ''}`}
          />
        )}
        {p.footer && renderLines(p.footer, styles.footer)}
        {isProblemPage && p.problemBlock && (
          <ProblemButton
            items={p.problemBlock}
            onComplete={() => setProblemComplete(true)}
          />
        )}
        <Animated.View
          style={{opacity: navAnim}}
          pointerEvents={
            page === idx && isProblemPage && (!problemComplete || !navEnabled)
              ? 'none'
              : 'auto'
          }>
          <CourseNav
            showPrev={idx > 0}
            showNext={idx < PAGES.length - 1}
            onPrev={() => pagerRef.current?.goToPage(idx - 1)}
            onNext={() => handleNext(idx)}
            nextAnim={shakeAnim}
          />
        </Animated.View>
      </ScrollView>
    );
  });

  if (!initialSet) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <CoursePager
        ref={pagerRef}
        pages={pages}
        onBack={onBack}
        onPageChange={handlePageChange}
        dotsCount={CHAPTER_COUNT}
        dotIndex={currentChapter - 1}
        progress={chapterProgress}
        progressColor={colors.accent}
        fullScreenPages={FULLSCREEN_PAGES}
      />
      {!isFullImagePage && (
        <TouchableOpacity
          onPress={openSidebar}
          activeOpacity={0.8}
          style={[styles.menuBtn, {top: insets.top - 4}]}
          pointerEvents={isFullImagePage ? 'none' : 'auto'}>
          <Animated.View style={{opacity: menuOpacity}}>
            <Ionicons name="menu" size={32} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      )}
      <CourseOutlineSidebar
        visible={sidebarOpen && !isFullImagePage}
        onClose={() => setSidebarOpen(false)}
        chapters={CHAPTER_TITLES.map((t, i) => ({
          title: t,
          completed: chaptersCompleted[i],
        }))}
        current={currentChapter - 1}
        onSelect={handleSelectChapter}
      />
      {showConfetti && (
        <ConfettiCannon count={60} fadeOut origin={{x: width / 2, y: 0}} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: -32,
    paddingHorizontal: 6,
  },
  header: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 0,
    paddingBottom: 2,
    textAlign: 'center',
  },
  sub: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 40,
    width: '90%',
    textAlign: 'center',
  },
  textBlock: {
    width: '92%',
    marginBottom: 12,
    backgroundColor: '#242424',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 22,
    shadowColor: '#FFF',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  text: {
    color: '#E2E2E2',
    fontSize: 16,
    textAlign: 'left',
    width: '90%',
    marginVertical: 12,
    marginLeft: 12,
    lineHeight: 22,
  },
  footer: {
    color: '#767676',
    fontStyle: 'italic',
    fontSize: 16,
    textAlign: 'left',
    marginTop: 24,
    marginLeft: 12,
    marginBottom: 22,
    lineHeight: 22,
  },
  heroVideo: {
    width: width - 18,
    aspectRatio: 9 / 16,
    borderRadius: 16,
    backgroundColor: '#222',
    overflow: 'hidden',
    borderRightWidth: 3,
    borderBottomWidth: 2,
    borderColor: colors.accent,
  },
  heroVideoLandscape: {
    width: width,
    aspectRatio: 16 / 9,
    borderRadius: 18,
    marginBottom: 8,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  heroImg: {
    width: '99%',
    height: width * 0.6,
    borderRadius: 16,
    marginBottom: 12,
    alignSelf: 'center',
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
  primaryBtn: {
    backgroundColor: '#FFCC00',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 0.6,
  },
  choice: {
    backgroundColor: '#232323',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  choiceText: {color: '#FFCC00', fontSize: 15},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    color: '#000',
    width: width - 60,
    backgroundColor: '#fff',
  },
  inputError: {borderColor: colors.error},
  inputHint: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  quoteContainer: {
    backgroundColor: '#FFF7ED',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginVertical: 16,
    marginLeft: -18,
    width: width - 60,
    borderRightWidth: 3,
    borderBottomWidth: 2,
    borderColor: colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  quoteText: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 15,
    color: colors.textDark,
    fontWeight: 'normal',
    lineHeight: 22.5,
    textAlign: 'left',
  },
  quoteAuthor: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 14,
    color: '#A7A7A7',
    textAlign: 'right',
    marginTop: 8,
  },
  quoteIconLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    color: '#FEC515',
    opacity: 0.5,
  },
  quoteIconRight: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    color: '#FEC515',
    opacity: 0.5,
  },
  problemArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  problemBtn: {
    backgroundColor: colors.error,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemBtnText: {
    color: colors.white,
    fontSize: 18,
  },
  problemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuBtn: {
    position: 'absolute',
    right: 12,
    padding: 12,
    zIndex: 30,
  },
});