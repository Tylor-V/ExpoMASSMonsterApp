import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { useCart } from '../hooks/useCart';
import { addToCart, sanitizeId, CartItem } from '../firebase/cartHelpers';
import { ANIM_BUTTON_POP } from '../animations';

type Props = {
  item: CartItem;
  style?: ViewStyle;
};

function AddCartButton({ item, style }: Props) {
  const { items, setItems } = useCart();
  const sid = useMemo(() => sanitizeId(item.id), [item.id]);
  const qty = items.find(i => i.id === sid)?.quantity || 0;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.1, duration: ANIM_BUTTON_POP, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: ANIM_BUTTON_POP, useNativeDriver: true }),
    ]).start();
    const newQty = qty + 1;
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === sid);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: newQty };
        return copy;
      }
      return [...prev, { ...item, id: sid, quantity: 1 }];
    });
    try {
      addToCart({ ...item, quantity: 1 });
    } catch {}
  };

  return (
    <Animated.View style={[styles.container, style, { transform: [{ scale }] }]}>
      <Pressable onPress={handlePress} style={styles.button} accessibilityRole="button">
        <Ionicons name="cart" size={24} color={colors.black} />
      </Pressable>
      {qty > 0 && (
        <View style={styles.badge} accessibilityLabel={`quantity-${qty}`}>\
          <Text style={styles.badgeText}>{qty}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 12, right: 12 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.11,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    backgroundColor: colors.black,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
});

export default React.memo(AddCartButton);