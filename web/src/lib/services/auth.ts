import {
  AuthTokenExchangeResponse,
  BackendCurrentUser,
  User,
} from '@/lib/types/auth';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/services/api-client';

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';
const AUTH_USER_STORAGE_KEY = 'auth_user';

export type AuthRevalidationResult =
  | { status: 'valid'; user: User }
  | { status: 'invalid' }
  | { status: 'unreachable' };

export class AuthService {
  private static instance: AuthService;

  constructor() {
    // No need for baseUrl since apiClient handles it
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Exchange Google authorization code for app JWT token.
   */
  async exchangeGoogleCode(code: string): Promise<{ token: string; user: User }> {
    try {
      const response = await apiClient.post<AuthTokenExchangeResponse>(
        '/auth/token',
        { code }
      );
      const user = this.normalizeExchangeUser(response);
      this.setToken(response.token);
      this.setStoredUser(user);
      return {
        token: response.token,
        user,
      };
    } catch (error) {
      console.error('Failed to exchange Google code:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Store authentication token
   */
  private setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }

  /**
   * Get stored authentication token
   */
  private getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  /**
   * Clear stored authentication token
   */
  private clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }

  private setStoredUser(user: User): void {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  }

  getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<User>;
      if (!parsed?.sub || !parsed?.email) {
        return null;
      }

      return {
        sub: parsed.sub,
        email: parsed.email,
        name: parsed.name || parsed.email,
        picture: parsed.picture,
      };
    } catch {
      return null;
    }
  }

  private clearStoredUser(): void {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Get current user information from backend
   */
  async getCurrentUser(options?: { force?: boolean }): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }

      const cachedUser = this.getStoredUser();
      if (!options?.force && cachedUser) {
        return cachedUser;
      }

      const user = await apiClient.get<BackendCurrentUser>('/auth/me');
      const normalizedUser = this.normalizeBackendUser(user);
      this.setStoredUser(normalizedUser);
      return normalizedUser;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (options?.force && axiosError?.response?.status === 401) {
        this.clearClientData();
      }
      const err = error as Error;
      console.error('Failed to get current user:', err.message);
      return null;
    }
  }

  async revalidateCurrentUser(): Promise<AuthRevalidationResult> {
    const token = this.getToken();
    if (!token) {
      return { status: 'invalid' };
    }

    try {
      const user = await apiClient.get<BackendCurrentUser>('/auth/me');
      const normalizedUser = this.normalizeBackendUser(user);
      this.setStoredUser(normalizedUser);
      return {
        status: 'valid',
        user: normalizedUser,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError?.response?.status === 401) {
        this.clearClientData();
        return { status: 'invalid' };
      }

      console.error('Failed to revalidate current user:', axiosError.message);
      return { status: 'unreachable' };
    }
  }

  /**
   * Logout current user (client-side only - backend has no logout endpoint)
   */
  async logout(): Promise<void> {
    try {
      // Clear client-side stored data
      this.clearClientData();
      // Note: Backend has no /auth/logout endpoint - JWT tokens are stateless
      // and will expire naturally. We only need to clear client-side storage.
    } catch (error) {
      console.error('Failed to logout:', error);
      // Ensure we clear client data even if something goes wrong
      this.clearClientData();
      throw error;
    }
  }

  /**
   * Check if user is authenticated by making a request to get current user
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Clear any client-side stored authentication data
   */
  private clearClientData(): void {
    this.clearToken();
    this.clearStoredUser();
  }

  private normalizeExchangeUser(data: AuthTokenExchangeResponse): User {
    return {
      sub: data.user_id,
      email: data.email,
      name: data.email,
    };
  }

  private normalizeBackendUser(data: BackendCurrentUser): User {
    return {
      sub: data.user_id,
      email: data.email,
      name: data.email,
    };
  }
}

export const authService = AuthService.getInstance();
