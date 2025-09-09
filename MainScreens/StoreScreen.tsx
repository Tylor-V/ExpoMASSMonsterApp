import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToCartControl from '../components/AddToCartControl';
import BackgroundWrapper from '../components/BackgroundWrapper';
import CartDrawer from '../components/CartDrawer';
import FeaturedCarousel from '../components/FeaturedCarousel';
import ProductDescriptionTabs from '../components/ProductDescriptionTabs';
import ProductImage from '../components/ProductImage';
import RatingRow from '../components/RatingRow';
import RollingNumber from '../components/RollingNumber';
import { TAB_BAR_HEIGHT } from '../components/SwipeableTabs';
import { addToCart as addCartItem } from '../firebase/cartHelpers';
import { useCart } from '../hooks/useCart';
import { useShopifyCollections, useShopifyProducts } from '../hooks/useShopify';
import { colors, fonts, radius } from '../theme';
import { ANIM_BUTTON_POP, ANIM_DRAWER, ANIM_MEDIUM } from '../utils/animations';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  parseCategoryRatings,
} from '../utils/categoryRatings';

const { width, height: screenHeight } = Dimensions.get('window');
const SHOPIFY_DOMAIN = 'zhcfc2-it.myshopify.com'; // <-- Replace with your shop domain
const CART_BAR_HEIGHT = 55;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const CARD_ROW_HEIGHT = 260;
// Fade rows in from 50% opacity as they scroll up from the bottom
const FADE_DISTANCE = CARD_ROW_HEIGHT;

function StoreScreen({ navigation }) {
  const {
    collections,
    loading: loadingCollections,
    error: collectionsError,
  } = useShopifyCollections();
  const [selected, setSelected] = useState<string>('all');
  const { products, loading, error: productError } = useShopifyProducts(selected);

  useEffect(() => {
    products?.forEach(p => {
      const url = p.images?.[0];
      if (url && typeof Image.prefetch === 'function') {
        Image.prefetch(url);
      }
    });
  }, [products]);

  const coralCollectionId = useMemo(() => {
    const match = collections.find(c =>
      c.title.toLowerCase().includes('coral')
    );
    return match?.id;
  }, [collections]);

  const featuredCollectionId = useMemo(() => {
    const match = collections.find(c =>
      c.title.toLowerCase().includes('featured')
    );
    return match?.id;
  }, [collections]);

  const {
    products: featuredProducts,
    loading: loadingFeatured,
  } = useShopifyProducts(featuredCollectionId);

  useEffect(() => {
    featuredProducts?.forEach(p => {
      const url = p.images?.[0];
      if (url && typeof Image.prefetch === 'function') {
        Image.prefetch(url);
      }
    });
  }, [featuredProducts]);

  const { items: cartItems } = useCart();
  const cartQuantity = cartItems.reduce((t, i) => t + i.quantity, 0);
  const [modalItem, setModalItem] = useState<any>(null);
  const [renderModal, setRenderModal] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const drawerHeight = screenHeight * 0.92;
  const slideAnim = useRef(new Animated.Value(drawerHeight)).current;
  const [imgIndex, setImgIndex] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const modalRatings = useMemo(
    () => parseCategoryRatings(modalItem?.description),
    [modalItem?.description],
  );
  const insets = useSafeAreaInsets();
  const cartAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + Number(item.price) * item.quantity,
        0,
      ),
    [cartItems],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(cartAnim, {
          toValue: 1.1,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: true,
        }),
        Animated.timing(cartAnim, {
          toValue: 1,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1.2,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: ANIM_BUTTON_POP,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cartQuantity, cartAnim, dotAnim]);

  const addToCart = async (item: any) => {
    try {
      await addCartItem({
        id: item.id,
        title: item.title,
        price: parseFloat(item.priceRange?.minVariantPrice.amount || '0'),
        image: item.images?.[0],
        quantity: 1,
        variantId: item.variantId, // <-- add this
        variantTitle: item.variantTitle, // optional
      });
    } catch (err) {
      console.error('Failed to add item to cart', err);
    }
  };

  const nextImg = () => {
    if (!modalItem) return;
    const total = modalItem.images?.length || 0;
    setImgIndex(i => (i + 1) % Math.max(total, 1));
  };

  const prevImg = () => {
    if (!modalItem) return;
    const total = modalItem.images?.length || 0;
    setImgIndex(i => (i - 1 + Math.max(total, 1)) % Math.max(total, 1));
  };

  const handleSelectFeaturedItem = useCallback(
    (item: any) => {
      if (cartOpen) {
        setCartOpen(false);
        setTimeout(() => setModalItem(item), ANIM_MEDIUM);
      } else {
        setModalItem(item);
      }
    },
    [cartOpen, setCartOpen, setModalItem],
  );

  const showFeatured =
    selected === 'all' && !loadingFeatured && featuredProducts.length > 0;

  const listData = useMemo(
    () =>
      showFeatured
        ? [
            { id: '__featured__', type: 'featured' },
            { id: '__spacer__', type: 'spacer' },
            ...products,
          ]
        : products,
    [showFeatured, products],
  );
  
  const animateCloseModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: ANIM_MEDIUM,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: drawerHeight,
        duration: ANIM_DRAWER,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRenderModal(false);
      setModalItem(null);
    });
  }, [overlayOpacity, slideAnim, drawerHeight]);

  const closeModal = () => animateCloseModal();

  useEffect(() => {
    setImgIndex(0);
  }, [modalItem]);

  useEffect(() => {
    if (modalItem) {
      setRenderModal(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIM_MEDIUM,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_DRAWER,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalItem, overlayOpacity, slideAnim, drawerHeight]);

  const renderProduct = ({ item, index }: { item: any; index: number }) => {
    const row = Math.floor(index / 2);
    const start = row * CARD_ROW_HEIGHT;
    const opacity = scrollY.interpolate({
      // Fade a row from 50% opacity to fully visible as it scrolls into view
      inputRange: [start - screenHeight, start - screenHeight + FADE_DISTANCE],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });
    
    if (item.type === 'featured') {
      return (
        <Animated.View style={[styles.featuredWrapper, { opacity }]}>          
          <Text style={styles.featuredLabel}>Bestsellers</Text>
          <FeaturedCarousel
            style={styles.featuredCarousel}
            products={featuredProducts}
            onSelect={handleSelectFeaturedItem}
            arrowSize={36}
            dotSize={16}
          />
        </Animated.View>
      );
    }

    if (item.type === 'spacer') {
      return <View style={{ width: 0, height: 0 }} />;
    }

    const imageUrl = item.images?.[0];
    const ratings = parseCategoryRatings(item.description);
    if (!imageUrl) {
      console.warn('No image URL for product', item.id);
    }

    return (
      <Animated.View style={[styles.card, { opacity }]}>
        <Pressable
          accessibilityRole="button"
          testID={`product-card-${item.id}`}
          style={styles.cardTouch}
          onPress={() => {
            if (cartOpen) {
              setCartOpen(false);
              setTimeout(() => setModalItem(item), ANIM_MEDIUM);
            } else {
              setModalItem(item);
            }
          }}
        >
          {(item?.title?.includes('New') || item?.title?.includes('Hot')) && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {item.title.includes('New') ? 'New' : 'Hot'}
              </Text>
            </View>
          )}
          <ProductImage uri={imageUrl} style={styles.cardImg} />
          <View style={styles.cardBody}>
            {item.collections?.some(
              c => c.id === coralCollectionId || c.title.toLowerCase().includes('coral'),
            ) && (
              <Image
                source={require('../assets/coral-logo.png')}
                style={styles.coralLogo}
                contentFit="contain"
              />
            )}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardPrice}>
              ${parseFloat(item.priceRange?.minVariantPrice.amount || '0').toFixed(2)}
            </Text>
            <View style={styles.cardRatings}>
              {CATEGORY_LABELS.map(label => {
                const rating = ratings[label];
                return rating ? (
                  <Ionicons
                    key={label}
                    name={CATEGORY_ICONS[label]}
                    size={24}
                    color={colors.black}
                    style={styles.cardRatingIcon}
                  />
                ) : null;
              })}
            </View>
            <AddToCartControl
              item={{
                id: item.id,
                title: item.title,
                price: parseFloat(item.priceRange?.minVariantPrice.amount || '0'),
                image: item.images?.[0],
                quantity: 1,
                variantId: item.variantId, // <-- add this
                variantTitle: item.variantTitle, // optional
              }}
              style={styles.addControl}
            />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const handleCheckout = async () => {
    if (!cartItems || cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Add items to your cart before checking out.');
      return;
    }
    // Validate all items have variantId and quantity > 0
    const invalid = cartItems.find(i => !i.variantId || i.quantity < 1);
    if (invalid) {
      Alert.alert('Invalid cart', 'Some items are missing variant info or quantity.');
      return;
    }
    // Build Shopify cart URL
    const cartPath = cartItems
      .map(i => `${i.variantId.replace('gid://shopify/ProductVariant/', '')}:${i.quantity}`)
      .join(',');
    const url = `https://${SHOPIFY_DOMAIN}/cart/${cartPath}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        try {
          await Linking.openURL(url);
        } catch {
          await WebBrowser.openBrowserAsync(url);
        }
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      Alert.alert('Checkout failed', 'Could not open checkout. Please try again.');
      console.error('Failed to open Shopify cart URL', err);
    }
  };

  return (
    <BackgroundWrapper
      padTop={false}
      style={{ flex: 1, justifyContent: 'flex-start' }}
    >
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../assets/mass-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.shopTitle}>SHOP</Text>
        </View>
        <Pressable
          testID="rewards-btn"
          accessibilityRole="button"
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Rewards')}
        >
          <Ionicons name="gift-outline" size={28} color={colors.gold} />
        </Pressable>
      </View>
      {loadingCollections ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginTop: 40 }}
        />
        ) : collectionsError ? (
        <Text style={styles.errorText}>Unable to load ratings.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            style={[
              styles.chip,
              selected === 'all' && styles.chipActive,
            ]}
            onPress={() => setSelected('all')}
          >
            <Text
              style={[
                styles.chipText,
                selected === 'all' && styles.chipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>
          {collections.map(c => (
            <Pressable
              key={c.id}
              style={[
                styles.chip,
                selected === c.id && styles.chipActive,
              ]}
              onPress={() => setSelected(c.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selected === c.id && styles.chipTextActive,
                ]}
              >
                {c.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={{ marginTop: 60 }}
        />
        ) : productError ? (
        <Text style={styles.errorText}>Unable to load products.</Text>
      ) : products.length === 0 ? (
        <Text style={styles.emptyText}>No products here yet. Check back soon!</Text>
      ) : (
        <AnimatedFlatList
          testID="products-list"
          data={listData}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
          contentContainerStyle={styles.grid}
          renderItem={renderProduct}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}
      <Modal
        visible={renderModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeModal}
          />
          {modalItem && (
            <Animated.View
              style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}
            >
              <Pressable style={styles.closeBtn} onPress={closeModal}>
                <Ionicons name="close" size={32} color={colors.gray} />
              </Pressable>
              <View style={styles.carouselWrap}>
                <Pressable onPress={prevImg} style={styles.carouselArrow}>
                  <Ionicons name="chevron-back" size={28} color={colors.black} />
                </Pressable>
                {(() => {
                  const imageUrl = modalItem.images?.[imgIndex];
                  if (!imageUrl) {
                    console.warn('No image URL for product', modalItem.id);
                  }
                  return (
                    <ProductImage
                      uri={imageUrl}
                      style={styles.modalImg}
                      contentFit="contain"
                    />
                  );
                })()}
                <Pressable onPress={nextImg} style={styles.carouselArrow}>
                  <Ionicons name="chevron-forward" size={28} color={colors.black} />
                </Pressable>
              </View>
              <Text style={styles.modalTitle}>{modalItem.title}</Text>
              <ScrollView
                style={styles.modalDescScroll}
                showsVerticalScrollIndicator={false}
              >
                {CATEGORY_LABELS.some(label => modalRatings[label]) && (
                  <View style={styles.modalRatings}>
                    {CATEGORY_LABELS.map(label => {
                      const rating = modalRatings[label];
                      return rating ? (
                        <RatingRow key={label} label={label} rating={rating} />
                      ) : null;
                    })}
                  </View>
                )}
                <ProductDescriptionTabs description={modalItem.description} />
              </ScrollView>
              <Pressable
                style={styles.modalAdd}
                onPress={() => {
                  addToCart({
                    ...modalItem,
                    variantId: modalItem.variantId,
                    variantTitle: modalItem.variantTitle,
                  });
                  closeModal();
                }}
              >
                <Text style={styles.modalAddText}>Add to Cart</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </Modal>
      <CartDrawer visible={cartOpen} onClose={() => setCartOpen(false)} />
      <Pressable
        testID="cart-bar-btn"
        accessibilityRole="button"
        style={[
          styles.cartBar,
          { bottom: TAB_BAR_HEIGHT + insets.bottom },
        ]}
        onPress={() => setCartOpen(true)}
      >
        <Animated.View style={{ transform: [{ scale: cartAnim }] }}>
          <Ionicons name="cart-outline" size={26} color={colors.black} />
          {cartQuantity > 0 && (
            <Animated.View
              style={[styles.cartDot, { transform: [{ scale: dotAnim }] }]}
            >
              <Text style={styles.cartDotText}>{cartQuantity}</Text>
            </Animated.View>
          )}
        </Animated.View>
        <Text style={styles.cartLabel}>Cart</Text>
        <View style={styles.cartTotalWrap}>
          <RollingNumber value={cartTotal} style={styles.cartTotal} />
        </View>
        {/* Only show checkout button if cart drawer is closed */}
        {cartQuantity > 0 && (
          <Pressable
            style={styles.checkoutBarBtn}
            onPress={handleCheckout}
            accessibilityRole="button"
          >
            <Text style={styles.checkoutBarBtnText}>Checkout</Text>
          </Pressable>
        )}
      </Pressable>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6 },
  logo: {
    width: width * 0.5,
    height: 70,
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  shopTitle: {
    fontWeight: 'bold',
    fontSize: 26,
    color: colors.white,
    marginTop: 8,
    marginLeft: -32,
  },
  chipRow: { paddingHorizontal: 12, marginBottom: 14 },
  chip: {
    height: 44,
    paddingHorizontal: 30,
    borderRadius: 6,
    backgroundColor: colors.translucentWhite,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.gold,
    shadowColor: colors.white,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chipText: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: colors.black,
  },
  chipTextActive: { color: colors.black },
  grid: {
    paddingHorizontal: 16,
    marginTop: 16,
    paddingBottom: 20 + CART_BAR_HEIGHT,
  },
  featuredWrapper: {
    width: '100%',
    flexBasis: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  featuredLabel: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.white,
    marginBottom: 8,
  },
  featuredCarousel: { marginBottom: 0 },
  card: {
    width: '46%',
    backgroundColor: colors.translucentWhite,
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 6 },
  },
  cardTouch: { flex: 1 },
  cardImg: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: colors.grayLight,
  },
  cardBody: {
    padding: 16
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.black,
    marginBottom: 4,
  },
  cardPrice: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.gold,
    marginBottom: 8,
  },
  // Provide extra space below ratings so the quantity control doesn't overlap
  cardRatings: { flexDirection: 'row', marginBottom: 8 },
  cardRatingIcon: { marginRight: 4 },
  addControl: { alignSelf: 'center', marginTop: 8 },
  coralLogo: {
    width: 80,
    height: 20,
    alignSelf: 'center',
    marginTop: -16,
    marginLeft: -32,
  },
  pill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.gold,
  },
  pillText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.black,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#A7A7A7',
    fontFamily: fonts.regular,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    color: colors.error,
    fontFamily: fonts.regular,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.translucentWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: colors.accent,
    borderWidth: 1,
    borderBottomWidth: -1,
    height: '92%',
    paddingTop: 48,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
  },
  closeBtn: { position: 'absolute', top: 4, right: 8, padding: 8 },
  carouselWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselArrow: { padding: 10 },
  modalImg: { width: width * 0.8, height: width * 0.8, borderRadius: 18 },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 24,
    color: colors.purple,
    marginHorizontal: 12,
    borderBottomWidth: 2,
    paddingTop: 12,
    paddingBottom: 8,
    borderColor: colors.accent,
  },
  // Allow more room for longer product descriptions
  modalDescScroll: { maxHeight: 260, marginHorizontal: 12, marginBottom: 0 },
  modalRatings: { marginBottom: 8 },
  modalAdd: {
    backgroundColor: colors.gold,
    borderRadius: radius.button,
    marginHorizontal: 12,
    marginBottom: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalAddText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.black,
  },
  cartBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 55,
    backgroundColor: colors.translucentWhite,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cartLabel: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.black,
    marginLeft: 12,
  },
  cartTotalWrap: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  cartTotal: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.black,
    textAlign: 'right',
  },
  cartDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.gold,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cartDotText: {
    fontWeight: 'bold',
    fontSize: 11,
    color: colors.black,
  },
  checkoutBarBtn: {
    marginLeft: 18,
    alignSelf: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  checkoutBarBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.gold,
    textDecorationLine: 'underline',
  },
});

export default React.memo(StoreScreen);