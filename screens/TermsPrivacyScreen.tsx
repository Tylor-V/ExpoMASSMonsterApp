import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const TERMS = [
  {
    title: 'Welcome to MASS Monster',
    body: `By using MASS Monster, you agree to these Terms of Service and our Privacy Policy. Please read them carefully.`
  },
  {
    title: 'Eligibility',
    body: `You must be at least 13 years old to use MASS Monster. By creating an account, you confirm that all information provided is accurate.`
  },
  {
    title: 'Account & Community Guidelines',
    body: `Respect others and follow our Community Guidelines. Harassment, hate speech, spamming, or any abusive behavior may result in account suspension or removal.`
  },
  {
    title: 'Data Collection & Use',
    body: `We collect only the information necessary to operate and improve MASS Monster, such as your email, profile info, check-in/activity data, and device information. Your data is stored securely in Firebase and is never sold to third parties.`
  },
  {
    title: 'Cookies & Analytics',
    body: `We may use cookies and similar technologies to enhance your experience, analyze usage, and improve our services.`
  },
  {
    title: 'User Content',
    body: `You are responsible for any content you post. Do not share content that is illegal, offensive, or violates others’ rights.`
  },
  {
    title: 'Shop Terms & Orders',
    body: `All purchases are processed via Shopify’s secure checkout. We do not store payment information. Product details and availability may change at any time. If a product is unavailable after purchase, you will be notified and refunded.`
  },
  {
    title: 'Refunds & Returns',
    body: `Refunds and returns follow each product’s policy as listed in the shop. Most supplements and consumables cannot be returned if opened. For issues, contact support@massmonster.com within 7 days of delivery.`
  },
  {
    title: 'Accountability Points & Rewards',
    body: `Earn Accountability Points by completing check-ins and activities. Points may be revoked for fraudulent activity. Rewards, discounts, and offers are subject to change and availability. Points have no cash value.`
  },
  {
    title: 'Data Security',
    body: `Your account is protected with encryption and authentication via Firebase and Shopify. Use a strong, unique password and never share your login.`
  },
  {
    title: 'Data Retention & Deletion',
    body: `You may request deletion of your MASS Monster account and data at any time by contacting support@massmonster.com. Some data (such as purchase history) may be retained for legal or tax purposes.`
  },
  {
    title: 'Updates to Terms',
    body: `We may update these Terms and Privacy Policy at any time. Continued use of MASS Monster after changes means you accept the new terms. Major changes will be announced in-app.`
  },
  {
    title: 'Contact',
    body: `For support or questions, email support@massmonster.com.`
  }
];

export default function TermsPrivacyScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="terms-back"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TERMS & PRIVACY</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {TERMS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>Last Updated: 07/10/2025</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: {
    height: 56,
    backgroundColor: '#232323',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.5,
    marginRight: 40,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#232323',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  sectionBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: '#444',
  },
  footerWrap: { marginTop: 30, alignItems: 'center' },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#A7A7A7',
    marginTop: 10,
  },
});