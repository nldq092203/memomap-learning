import { useAuth as useAuthContext } from '@/lib/contexts/auth-context';

/**
 * Main authentication hook that provides all auth functionality
 */
export const useAuth = useAuthContext;

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * Hook to get current user
 */
export const useCurrentUser = () => {
  const { user } = useAuth();
  return user;
};

/**
 * Hook to check if auth is loading
 */
export const useAuthLoading = (): boolean => {
  const { isLoading } = useAuth();
  return isLoading;
};

/**
 * Hook to get auth error
 */
export const useAuthError = (): string | null => {
  const { error } = useAuth();
  return error;
};

/**
 * Hook for login functionality
 */
export const useLogin = () => {
  const { login, isLoading, error } = useAuth();
  return { login, isLoading, error };
};

/**
 * Hook for logout functionality
 */
export const useLogout = () => {
  const { logout, isLoading, error } = useAuth();
  return { logout, isLoading, error };
};
