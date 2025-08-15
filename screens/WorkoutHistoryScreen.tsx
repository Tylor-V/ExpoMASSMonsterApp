import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useAppContext } from '../firebase/AppContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function WorkoutRow({ item }: { item: any }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = React.useState(false);

  const onPressIn = () => {
    setPressed(true);
    Animated.timing(scale, {
      toValue: 1.03,
      duration: 70,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 70,
      useNativeDriver: true,
    }).start(() => setPressed(false));
  };

  const date = new Date(item.ts || 0);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ transform: [{ scale }], width: '100%' }}
    >
      <View style={[styles.row, pressed && styles.rowPressed]}>
        <Ionicons
          name="location-outline"
          size={23}
          color={colors.gray}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.location} numberOfLines={1}>
            {item.homeWorkout ? 'Home Workout' : item.gymName || 'Unknown Location'}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.date}>{dateStr}</Text>
            <Text style={styles.time}> {timeStr}</Text>
          </View>
        </View>
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={colors.accent}
          style={{ marginLeft: 'auto' }}
        />
      </View>
    </AnimatedPressable>
  );
}

export default function WorkoutHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { workoutHistory } = useAppContext();
  const history = Array.isArray(workoutHistory)
    ? [...workoutHistory].sort((a, b) => (b.ts || 0) - (a.ts || 0))
    : [];

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WORKOUT HISTORY</Text>
      </View>
      {history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="time-outline" size={36} color={colors.gray} />
          <Text style={styles.emptyText}>
            No workout history yet. Complete an Accountability Check-In to see your workouts here!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {history.map((item, idx) => (
            <WorkoutRow key={idx} item={item} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerBar: {
    height: 56,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 21,
    color: colors.white,
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.5,
    marginRight: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.grayLight,
  },
  rowPressed: { backgroundColor: '#F6F6F6' },
  location: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textDark,
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#757575',
  },
  time: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#757575',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 15,
    color: '#A7A7A7',
    marginTop: 12,
  },
});