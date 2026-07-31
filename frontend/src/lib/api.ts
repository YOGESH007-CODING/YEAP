/**
 * src/lib/api.ts
 *
 * Thin fetch wrapper with JWT auth for the YEAP backend.
 * All API calls go through here.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
  const res = await fetch(`${BASE_URL}${path}`, {
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

  if (res.status === 204) return undefined as T;
  const data = await res.json() as { error?: string };

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Request failed');
  }

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
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};

export { ApiError };

export interface AuthUser { id: string; email: string; name: string | null; leetcodeUsername?: string | null; }
export interface AuthResponse { success: boolean; data: { accessToken: string; user: AuthUser }; }
