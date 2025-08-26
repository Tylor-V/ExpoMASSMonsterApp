import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../firebase/AppContext';
import { updateProfileField } from '../firebase/userProfileHelpers';
import { colors, fonts } from '../theme';

const OnlineStatusScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAppContext();
  const [enabled, setEnabled] = useState<boolean>(!!user?.showOnlineStatus);

  useEffect(() => {
    setEnabled(!!user?.showOnlineStatus);
  }, [user?.showOnlineStatus]);

  const toggle = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    try {
      await updateProfileField('showOnlineStatus', newVal);
    } catch (err) {
      console.error('Failed to update online status', err);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="online-status-back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ONLINE STATUS</Text>
      </View>
      <TouchableOpacity onPress={toggle} activeOpacity={1}>
        <View style={styles.row}>
          <Ionicons name="globe-outline" size={24} color={colors.black} />
          <Text style={styles.rowLabel}>Show my Online Status</Text>
          <Switch
            testID="online-status-switch"
            value={enabled}
            onValueChange={toggle}
            style={{ marginLeft: 'auto' }}
            ios_backgroundColor="#D1D1D1"
            trackColor={{ false: '#D1D1D1', true: '#47d18c' }}
          />
        </View>
      </TouchableOpacity>
      <Text style={styles.desc}>
        When enabled, your online status will be visible in the Online Users sidebar. Disable to appear offline to others.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerBar: {
    height: 56,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: colors.white,
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  rowLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.black,
    marginLeft: 12,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

export default OnlineStatusScreen;