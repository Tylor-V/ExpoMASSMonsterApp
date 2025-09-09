import { Ionicons as Icon } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  rating: number;
}

const RatingRow = ({ label, rating }: Props) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.stars}>
      {[0, 1, 2, 3, 4].map(i => (
        <Icon
          key={i}
          name="star"
          size={14}
          color={i < rating ? colors.gold : colors.gray}
          style={styles.star}
        />
      ))}
    </View>
  </View>
);

export default React.memo(RatingRow);

const styles = StyleSheet.create({
  row: { width: '100%', marginTop: 2 },
  label: { fontSize: 12, color: '#888' },
  stars: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 2 },
  star: { marginHorizontal: 1 },
});