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
    // DesktopTopNav marks its active nav item by matching usePathname(); without
    // this, any test rendering a desktop-register screen throws.
    usePathname: jest.fn(() => '/'),
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

// Mock react-native-safe-area-context — tests render screens without the
// app-root <SafeAreaProvider>, so useSafeAreaInsets() would otherwise throw.
// Return zero insets (matches web/no-notch behaviour) and pass-through providers.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    SafeAreaConsumer: ({ children }: { children: (i: typeof inset) => unknown }) =>
      children(inset),
    SafeAreaView: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets: inset, frame },
  };
});

// Silence the React Native LogBox in test output
jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
  ignoreLogs: jest.fn(),
  ignoreAllLogs: jest.fn(),
}));
