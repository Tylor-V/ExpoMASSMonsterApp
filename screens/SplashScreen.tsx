import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import * as NativeSplashScreen from 'expo-splash-screen';
import { Video } from 'expo-video';
import { Image } from 'expo-image';
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
import { useAppContext } from '../firebase/AppContext';
import { fixUserLevel } from '../firebase/chatXPHelpers';
import { auth } from '../firebase/firebase';
import { checkAccountabilityStreak } from '../firebase/userProfileHelpers';
import { colors } from '../theme';
import { ANIM_SLOW, SPLASH_TIMEOUT } from '../utils/animations';

const splashVideo = require('../assets/mass-splash.mp4');
const splashPlaceholder = require('../assets/app-icon.png');
const {width, height} = Dimensions.get('window');

export default function SplashScreen({navigation}) {
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const {appReady} = useAppContext();

  const hasNavigated = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<Video>(null);

  // Preload the splash video so the first frame shows immediately
  useEffect(() => {
    let mounted = true;
    Asset.loadAsync(splashVideo)
      .catch(() => null)
      .finally(() => {
        if (mounted) setVideoReady(true);
      });
    return () => {
      mounted = false;
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
  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) {
      if (status.error) handleFinish(true);
      return;
    }
    if (status.didJustFinish) handleFinish();
  };

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

  // If auth and data fetching finish after the video ends, navigate automatically
  useEffect(() => {
    if (authChecked && !hasNavigated.current) {
      if (!isLoggedIn || appReady) {
        handleFinish();
      }
    }
  }, [authChecked, appReady, isLoggedIn]);

  useEffect(() => {
    if (videoReady) {
      try {
        videoRef.current?.play();
      } catch {
        handleFinish(true);
      }
      NativeSplashScreen.hideAsync().catch(() => null);
    }
  }, [videoReady]);

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      {videoReady ? (
        <Video
          ref={videoRef}
          source={splashVideo}
          style={styles.video}
          contentFit="cover"
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      ) : (
        <Image source={splashPlaceholder} style={styles.video} contentFit="cover" />
      )}
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