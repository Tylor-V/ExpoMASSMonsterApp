import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COURSE_TOP_PAD = 52;

export default function useCourseTopPad(extra: number = 0) {
  const insets = useSafeAreaInsets();
  return insets.top + COURSE_TOP_PAD + extra;
}