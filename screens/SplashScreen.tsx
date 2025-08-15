import auth from '@react-native-firebase/auth';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ANIM_SLOW, SPLASH_TIMEOUT } from '../animations';
import { useAppContext } from '../firebase/AppContext';
import { fixUserLevel } from '../firebase/chatXPHelpers';
import { checkAccountabilityStreak } from '../firebase/userProfileHelpers';
import { colors } from '../theme';

const {width, height} = Dimensions.get('window');

export default function SplashScreen({navigation}) {
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const {appReady} = useAppContext();

  const videoRef = useRef(null);
  const hasNavigated = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const unsub = auth().onAuthStateChanged(async user => {
      if (user) {
        await fixUserLevel(user.uid);
        await checkAccountabilityStreak(user.uid);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Fallback timeout in case auth or app data hangs
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      handleFinish(true);
    }, SPLASH_TIMEOUT);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // When splash video ends or tap to skip, navigate accordingly
  const handleFinish = (force = false) => {
    if (!authChecked || hasNavigated.current) return;
    if (!force && isLoggedIn && !appReady) return;
    hasNavigated.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: ANIM_SLOW,
      useNativeDriver: true,
    }).start(() => {
      if (isLoggedIn) {
        navigation.replace('AppStack');
      } else {
        navigation.replace('AuthStack');
      }
    });
  };

  // If auth and data fetching finish after the video ends, navigate automatically
  useEffect(() => {
    if (authChecked && !hasNavigated.current) {
      if (!isLoggedIn || appReady) {
        handleFinish();
      }
    }
  }, [authChecked, appReady, isLoggedIn]);

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      <Video
        ref={videoRef}
        source={require('../assets/mass-splash.mp4')}
        style={styles.video}
        resizeMode="cover"
        repeat={false}
        onEnd={handleFinish}
        onError={() => handleFinish(true)}
        muted={false}
        controls={false}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        playWhenInactive={false}
        volume={1.0}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleFinish}
        activeOpacity={1}
      />
      {!authChecked && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.yellow} />
          <Text style={styles.loadingText}>Checking Login…</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {width, height, position: 'absolute', top: 0, left: 0},
  loadingBox: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 16,
  },
});