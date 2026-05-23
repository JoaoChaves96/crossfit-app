/**
 * Mock navigation objects for components and hooks that call
 * useRouter (expo-router) or useNavigation (@react-navigation/native).
 *
 * These are automatically applied via the jest.mock() calls in jest-setup.ts.
 * Import this file when you need to assert against the mocked functions.
 *
 * Usage:
 *   import { getMockRouter } from '@/test-utils/mock-navigation';
 *   const router = getMockRouter();
 *   expect(router.push).toHaveBeenCalledWith('/some-route');
 */

import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

export function getMockRouter() {
  return useRouter() as unknown as {
    push: jest.Mock;
    replace: jest.Mock;
    back: jest.Mock;
    navigate: jest.Mock;
  };
}

export function getMockNavigation() {
  return useNavigation() as unknown as {
    navigate: jest.Mock;
    goBack: jest.Mock;
    setOptions: jest.Mock;
  };
}
