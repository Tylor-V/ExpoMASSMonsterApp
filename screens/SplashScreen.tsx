import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import * as NativeSplashScreen from 'expo-splash-screen';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { onAuthStateChanged } from 'firebase/auth';
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
  const authCheckedRef = useRef(false);
  const player = useVideoPlayer(splashVideo, player => {
    player.loop = false;
    player.addListener('playToEnd', () => handleFinish());
    player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') handleFinish(true);
    });
  });

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
  const handleFinish = React.useCallback((force = false) => {
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
        navigation.replace('AcceptanceGate');
      } else {
        navigation.replace('AuthStack');
      }
    });
  }, [appReady, authChecked, fadeAnim, isLoggedIn, navigation]);

  useEffect(() => {
    authCheckedRef.current = authChecked;
  }, [authChecked]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async user => {
      try {
        if (user) {
          await fixUserLevel(user.uid);
          await checkAccountabilityStreak(user.uid);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error('Splash auth bootstrap failed', err);
        setIsLoggedIn(!!user);
      } finally {
        setAuthChecked(true);
      }
    });
    return unsub;
  }, []);

  // Fallback timeout in case auth or app data hangs
  useEffect(() => {
    const tryForcedFinish = () => {
      if (hasNavigated.current) return;
      if (!authCheckedRef.current) {
        timeoutRef.current = setTimeout(tryForcedFinish, 250);
        return;
      }
      handleFinish(true);
    };

    timeoutRef.current = setTimeout(tryForcedFinish, SPLASH_TIMEOUT);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleFinish]);

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
        player.play();
      } catch {
        handleFinish(true);
      }
      NativeSplashScreen.hideAsync().catch(() => null);
    }
  }, [videoReady]);

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      {videoReady ? (
        <VideoView player={player} style={styles.video} contentFit="cover" />
      ) : (
        <Image source={splashPlaceholder} style={styles.video} contentFit="cover" />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={() => handleFinish()}
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
