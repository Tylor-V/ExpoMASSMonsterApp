import AsyncStorage from '@react-native-async-storage/async-storage';

const GLOBAL_CACHE_KEYS = [
  'showWorkout',
  'workoutPlan',
  'sharedSplits',
  'calendarCarouselIndex',
  'customSplit_guest',
];

export async function clearUserCache(uid?: string): Promise<void> {
  try {
    const keysToRemove = [...GLOBAL_CACHE_KEYS];
    if (uid) {
      keysToRemove.push(`customSplit_${uid}`);
    }
    await AsyncStorage.multiRemove(keysToRemove);
  } catch (e) {
    console.warn('Failed to clear user cache', e);
  }
}
