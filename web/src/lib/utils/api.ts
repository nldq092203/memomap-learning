import { ApiResponse } from '@/lib/types/auth';

/**
 * Generic function to handle API responses from Flask ResponseBuilder
 */
export async function handleApiResponse<T>(
  response: Response
): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ApiResponse<T> = await response.json();

  if (data.status === 'error') {
    throw new Error(data.error || data.message || 'API request failed');
  }

  if (data.status === 'success' && data.data !== undefined) {
    return data.data;
  }

  throw new Error('Invalid API response format');
}

/**
 * Generic function to handle API responses that might return null for unauthenticated users
 */
export async function handleApiResponseOrNull<T>(
  response: Response
): Promise<T | null> {
  if (response.status === 401) {
    return null; // Not authenticated
  }

  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  try {
    const data: ApiResponse<T> = await response.json();

    if (data.status === 'error') {
      console.error('API error:', data.error || data.message);
      return null;
    }

    if (data.status === 'success' && data.data !== undefined) {
      return data.data;
    }

    return null;
  } catch (jsonError) {
    console.error('Failed to parse JSON response:', jsonError);
    throw new Error('Invalid JSON response from server');
  }
}

/**
 * Create a fetch request with common headers and Bearer token
 */
export function createApiRequest(
  url: string,
  options: RequestInit = {}
): RequestInit {
  const token = localStorage.getItem('auth_token');
  
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };
}
