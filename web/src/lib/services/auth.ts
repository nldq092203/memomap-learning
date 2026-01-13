import { User } from '@/lib/types/auth';
import { apiClient } from '@/lib/services/api-client';

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
   * Exchange Google token (id_token or access_token) for app JWT token
   */
  async exchangeGoogleToken(token: string, isAccessToken = false): Promise<{ token: string; user_id: string; email: string }> {
    try {
      const payload = isAccessToken 
        ? { access_token: token }
        : { id_token: token };
      
      const response = await apiClient.post<{ token: string; user_id: string; email: string }>(
        '/auth/token',
        payload
      );
      return response;
    } catch (error) {
      console.error('Failed to exchange Google token:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Store authentication token
   */
  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Get stored authentication token
   */
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Clear stored authentication token
   */
  private clearToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * Get current user information from backend
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }

      const user = await apiClient.get<User>('/auth/me');
      return user;
    } catch (error) {
      const err = error as Error;
      console.error('Failed to get current user:', err.message);
      return null;
    }
  }

  /**
   * Logout current user (client-side only - backend has no logout endpoint)
   */
  async logout(): Promise<void> {
    try {
      // Clear client-side stored data
      this.clearToken();
      // Also clear Drive access token used for Drive-backed endpoints
      apiClient.setDriveToken(null);
      // Note: Backend has no /auth/logout endpoint - JWT tokens are stateless
      // and will expire naturally. We only need to clear client-side storage.
    } catch (error) {
      console.error('Failed to logout:', error);
      // Ensure we clear client data even if something goes wrong
      this.clearToken();
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
  }
}

export const authService = AuthService.getInstance();
