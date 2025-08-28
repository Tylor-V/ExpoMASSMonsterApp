import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type SettingsRowProps = {
  icon: string;
  label: string;
  onPress?: () => void;
  labelColor?: string;
  iconColor?: string;
  chevronColor?: string;
  red?: boolean;
};

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  onPress,
  labelColor = '#232323',
  iconColor = '#232323',
  chevronColor = '#B0B0B0',
  red = false,
}) => {
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? '#F5F5F5' : '#FFFFFF' }]}> 
      <Icon name={icon} size={24} color={iconColor} />
      <Text style={[styles.rowLabel, { color: red ? '#E53935' : labelColor }]}>{label}</Text>
      <Icon
        name="chevron-forward"
        size={20}
        color={red ? '#E53935' : chevronColor}
        style={{ marginLeft: 'auto' }}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
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

export default SettingsRow;