import { useEffect, useState } from 'react';
import { getShopifyConfig } from '../src/lib/shopify/config';
import { htmlToText } from '../utils/htmlToText';

async function shopifyFetch(query: string, variables?: Record<string, any>) {
  const config = getShopifyConfig();
  const { endpoint, token } = config;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      console.error('Shopify request failed with status', res.status);
      return null;
    }
    const json = await res.json();
    if (json.errors) {
      console.error('Shopify returned errors', json.errors);
      return null;
    }
    return json.data;
  } catch (error) {
    console.error('Shopify request failed', error);
    return null;
  }
}

export function useShopifyCollections() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await shopifyFetch(
          `query collections { collections(first: 20) { edges { node { id title } } } }`,
        );
        if (!cancelled) {
          if (data) {
            const edges = data.collections?.edges ?? [];
            const list = edges.map((e: any) => e.node);
            setCollections(list);
            setError(false);
          } else {
            setCollections([]);
            setError(true);
          }
        }
      } catch {
        if (!cancelled) {
          setCollections([]);
          setError(true);
        }
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { collections, loading, error };
}

export function useShopifyProducts(collectionId?: string) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const fragment = `
  id
  title
  descriptionHtml
  availableForSale
  images(first:5){edges{node{url}}}
  priceRange{minVariantPrice{amount}}
  collections(first:5){edges{node{id title}}}
  variants(first:1){edges{node{id title availableForSale}}}
`;
        let data;
        if (!collectionId || collectionId === 'all') {
          data = await shopifyFetch(
            `query products { products(first: 20) { edges { node { ${fragment} } } } }`,
          );
          if (data) data = data.products.edges.map((e: any) => e.node);
        } else {
          const res = await shopifyFetch(
            `query collectionProducts($id: ID!) { collection(id:$id) { products(first:20){ edges{ node{ ${fragment} } } } } }`,
            { id: collectionId },
          );
          if (res?.collection?.products?.edges) {
            data = res.collection.products.edges.map((e: any) => e.node);
          }
        }
        if (!cancelled) {
          if (data) {
            const list = (data as any[]).map(node => ({
              ...node,
              description: htmlToText(node.descriptionHtml),
              descriptionHtml: node.descriptionHtml,
              images:
                node.images?.edges
                  ?.map((edge: any) => edge?.node?.url)
                  .filter((url: string | undefined) => Boolean(url)) ?? [],
              collections: node.collections?.edges?.map((edge: any) => edge.node) ?? [],
              variantId: node.variants?.edges?.[0]?.node?.id,
              variantTitle: node.variants?.edges?.[0]?.node?.title,
              availableForSale: node.availableForSale,
              variantAvailable: node.variants?.edges?.[0]?.node?.availableForSale,
            }));
            setProducts(list);
            setError(false);
          } else {
            setProducts([]);
            setError(true);
          }
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setError(true);
        }
      }
      if (!cancelled) setLoading(false);
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
  const created = await shopifyFetch(
    `mutation cartCreate { cartCreate(input: {}) { cart { id checkoutUrl } userErrors { field message } } }`,
  );
  const cartId = created?.cartCreate?.cart?.id;
  if (!cartId || created?.cartCreate?.userErrors?.length) {
    console.error('Shopify cartCreate failed', created?.cartCreate?.userErrors);
    return null;
  }
  const added = await shopifyFetch(
    `mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }`,
    { cartId, lines },
  );
  if (added?.cartLinesAdd?.userErrors?.length) {
    console.error('Shopify cartLinesAdd failed', added?.cartLinesAdd?.userErrors);
    return null;
  }
  return added?.cartLinesAdd?.cart?.checkoutUrl ?? null;
}

export { shopifyFetch };
