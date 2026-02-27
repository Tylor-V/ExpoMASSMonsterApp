import { Ionicons as Icon } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SettingsRow from '../components/SettingsRow';
import { settingsGroups } from '../constants/settingsOptions';
import { useAppContext } from '../firebase/AppContext';
import { auth, firestore } from '../firebase/firebase';
import { useSettingsNavigation } from '../hooks/useSettingsNavigation';
import { clearUserCache } from '../utils/clearUserCache';

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { goBack, handleNavigate } = useSettingsNavigation();
  const insets = useSafeAreaInsets();
  const { user, setAppStatus } = useAppContext();
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  const handleSignOut = async () => {
    const uid = auth().currentUser?.uid;

    try {
      if (uid) {
        try {
          await firestore().collection('users').doc(uid).update({
            presence: 'offline',
            lastActive: firestore.FieldValue.serverTimestamp(),
          });
        } catch (presenceError) {
          console.warn('Failed to set offline presence before sign out', presenceError);
        }
      }

      await signOut(auth());
      if (uid) {
        void clearUserCache(uid).catch(cacheError => {
          console.warn('Failed to clear user cache on sign out', cacheError);
        });
      }
      setAppStatus({ user: null, points: 0, workoutHistory: [] });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        }),
      );
    } catch (error: any) {
      Alert.alert('Sign Out Failed', error?.message || 'Could not sign out.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity testID="settings-back" onPress={goBack} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>
      <ScrollView>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex}>
            {group.map((option) => (
              option.label === 'Sign Out' ? (
                <SettingsRow
                  key={option.label}
                  icon={option.icon}
                  label={option.label}
                  red={option.red}
                  iconColor={option.iconColor}
                  chevronColor={option.chevronColor}
                  onPress={handleSignOut}
                />
              ) : option.disabled || !option.routeName ? (
                <View key={option.label} style={styles.disabledRow}>
                  <Icon name={option.icon} size={24} color={option.iconColor || '#232323'} />
                  <Text style={styles.disabledLabel}>{option.label}</Text>
                  <Text style={styles.comingSoonText}>Coming soon</Text>
                </View>
              ) : (
                <SettingsRow
                  key={option.label}
                  icon={option.icon}
                  label={option.label}
                  red={option.red}
                  iconColor={option.iconColor}
                  chevronColor={option.chevronColor}
                  onPress={handleNavigate(option.routeName)}
                />
              )
            ))}
            {groupIndex < settingsGroups.length - 1 && <View style={styles.groupSpacer} />}
          </View>
        ))}
        {isModerator ? (
          <View>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Moderation Queue"
              onPress={handleNavigate('ModerationQueue')}
            />
          </View>
        ) : null}
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
  groupSpacer: {
    height: 32,
  },
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  disabledLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    color: '#232323',
  },
  comingSoonText: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#8C8C8C',
  },
});

export default SettingsScreen;
