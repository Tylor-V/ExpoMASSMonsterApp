import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Animated} from 'react-native';
import {radius, colors} from '../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

interface CourseNavProps {
  showPrev?: boolean;
  showNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  finishLabel?: string;
  nextAnim?: Animated.Value;
}

export default function CourseNav({
  showPrev,
  showNext,
  onPrev,
  onNext,
  onFinish,
  finishLabel = 'Finish',
  nextAnim,
}: CourseNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.navArea, {paddingBottom: insets.bottom + 16}]}>
      {showPrev && (
        <TouchableOpacity style={styles.navBtn} onPress={onPrev}>
          <Icon name="arrow-back-circle" size={34} color="#FFCC00" />
          <Text style={styles.navBtnText}>Back</Text>
        </TouchableOpacity>
      )}
      <View style={{flex: 1}} />
      {showNext ? (
        <Animated.View
          style={
            nextAnim
              ? {transform: [{translateX: nextAnim.interpolate({inputRange: [-1, 1], outputRange: [-8, 8]})}]}
              : undefined
          }>
          <TouchableOpacity style={styles.navBtn} onPress={onNext}>
            <Text style={styles.navBtnText}>Next</Text>
            <Icon name="arrow-forward-circle" size={34} color="#FFCC00" />
          </TouchableOpacity>
        </Animated.View>
      ) : (
        onFinish && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onFinish}>
            <Text style={styles.primaryBtnText}>{finishLabel}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 22,
    width: '100%',
    justifyContent: 'space-between',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36,36,36,0.95)',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 12,
  },
  navBtnText: {
    color: '#FFCC00',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  primaryBtn: {
    backgroundColor: colors.yellow,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 0.6,
  },
});