"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthContextType, AuthState } from '@/lib/types/auth';
import { authService } from '@/lib/services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_INIT_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const hasInitializedRef = useRef(false);
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearLearningSettingsForUser = useCallback((userKey?: string | null) => {
    if (!userKey) {
      return;
    }

    const storageKey = `learning_settings:${userKey}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const login = useCallback(async (googleCode: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
      });

      const { user } = await authService.exchangeGoogleCode(googleCode);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await authService.logout();
      clearLearningSettingsForUser(state.user?.sub || state.user?.email);
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }));
    }
  }, [clearLearningSettingsForUser, state.user]);

  const refreshAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const user = await authService.getCurrentUser();
      
      setState({
        user,
        isAuthenticated: user !== null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh authentication',
      }));
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    const initializeAuth = async () => {
      if (!authService.hasToken()) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      const cachedUser = authService.getStoredUser();
      if (cachedUser) {
        setState({
          user: cachedUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        void authService.revalidateCurrentUser().then((result) => {
          if (result.status === 'valid') {
            setState(prev => {
              if (!prev.isAuthenticated) {
                return prev;
              }

              if (
                prev.user?.sub === result.user.sub &&
                prev.user?.email === result.user.email &&
                prev.user?.name === result.user.name &&
                prev.error === null
              ) {
                return prev;
              }

              return {
                ...prev,
                user: result.user,
                error: null,
              };
            });
            return;
          }

          if (result.status === 'invalid') {
            clearLearningSettingsForUser(cachedUser.sub || cachedUser.email);
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        });
        return;
      }

      const user = await withTimeout(
        authService.getCurrentUser({ force: true }).catch((error) => {
          console.warn('Failed to initialize auth (backend may not be running):', error);
          return null;
        }),
        AUTH_INIT_TIMEOUT_MS,
        null,
      );

      setState({
        user,
        isAuthenticated: user !== null,
        isLoading: false,
        error: null,
      });
    };

    initializeAuth();
  }, [clearLearningSettingsForUser]); // initialization is explicitly guarded by ref

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
