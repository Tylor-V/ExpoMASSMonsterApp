import { Ionicons as Icon } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SettingsRow from '../components/SettingsRow';
import { settingsGroups } from '../constants/settingsOptions';
import { useSettingsNavigation } from '../hooks/useSettingsNavigation';

const SettingsScreen = () => {
  const { goBack, handleNavigate } = useSettingsNavigation();
  const insets = useSafeAreaInsets();

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
              <SettingsRow
                key={option.label}
                icon={option.icon}
                label={option.label}
                red={option.red}
                iconColor={option.iconColor}
                chevronColor={option.chevronColor}
                onPress={handleNavigate(option.routeName)}
              />
            ))}
            {groupIndex < settingsGroups.length - 1 && <View style={styles.groupSpacer} />}
          </View>
        ))}
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
});

export default SettingsScreen;