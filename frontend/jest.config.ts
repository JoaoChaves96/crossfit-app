import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  moduleNameMapper: {
    // Prevent the Expo winter ESM-only runtime from loading in Jest (CJS environment)
    '^expo/src/winter$': '<rootDir>/__mocks__/expo-winter.js',
    '^expo/src/winter/runtime(\\.native)?$': '<rootDir>/__mocks__/expo-winter.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
};

export default config;
