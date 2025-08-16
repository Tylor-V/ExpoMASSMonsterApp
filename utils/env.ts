import Constants from 'expo-constants';

// Access configuration values provided via app.config.ts and .env
export const env = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};

export default env;