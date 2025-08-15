import { useCallback, useRef, useState, useEffect } from 'react';
import { FlatList, Animated } from 'react-native';
import { ANIM_NAVIGATION } from '../animations';

export default function useCarousel<T>(
  length: number,
  itemWidth: number,
  options?: { animatedScroll?: boolean; initialIndex?: number },
) {
  const [index, setIndex] = useState(options?.initialIndex ?? 0);
  const ref = useRef<FlatList<T>>(null);
  const prevIndex = useRef(options?.initialIndex ?? 0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const animatedScroll = options?.animatedScroll ?? false;
  const [direction, setDirection] = useState(1); // 1 for right, -1 for left

  type IndexSetter = number | ((cur: number) => number);
  const goToIndex = useCallback(
    (next: IndexSetter) => {
      setIndex(cur => {
        const target = typeof next === 'function' ? next(cur) : next;
        const clamped = Math.min(Math.max(target, 0), length - 1);
        setDirection(clamped > cur ? 1 : -1);
        return clamped;
      });
    },
    [length],
  );

  // Clamp index whenever the carousel length changes
  useEffect(() => {
    setIndex(i => Math.min(Math.max(i, 0), length - 1));
  }, [length]);
  
  // Scroll to the new index. Use FlatList animation or manual slide animation.
  useEffect(() => {
    if (!ref.current) return;
    if (animatedScroll) {
      ref.current.scrollToIndex({ index, animated: true });
      prevIndex.current = index;
      return;
    }
    if (prevIndex.current === index) {
      ref.current.scrollToIndex({ index, animated: false });
      return;
    }
    const dir = direction;
    prevIndex.current = index;
    ref.current.scrollToIndex({ index, animated: false });
    slideAnim.setValue(dir * itemWidth);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIM_NAVIGATION,
      useNativeDriver: true,
    }).start();
  }, [index, itemWidth, slideAnim, animatedScroll, direction]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollToIndex({ index, animated: false });
  }, [itemWidth]);

  // Ensure FlatList scrolls to the correct item once the ref is set
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollToIndex({ index, animated: false });
  }, [ref.current, index]);
  
  return { index, goToIndex, ref, slideAnim };
}