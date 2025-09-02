import React, { memo, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Dimensions,
  Text,
  ViewStyle,
  Animated,
} from 'react-native';
import { colors, fonts } from '../theme';
import useCarousel from '../hooks/useCarousel';
import CarouselNavigator from './CarouselNavigator';
import AddCartButton from './AddCartButton';
import ProductImage from './ProductImage';

const { width } = Dimensions.get('window');
// Width of the product grid on StoreScreen has 16px padding on each side
const GRID_WIDTH = width - 32;
// Leave 10px horizontal margin on each side of the cards so we subtract 20
const CARD_WIDTH = GRID_WIDTH - 20;
const CARD_HEIGHT = CARD_WIDTH * 1.25; // 4:5 ratio
// Item length matches the grid width so snapping aligns cards to center
const ITEM_LENGTH = CARD_WIDTH + 20;

type CardProps = {
  item: any;
  onSelect: (item: any) => void;
};

const FeaturedCard = memo(({ item, onSelect }: CardProps) => {
  const imageUrl = item.images?.[0];
  if (!imageUrl) {
    console.warn('No image URL for product', item.id);
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.touch} onPress={() => onSelect(item)}>
        <ProductImage uri={imageUrl} style={styles.image} contentFit="cover" />
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
          image: item.images?.[0],
          quantity: 1,
          variantId: item.variantId,
          variantTitle: item.variantTitle,
        }}
      />
    </View>
  );
});

type Props = {
  products: any[];
  onSelect: (item: any) => void;
  style?: ViewStyle;
  /** Size of arrow icons for navigation */
  arrowSize?: number;
  /** Diameter of navigation dots */
  dotSize?: number;
};

function FeaturedCarousel({ products, onSelect, style, arrowSize = 24, dotSize = 12 }: Props) {
  const { index, goToIndex, ref, slideAnim } = useCarousel<any>(products.length, ITEM_LENGTH);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <FeaturedCard item={item} onSelect={onSelect} />
  ), [onSelect]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const getItemLayout = useCallback((_: any, i: number) => (
    { length: ITEM_LENGTH, offset: ITEM_LENGTH * i, index: i }
  ), []);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.inner, { transform: [{ translateX: slideAnim }] }]}>
        <FlatList
          testID="featured-carousel"
          ref={ref}
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_LENGTH}
          decelerationRate="fast"
          scrollEnabled={false}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          style={{ width: ITEM_LENGTH }}
        />
      </Animated.View>
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

export default memo(FeaturedCarousel);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  inner: { width: '100%' },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    // Use symmetric margins so the carousel items stay centered on screen
    marginHorizontal: 10,
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