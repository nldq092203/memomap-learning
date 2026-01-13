import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { ApiResponse } from '@/lib/types/api';
import { apiErrorHandler } from '@/lib/services/api-error-handler';

class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private pendingRequests = new Map<string, Promise<AxiosResponse>>();
  
  // Retry + circuit breaker settings
  private readonly MAX_ATTEMPTS = 3; // total attempts = 3 (1 initial + 2 retries)
  private readonly RETRY_BASE_DELAY_MS = 300; // base backoff delay
  private readonly CIRCUIT_FAILURE_THRESHOLD = 1; // open circuit after a fully failed request
  private readonly CIRCUIT_OPEN_COOLDOWN_MS = 60_000; // keep circuit open for 60s
  private readonly NOTIFY_THROTTLE_MS = 15_000; // min gap between identical error toasts

  // Track failures per method:endpoint (no params to aggregate variants)
  private circuitState = new Map<string, { failures: number; openUntil?: number; lastNotifiedAt?: number }>();

  /**
   * Create a unique key for request deduplication
   */
  private createRequestKey(method: string, endpoint: string, params?: Record<string, unknown>): string {
    const sortedParams = params ? Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, unknown>) : {};
    
    return `${method}:${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  constructor(options?: { baseURL?: string; timeout?: number; headers?: Record<string, string> }) {
    this.baseUrl = options?.baseURL || process.env.NEXT_PUBLIC_API_URL || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: options?.timeout ?? 3*60*1000, // 3 minutes
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    // Add auth token interceptor (guard for SSR)
    this.client.interceptors.request.use((config) => {
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Add Google Drive access token if available (for Drive-backed endpoints)
          const driveToken = localStorage.getItem('google_drive_token');
          if (driveToken) {
            config.headers['X-Google-Access-Token'] = driveToken;
          }
        }
      } catch {}
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle 401 errors globally
        if (error?.response?.status === 401) {
          await apiErrorHandler.handleError(error, {
            showToast: true,
            redirectToLogin: true
          });
        } else {
          // For non-401 errors, just log here. Toasts are managed by retry logic.
          console.error('API Error:', error.response?.data || error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Network error / timeout (no response)
    if (!error || typeof error !== 'object') {
      return true;
    }
    // Check if it's an AxiosError with response
    if ('isAxiosError' in error && error.isAxiosError && 'response' in error) {
      const axiosErr = error as AxiosError;
      if (!axiosErr.response) {
        return true;
      }
      const status = axiosErr.response.status;
      // Retry on 5xx and 429
      if (status >= 500 || status === 429) return true;
    }
    return false;
  }

  /**
   * Exponential backoff delay
   */
  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit key (aggregate by method:endpoint)
   */
  private getCircuitKey(method: string, endpoint: string): string {
    return `${method.toUpperCase()}:${endpoint}`;
  }

  /**
   * Check if circuit is open for this request
   */
  private isCircuitOpen(method: string, endpoint: string): boolean {
    const key = this.getCircuitKey(method, endpoint);
    const state = this.circuitState.get(key);
    if (!state || !state.openUntil) return false;
    const now = Date.now();
    if (now < state.openUntil) {
      return true;
    }
    // Cooldown passed - reset circuit
    this.circuitState.set(key, { failures: 0 });
    return false;
  }

  /**
   * Record a failure and open circuit if threshold reached
   */
  private async recordFailure(method: string, endpoint: string, error: unknown) {
    const key = this.getCircuitKey(method, endpoint);
    const prev = this.circuitState.get(key) || { failures: 0 as number };
    const failures = (prev.failures || 0) + 1;
    const state = { ...prev, failures } as { failures: number; openUntil?: number; lastNotifiedAt?: number };
    
    if (failures >= this.CIRCUIT_FAILURE_THRESHOLD) {
      state.openUntil = Date.now() + this.CIRCUIT_OPEN_COOLDOWN_MS;
      const now = Date.now();
      const status = (error && (error as AxiosError).response?.status) || 0;
      const canNotify = !state.lastNotifiedAt || (now - state.lastNotifiedAt) > this.NOTIFY_THROTTLE_MS;
      if (status !== 401 && canNotify) {
        state.lastNotifiedAt = now;
        await apiErrorHandler.handleError(error, {
          showToast: true,
          redirectToLogin: false,
          customMessage: 'Server error'
        });
      }
    }
    this.circuitState.set(key, state);
  }

  /**
   * Reset circuit on successful request
   */
  private resetCircuit(method: string, endpoint: string) {
    const key = this.getCircuitKey(method, endpoint);
    this.circuitState.set(key, { failures: 0 });
  }

  /**
   * Execute an Axios request with retry and circuit breaker.
   * The provided factory must create a fresh Axios request each attempt.
   */
  private async executeWithRetry<T>(
    method: string,
    endpoint: string,
    factory: () => Promise<AxiosResponse<T>>
  ): Promise<AxiosResponse<T>> {
    // Fast-fail if circuit is open
    if (this.isCircuitOpen(method, endpoint)) {
      // Throttled notification while circuit is open
      const key = this.getCircuitKey(method, endpoint);
      const state = this.circuitState.get(key) || { failures: this.CIRCUIT_FAILURE_THRESHOLD };
      const now = Date.now();
      const canNotify = !state.lastNotifiedAt || (now - state.lastNotifiedAt) > this.NOTIFY_THROTTLE_MS;
      if (canNotify) {
        state.lastNotifiedAt = now;
        this.circuitState.set(key, state);
        await apiErrorHandler.handleError(new Error('Server error'), {
          showToast: true,
          redirectToLogin: false,
          customMessage: 'Server error'
        });
      }
      const err = new Error('Server error');
      throw err;
    }

    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < this.MAX_ATTEMPTS) {
      try {
        const response = await factory();
        // Success resets circuit
        this.resetCircuit(method, endpoint);
        return response;
      } catch (error) {
        lastError = error;
        attempt += 1;
        const shouldRetry = attempt < this.MAX_ATTEMPTS && this.isRetryableError(error);
        if (!shouldRetry) {
          await this.recordFailure(method, endpoint, error);
          break;
        }
        // Backoff with jitter
        const delayMs = Math.min(5000, this.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 100);
        await this.delay(delayMs);
      }
    }
    throw lastError || new Error('Server error');
  }

  /**
   * Generic GET request with deduplication
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const requestKey = this.createRequestKey('GET', endpoint, params);
    const method = 'GET';
    
    // Check if request is already pending
    if (this.pendingRequests.has(requestKey)) {
      const response = await this.pendingRequests.get(requestKey)!;
      return this.handleResponse(response as AxiosResponse<ApiResponse<T>>);
    }
    
    // Create new request with retry + circuit breaker
    const requestPromise = this.executeWithRetry<ApiResponse<T>>(
      method,
      endpoint,
      () => this.client.get(endpoint, { params })
    );
    this.pendingRequests.set(requestKey, requestPromise);
    
    try {
      const response: AxiosResponse<ApiResponse<T>> = await requestPromise;
      return this.handleResponse(response);
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * GET request returning raw response body (no ApiResponse envelope)
   */
  async getRaw<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.executeWithRetry<T>('GET', endpoint, () => this.client.get<T>(endpoint, { params }));
    return response.data as T;
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.executeWithRetry<ApiResponse<T>>('POST', endpoint, () => this.client.post(endpoint, data));
    return this.handleResponse(response);
  }

  /**
   * POST multipart/form-data request
   */
  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> =
      await this.executeWithRetry<ApiResponse<T>>('POST', endpoint, () =>
        this.client.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      )
    return this.handleResponse(response)
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.executeWithRetry<ApiResponse<T>>('PUT', endpoint, () => this.client.put(endpoint, data));
    return this.handleResponse(response);
  }

  /**
   * Generic PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.executeWithRetry<ApiResponse<T>>('PATCH', endpoint, () => this.client.patch(endpoint, data));
    return this.handleResponse(response);
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.executeWithRetry<ApiResponse<T>>('DELETE', endpoint, () => this.client.delete(endpoint));
    return this.handleResponse(response);
  }

  /**
   * Handle API response and extract data
   */
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { data } = response;
    
    if (data.status === 'error') {
      throw new Error(data.error || data.message || 'API request failed');
    }
    
    if (data.status !== 'success') {
      throw new Error('Invalid response status');
    }
    
    return data.data as T;
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set Google Drive access token for Drive-backed endpoints
   */
  setDriveToken(token: string | null): void {
    try {
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem('google_drive_token', token);
        } else {
          localStorage.removeItem('google_drive_token');
        }
      }
    } catch (error) {
      console.error('Failed to set Drive token:', error);
    }
  }

  /**
   * Get stored Google Drive access token
   */
  getDriveToken(): string | null {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('google_drive_token');
      }
    } catch {}
    return null;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// External service clients
export const nominatimClient = new ApiClient({
  baseURL: 'https://nominatim.openstreetmap.org',
  timeout: 15000,
  headers: {
    'User-Agent': 'MemoMap/1.0 (contact@memomap.com)',
    'Accept': 'application/json'
  }
});
