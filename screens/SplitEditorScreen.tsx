import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import SplitBuilder, { WorkoutPlan } from '../components/SplitBuilder';

interface RouteParams {
  initialSplit?: WorkoutPlan | null;
  onSave: (plan: WorkoutPlan) => void;
}

const SplitEditorScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  let params: RouteParams | undefined;
  try {
    const route = useRoute();
    params = route.params as RouteParams | undefined;
  } catch {
    params = undefined;
  }

  const handleSave = (plan: WorkoutPlan) => {
    params?.onSave(plan);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="split-back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CUSTOM SPLIT</Text>
      </View>
      <SplitBuilder initialSplit={params?.initialSplit} onSave={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: colors.grayLight,
  },
  backBtn: { marginRight: 12 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
});

export default SplitEditorScreen;