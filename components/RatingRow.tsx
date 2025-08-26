import { Ionicons as Icon } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  rating: number;
}

const RatingRow = ({label, rating}: Props) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    {[0, 1, 2, 3, 4].map(i => (
      <Icon
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={14}
        color={i < rating ? colors.gold : '#ECECEC'}
        style={styles.star}
      />
    ))}
  </View>
);

export default React.memo(RatingRow);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', marginTop: 2},
  label: {fontSize: 12, color: '#888', marginRight: 4},
  star: {marginHorizontal: 1},
});