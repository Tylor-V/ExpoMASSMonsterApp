import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Row = ({ icon, label, onPress, labelColor = '#232323', iconColor = '#232323', chevronColor = '#B0B0B0', red = false }) => {
  const [pressed, setPressed] = useState(false);
  const handlePress = () => {
    setPressed(true);
    setTimeout(() => {
      setPressed(false);
      onPress?.();
    }, 100);
  };
  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress}>
      <View style={[styles.row, { backgroundColor: pressed ? '#F5F5F5' : '#FFFFFF' }]}>
        <Icon name={icon} size={24} color={iconColor} />
        <Text style={[styles.rowLabel, { color: red ? '#E53935' : labelColor }]}>{label}</Text>
        <Icon name="chevron-forward" size={20} color={red ? '#E53935' : chevronColor} style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
};

const SettingsScreen = () => {
  const navigation = useNavigation<any>(); // Fix typing for navigation
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="settings-back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>
      <ScrollView>
        <View>
          <Row icon="person-outline" label="Account" onPress={() => navigation.navigate('Account')} />
          <Row icon="wifi-outline" label="Online Status" onPress={() => navigation.navigate('OnlineStatus')} />
          <Row
            icon="calendar-outline"
            label="Workout History"
            onPress={() => navigation.navigate('WorkoutHistory')}
          />
          <Row icon="nutrition-outline" label="Nutrition Calculator" onPress={() => {}} />
        </View>
        <View style={styles.groupSpacer} />
        <View>
          <Row icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('NotificationsScreen')} />
          <Row icon="help-circle-outline" label="Help & FAQ" onPress={() => navigation.navigate('HelpFAQ')} />
          <Row
            icon="document-text-outline"
            label="Terms & Privacy"
            onPress={() => navigation.navigate('TermsPrivacy')}
          />
          <Row
            icon="heart-outline"
            label="Donate & Support"
            onPress={() => navigation.navigate('DonateSupport')}
          />
        </View>
        <View style={styles.groupSpacer} />
        <View>
          <Row icon="logo-usd" label="Become Affiliated" onPress={() => {}} />
          <Row icon="share-social-outline" label="Refer a Friend" onPress={() => {}} />
          <Row icon="log-out-outline" label="Sign Out" red onPress={() => {}} iconColor="#E53935" chevronColor="#E53935" />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 56,
    backgroundColor: '#232323',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    color: '#232323',
  },
  groupSpacer: {
    height: 32,
  },
});

export default SettingsScreen;