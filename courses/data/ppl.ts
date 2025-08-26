import { LIFT_RATINGS, type RatingMap } from '../../constants/liftRatings';

const pushDayImg = require('../../assets/push-day.png');
const pullDayImg = require('../../assets/pull-day.png');
const legDayImg = require('../../assets/leg-day.png');
const introImg = require('../../assets/PPL-intro-page.png');

export const HERO_ASPECT = 800 / 260; // matches hero image style

export const EXERCISE_RATINGS: Record<string, RatingMap> = {
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

export const PAGES = [
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
    videoUrl: 'https://www.youtube-nocookie.com/embed/VEZVUNnhTtM?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0',
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
          { name: 'Flat Bench Press', detail: '3 sets' },
          { name: 'Incline Bench Press', detail: '2 sets' },
          { name: 'Cable Flys', detail: '2 sets' },
        ],
        tip: 'Full stretch/contraction and progressive overload.',
      },
      {
        group: 'Triceps',
        exercises: [
          { name: 'Rope Pulldowns', detail: '2 sets' },
          { name: 'Tricep Kickbacks', detail: '2 sets' },
          { name: 'Rope Overhead Extensions', detail: '2 sets' },
        ],
        tip: 'Full range + strict form for max growth.',
      },
      {
        group: 'Shoulders',
        exercises: [
          { name: 'Lateral Cable Raises', detail: '5 sets' },
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
          { name: 'Pulldowns', detail: '3 sets' },
          { name: 'Rows', detail: '3 sets' },
          { name: 'Cable Pull-Overs', detail: '3 sets' },
        ],
      },
      {
        group: 'Rear Delts',
        exercises: [
          { name: 'Face Pulls', detail: '4 sets' },
        ],
      },
      {
        group: 'Biceps',
        exercises: [
          { name: 'Hammer Curls', detail: '3 sets' },
          { name: 'Preacher Curls', detail: '3 sets' },
          { name: 'Drag Curls', detail: '2 sets' },
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
          { name: 'Leg Extension', detail: '3 sets' },
          { name: 'Barbell Squats', detail: '3 sets' },
          { name: 'Sissy Squats', detail: '5 sets' },
        ],
      },
      {
        group: 'Hams/Glutes',
        exercises: [
          { name: 'Leg Curls', detail: '3 sets' },
        ],
      },
      {
        group: 'Ductors',
        exercises: [
          { name: 'Adductor Machine', detail: '2 sets' },
          { name: 'Abductor Machine', detail: '2 sets' },
        ],
      },
      {
        group: 'Calves',
        exercises: [
          { name: 'Standing Calf Raises', detail: '3 sets' },
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
    fullImage: require('../../assets/ppl-last-page.png'),
  },
];