import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage abstraction layer.
 * Uses expo-secure-store on native, localStorage on web.
 * Persists across app reloads and browser refreshes.
 */

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error(`Failed to persist to localStorage: ${key}`, error);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error(`Failed to read from localStorage: ${key}`, error);
        return null;
      }
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove from localStorage: ${key}`, error);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
