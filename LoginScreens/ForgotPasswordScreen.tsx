import { useNavigation } from '@react-navigation/native';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BackgroundWrapper from '../components/BackgroundWrapper';
import ResponsivePressable from '../components/ResponsivePressable';
import { auth } from '../firebase/firebase';
import { colors, fonts, radius } from '../theme';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const emailScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<any>();

  const handleReset = async () => {
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth(), sanitizedEmail);
      Alert.alert(
        'Success',
        'A password reset link has been sent to your email.',
      );
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
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

  const [emailFocused, setEmailFocused] = useState(false);

  return (
    <BackgroundWrapper style={styles.background} padBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.container}>
      <Text style={styles.header}>Forgot Password</Text>
      <Text style={styles.subtext}>
        Enter your email to receive a reset link
      </Text>
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
      <Animated.View style={{width: '100%', transform: [{scale: buttonScale}]}}>
        <ResponsivePressable
          style={styles.button}
          onPress={handleReset}
          onPressIn={() => pressIn(buttonScale)}
          onPressOut={() => pressOut(buttonScale)}>
          <Text style={styles.buttonText}>Send Reset Link</Text>
        </ResponsivePressable>
      </Animated.View>
      <ResponsivePressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Back to Login</Text>
      </ResponsivePressable>
    </View>
    </ScrollView>
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: colors.white,
    marginBottom: 24,
  },
  subtext: {
    color: colors.textLight,
    fontSize: 15,
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
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
