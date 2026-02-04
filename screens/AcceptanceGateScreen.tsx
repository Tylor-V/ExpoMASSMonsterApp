import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACCEPTANCE_LINKS, GUIDELINES_VERSION, TERMS_VERSION } from '../constants/acceptance';
import { useAppContext } from '../firebase/AppContext';
import { auth, firestore } from '../firebase/firebase';
import { colors, fonts, radius } from '../theme';
import { hasAcceptedLatest } from '../utils/acceptance';

const SUMMARY_TEXT =
  'MASS Monster has zero tolerance for abusive or objectionable content.\n' +
  'You can report or block users at any time.\n' +
  'Reports are reviewed and actioned within 24 hours.';

const linkRows = [
  {
    title: 'View Terms of Service',
    url: ACCEPTANCE_LINKS.terms,
  },
  {
    title: 'View Community Guidelines',
    url: ACCEPTANCE_LINKS.guidelines,
  },
  {
    title: 'View Moderation & Enforcement Policy',
    url: ACCEPTANCE_LINKS.moderation,
  },
];

export default function AcceptanceGateScreen() {
  const navigation = useNavigation<any>();
  const { appReady, user } = useAppContext();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  useEffect(() => {
    if (!appReady || hasRedirected.current) return;
    if (!user) {
      hasRedirected.current = true;
      navigation.replace('AuthStack');
      return;
    }
    if (hasAcceptedLatest(user)) {
      hasRedirected.current = true;
      navigation.replace('AppStack');
    }
  }, [appReady, navigation, user]);

  const handleOpenLink = (title: string, url: string) => {
    navigation.navigate('AcceptanceWebView', { title, url });
  };

  const handleAccept = async () => {
    const uid = auth().currentUser?.uid;
    if (!uid || submitting) return;
    setSubmitting(true);
    try {
      await firestore().collection('users').doc(uid).set(
        {
          acceptedAt: firestore.FieldValue.serverTimestamp(),
          acceptedTermsVersion: TERMS_VERSION,
          acceptedGuidelinesVersion: GUIDELINES_VERSION,
        },
        { merge: true },
      );
      navigation.replace('AppStack');
    } catch (error) {
      setSubmitting(false);
      Alert.alert(
        'Unable to Save',
        'Please try again to continue into the app.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Community Rules & Terms</Text>
        <Text style={styles.summary}>{SUMMARY_TEXT}</Text>
        <View style={styles.linkList}>
          {linkRows.map(row => (
            <TouchableOpacity
              key={row.title}
              style={styles.linkRow}
              activeOpacity={0.7}
              onPress={() => handleOpenLink(row.title, row.url)}
            >
              <Text style={styles.linkText}>{row.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.7}
          onPress={() => setChecked(value => !value)}
        >
          <Ionicons
            name={checked ? 'checkbox' : 'square-outline'}
            size={22}
            color={checked ? colors.accent : colors.white}
          />
          <Text style={styles.checkboxText}>
            I agree to the Terms of Service and Community Guidelines
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            (!checked || submitting) && styles.ctaButtonDisabled,
          ]}
          disabled={!checked || submitting}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.ctaText}>Agree & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.black,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: fonts.regular,
  },
  linkList: {
    gap: 12,
    marginBottom: 24,
  },
  linkRow: {
    borderWidth: 1,
    borderColor: colors.grayOutline,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  linkText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 10,
  },
  checkboxText: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  ctaButton: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
