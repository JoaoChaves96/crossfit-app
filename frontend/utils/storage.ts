import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage abstraction layer.
 * Uses expo-secure-store on native, in-memory fallback on web.
 */

const memoryStore: Record<string, string> = {};

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryStore[key] = value;
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return memoryStore[key] ?? null;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      delete memoryStore[key];
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
