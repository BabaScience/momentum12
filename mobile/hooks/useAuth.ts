import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store';
import { setCredentials, logout as logoutAction } from '../store/authSlice';
import { useLoginMutation, useRegisterMutation, useLogoutMutation } from '../store/api';
import { secureStorage, appStorage } from '../services/storage';
import type { User } from '../types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password }).unwrap();

      if (result.success && result.data) {
        await secureStorage.setTokens(
          result.data.accessToken,
          result.data.refreshToken
        );
        await appStorage.setUser(result.data.user);
        dispatch(setCredentials({ user: result.data.user }));
        return result.data.user;
      }

      throw new Error(result.message || 'Login failed');
    },
    [loginMutation, dispatch]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await registerMutation({
        email,
        password,
        displayName,
      }).unwrap();

      if (result.success && result.data) {
        await secureStorage.setTokens(
          result.data.accessToken,
          result.data.refreshToken
        );
        await appStorage.setUser(result.data.user);
        dispatch(setCredentials({ user: result.data.user }));
        return result.data.user;
      }

      throw new Error(result.message || 'Registration failed');
    },
    [registerMutation, dispatch]
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      await logoutMutation({ refreshToken: refreshToken || undefined }).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await secureStorage.clearTokens();
      await appStorage.clear();
      dispatch(logoutAction());
      router.replace('/(auth)/login');
    }
  }, [logoutMutation, dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || isLoginLoading || isRegisterLoading,
    isInitialized,
    login,
    register,
    logout,
  };
}

