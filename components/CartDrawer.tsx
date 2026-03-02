import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Image } from 'expo-image';
import {
    ActivityIndicator,
    Animated,
    Alert,
    Dimensions,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANIM_MEDIUM } from '../utils/animations';
import { useCart } from '../hooks/useCart';
import { getActiveIssuedDiscountCode } from '../hooks/useActiveDiscountCode';
import { createShopifyCheckout } from '../hooks/useShopify';
import { isShopifyConfigError } from '../src/lib/shopify/config';
import { shopifyFetch } from '../src/lib/shopify/storefrontClient';
import { colors, fonts } from '../theme';
import { TAB_BAR_HEIGHT } from './SwipeableTabs';
import { useFocusEffect } from '@react-navigation/native';
import { removeCartItem, updateCartItem } from '../firebase/cartHelpers';
import type { CartItem } from '../firebase/cartHelpers';
import { openCheckoutUrl } from '../src/lib/shopify/openCheckoutUrl';

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

type CartDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

function CartDrawer({ visible, onClose }: CartDrawerProps) {
  const insets = useSafeAreaInsets();
  const { items, loading, setItems } = useCart();
  const subtotal = useMemo(
    () => items.reduce((t, i) => t + i.price * i.quantity, 0),
    [items],
  );
  const itemCount = useMemo(() => items.reduce((t, i) => t + i.quantity, 0), [items]);
  const screenHeight = Dimensions.get('window').height;
  const cardHeight = screenHeight - (TAB_BAR_HEIGHT + insets.bottom + 70); // leave space for cart bar and some margin
  const collapsedOffset = cardHeight - 72;
  const slideAnim = useRef(new Animated.Value(visible ? 0 : collapsedOffset)).current;
  const overlayOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const isDraggingRef = useRef(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const controlsDisabled = checkoutLoading || loading;

  // Validate cart items before checkout
  const canCheckout = items.length > 0 && items.every(i => i.quantity > 0 && i.variantId);

  useEffect(() => {
    if (isDraggingRef.current) return;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : collapsedOffset,
        duration: ANIM_MEDIUM,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: visible ? 1 : 0,
        duration: ANIM_MEDIUM,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, collapsedOffset, slideAnim, overlayOpacity]);

  const resetToOpen = React.useCallback(() => {
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
  }, [overlayOpacity, slideAnim]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          visible &&
          gestureState.dy > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5,
        onPanResponderGrant: () => {
          isDraggingRef.current = true;
          slideAnim.stopAnimation();
          overlayOpacity.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy <= 0) {
            slideAnim.setValue(0);
            overlayOpacity.setValue(1);
            return;
          }
          const clampedDy = Math.max(0, Math.min(gestureState.dy, collapsedOffset));
          slideAnim.setValue(clampedDy);
          overlayOpacity.setValue(Math.max(0, 1 - clampedDy / collapsedOffset));
        },
        onPanResponderRelease: (_, gestureState) => {
          isDraggingRef.current = false;
          if (gestureState.dy > collapsedOffset * 0.25 || gestureState.vy > 0.7) {
            onClose();
            return;
          }
          resetToOpen();
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          resetToOpen();
        },
      }),
    [collapsedOffset, onClose, overlayOpacity, resetToOpen, slideAnim, visible],
  );

  // Refresh cart when drawer is opened or app regains focus
  useFocusEffect(
    React.useCallback(() => {
      // Optionally, reload cart from backend here
      // For example, call setItems(await fetchCartItems());
    }, [visible])
  );

  // Helper to check stock for all items
  async function checkStock(items: CartItem[]) {
    // Query Shopify for inventory for each variantId
    const variantIds = Array.from(new Set(items.map(i => i.variantId).filter(Boolean)));
    if (variantIds.length === 0) {
      throw new Error('Missing product variants for stock check.');
    }
    const query = `
      query ($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            quantityAvailable
            availableForSale
          }
        }
      }
    `;
    try {
      const data = await shopifyFetch<{ nodes: any[] }>(query, { ids: variantIds });
      if (!data || !data.nodes) {
        throw new Error('Shopify inventory response missing data.');
      }
      // Map variantId to inventory
      const inventoryMap: Record<string, { quantityAvailable?: number; availableForSale?: boolean }> = {};
      data.nodes.forEach(node => {
        if (node && node.id) {
          inventoryMap[node.id] = {
            quantityAvailable: node.quantityAvailable,
            availableForSale: node.availableForSale,
          };
        }
      });
      // Check each cart item against inventory
      for (const item of items) {
        const stock = inventoryMap[item.variantId];
        if (!stock) {
          return false;
        }
        if (typeof stock.quantityAvailable === 'number') {
          if (item.quantity > stock.quantityAvailable) {
            return false;
          }
        } else if (stock.availableForSale === false) {
          return false;
        }
      }
      return true;
    } catch (error) {
      if (!isShopifyConfigError(error)) {
        console.error('Failed to check Shopify inventory', error);
      }
      throw error instanceof Error ? error : new Error('Unable to verify inventory.');
    }
  }

  // Checkout handler
  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckoutLoading(true);
    try {
      // Validate all items have variantId and quantity >= 1
      const invalid = items.find(i => !i.variantId || i.quantity < 1);
      if (invalid) {
        Alert.alert('Checkout unavailable', 'Some items are missing variant info.');
        setCheckoutLoading(false);
        return;
      }
      // Check stock
      const inStock = await checkStock(items);
      if (!inStock) {
        Alert.alert('Out of stock', 'One or more items are out of stock.');
        setCheckoutLoading(false);
        return;
      }
      const discountCode = await getActiveIssuedDiscountCode();
      const url = await createShopifyCheckout(
        items.map(i => ({
          id: i.variantId, // variantId is required by Shopify
          quantity: i.quantity,
          variantId: i.variantId,
        })),
        discountCode ? { discountCode } : undefined,
      );
      if (url) {
        await openCheckoutUrl(url);
        // Optionally: listen for return/close to refresh cart
      } else {
        Alert.alert('Checkout failed', 'Could not start checkout. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Checkout failed', message);
      if (!isShopifyConfigError(err)) {
        console.error('Failed to start checkout', err);
      }
    }
    setCheckoutLoading(false);
  };

  const updateQuantity = async (item: CartItem, nextQty: number) => {
    const previousItems = items;
    if (nextQty <= 0) {
      setItems(prev => prev.filter(cartItem => cartItem.id !== item.id));
      try {
        await removeCartItem(item.id);
      } catch (error) {
        setItems(previousItems);
        Alert.alert('Cart update failed', 'Unable to update cart. Please try again.');
      }
      return;
    }

    setItems(prev =>
      prev.map(cartItem =>
        cartItem.id === item.id ? { ...cartItem, quantity: nextQty } : cartItem,
      ),
    );

    try {
      await updateCartItem(item.id, nextQty);
    } catch (error) {
      setItems(previousItems);
      Alert.alert('Cart update failed', 'Unable to update cart. Please try again.');
    }
  };

  const onPlus = async (item: CartItem) => updateQuantity(item, item.quantity + 1);
  const onMinus = async (item: CartItem) => updateQuantity(item, item.quantity - 1);

  const onRemove = async (item: CartItem) => {
    const previousItems = items;
    setItems(prev => prev.filter(cartItem => cartItem.id !== item.id));
    try {
      await removeCartItem(item.id);
    } catch (error) {
      setItems(previousItems);
      Alert.alert('Cart update failed', 'Unable to update cart. Please try again.');
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
          marginBottom: -(TAB_BAR_HEIGHT + insets.bottom),
        },
      ]}
      pointerEvents={visible ? 'auto' : 'box-none'}
      testID="cart-drawer"
    >
      <AnimatedTouchable
        accessibilityRole="button"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
        pointerEvents={visible ? 'auto' : 'none'}
      />
      <Animated.View
        style={[
          styles.card,
          { height: cardHeight, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.dragHandleWrap} {...panResponder.panHandlers}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              hitSlop={{ top: 16, bottom: 16, left: 24, right: 24 }}
              style={styles.dragBar}
            />
          </View>
          <Text style={styles.title}>Your Cart</Text>
        </View>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.accent}
                style={{ marginTop: 40 }}
              />
            ) : items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Image
                  source={require('../assets/mass-logo.png')}
                  style={styles.emptyLogo}
                  contentFit="contain"
                />
                <Text style={styles.emptyTitle}>Your cart is empty!</Text>
                <Text style={styles.emptySub}>Browse the shop to add products.</Text>
              </View>
            ) : (
              <>
                {items.map(item => (
                  <View style={styles.row} key={item.id}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowTotal}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.rowControls}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={controlsDisabled}
                        onPress={() => onMinus(item)}
                        style={({ pressed }) => [
                          styles.qtyBtn,
                          pressed && styles.qtyBtnPressed,
                          controlsDisabled && styles.qtyBtnDisabled,
                        ]}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </Pressable>
                      <Text style={styles.rowQty}>{item.quantity}</Text>
                      <Pressable
                        accessibilityRole="button"
                        disabled={controlsDisabled}
                        onPress={() => onPlus(item)}
                        style={({ pressed }) => [
                          styles.qtyBtn,
                          pressed && styles.qtyBtnPressed,
                          controlsDisabled && styles.qtyBtnDisabled,
                        ]}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={controlsDisabled}
                        onPress={() => onRemove(item)}
                        style={({ pressed }) => [
                          styles.removeBtn,
                          pressed && styles.qtyBtnPressed,
                          controlsDisabled && styles.qtyBtnDisabled,
                        ]}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>Subtotal</Text>
                  <Text style={styles.subAmount}>${subtotal.toFixed(2)}</Text>
                </View>
                <Text style={styles.itemCount}>{itemCount} items in cart</Text>
                <Text style={styles.subInfo}>
                  Taxes and shipping calculated at checkout.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
        <View style={styles.checkoutFooter}>
          <Pressable
            accessibilityRole="button"
            testID="checkout-btn"
            onPress={handleCheckout}
            disabled={!canCheckout || checkoutLoading}
            style={({ pressed }) => [
              styles.checkoutBtn,
              pressed && styles.checkoutBtnPressed,
              (!canCheckout || checkoutLoading) && styles.checkoutBtnDisabled,
            ]}
          >
            <View style={styles.checkoutContent}>
              <Text style={styles.checkoutText}>Checkout</Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={20}
                color="#000"
                style={styles.checkoutArrow}
              />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    marginHorizontal: 0,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    paddingHorizontal: 20,
    paddingBottom: 0, // remove extra padding
  },
  dragBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray,
    opacity: 0.22,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  header: {
    paddingBottom: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 23,
    textAlign: 'center',
    color: colors.black,
    marginBottom: 8,
  },
  row: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 14, // <-- Add this line for spacing between rows
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.black,
    flex: 1,
  },
  rowQty: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.black,
    minWidth: 24,
    textAlign: 'center',
  },
  rowTotal: {
    fontWeight: 'bold',
    fontSize: 17,
    color: colors.gold,
    textAlign: 'right',
    marginLeft: 8,
  },
  rowControls: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },
  qtyBtnPressed: {
    opacity: 0.7,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.black,
  },
  removeBtn: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeBtnText: {
    color: '#B00020',
    fontWeight: '600',
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(210,210,210,0.28)',
    borderRadius: 1,
    marginTop: 18,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  subLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.black,
  },
  subAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.gold,
  },
  itemCount: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.gray,
    marginTop: 4,
  },
  subInfo: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#A2A2A2',
    marginTop: 4,
  },
  checkoutBtn: {
    // Remove position, left, right, zIndex
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginTop: 18, // Add spacing from above
    marginBottom: 12, // Optional: spacing from bottom of card
  },
  checkoutBtnPressed: {
    backgroundColor: '#FFC700',
    transform: [{ scale: 1.04 }],
  },
  checkoutBtnDisabled: {
    backgroundColor: '#FFF7BF',
    opacity: 0.4,
  },
  checkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: {
    fontWeight: 'bold', // Inter Bold
    fontSize: 18,
    color: '#000',
    marginRight: 8,
  },
  checkoutArrow: {
    marginLeft: 2,
  },
  emptyWrap: { alignItems: 'center', marginTop: 40 },
  emptyLogo: {
    width: 120,
    height: 120,
    opacity: 0.6,
  },
  emptyTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#6A6A6A',
    marginTop: 28,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#A2A2A2',
    marginTop: 6,
  },
  checkoutFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TAB_BAR_HEIGHT + 12, // keep above cart bar
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8 + 8, // extra for safe area
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 10,
  },
});
export default React.memo(CartDrawer);
