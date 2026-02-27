import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

interface FAQSectionData {
  key: string;
  title: string;
  icon: string;
  faqs: { question: string; answer: string }[];
}

const SECTIONS: FAQSectionData[] = [
  {
    key: 'getting',
    title: 'Getting Started',
    icon: 'book-outline',
    faqs: [
      {
        question: 'How do I create an account?',
        answer: 'Download the app and follow the sign up steps to get started.',
      },
    ],
  },
  {
    key: 'features',
    title: 'App Features',
    icon: 'star-outline',
    faqs: [
      {
        question: 'What features are available?',
        answer: 'Track workouts, join the community and more.',
      },
    ],
  },
  {
    key: 'community',
    title: 'Community & Moderation',
    icon: 'people-outline',
    faqs: [
      {
        question: 'How do I report inappropriate content?',
        answer: 'Tap the report option from the post or user menu.',
      },
    ],
  },
  {
    key: 'privacy',
    title: 'Privacy & Security',
    icon: 'lock-closed-outline',
    faqs: [
      {
        question: 'Is my data secure?',
        answer: 'We store your data securely using Firebase.',
      },
    ],
  },
  {
    key: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'help-circle-outline',
    faqs: [
      {
        question: 'The app is not working as expected',
        answer: 'Try restarting the app or reinstalling if issues persist.',
      },
    ],
  },
  {
    key: 'legal',
    title: 'Legal & Safety',
    icon: 'document-text-outline',
    faqs: [
      {
        question: 'Where can I read the terms?',
        answer: 'Our legal documents are available below.',
      },
    ],
  },
];

export default function HelpFaqScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'),
    );
    setOpen(prev => (prev === key ? null : key));
  };


  const contactSupport = () => {
    Linking.openURL('mailto:support@massmonster.com').catch(err =>
      console.error('Failed to open mail app', err)
    );
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="faq-back"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HELP & FAQ</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {SECTIONS.map(section => (
          <View key={section.key}>
            <TouchableOpacity
              onPress={() => toggle(section.key)}
              accessibilityRole="button"
              accessibilityLabel={`${section.title} section`}
            >
              <View style={styles.row}>
                <Ionicons name={section.icon} size={22} color="#333" />
                <Text style={styles.rowLabel}>{section.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color="#B3B3B3"
                  style={{ marginLeft: 'auto', transform: [{ rotate: open === section.key ? '90deg' : '0deg' }] }}
                />
              </View>
            </TouchableOpacity>
            {open === section.key && (
              <View style={styles.answerWrap}>
                {section.faqs.map((f, idx) => (
                  <View key={idx} style={{ marginBottom: idx === section.faqs.length - 1 ? 0 : 12 }}>
                    <Text style={styles.question}>{f.question}</Text>
                    <Text style={styles.answer}>{f.answer}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 6 }]}>
        <TouchableOpacity
          onPress={contactSupport}
          style={styles.contactBtn}
          accessibilityRole="button"
          accessibilityLabel="Contact Support"
        >
          <Ionicons name="mail-outline" size={21} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.contactText}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('TermsPrivacy')} accessibilityRole="link">
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('TermsPrivacy')} accessibilityRole="link">
          <Text style={styles.footerLink}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerBar: {
    height: 56,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.5,
    marginRight: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E9E9E9',
  },
  rowLabel: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#000',
    marginLeft: 12,
  },
  answerWrap: {
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    padding: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  question: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  answer: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#636363',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    height: 52,
    borderRadius: 999,
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  contactText: {
    fontWeight: 'bold',
    fontSize: 19,
    color: '#000',
  },
  footerLink: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#A7A7A7',
    textDecorationLine: 'underline',
    textAlign: 'center',
    paddingVertical: 18,
  },
});