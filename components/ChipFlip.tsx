import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ANIM_SLOW } from '../utils/animations';
import { colors } from '../theme';

interface ChipFlipProps {
  titles: string[];
  contents: string[];
}

const CHIP_WIDTH = Dimensions.get('window').width * 0.92;
const CHIP_HEIGHT = 66; // roughly 3 lines at 20-22 lineHeight

const FlipChip = ({title, content}: {title: string; content: string}) => {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const flip = () => {
    setAnimating(true);
    Animated.timing(anim, {
      toValue: flipped ? 0 : 1,
      duration: ANIM_SLOW,
      useNativeDriver: true,
    }).start(() => {
      setFlipped(!flipped);
      setAnimating(false);
    });
  };

  const front = {
    transform: [
      {
        rotateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };
  const back = {
    transform: [
      {
        rotateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <TouchableOpacity
      onPress={flip}
      activeOpacity={0.9}
      style={{ margin: 6, alignSelf: 'center' }}>
      <View style={{width: CHIP_WIDTH, height: CHIP_HEIGHT}}>
        <Animated.View
          style={[
            styles.chip,
            animating && styles.noShadow,
            styles.face,
            front,
          ]}>
          <Text style={styles.titleText}>{title}</Text>
          <Icon
            name="chevron-forward"
            size={16}
            color={colors.gray}
            style={styles.arrow}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.chip,
            animating && styles.noShadow,
            styles.back,
            back,
            StyleSheet.absoluteFillObject,
          ]}>
          <Text style={styles.text}>{content}</Text>
          <Icon
            name="chevron-forward"
            size={16}
            color={colors.gray}
            style={styles.arrow}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChipFlip({titles, contents}: ChipFlipProps) {
  const chips = titles.map((t, i) => ({title: t, content: contents[i] || ''}));
  return (
    <View style={styles.row}>
      {chips.map((c, i) => (
        <FlipChip key={i} title={c.title} content={c.content} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  chip: {
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.accent,
    backfaceVisibility: 'hidden',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  noShadow: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
    elevation: 0,
  },
  face: {backgroundColor: colors.background},
  back: {
    position: 'absolute',
    top: 0,
    backgroundColor: colors.accent,
  },
  titleText: {
    fontWeight: 'bold',
    fontWeight: '900',
    color: colors.white,
    textAlign: 'left',
    fontSize: 20,
    marginLeft: 12,
  },
  text: {
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontSize: 16,
    color: colors.white,
    textAlign: 'left',
    marginLeft: 10,
    width: '92%',
  },
  arrow: {
    marginLeft: 'auto',
    marginRight: 0,
  },
});