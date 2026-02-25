import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { addToCart, CartItem, removeCartItem, sanitizeId, updateCartItem } from '../firebase/cartHelpers';
import { useCart } from '../hooks/useCart';
import { colors, fonts } from '../theme';
import { ANIM_BUTTON_POP, ANIM_MEDIUM } from '../utils/animations';

type AddToCartControlProps = {
  item: CartItem;
  disabled?: boolean;
  style?: ViewStyle;
};

function AddToCartControl({ item, disabled = false, style }: AddToCartControlProps) {
  const { items, setItems } = useCart();
  const sanitizedId = useMemo(() => sanitizeId(item.id), [item.id]);
  const existingCartItem = useMemo(
    () => items.find(i => i.id === sanitizedId || i.id === item.id),
    [item.id, items, sanitizedId],
  );
  const cartDocId = existingCartItem?.id ?? sanitizedId;
  const quantity = existingCartItem?.quantity || 0;
  const [localQty, setLocalQty] = useState(quantity);

  const fadeAnim = useRef(new Animated.Value(quantity > 0 ? 1 : 0)).current;
  const leftScale = useRef(new Animated.Value(localQty > 0 ? 1 : 0)).current;
  const rightScale = useRef(new Animated.Value(localQty > 0 ? 1 : 0)).current;
  useEffect(() => {
    setLocalQty(quantity);
  }, [quantity]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: localQty > 0 ? 1 : 0,
      duration: ANIM_MEDIUM,
      useNativeDriver: true,
    }).start();
    Animated.timing(leftScale, {
      toValue: localQty > 0 ? 1 : 0,
      duration: ANIM_MEDIUM,
      useNativeDriver: true,
    }).start();
    Animated.timing(rightScale, {
      toValue: localQty > 0 ? 1 : 0,
      duration: ANIM_MEDIUM,
      useNativeDriver: true,
    }).start();
    }, [localQty, fadeAnim, leftScale, rightScale]);

  const bounce = (scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.11, duration: ANIM_BUTTON_POP, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: ANIM_BUTTON_POP, useNativeDriver: true }),
    ]).start();
  };

  const handleAdd = async (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (disabled) return;
    bounce(rightScale);
    const newQty = localQty + 1;
    const previousItems = items;
    setLocalQty(newQty);
    setItems(prev =>
      prev.map(i => (i.id === cartDocId ? { ...i, quantity: newQty } : i)),
    );
    try {
      await updateCartItem(cartDocId, newQty);
    } catch (err) {
      setLocalQty(quantity);
      setItems(previousItems);
      console.error('Failed to update cart item', err);
    }
  };

  const handleRemove = async (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    bounce(leftScale);
    const newQty = localQty - 1;
    const previousItems = items;
    setLocalQty(newQty);
    setItems(prev => {
      const mapped = prev.map(i =>
        i.id === cartDocId ? { ...i, quantity: newQty } : i,
      );
      return newQty <= 0 ? mapped.filter(i => i.quantity > 0) : mapped;
    });
    if (newQty <= 0) {
      try {
        await removeCartItem(cartDocId);
      } catch (err) {
        setLocalQty(quantity);
        setItems(previousItems);
        console.error('Failed to remove cart item', err);
      }
    } else {
      try {
        await updateCartItem(cartDocId, newQty);
      } catch (err) {
        setLocalQty(quantity);
        setItems(previousItems);
        console.error('Failed to update cart item', err);
      }
    }
  };

  const handleInitialAdd = async (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (disabled) return;
    setLocalQty(1);
    setItems(prev => [...prev, { ...item, id: sanitizedId, quantity: 1 }]);
    try {
      await addToCart(item);
    } catch (err) {
      console.error('Failed to add item to cart', err);
    }
  };

  const circleWidth = 40;
  const containerWidth = 96;

  const inCart = localQty > 0;
  const disableIncrement = disabled;
  const disableInitialAdd = disabled && !inCart;

  return (
    <View
      style={[
        styles.container,
        { width: containerWidth, height: 30 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View
        pointerEvents={inCart ? 'auto' : 'none'}
        style={{ transform: [{ scale: leftScale }], opacity: fadeAnim }}
      >
        <Pressable
          onPress={handleRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.btn}
        >
          <Ionicons
            name={localQty <= 1 ? 'trash' : 'remove'}
            size={20}
            color={colors.black}
          />
        </Pressable>
      </Animated.View>
      <View
        style={[
          styles.circle,
          {
            width: circleWidth,
            marginHorizontal: 8,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={inCart || disableInitialAdd ? undefined : handleInitialAdd}
          style={({ pressed }) => [
            StyleSheet.absoluteFill,
            {
              justifyContent: 'center',
              alignItems: 'center',
            },
            !inCart && { transform: [{ scale: pressed ? 0.9 : 1 }] },
          ]}
        >
          {inCart ? (
            <Text style={styles.qty}>{localQty}</Text>
          ) : (
            <Ionicons name="cart" size={18} color={colors.black} />
          )}
        </Pressable>
      </View>
      <Animated.View
        pointerEvents={inCart && !disableIncrement ? 'auto' : 'none'}
        style={{ transform: [{ scale: rightScale }], opacity: fadeAnim }}
      >
        <Pressable
          onPress={handleAdd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.btn}
        >
          <Ionicons name="add" size={18} color={colors.black} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.5 },
  circle: {
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qty: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.black,
  },
});
export default React.memo(AddToCartControl);
