import React, { createContext, useContext, useEffect, useState } from 'react';
import { firestore } from '../firebase/firebase';
import { auth } from '../firebase/firebase';
import { CartItem } from '../firebase/cartHelpers';

type CartState = {
  items: CartItem[];
  loading: boolean;
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
};

const CartContext = createContext<CartState>({
  items: [],
  loading: true,
  setItems: () => {},
});

export function CartProvider({ children }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubCart: (() => void) | undefined;
    const unsubAuth = auth().onAuthStateChanged(firebaseUser => {
      unsubCart?.();

      if (firebaseUser) {
        setLoading(true);
        const uid = firebaseUser.uid;
        unsubCart = firestore()
          .collection('users')
          .doc(uid)
          .collection('cart')
          .onSnapshot(
            snap => {
              const list = snap.docs.map(d => ({
                id: d.id,
                ...(d.data() as any),
              }));
              setItems(list);
              setLoading(false);
            },
            () => {
              setItems([]);
              setLoading(false);
            },
          );
      } else {
        setItems([]);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubCart?.();
    };
  }, []);

  return (
    <CartContext.Provider value={{ items, loading, setItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}