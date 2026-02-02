import Constants from 'expo-constants';

type ShopifyConfig = {
  domain: string;
  apiVersion: string;
  token: string;
  endpoint: string;
  testProductHandle?: string;
};

const extra = Constants.expoConfig?.extra ?? {};
const devEnv = __DEV__ ? process.env : {};

const apiVersionPathMatch = /\/api\/([^/]+)\/graphql\.json/i;

function normalizeDomainInput(input?: string) {
  if (!input) {
    return { domain: undefined, apiVersion: undefined };
  }

  const trimmed = input.trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  const [hostAndPath] = withoutProtocol.split('?');
  const [host] = hostAndPath.split('/');
  const apiMatch = hostAndPath.match(apiVersionPathMatch);
  const apiVersion = apiMatch?.[1];

  return { domain: host || undefined, apiVersion };
}

export function getShopifyConfig(): ShopifyConfig {
  const rawDomain =
    (extra?.SHOPIFY_STOREFRONT_DOMAIN as string | undefined) ??
    (extra?.SHOPIFY_DOMAIN as string | undefined) ??
    devEnv.EXPO_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN ??
    devEnv.EXPO_PUBLIC_SHOPIFY_DOMAIN ??
    devEnv.SHOPIFY_STOREFRONT_DOMAIN ??
    devEnv.SHOPIFY_DOMAIN;
  const apiVersion =
    (extra?.SHOPIFY_API_VERSION as string | undefined) ??
    devEnv.EXPO_PUBLIC_SHOPIFY_API_VERSION ??
    devEnv.SHOPIFY_API_VERSION;
  const token =
    (extra?.SHOPIFY_STOREFRONT_TOKEN as string | undefined) ??
    devEnv.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ??
    devEnv.SHOPIFY_STOREFRONT_TOKEN ??
    devEnv.SHOPIFY_TOKEN;
  const testProductHandle =
    (extra?.SHOPIFY_TEST_PRODUCT_HANDLE as string | undefined) ??
    devEnv.EXPO_PUBLIC_SHOPIFY_TEST_PRODUCT_HANDLE;

  const normalizedInput = normalizeDomainInput(rawDomain);
  const domain = normalizedInput.domain;
  const resolvedApiVersion = apiVersion ?? normalizedInput.apiVersion;

  const missing: string[] = [];
  if (!domain) missing.push('EXPO_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN');
  if (!resolvedApiVersion) missing.push('EXPO_PUBLIC_SHOPIFY_API_VERSION');
  if (!token) missing.push('EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN');

  if (missing.length) {
    throw new Error(`Shopify configuration missing: ${missing.join(', ')}`);
  }

  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apiVersionValue = resolvedApiVersion ?? '';
  const endpoint = `https://${normalizedDomain}/api/${apiVersionValue}/graphql.json`;

  return {
    domain: normalizedDomain,
    apiVersion: apiVersionValue,
    token,
    endpoint,
    testProductHandle,
  };
}
