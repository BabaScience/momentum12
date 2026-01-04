import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys
const AUTH_TOKENS_KEY = 'auth_tokens';
const USER_KEY = 'user';
const STORAGE_PREFIX = '@momentum12:';

// Secure storage for tokens
export const secureStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify({ accessToken, refreshToken }));
  },

  async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    const tokens = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
    if (!tokens) return null;
    return JSON.parse(tokens);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
  },

  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  },

  async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken || null;
  },
};

// AsyncStorage wrapper for app data (works in Expo Go)
export const appStorage = {
  // User data
  async setUser(user: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  async getUser<T>(): Promise<T | null> {
    try {
      const user = await AsyncStorage.getItem(STORAGE_PREFIX + USER_KEY);
      if (!user) return null;
      return JSON.parse(user) as T;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + USER_KEY);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  },

  // Generic key-value
  async setItem(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item:', error);
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_PREFIX + key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + key);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
