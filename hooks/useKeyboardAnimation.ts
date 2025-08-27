import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

export function useKeyboardAnimation(initialOffset: number = 0): [Animated.Value, number] {
  const offset = useRef(new Animated.Value(initialOffset)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (e: any) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      animationRef.current?.stop();
      animationRef.current = Animated.timing(offset, {
        toValue: height + initialOffset,
        duration: e.duration || 250,
        useNativeDriver: false,
      });
      animationRef.current.start();
    };

    const handleHide = (e: any) => {
      setKeyboardHeight(0);
      animationRef.current?.stop();
      animationRef.current = Animated.timing(offset, {
        toValue: initialOffset,
        duration: e?.duration || 250,
        useNativeDriver: false,
      });
      animationRef.current.start();
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      animationRef.current?.stop();
    };
  }, [offset, initialOffset]);

  return [offset, keyboardHeight];
}