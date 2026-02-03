import Constants from 'expo-constants';

type ShopifyConfig = {
  domain: string;
  apiVersion: string;
  token: string;
  endpoint: string;
  testProductHandle?: string;
};

type ExpoExtra = Record<string, unknown>;

function getExpoExtra(): ExpoExtra {
  const manifest2 = (Constants as { manifest2?: { extra?: ExpoExtra } }).manifest2;
  const expoClientExtra = (manifest2?.extra as { expoClient?: { extra?: ExpoExtra } } | undefined)
    ?.expoClient?.extra;

  return (
    Constants.expoConfig?.extra ??
    expoClientExtra ??
    manifest2?.extra ??
    (Constants.manifest as { extra?: ExpoExtra } | undefined)?.extra ??
    {}
  );
}

const extra = getExpoExtra();

const apiVersionPathMatch = /\/api\/([^/]+)\/graphql\.json/i;
const REQUIRED_KEYS = [
  'EXPO_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN',
  'EXPO_PUBLIC_SHOPIFY_API_VERSION',
  'EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN',
];

export const SHOPIFY_CONFIG_ERROR_NAME = 'ShopifyConfigError';

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

export function createShopifyConfigError(missing: string[]): Error {
  const message = missing.length
    ? `Shopify configuration missing: ${missing.join(', ')}`
    : 'Shopify configuration missing.';
  const error = new Error(message);
  error.name = SHOPIFY_CONFIG_ERROR_NAME;
  return error;
}

export function isShopifyConfigError(error: unknown): boolean {
  return error instanceof Error && error.name === SHOPIFY_CONFIG_ERROR_NAME;
}

export function getShopifyConfigStatus(): { config: ShopifyConfig | null; missing: string[] } {
  const rawDomain = extra?.EXPO_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN as string | undefined;
  const apiVersion = extra?.EXPO_PUBLIC_SHOPIFY_API_VERSION as string | undefined;
  const token = extra?.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN as string | undefined;
  const testProductHandle = extra?.EXPO_PUBLIC_SHOPIFY_TEST_PRODUCT_HANDLE as string | undefined;

  const normalizedInput = normalizeDomainInput(rawDomain);
  const domain = normalizedInput.domain;
  const resolvedApiVersion = apiVersion ?? normalizedInput.apiVersion;

  const missing: string[] = [];
  if (!domain) missing.push(REQUIRED_KEYS[0]);
  if (!resolvedApiVersion) missing.push(REQUIRED_KEYS[1]);
  if (!token) missing.push(REQUIRED_KEYS[2]);

  if (missing.length) {
    return { config: null, missing };
  }

  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apiVersionValue = resolvedApiVersion ?? '';
  const endpoint = `https://${normalizedDomain}/api/${apiVersionValue}/graphql.json`;

  return {
    config: {
      domain: normalizedDomain,
      apiVersion: apiVersionValue,
      token,
      endpoint,
      testProductHandle,
    },
    missing: [],
  };
}

export function getShopifyConfig(): ShopifyConfig {
  const { config, missing } = getShopifyConfigStatus();
  if (!config) {
    throw createShopifyConfigError(missing);
  }
  return config;
}
