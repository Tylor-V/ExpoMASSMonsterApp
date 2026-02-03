import { getShopifyConfig } from './config';

type ShopifyError = {
  message: string;
  extensions?: Record<string, unknown>;
};

export type Money = {
  amount: string;
  currencyCode: string;
};

export type StorefrontImage = {
  url: string;
  altText?: string | null;
};

export type StorefrontVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
};

export type StorefrontCollectionRef = {
  id: string;
  title: string;
  handle: string;
};

export type StorefrontProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  availableForSale: boolean;
  featuredImage?: StorefrontImage | null;
  images: StorefrontImage[];
  priceRange: {
    minVariantPrice: Money;
  };
  variants: StorefrontVariant[];
  collections: StorefrontCollectionRef[];
};

const DEFAULT_MONEY: Money = { amount: '0', currencyCode: 'USD' };

const PRODUCT_FRAGMENT = `
  id
  handle
  title
  description
  descriptionHtml
  vendor
  productType
  availableForSale
  featuredImage { url altText }
  images(first: 10) { edges { node { url altText } } }
  priceRange { minVariantPrice { amount currencyCode } }
  variants(first: 10) { edges { node { id title availableForSale price { amount currencyCode } } } }
  collections(first: 5) { edges { node { id title handle } } }
`;

function normalizeMoney(value?: Money | null): Money {
  if (!value?.amount || !value?.currencyCode) {
    return DEFAULT_MONEY;
  }
  return value;
}

function normalizeImages(node: any): StorefrontImage[] {
  const images =
    node?.images?.edges
      ?.map((edge: any) => edge?.node)
      .filter((image: StorefrontImage | undefined) => Boolean(image?.url)) ?? [];
  if (images.length > 0) {
    return images;
  }
  if (node?.featuredImage?.url) {
    return [node.featuredImage];
  }
  return [];
}

function normalizeVariants(node: any, fallbackPrice: Money): StorefrontVariant[] {
  const variants =
    node?.variants?.edges?.map((edge: any) => edge?.node).filter(Boolean) ?? [];
  return variants.map((variant: StorefrontVariant) => ({
    ...variant,
    price: normalizeMoney(variant?.price ?? fallbackPrice),
    availableForSale: Boolean(variant?.availableForSale),
    title: variant?.title ?? '',
    id: variant?.id ?? '',
  }));
}

function normalizeProduct(node: any): StorefrontProduct {
  const collections =
    node?.collections?.edges?.map((edge: any) => edge?.node).filter(Boolean) ?? [];
  const fallbackPrice =
    node?.priceRange?.minVariantPrice ?? node?.variants?.edges?.[0]?.node?.price ?? DEFAULT_MONEY;
  const images = normalizeImages(node);
  const variants = normalizeVariants(node, normalizeMoney(fallbackPrice));
  const featuredImage = node?.featuredImage?.url ? node.featuredImage : images[0] ?? null;
  return {
    id: node?.id ?? '',
    handle: node?.handle ?? '',
    title: node?.title ?? '',
    description: node?.description ?? '',
    descriptionHtml: node?.descriptionHtml ?? '',
    vendor: node?.vendor ?? '',
    productType: node?.productType ?? '',
    availableForSale: Boolean(node?.availableForSale),
    featuredImage,
    images,
    priceRange: {
      minVariantPrice: normalizeMoney(node?.priceRange?.minVariantPrice ?? fallbackPrice),
    },
    variants,
    collections,
  };
}

export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  const config = getShopifyConfig();
  const { endpoint, token } = config;
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
    const body = await res.text();
    throw new Error(`Shopify request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data?: T; errors?: ShopifyError[] };
  if (json.errors?.length) {
    const message = json.errors.map(error => error.message).join(' | ');
    throw new Error(`Shopify GraphQL error: ${message}`);
  }
  if (!json.data) {
    throw new Error('Shopify response missing data.');
  }
  return json.data;
}

export async function fetchProductsPage({
  first = 20,
  after,
}: {
  first?: number;
  after?: string | null;
} = {}): Promise<{ products: StorefrontProduct[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } }> {
  const data = await shopifyFetch<{
    products: {
      edges: { node: StorefrontProduct }[];
      pageInfo: { hasNextPage: boolean; endCursor?: string | null };
    };
  }>(
    `query products($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges { node { ${PRODUCT_FRAGMENT} } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { first, after },
  );

  const products = data.products?.edges?.map(edge => normalizeProduct(edge.node)) ?? [];
  return { products, pageInfo: data.products?.pageInfo ?? { hasNextPage: false } };
}

export async function fetchCollections(): Promise<StorefrontCollectionRef[]> {
  const data = await shopifyFetch<{
    collections: { edges: { node: StorefrontCollectionRef }[] };
  }>(`query collections { collections(first: 20) { edges { node { id title handle } } } }`);

  const edges = data.collections?.edges ?? [];
  return edges
    .map(edge => edge.node)
    .filter(collection => Boolean(collection?.id));
}

export async function fetchCollectionProductsPage({
  collectionId,
  first = 20,
  after,
}: {
  collectionId: string;
  first?: number;
  after?: string | null;
}): Promise<{ products: StorefrontProduct[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } }> {
  const data = await shopifyFetch<{
    collection: {
      products: {
        edges: { node: StorefrontProduct }[];
        pageInfo: { hasNextPage: boolean; endCursor?: string | null };
      };
    } | null;
  }>(
    `query collectionProducts($id: ID!, $first: Int!, $after: String) {
      collection(id: $id) {
        products(first: $first, after: $after) {
          edges { node { ${PRODUCT_FRAGMENT} } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,
    { id: collectionId, first, after },
  );

  const products =
    data.collection?.products?.edges?.map(edge => normalizeProduct(edge.node)) ?? [];
  return {
    products,
    pageInfo: data.collection?.products?.pageInfo ?? { hasNextPage: false },
  };
}

export async function fetchProductByHandle(handle: string): Promise<StorefrontProduct | null> {
  const data = await shopifyFetch<{ productByHandle: StorefrontProduct | null }>(
    `query productByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        ${PRODUCT_FRAGMENT}
      }
    }`,
    { handle },
  );

  if (!data.productByHandle) return null;
  return normalizeProduct(data.productByHandle);
}
