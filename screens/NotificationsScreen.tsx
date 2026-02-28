import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../firebase/AppContext';
import { updateProfileField } from '../firebase/userProfileHelpers';

const defaultNotificationPrefs = {
  news: true,
  deals: true,
  role: true,
  dm: true,
  checkin: true,
};

type NotificationPrefs = typeof defaultNotificationPrefs;
type NotificationPrefKey = keyof NotificationPrefs;

type NotificationRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
};

const NotificationRow = ({ icon, label, value, onValueChange }: NotificationRowProps) => {
  const [pressed, setPressed] = useState(false);
  const handlePress = () => setPressed(true);
  const handleRelease = () => setPressed(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePress}
      onPressOut={handleRelease}
      onPress={() => onValueChange(!value)}
      accessibilityRole="button"
      style={{ width: '100%' }}
    >
      <View style={[styles.row, { backgroundColor: pressed ? '#F5F5F5' : '#FFFFFF' }]}>
        <Ionicons name={icon} size={24} color={'#232323'} />
        <Text style={styles.rowLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          style={{ marginLeft: 'auto' }}
        />
      </View>
    </TouchableOpacity>
  );
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAppContext();
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);

  useEffect(() => {
    setNotificationPrefs({
      ...defaultNotificationPrefs,
      ...(user?.notificationPrefs || {}),
    });
  }, [user?.notificationPrefs]);

  const updatePreference = async (key: NotificationPrefKey, nextValue: boolean) => {
    const previousPrefs = notificationPrefs;
    const nextPrefs = {
      ...notificationPrefs,
      [key]: nextValue,
    };

    setNotificationPrefs(nextPrefs);

    try {
      await updateProfileField('notificationPrefs', nextPrefs);
    } catch (err) {
      setNotificationPrefs(previousPrefs);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="notifications-back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
      </View>
      <ScrollView>
        <View>
          <NotificationRow
            icon="megaphone-outline"
            label="News Notifications"
            value={notificationPrefs.news}
            onValueChange={(nextValue) => updatePreference('news', nextValue)}
          />
          <NotificationRow
            icon="pricetags-outline"
            label="Deals & Promos"
            value={notificationPrefs.deals}
            onValueChange={(nextValue) => updatePreference('deals', nextValue)}
          />
          <NotificationRow
            icon="at-outline"
            label="@Role Mentions"
            value={notificationPrefs.role}
            onValueChange={(nextValue) => updatePreference('role', nextValue)}
          />
          <NotificationRow
            icon="chatbubble-ellipses-outline"
            label="DM Notifications"
            value={notificationPrefs.dm}
            onValueChange={(nextValue) => updatePreference('dm', nextValue)}
          />
          <NotificationRow
            icon="checkmark-done-outline"
            label="Check-In Reminders"
            value={notificationPrefs.checkin}
            onValueChange={(nextValue) => updatePreference('checkin', nextValue)}
          />
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
});

export default NotificationsScreen;
