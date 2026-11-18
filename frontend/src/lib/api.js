const API_BASE = '/api';
const TOKEN_KEY = 'petbug_token';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = data?.code ?? 'UNKNOWN';
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

// Single-flight refresh: many parallel 401s only produce one /auth/refresh call.
let refreshing = null;
const refreshSession = () => {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed');
        const body = await res.json();
        setToken(body.data.accessToken);
        return body.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

async function rawRequest(endpoint, options, token) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * JSON fetch wrapper.
 *
 * - Attaches the access token.
 * - On 401 it tries a silent refresh (HttpOnly cookie) exactly once and
 *   replays the original request, so a lab session survives token expiry.
 * - Throws `ApiError` carrying `status`, `code` and the parsed body so callers
 *   can branch on business codes (WRONG_FLAG, ACTIVE_INSTANCE_EXISTS…).
 */
export async function apiRequest(endpoint, options = {}) {
  let response = await rawRequest(endpoint, options, getToken());

  if (response.status === 401 && !options.skipRefresh) {
    try {
      const data = await refreshSession();
      if (data?.accessToken) {
        response = await rawRequest(endpoint, options, data.accessToken);
      }
    } catch {
      setToken(null);
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = body?.message || body?.errors?.[0]?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ';
    throw new ApiError(message, response.status, body);
  }

  return body;
}

export const api = {
  get: (url, options) => apiRequest(url, options),
  post: (url, data, options) =>
    apiRequest(url, { ...options, method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: (url, data) => apiRequest(url, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (url, data) =>
    apiRequest(url, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  del: (url) => apiRequest(url, { method: 'DELETE' }),
};

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  me: () => api.get('/auth/me'),
  refresh: () => refreshSession(),
  logout: () => api.post('/auth/logout'),
  updateProfile: (bio) => api.patch('/auth/me', { bio }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/me/password', { currentPassword, newPassword }),
};
