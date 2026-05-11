import '@testing-library/jest-native/extend-expect';

// Mock expo-secure-store (used by storage util)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router navigation primitives
// useRouter returns a stable singleton object within the factory closure so
// that getMockRouter() and any hook under test share the same instance.
// This makes assertions on router methods (push, replace, etc.) work correctly.
jest.mock('expo-router', () => {
  const routerSingleton = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  };
  return {
    useRouter: jest.fn(() => routerSingleton),
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    Link: jest.fn(({ children }: { children: unknown }) => children),
    Redirect: jest.fn(() => null),
    Stack: { Screen: jest.fn(() => null) },
    Tabs: { Screen: jest.fn(() => null) },
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ params: {} })),
  useFocusEffect: jest.fn(),
}));

// Silence the React Native LogBox in test output
jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
  ignoreLogs: jest.fn(),
  ignoreAllLogs: jest.fn(),
}));
