const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.afterEnv.js',
    '<rootDir>/jest.setup.js',
  ],
  // Ensure Jest exits cleanly after all tests complete. This prevents
  // open handle warnings during CI or local runs.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|@react-native-community|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-device-info|react-native-video|@expo|expo(?:(-|/)|$))',
  ],
  moduleNameMapper: {
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^react-native-screens$': '<rootDir>/__mocks__/react-native-screens.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^react-native-vector-icons$': '<rootDir>/__mocks__/react-native-vector-icons.js',
    '^react-native-video$': '<rootDir>/__mocks__/react-native-video.js',
    '^@react-native-community/geolocation$': '<rootDir>/__mocks__/react-native-community-geolocation.js',
    '^@react-native-community/datetimepicker$': '<rootDir>/__mocks__/react-native-community-datetimepicker.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/react-native-community-netinfo.js',
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.js',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^@env$': '<rootDir>/__mocks__/env.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-image$': '<rootDir>/__mocks__/expo-image.js',
    '\\.(png|jpg|jpeg|gif)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
