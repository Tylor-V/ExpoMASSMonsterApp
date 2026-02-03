import Constants from 'expo-constants';

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

function getProcessEnvExtra(): ExpoExtra {
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }
  return Object.keys(process.env).reduce<ExpoExtra>((acc, key) => {
    if (key.startsWith('EXPO_PUBLIC_')) {
      acc[key] = process.env[key];
    }
    return acc;
  }, {});
}

// Access configuration values provided via app.config.ts/.env and runtime EXPO_PUBLIC_ vars.
export const env = {
  ...getExpoExtra(),
  ...getProcessEnvExtra(),
};

export default env;
