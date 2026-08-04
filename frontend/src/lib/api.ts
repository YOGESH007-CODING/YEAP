/**
 * src/lib/api.ts
 *
 * Thin fetch wrapper with JWT auth for the YEAP backend.
 * All API calls go through here.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
let accessToken: string | null = null;
let refreshTokenPromise: Promise<AuthResponse['data']> | null = null;

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry && path !== '/api/auth/refresh') {
    try {
      await api.refresh();
      return request<T>(path, options, false);
    } catch {
      accessToken = null;
      throw new ApiError(401, 'Unauthorized');
    }
  }

  // A token that still receives a 401 after the refresh attempt cannot be used.
  // Clear it so later requests do not repeatedly trigger a refresh.
  if (res.status === 401) accessToken = null;

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  const body = await res.text();
  let data: { error?: string } | undefined;
  if (contentType.includes('application/json') && body) {
    try {
      data = JSON.parse(body) as { error?: string };
    } catch {
      if (res.ok) throw new ApiError(res.status, 'Server returned invalid JSON');
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || body || `Request failed (${res.status})`);
  }

  if (!data) throw new ApiError(res.status, 'Server returned an invalid response');
  return data as T;
}

export const api = {
  setAccessToken: (token: string | null) => { accessToken = token; },
  refresh: (): Promise<AuthResponse['data']> => {
    if (refreshTokenPromise) return refreshTokenPromise;

    refreshTokenPromise = (async () => {
      try {
        const session = await request<AuthResponse>('/api/auth/refresh', { method: 'POST' }, false);
        accessToken = session.data.accessToken;
        return session.data;
      } catch (err) {
        accessToken = null;
        throw err;
      } finally {
        refreshTokenPromise = null;
      }
    })();

    return refreshTokenPromise;
  },
  get: <T>(path: string, options: RequestInit = {}) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};

export { ApiError };

export interface AuthUser { id: string; email: string; name: string | null; leetcodeUsername?: string | null; provider: 'LOCAL' | 'GOOGLE' | 'GITHUB'; }
export interface AuthResponse { success: boolean; data: { accessToken: string; user: AuthUser }; }
