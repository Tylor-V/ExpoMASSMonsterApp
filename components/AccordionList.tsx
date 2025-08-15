import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { fonts, radius } from '../theme';
import { ANIM_ROTATE } from '../animations';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItemProps {
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
}

const AccordionItem = ({title, description, expanded, onToggle}: AccordionItemProps) => {
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: ANIM_ROTATE,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const handlePress = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
    );
    onToggle();
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const contentStyle = {
    opacity: rotateAnim,
    transform: [{translateY: rotateAnim.interpolate({inputRange: [0, 1], outputRange: [-10, 0]})}],
  };

  return (
    <Animated.View style={[styles.item, {transform: [{scale: scaleAnim}]}]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityState={{expanded}}
        style={{width: '100%'}}>
        <View style={styles.row}>
          <Text style={styles.title}>{title}</Text>
          <Animated.View style={{transform: [{rotate}]}}>
            <Icon name="chevron-down-outline" size={20} color="#FFD700" />
          </Animated.View>
        </View>
        {expanded && (
          <Animated.View style={[styles.content, contentStyle]}>
            <Text style={styles.desc}>{description}</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

interface AccordionListProps {
  items: {title: string; description: string}[];
}

export default function AccordionList({items}: AccordionListProps) {
  const [openIndex, setOpenIndex] = useState<number>(-1);
  return (
    <View style={{width: '100%'}}>
      {items.map((it, idx) => (
        <AccordionItem
          key={idx}
          title={it.title}
          description={it.description}
          expanded={idx === openIndex}
          onToggle={() => setOpenIndex(idx === openIndex ? -1 : idx)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#f7f7f7',
    borderRadius: radius.card,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: '#181818',
  },
  content: {
    marginTop: 8,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: '#474747',
  },
});
