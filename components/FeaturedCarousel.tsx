import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, fonts } from '../theme';
import useCarousel from '../hooks/useCarousel';
import CarouselNavigator from './CarouselNavigator';
import AddCartButton from './AddCartButton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // match product grid width
const CARD_HEIGHT = CARD_WIDTH * 1.25; // 4:5 ratio
const SIDE_PAD = (width - CARD_WIDTH) / 2;

type Props = {
  products: any[];
  onSelect: (item: any) => void;
  style?: ViewStyle;
/** Size of arrow icons for navigation */
  arrowSize?: number;
  /** Diameter of navigation dots */
  dotSize?: number;
};
export default function FeaturedCarousel({ products, onSelect, style, arrowSize = 24, dotSize = 12 }: Props) {
  const { index, goToIndex, ref } = useCarousel<any>(products.length, CARD_WIDTH + 20);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Pressable style={styles.touch} onPress={() => onSelect(item)}>
        <Image
          source={{ uri: item.images?.[0]?.url }}
          defaultSource={require('../assets/mass-logo.png')}
          style={styles.image}
        />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Text style={styles.price}>
            ${parseFloat(item.priceRange?.minVariantPrice.amount || '0').toFixed(2)}
          </Text>
        </View>
      </Pressable>
      <AddCartButton
        item={{
          id: item.id,
          title: item.title,
          price: parseFloat(item.priceRange?.minVariantPrice.amount || '0'),
          image: item.images?.[0]?.url,
          quantity: 1,
          variantId: item.variantId,
          variantTitle: item.variantTitle,
        }}
      />
    </View>
  );

  return (
    <View style={style}>
      <FlatList
        testID="featured-carousel"
        ref={ref}
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 20}
        decelerationRate="fast"
        scrollEnabled={false}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD - 10 }}
        getItemLayout={(_, i) => ({ length: CARD_WIDTH + 20, offset: (CARD_WIDTH + 20) * i, index: i })}
      />
      {products.length > 1 && (
        <CarouselNavigator
          index={index}
          length={products.length}
          onIndexChange={goToIndex}
          dotsRowStyle={styles.dotsRow}
          activeColor={colors.gold}
          inactiveColor="#DADADA"
          dotSize={dotSize}
          arrowSize={arrowSize}
          leftOffset={-arrowSize * 0.75}
          rightOffset={-arrowSize * 0.75}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    overflow: 'hidden',
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    shadowColor: '#000',
    shadowOpacity: 0.11,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  touch: { flex: 1 },
  image: {
    width: '100%',
    height: CARD_HEIGHT * 0.7,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.grayLight,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: '#171717',
    textAlign: 'center',
  },
  price: {
    marginTop: 4,
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.gold,
  },
  dotsRow: { marginBottom: 24 },
});