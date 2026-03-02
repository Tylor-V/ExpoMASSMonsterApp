import { useEffect, useState } from 'react';
import {
  fetchCollectionProductsPage,
  fetchCollections,
  fetchProductsPage,
  isAbortError,
  shopifyFetch,
  type StorefrontProduct,
} from '../src/lib/shopify/storefrontClient';
import {
  createShopifyConfigError,
  getShopifyConfigStatus,
  isShopifyConfigError,
} from '../src/lib/shopify/config';
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
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const { config, missing } = getShopifyConfigStatus();
        if (!config) {
          const error = createShopifyConfigError(missing);
          if (!cancelled) {
            setCollections([]);
            setError(error);
          }
          return;
        }
        const data = await fetchCollections({ signal: controller.signal });
        if (!cancelled) {
          const list = data.map(collection => ({
            id: collection.id,
            title: collection.title,
          }));
          setCollections(list);
          setError(null);
        }
      } catch (error) {
        if (cancelled) return;
        if (isAbortError(error)) {
          setCollections([]);
          setError(error instanceof Error ? error : new Error('Shopify request canceled.'));
          return;
        }
        if (!isShopifyConfigError(error)) {
          console.error('Failed to load Shopify collections', error);
        }
        setCollections([]);
        setError(
          error instanceof Error ? error : new Error('Unable to load collections.'),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { collections, loading, error };
}

export function useShopifyProducts(
  collectionId?: string,
  options: { enabled?: boolean } = {},
) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      if (!enabled) {
        if (!cancelled) {
          setProducts([]);
          setLoading(false);
          setError(null);
        }
        return;
      }
      setLoading(true);
      try {
        const { config, missing } = getShopifyConfigStatus();
        if (!config) {
          const error = createShopifyConfigError(missing);
          if (!cancelled) {
            setProducts([]);
            setError(error);
          }
          return;
        }
        let nodes: StorefrontProduct[] = [];
        if (!collectionId || collectionId === 'all') {
          const res = await fetchProductsPage({ first: 20 }, { signal: controller.signal });
          nodes = res.products;
        } else {
          const res = await fetchCollectionProductsPage(
            { collectionId, first: 20 },
            { signal: controller.signal },
          );
          nodes = res.products;
        }
        if (!cancelled) {
          const list = nodes.map(mapProduct);
          setProducts(list);
          setError(null);
        }
      } catch (error) {
        if (cancelled) return;
        if (isAbortError(error)) {
          setProducts([]);
          setError(error instanceof Error ? error : new Error('Shopify request canceled.'));
          return;
        }
        if (!isShopifyConfigError(error)) {
          console.error('Failed to load Shopify products', error);
        }
        setProducts([]);
        setError(error instanceof Error ? error : new Error('Unable to load products.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [collectionId, enabled]);

  return { products, loading, error };
}

export async function createShopifyCheckout(
  items: { id: string; quantity: number; variantId?: string }[],
  opts: { discountCode?: string } = {},
): Promise<string | null> {
  const { config, missing } = getShopifyConfigStatus();
  if (!config) {
    throw createShopifyConfigError(missing);
  }
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
  if (created?.cartCreate?.userErrors?.length) {
    console.warn('Shopify cartCreate userErrors', created.cartCreate.userErrors);
  }
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
    console.warn('Shopify cartLinesAdd userErrors', added.cartLinesAdd.userErrors);
    const message =
      added?.cartLinesAdd?.userErrors?.map(error => error.message).join(' | ') ||
      'Unable to add cart lines.';
    throw new Error(message);
  }

  let checkoutUrl = added?.cartLinesAdd?.cart?.checkoutUrl ?? null;
  const discountCode = opts.discountCode?.trim();
  if (discountCode && cartId) {
    const discounted = await shopifyFetch<{
      cartDiscountCodesUpdate: {
        cart: { id: string; checkoutUrl: string | null } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(
      `mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
        cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
          cart { id checkoutUrl }
          userErrors { field message }
        }
      }`,
      { cartId, discountCodes: [discountCode] },
    );
    if (discounted?.cartDiscountCodesUpdate?.userErrors?.length) {
      console.warn(
        'Shopify cartDiscountCodesUpdate userErrors',
        discounted.cartDiscountCodesUpdate.userErrors,
      );
      const message =
        discounted.cartDiscountCodesUpdate.userErrors
          .map(error => error.message)
          .join(' | ') || 'Unable to apply discount code.';
      throw new Error(message);
    }
    checkoutUrl = discounted?.cartDiscountCodesUpdate?.cart?.checkoutUrl ?? checkoutUrl;
  }

  return checkoutUrl;
}

export { shopifyFetch };
