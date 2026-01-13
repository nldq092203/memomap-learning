// Base API types
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

// Resource types
export interface BaseResource {
  id: string;
  created_at: number;
  updated_at: number;
  version: number;
}

// Feature resources moved to per-feature files under src/lib/types/api/*

// API request/response types
export interface ListResponse<T> {
  items: T[];
  total: number;
  pageSize: number;
}

// Backend Response (ResponseBuilder) helpers
export type ResponseStatus = 'success' | 'error'

export interface ResponseBuilderEnvelope<T> {
  status: ResponseStatus;
  message?: string;
  data?: T;
  error?: string;
}

// Travel-specific types moved to src/lib/types/api/travel

export type CreateRequest<T extends BaseResource> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'version'> & {
  id: string;
  created_at: number;
  updated_at: number;
  version: number;
}

export type UpdateRequest<T extends BaseResource> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at' | 'version'>> & {
  id: string;
  updated_at: number;
}

// Form types moved to per-feature files if needed

// Store types
export interface ApiState<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
}

export interface ApiActions<T> {
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<T, 'id' | 'created_at' | 'updated_at' | 'version'>) => Promise<T | null>;
  updateItem: (id: string, updates: Partial<T>) => Promise<T | null>;
  deleteItem: (id: string) => Promise<boolean>;
  refreshItems: () => Promise<void>;
  clearError: () => void;
}
