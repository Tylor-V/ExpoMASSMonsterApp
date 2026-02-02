import Constants from 'expo-constants';

type ShopifyConfig = {
  domain: string;
  apiVersion: string;
  token: string;
  endpoint: string;
};

const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};

function getEnvValue(key: keyof typeof process.env) {
  return process.env[key] ?? (extra?.[key] as string | undefined);
}

export function getShopifyConfig(): ShopifyConfig {
  const domain = getEnvValue('EXPO_PUBLIC_SHOPIFY_DOMAIN');
  const apiVersion = getEnvValue('EXPO_PUBLIC_SHOPIFY_API_VERSION');
  const token = getEnvValue('EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN');

  const missing: string[] = [];
  if (!domain) missing.push('EXPO_PUBLIC_SHOPIFY_DOMAIN');
  if (!apiVersion) missing.push('EXPO_PUBLIC_SHOPIFY_API_VERSION');
  if (!token) missing.push('EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN');

  if (missing.length) {
    throw new Error(`Shopify configuration missing: ${missing.join(', ')}`);
  }

  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const endpoint = `https://${normalizedDomain}/api/${apiVersion}/graphql.json`;

  return {
    domain: normalizedDomain,
    apiVersion,
    token,
    endpoint,
  };
}
