import 'dotenv/config';
import { ConfigContext, ExpoConfig } from 'expo/config';
import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';

const IOS_LOCATION_WHEN_IN_USE_COPY =
  'MASS Monster uses your location only while you check in to verify you are at your selected gym.';
const IOS_PHOTO_LIBRARY_COPY =
  'MASS Monster needs photo library access so you can upload profile photos and gym videos.';
const IOS_PHOTO_SAVE_COPY =
  'MASS Monster can save selected media for your profile and workout posts when you choose to share them.';
const IOS_CAMERA_COPY =
  'MASS Monster uses camera access when you choose to capture profile or workout media.';
const IOS_MICROPHONE_COPY =
  'MASS Monster uses microphone access when you record workout videos with audio.';

const withIosComplianceCopy: ConfigPlugin = config =>
  withInfoPlist(config, configWithPlist => {
    configWithPlist.modResults.NSLocationWhenInUseUsageDescription = IOS_LOCATION_WHEN_IN_USE_COPY;
    configWithPlist.modResults.NSPhotoLibraryUsageDescription = IOS_PHOTO_LIBRARY_COPY;
    configWithPlist.modResults.NSPhotoLibraryAddUsageDescription = IOS_PHOTO_SAVE_COPY;
    configWithPlist.modResults.NSCameraUsageDescription = IOS_CAMERA_COPY;
    configWithPlist.modResults.NSMicrophoneUsageDescription = IOS_MICROPHONE_COPY;

    // Keep iOS networking policy strict for App Store review.
    configWithPlist.modResults.NSAppTransportSecurity = {
      ...(configWithPlist.modResults.NSAppTransportSecurity ?? {}),
      NSAllowsArbitraryLoads: false,
    };

    // Foreground-only location posture: remove always-location permission keys.
    delete configWithPlist.modResults.NSLocationAlwaysAndWhenInUseUsageDescription;
    delete configWithPlist.modResults.NSLocationAlwaysUsageDescription;

    return configWithPlist;
  });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    ...(config.android ?? {}),
    package: config.android?.package ?? 'com.expomassmonster.app',
  },
  plugins: [
    ...(config.plugins || []),
    [
      'expo-location',
      {
        locationWhenInUsePermission: IOS_LOCATION_WHEN_IN_USE_COPY,
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: IOS_PHOTO_LIBRARY_COPY,
        cameraPermission: IOS_CAMERA_COPY,
      },
    ],
    'expo-video',
    'expo-audio',
    'expo-asset',
    'expo-font',
    'expo-web-browser',
    'expo-notifications',
    withIosComplianceCopy,
  ],
  extra: {
    ...(config.extra ?? {}),
    EXPO_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN:
      process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_DOMAIN ??
      process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN ??
      process.env.SHOPIFY_STOREFRONT_DOMAIN ??
      process.env.SHOPIFY_DOMAIN,
    EXPO_PUBLIC_SHOPIFY_API_VERSION:
      process.env.EXPO_PUBLIC_SHOPIFY_API_VERSION ?? process.env.SHOPIFY_API_VERSION,
    EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN:
      process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN ??
      process.env.SHOPIFY_STOREFRONT_TOKEN ??
      process.env.SHOPIFY_TOKEN,
    EXPO_PUBLIC_SHOPIFY_TEST_PRODUCT_HANDLE:
      process.env.EXPO_PUBLIC_SHOPIFY_TEST_PRODUCT_HANDLE,
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
