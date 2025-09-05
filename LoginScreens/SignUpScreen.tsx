import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation, StackActions} from '@react-navigation/native';
import { auth } from '../firebase/firebase';
import { fonts, colors, radius } from '../theme';
import BackgroundWrapper from '../components/BackgroundWrapper';
import ResponsivePressable from '../components/ResponsivePressable';
import {createOrUpdateUserProfile} from '../firebase/firebaseUserProfile';
import {useInitializeUser} from '../hooks/useInitializeUser';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {clearUserCache} from '../utils/clearUserCache';
import {ensureShopifyCustomer} from '../utils/shopifyCustomer';

const SignUpScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const firstScale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(new Animated.Value(1)).current;
  const emailScale = useRef(new Animated.Value(1)).current;
  const passScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<any>();
  const initializeUser = useInitializeUser();
  const isConnected = useNetworkStatus();

  const handleSignUp = async () => {
    if (isConnected === false) {
      Alert.alert('No Internet', 'Please connect to the internet and try again.');
      return;
    }
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFirst = firstName.trim();
    const sanitizedLast = lastName.trim();
    const sanitizedPassword = password.trim();

    if (!sanitizedEmail || !sanitizedPassword || !sanitizedFirst || !sanitizedLast) {
      Alert.alert('Error', 'Please enter all fields.');
      return;
    }
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        sanitizedEmail,
        sanitizedPassword,
      );
      await clearUserCache();
      await userCredential.user.updateProfile({
        displayName: `${sanitizedFirst} ${sanitizedLast}`,
      });
      const shopifyCustomerId = await ensureShopifyCustomer(
        sanitizedEmail,
        sanitizedFirst,
        sanitizedLast,
      );
      await createOrUpdateUserProfile({
        uid: userCredential.user.uid,
        email: sanitizedEmail,
        firstName: sanitizedFirst,
        lastName: sanitizedLast,
        role: 'member',
        shopifyCustomerId: shopifyCustomerId || undefined,
      });
      await initializeUser(userCredential.user.uid);
      Alert.alert('Success', 'Account created! Logging you in...');
      // Replace the AuthStack with the main application stack
      navigation.getParent()?.dispatch(StackActions.replace('AppStack'));
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Email in use', 'That email address is already in use!');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'That email address is invalid!');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert(
          'Weak password',
          'Password should be at least 6 characters.',
        );
      } else {
        Alert.alert('Sign Up failed', error.message);
      }
    }
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

  const [firstFocused, setFirstFocused] = useState(false);
  const [lastFocused, setLastFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <BackgroundWrapper style={styles.background} padBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.container}>
      <Text style={styles.header} numberOfLines={1}>Starting your MASS lifestyle...</Text>
      <Text style={styles.subtext} numberOfLines={1}>Create account</Text>

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            transform: [{scale: firstScale}],
            borderColor: firstFocused ? colors.accent : 'transparent',
          },
        ]}>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor={colors.background}
          value={firstName}
          onChangeText={setFirstName}
          onFocus={() => {
            focusIn(firstScale);
            setFirstFocused(true);
          }}
          onBlur={() => {
            focusOut(firstScale);
            setFirstFocused(false);
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            transform: [{scale: lastScale}],
            borderColor: lastFocused ? colors.accent : 'transparent',
          },
        ]}>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor={colors.background}
          value={lastName}
          onChangeText={setLastName}
          onFocus={() => {
            focusIn(lastScale);
            setLastFocused(true);
          }}
          onBlur={() => {
            focusOut(lastScale);
            setLastFocused(false);
          }}
        />
      </Animated.View>

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

      <Animated.View style={{width: '100%', transform: [{scale: buttonScale}]}}>
        <ResponsivePressable
          style={styles.button}
          onPress={handleSignUp}
          onPressIn={() => pressIn(buttonScale)}
          onPressOut={() => pressOut(buttonScale)}>
          <Text style={styles.buttonText}>SIGN UP</Text>
        </ResponsivePressable>
      </Animated.View>

      <ResponsivePressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Back to Login</Text>
      </ResponsivePressable>
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
  subtext: {
    color: colors.textLight,
    fontSize: 16,
    fontFamily: fonts.regular,
    marginBottom: 20,
    textAlign: 'center',
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
    color: colors.background,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  button: {
    width: '100%',
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: radius.button,
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
  linkText: {
    color: colors.accent,
    marginHorizontal: 10,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    fontWeight: 'bold',
  },
});

export default SignUpScreen;
