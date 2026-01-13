"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContextType, AuthState } from '@/lib/types/auth';
import { authService } from '@/lib/services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const login = useCallback(async (googleToken: string, isAccessToken = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const { token } = await authService.exchangeGoogleToken(googleToken, isAccessToken);
      localStorage.setItem('auth_token', token);
      
      // Fetch user data after successful token exchange
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
        error: error instanceof Error ? error.message : 'Login failed',
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await authService.logout();
      
      // Clear learning settings from localStorage on logout
      const userKey = state.user?.sub || state.user?.email
      if (userKey) {
        const storageKey = `learning_settings:${userKey}`
        try {
          localStorage.removeItem(storageKey)
        } catch {
          // ignore localStorage errors
        }
      }
      
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
  }, [state.user]);

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
    const initializeAuth = async () => {
      // Check current authentication status
      try {
        await refreshAuth();
      } catch (error) {
        console.warn('Failed to initialize auth (backend may not be running):', error);
        // Set loading to false even if auth check fails
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - refreshAuth is stable and doesn't need to be in deps

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
