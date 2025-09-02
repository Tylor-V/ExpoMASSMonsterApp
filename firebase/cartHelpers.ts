import { firestore } from './firebase';
import { auth } from './firebase';

export type CartItem = {
  id: string;
  title: string;
  price: number;
  image?: string;
  variantId?: string;
  variantTitle?: string;
  quantity: number;
  /** UID of the user who owns this cart item */
  userId?: string;
};

export function sanitizeId(id: string) {
  return id.replace(/[/\\]/g, '_');
}

function cartCollection() {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No user logged in');
  return firestore().collection('users').doc(uid).collection('cart');
}

export async function addToCart(item: CartItem) {
  const sid = sanitizeId(item.id);
  const docWrapper = cartCollection().doc(sid);
  const docRef = docWrapper.ref;
  const uid = auth().currentUser?.uid;
  await firestore().runTransaction(async tx => {
    const doc = await tx.get(docRef);
    const qty = doc.exists ? (doc.data()?.quantity || 0) + item.quantity : item.quantity;
    tx.set(docRef, { ...item, id: sid, userId: uid, quantity: qty }, { merge: true });
  });
}

export async function updateCartItem(id: string, quantity: number) {
  const sid = sanitizeId(id);
  const ref = cartCollection().doc(sid);
  if (quantity <= 0) {
    await ref.delete();
  } else {
    const uid = auth().currentUser?.uid;
    await ref.set({ quantity, userId: uid }, { merge: true });
  }
}

export async function removeCartItem(id: string) {
  await cartCollection().doc(sanitizeId(id)).delete();
}