import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NotificationRow = ({ icon, label, value, onValueChange }) => {
  const [pressed, setPressed] = useState(false);
  const handlePress = () => setPressed(true);
  const handleRelease = () => setPressed(false);
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePress}
      onPressOut={handleRelease}
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
  const [news, setNews] = useState(true);
  const [deals, setDeals] = useState(true);
  const [role, setRole] = useState(true);
  const [dm, setDm] = useState(true);
  const [checkin, setCheckin] = useState(true);

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
            value={news}
            onValueChange={setNews}
          />
          <NotificationRow
            icon="pricetags-outline"
            label="Deals & Promos"
            value={deals}
            onValueChange={setDeals}
          />
          <NotificationRow
            icon="at-outline"
            label="@Role Mentions"
            value={role}
            onValueChange={setRole}
          />
          <NotificationRow
            icon="chatbubble-ellipses-outline"
            label="DM Notifications"
            value={dm}
            onValueChange={setDm}
          />
          <NotificationRow
            icon="checkmark-done-outline"
            label="Check-In Reminders"
            value={checkin}
            onValueChange={setCheckin}
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
