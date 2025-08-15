export const LIFT_CATEGORIES: Record<string, string[]> = {
  'Chest Lifts': [
    'Standard Bench',
    'Incline Bench',
    'Pushups',
    'Chest Flys',
    'Chest-Focused Dips',
  ],
  'Shoulder Lifts': [
    'Lateral Raises (Cable)',
    'Lateral Raises (Dumbell)',
    'Front Raises',
    'Shoulder Press',
    'Face Pulls',
    'Reverse Flys',
  ],
  'Back Lifts': [
    'Pulldowns',
    'Single-Arm Cable Pulldowns',
    'Cable Pull-Overs',
    'Rows',
  ],
  'Triceps Lifts': [
    'Rope Pulldowns',
    'Rope Overhead Extensions',
    'Kickbacks',
    'Dips',
    'Close-Grip Bench/Skull-Crushers',
  ],
  'Biceps Lifts': [
    'Hammer Curls',
    'Spider Curls/Preacher Curls',
    'Drag Curls',
    'Bayesian Curls',
    'Supinating Curls',
  ],
  'Forearm Lifts': [
    'Cable Twist-Ups',
    'Cable Twist-Downs',
    'Dumbbell Twists',
    'Reverse-Grip Curls',
  ],
  'Leg Lifts': [
    'Squats',
    'Bulgarian Split Squat',
    'Sissy Squats',
    'Leg Extensions',
    'RDLs',
    'Leg Curls',
    'Adductors',
    'Abductors',
    'Calf Raises',
  ],
};

export const LIFT_CATEGORY_ORDER = Object.keys(LIFT_CATEGORIES);