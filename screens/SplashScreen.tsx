import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as NativeSplashScreen from 'expo-splash-screen';
import { VideoView, useVideoPlayer } from 'expo-video';
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
const { width, height } = Dimensions.get('window');

type SplashFinishOptions = {
  force?: boolean;
  allowSkip?: boolean;
};

export default function SplashScreen({ navigation }) {
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [videoFinished, setVideoFinished] = React.useState(false);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const { appReady } = useAppContext();

  const hasNavigated = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authCheckedRef = useRef(false);
  const player = useVideoPlayer(splashVideo, playerInstance => {
    playerInstance.loop = false;
  });

  const handleFinish = React.useCallback(
    (options: SplashFinishOptions = {}) => {
      const { force = false, allowSkip = false } = options;
      if (!authChecked || hasNavigated.current) return;
      if (!force && !allowSkip && !videoFinished) return;
      if (!force && isLoggedIn && !appReady) return;

      hasNavigated.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
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
    },
    [appReady, authChecked, fadeAnim, isLoggedIn, navigation, videoFinished],
  );

  // Preload the splash video so the first frame can render without stutter.
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

  useEffect(() => {
    let playToEndSub: { remove?: () => void } | null = null;
    let statusSub: { remove?: () => void } | null = null;

    try {
      playToEndSub = player.addListener('playToEnd', () => {
        setVideoFinished(true);
      }) as { remove?: () => void };
      statusSub = player.addListener('statusChange', ({ status }) => {
        if (status === 'error') {
          setVideoFailed(true);
        }
      }) as { remove?: () => void };
    } catch {
      setVideoFailed(true);
    }

    return () => {
      playToEndSub?.remove?.();
      statusSub?.remove?.();
    };
  }, [player]);

  useEffect(() => {
    authCheckedRef.current = authChecked;
  }, [authChecked]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async user => {
      setIsLoggedIn(!!user);
      setAuthChecked(true);

      if (!user) {
        return;
      }

      try {
        await fixUserLevel(user.uid);
        await checkAccountabilityStreak(user.uid);
      } catch (err) {
        console.error('Splash auth bootstrap failed', err);
      }
    });
    return unsub;
  }, []);

  // Fallback timeout in case auth or app data hangs.
  useEffect(() => {
    const tryForcedFinish = () => {
      if (hasNavigated.current) return;
      if (!authCheckedRef.current) {
        timeoutRef.current = setTimeout(tryForcedFinish, 250);
        return;
      }
      handleFinish({ force: true });
    };

    timeoutRef.current = setTimeout(tryForcedFinish, SPLASH_TIMEOUT);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleFinish]);

  // Only auto-finish once the splash video has completed or playback fails.
  useEffect(() => {
    if (!authChecked || hasNavigated.current) {
      return;
    }
    if (videoFailed) {
      handleFinish({ force: true });
      return;
    }
    if (videoFinished) {
      handleFinish();
    }
  }, [appReady, authChecked, handleFinish, isLoggedIn, videoFailed, videoFinished]);

  useEffect(() => {
    if (!videoReady) {
      return;
    }

    try {
      player.play();
    } catch {
      setVideoFailed(true);
    }

    NativeSplashScreen.hideAsync().catch(() => null);
  }, [player, videoReady]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
        onPress={() => handleFinish({ allowSkip: true })}
        activeOpacity={1}
      />
      {!authChecked && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.yellow} />
          <Text style={styles.loadingText}>Checking Login...</Text>
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
  video: { width, height, position: 'absolute', top: 0, left: 0 },
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

