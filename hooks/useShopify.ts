import { useEffect, useState } from 'react';
import {
  fetchCollectionProductsPage,
  fetchCollections,
  fetchProductByHandle,
  fetchProductsPage,
  shopifyFetch,
  type StorefrontProduct,
} from '../src/lib/shopify/storefrontClient';
import { htmlToText } from '../utils/htmlToText';

type ShopifyProduct = StorefrontProduct & {
  images: string[];
  collections: { id: string; title: string }[];
  variantId?: string;
  variantTitle?: string;
  variantAvailable?: boolean;
};

function mapProduct(node: StorefrontProduct): ShopifyProduct {
  const images = (node.images ?? []).map(image => image.url).filter(Boolean);
  const firstVariant = node.variants[0];
  return {
    ...node,
    description: htmlToText(node.descriptionHtml || node.description),
    images,
    collections: node.collections.map(collection => ({
      id: collection.id,
      title: collection.title,
    })),
    variantId: firstVariant?.id,
    variantTitle: firstVariant?.title,
    variantAvailable: firstVariant?.availableForSale,
  };
}

export function useShopifyCollections() {
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchCollections();
        if (!cancelled) {
          const list = data.map(collection => ({
            id: collection.id,
            title: collection.title,
          }));
          setCollections(list);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load Shopify collections', error);
        if (!cancelled) {
          setCollections([]);
          setError(error instanceof Error ? error : new Error('Unable to load collections.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { collections, loading, error };
}

export function useShopifyProducts(collectionId?: string) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let nodes: StorefrontProduct[] = [];
        if (!collectionId || collectionId === 'all') {
          const res = await fetchProductsPage({ first: 20 });
          nodes = res.products;
        } else {
          const res = await fetchCollectionProductsPage({ collectionId, first: 20 });
          nodes = res.products;
        }
        if (!cancelled) {
          const list = nodes.map(mapProduct);
          setProducts(list);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load Shopify products', error);
        if (!cancelled) {
          setProducts([]);
          setError(error instanceof Error ? error : new Error('Unable to load products.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  return { products, loading, error };
}

export async function createShopifyCheckout(
  items: { id: string; quantity: number; variantId?: string }[],
): Promise<string | null> {
  const lines = items.map(i => ({
    merchandiseId: i.variantId || i.id,
    quantity: i.quantity,
  }));
  const created = await shopifyFetch<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string | null } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation cartCreate { cartCreate(input: {}) { cart { id checkoutUrl } userErrors { field message } } }`,
  );
  const cartId = created?.cartCreate?.cart?.id;
  if (!cartId || created?.cartCreate?.userErrors?.length) {
    const message =
      created?.cartCreate?.userErrors?.map(error => error.message).join(' | ') ||
      'Unable to create cart.';
    throw new Error(message);
  }
  const added = await shopifyFetch<{
    cartLinesAdd: {
      cart: { id: string; checkoutUrl: string | null } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }`,
    { cartId, lines },
  );
  if (added?.cartLinesAdd?.userErrors?.length) {
    const message =
      added?.cartLinesAdd?.userErrors?.map(error => error.message).join(' | ') ||
      'Unable to add cart lines.';
    throw new Error(message);
  }
  return added?.cartLinesAdd?.cart?.checkoutUrl ?? null;
}

export async function runShopifyRuntimeTest(handle?: string) {
  try {
    const { products } = await fetchProductsPage({ first: 5 });
    if (products.length === 0) {
      console.debug('[Shopify] Runtime test: no products returned.');
    } else {
      console.debug(
        '[Shopify] Runtime test products:',
        products.map(product => product.title),
      );
    }
  } catch (error) {
    console.error('[Shopify] Runtime test products failed', error);
  }

  if (!handle) {
    console.debug('[Shopify] Runtime test skipped handle lookup (no handle configured).');
    return;
  }

  try {
    const product = await fetchProductByHandle(handle);
    if (!product) {
      console.debug(`[Shopify] Runtime test: no product found for handle "${handle}".`);
    } else {
      console.debug(`[Shopify] Runtime test handle "${handle}": ${product.title}`);
    }
  } catch (error) {
    console.error('[Shopify] Runtime test handle fetch failed', error);
  }
}

export { shopifyFetch, fetchProductByHandle };
