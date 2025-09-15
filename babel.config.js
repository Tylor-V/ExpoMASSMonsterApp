module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated's Babel plugin has moved to the react-native-worklets package
    plugins: ['react-native-worklets/plugin'],
  };
};