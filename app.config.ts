import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    'expo-video',
    'expo-audio',
  ],
  extra: {
    ...(config.extra ?? {}),
    // Support both prefixed (EXPO_PUBLIC_) and legacy env variable names
    SHOPIFY_DOMAIN:
      process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN ?? process.env.SHOPIFY_DOMAIN,
    SHOPIFY_API_VERSION:
      process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION ?? process.env.SHOPIFY_API_VERSION,
    SHOPIFY_TOKEN:
      process.env.EXPO_PUBLIC_SHOPIFY_TOKEN ?? process.env.SHOPIFY_TOKEN,
    SHOPIFY_ADMIN_TOKEN:
      process.env.EXPO_PUBLIC_SHOPIFY_ADMIN_TOKEN ?? process.env.SHOPIFY_ADMIN_TOKEN,
    GOOGLE_PLACES_API_KEY:
      process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY,
    FIREBASE_API_KEY:
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID:
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? process.env.FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ??
      process.env.FIREBASE_MEASUREMENT_ID,
  },
});