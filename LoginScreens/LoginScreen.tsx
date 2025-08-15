import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { auth } from '../firebase/firebase';
import {createOrUpdateUserProfile} from '../firebase/firebaseUserProfile';
import {clearUserCache} from '../utils/clearUserCache';
import {fixUserLevel} from '../firebase/chatXPHelpers';
import {checkAccountabilityStreak} from '../firebase/userProfileHelpers';
import {useNavigation, StackActions} from '@react-navigation/native';
import { fonts, colors, radius } from '../theme';
import BackgroundWrapper from '../components/BackgroundWrapper';
import PillButton from '../components/PillButton';
import ResponsivePressable from '../components/ResponsivePressable';
import {useInitializeUser} from '../hooks/useInitializeUser';
import {useNetworkStatus} from '../hooks/useNetworkStatus';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailScale = useRef(new Animated.Value(1)).current;
  const passScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<any>();
  const initializeUser = useInitializeUser();
  const isConnected = useNetworkStatus();
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLogin = async () => {
    if (isConnected === false) {
      Alert.alert('No Internet', 'Please connect to the internet and try again.');
      return;
    }
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();
      await auth().signInWithEmailAndPassword(
        sanitizedEmail,
        sanitizedPassword,
      );
      await clearUserCache();
      const user = auth().currentUser;
      if (user) {
        await createOrUpdateUserProfile({
          uid: user.uid,
          email: user.email ?? sanitizedEmail,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        });
        await fixUserLevel(user.uid);
        await checkAccountabilityStreak(user.uid);
        await initializeUser(user.uid);
      }
      // ← Now replace the entire AuthStack with AppStack
      navigation.getParent()?.dispatch(StackActions.replace('AppStack'));
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert(
          'User not found',
          'No user found for that email. Please sign up.',
        );
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Wrong password', 'That password is incorrect.');
      } else {
        Alert.alert('Login failed', error.message);
      }
      } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const focusIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1.03,
      useNativeDriver: true,
    }).start();
  };

  const focusOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const pressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <BackgroundWrapper style={styles.background} padBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
        <Image source={require('../assets/mass-logo.png')} style={styles.logo} />
      <Text style={styles.header} numberOfLines={1}>LET'S DO IT</Text>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            transform: [{scale: emailScale}],
            borderColor: emailFocused ? colors.accent : 'transparent',
          },
        ]}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.background}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onFocus={() => {
            focusIn(emailScale);
            setEmailFocused(true);
          }}
          onBlur={() => {
            focusOut(emailScale);
            setEmailFocused(false);
          }}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            transform: [{scale: passScale}],
            borderColor: passFocused ? colors.accent : 'transparent',
          },
        ]}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.background}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onFocus={() => {
            focusIn(passScale);
            setPassFocused(true);
          }}
          onBlur={() => {
            focusOut(passScale);
            setPassFocused(false);
          }}
        />
      </Animated.View>
      <Animated.View style={{ width: '100%', transform: [{ scale: buttonScale }] }}>
        <ResponsivePressable
          testID="login-btn"
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          onPressIn={() => pressIn(buttonScale)}
          onPressOut={() => pressOut(buttonScale)}
        >
          <Text style={styles.buttonText}>LOGIN</Text>
        </ResponsivePressable>
      </Animated.View>
      {loading && (
        <ActivityIndicator
          testID="login-loading"
          color={colors.accent}
          size="large"
          style={{ marginVertical: 10 }}
        />
      )}
      <View style={styles.linkRow}>
        <ResponsivePressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </ResponsivePressable>
        <ResponsivePressable onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.linkText}>Sign Up</Text>
        </ResponsivePressable>
      </View>
      </View>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
    );
  };

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: colors.white,
    marginBottom: 32,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 16,
    borderWidth: 2,
    borderRadius: radius.button,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  input: {
    height: 50,
    color: colors.black,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  button: {
    width: '100%',
    backgroundColor: colors.accent,
    height: 50,
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  linkText: {
    color: colors.accent,
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    fontWeight: 'bold',
  },
  logo: {
    width: 250,
    height: 159,
    marginBottom: -25,
    resizeMode: 'contain',
  },
});

export default LoginScreen;