import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    SHOPIFY_DOMAIN: process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN,
    SHOPIFY_API_VERSION: process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION,
    SHOPIFY_TOKEN: process.env.EXPO_PUBLIC_SHOPIFY_TOKEN,
    GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
  },
});