module.exports = function (api) {
  api.cache(true);

  const plugins = [
    // React Native Worklets now hosts Reanimated's Babel plugin.
    'react-native-worklets/plugin',
  ];

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
