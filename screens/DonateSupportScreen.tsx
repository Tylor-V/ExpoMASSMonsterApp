import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentUserDoc } from '../hooks/useCurrentUserDoc';
import { colors, fonts } from '../theme';

const DonateSupportScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useCurrentUserDoc();
  const [pressDonate, setPressDonate] = useState(false);
  const [pressInvite, setPressInvite] = useState(false);

  const openDonate = () => {
    setPressDonate(true);
    setTimeout(() => {
      setPressDonate(false);
      Linking.openURL('https://massmonster.life/donate').catch(err =>
        console.error('Failed to open donate link', err)
      );
    }, 120);
  };

  const inviteFriend = () => {
    const code = user?.referralCode || user?.uid || '';
    const body = `Join me on MASS Monster! Build muscle, stay motivated, and unlock real rewards. Download the app and use my code ${code}. massmonster.life`;
    setPressInvite(true);
    setTimeout(() => {
      setPressInvite(false);
      const sms = Platform.OS === 'ios' ? 'sms:&body=' : 'sms:?body=';
      Linking.openURL(`${sms}${encodeURIComponent(body)}`).catch(err =>
        console.error('Failed to open SMS app', err)
      );
    }, 120);
  };

  const openEmail = () => {
    Linking.openURL('mailto:support@massmonster.com').catch(err =>
      console.error('Failed to open email app', err)
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="donate-back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DONATE & SUPPORT</Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionTitle}>Support MASS Monster</Text>
          <Text style={styles.bodyText}>
            We’re building MASS Monster for the community, not profit. Your
            donation goes directly toward new features, better content, and
            real-world rewards. Thank you for helping us grow stronger together.
          </Text>
        </View>
        <TouchableOpacity
          onPress={openDonate}
          activeOpacity={1}
          style={[
            styles.donateBtn,
            { transform: [{ scale: pressDonate ? 1.07 : 1 }] },
          ]}
        >
          <Ionicons name="heart" size={22} color="#E43F5A" style={{ marginRight: 8 }} />
          <Text style={styles.donateTxt}>Donate Now</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 32 }}>
          <Text style={styles.refTitle}>Refer a Friend</Text>
          <Text style={styles.bodyText}>
            Share MASS Monster with friends and help our community grow. When
            they join, you both earn bonus points!
          </Text>
          <TouchableOpacity
            onPress={inviteFriend}
            activeOpacity={1}
            style={[
              styles.inviteBtn,
              { transform: [{ scale: pressInvite ? 1.07 : 1 }] },
            ]}
          >
            <Text style={styles.inviteTxt}>Invite via Text</Text>
            <Ionicons name="send" size={20} color={colors.gold} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <Text style={styles.helpText}>Need help or have feedback?</Text>
        <TouchableOpacity onPress={openEmail}>
          <Text style={styles.email}>support@massmonster.com</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('HelpFAQ')}>
          <Text style={styles.faqLink}>View FAQ</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>
          Thank you for supporting the MASS Monster movement 💪
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
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
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.5,
    marginRight: 40,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#222',
    marginBottom: 8,
  },
  refTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#222',
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: '#444',
    marginBottom: 13,
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.88)',
    height: 54,
    borderRadius: 27,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  donateTxt: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    height: 50,
    borderRadius: 27,
    marginTop: 8,
  },
  inviteTxt: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 24,
  },
  helpText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#444',
  },
  email: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: '#111',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  faqLink: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.gold,
    marginTop: 12,
    textDecorationLine: 'underline',
  },
  footer: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 34,
  },
});

export default DonateSupportScreen;