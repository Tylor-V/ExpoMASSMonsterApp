import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANIM_MEDIUM } from '../utils/animations';

interface Chapter {
  title: string;
  completed: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  chapters: Chapter[];
  current: number; // 0-based index
  onSelect: (index: number) => void;
}

const CourseOutlineSidebar = ({
  visible,
  onClose,
  chapters,
  current,
  onSelect,
}: Props) => {
  const width = Dimensions.get('window').width * 0.3;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [render, setRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (render) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
      ]).start(() => setRender(false));
    }
  }, [visible, width]);

  if (!render) return null;

  const topOffset = Math.max(insets.top - 17, 0);

  return (
    <>
      <Animated.View
        style={[styles.overlay, {opacity: overlayOpacity}]}
        pointerEvents={visible ? 'auto' : 'none'}>
        <TouchableOpacity
          style={{flex: 1}}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sidebar,
          {
            width,
            transform: [{translateX: slideAnim}],
            top: topOffset,
            paddingTop: 16,
          },
        ]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Course Outline</Text>
        </View>
        <ScrollView
          style={styles.list}
          contentContainerStyle={{paddingBottom: 20}}
          showsVerticalScrollIndicator
          indicatorStyle="white">
          {chapters.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.item, current === i && styles.itemActive]}
              onPress={() => (c.completed ? onSelect(i) : undefined)}>
              <View style={styles.iconWrap}>
                {c.completed ? (
                  <Icon name="checkmark-circle" size={12} color="#32CD32" />
                ) : (
                  <Icon name="ellipse-outline" size={12} color="#888888" />
                )}
              </View>
              <Text
                style={[
                  styles.itemText,
                  {color: c.completed ? '#FFFFFF' : '#888888'},
                  current === i && styles.itemTextActive,
                ]}>
                {c.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(44,44,44,0.65)',
    borderLeftWidth: 1,
    borderLeftColor: '#444444',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: {width: -2, height: 0},
    zIndex: 100,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 10,
    marginBottom: 12,
  },
  headerText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 18},
  list: {flex: 1},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 24,
    paddingRight: 16,
    marginBottom: 12,
  },
  itemActive: {
    borderRightWidth: 4,
    borderRightColor: '#FFD700',
  },
  iconWrap: {width: 16, alignItems: 'center'},
  itemText: {fontSize: 16},
  itemTextActive: {fontWeight: 'bold'},
});

export default CourseOutlineSidebar;