import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store';
import { setCredentials, setInitialized } from '../store/authSlice';
import { secureStorage, appStorage } from '../services/storage';
import { colors } from '../theme';
import type { User } from '../types';

export default function Index() {
  const dispatch = useAppDispatch();
  const { isInitialized, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing tokens
        const tokens = await secureStorage.getTokens();
        const cachedUser = await appStorage.getUser<User>();

        if (tokens?.accessToken && cachedUser) {
          dispatch(setCredentials({ user: cachedUser }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        dispatch(setInitialized(true));
      }
    };

    initializeAuth();
  }, [dispatch]);

  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isInitialized, isAuthenticated]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
  },
});

