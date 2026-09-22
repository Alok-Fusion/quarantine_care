/**
 * Custom API client wrapper for Quarantine Care backend.
 * Automatically injects the 'x-staff-id' header from localStorage.
 * Redirects to /login if a 401 Unauthorized response is encountered.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getStaffIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('quarantine_care_staff');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.staffId || null;
    }
  } catch (e) {
    console.error('Failed to parse staff from localStorage', e);
  }
  return null;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const staffId = getStaffIdFromStorage();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (staffId && !headers.has('x-staff-id')) {
    headers.set('x-staff-id', staffId);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('quarantine_care_staff');
        // Only redirect if not already on the login page
        if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
          window.location.href = '/login?expired=true';
        }
      }
      const errData = await response.json().catch(() => ({}));
      throw new ApiError(401, errData.error || 'Unauthorized', errData);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || data.message || `Request failed with status ${response.status}`,
        data
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error.message || 'Network error occurred', null);
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
