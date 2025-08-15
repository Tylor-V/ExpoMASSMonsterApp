import { useEffect, useState } from 'react';
import { htmlToText } from '../utils/htmlToText';
import { SHOPIFY_DOMAIN, SHOPIFY_API_VERSION, SHOPIFY_TOKEN } from '@env';

function getConfig() {
  return {
    domain: SHOPIFY_DOMAIN,
    version: SHOPIFY_API_VERSION || '2024-01',
    token: SHOPIFY_TOKEN,
  };
}

function buildShopifyUrl() {
  const { domain, version } = getConfig();
  // Allow SHOPIFY_DOMAIN to be either the full GraphQL endpoint or the base domain
  return domain.includes('graphql.json')
    ? domain
    : `${domain}/api/${version}/graphql.json`;
}

async function shopifyFetch(query: string, variables?: Record<string, any>) {
  const { token, domain } = getConfig();
  if (!domain || !token) {
    console.error('Shopify configuration missing');
    return null;
  }
  const res = await fetch(buildShopifyUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
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
          if (res) data = res.collection.products.edges.map((e: any) => e.node);
        }
        if (!cancelled) {
          if (data) {
            const list = (data as any[]).map(node => ({
              ...node,
              description: htmlToText(node.descriptionHtml),
              descriptionHtml: node.descriptionHtml,
              images: node.images?.edges?.map((edge: any) => edge.node) ?? [],
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
  const lineItems = items.map(i => ({
    variantId: i.variantId || i.id,
    quantity: i.quantity,
  }));
  const data = await shopifyFetch(
    `mutation checkoutCreate($lineItems:[CheckoutLineItemInput!]!){checkoutCreate(input:{lineItems:$lineItems}){checkout{webUrl}}}`,
    { lineItems },
  );
  return data?.checkoutCreate?.checkout?.webUrl ?? null;
}