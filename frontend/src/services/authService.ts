import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './apiClient';
import { LoginCredentials, LoginResponse, User } from '../types/auth';

/**
 * Checks whether an RFC 7519 JSON Web Token is structurally valid and unexpired.
 */
export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Allow a 10-second margin for clock skew
    return Date.now() >= (payload.exp - 10) * 1000;
  } catch {
    return true;
  }
}

export const authService = {
  /**
   * Submits credentials to the backend Express authentication endpoint.
   * On success, persists token to localStorage (if rememberMe is enabled) or sessionStorage.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (response.data?.token) {
      const token = response.data.token;
      const user = response.data.user;
      const isRemember = credentials.rememberMe !== false;

      if (isRemember) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(USER_STORAGE_KEY);
      } else {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    return response.data;
  },

  /**
   * Fetches the current authenticated user's profile from the backend session endpoint.
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ status: string; data: { user: User } }>('/api/v1/auth/me');
    const user = response.data.data.user;

    // Update stored user data in the storage where the token resides
    if (sessionStorage.getItem(TOKEN_STORAGE_KEY)) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }

    return user;
  },

  /**
   * Logs out the user by notifying the backend and clearing client credential storage.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Best-effort server notification: even if server fails or network drop, clear client tokens
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  },

  /**
   * Returns the stored token from localStorage or sessionStorage if valid and unexpired.
   */
  getStoredToken(): string | null {
    const token =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) return null;

    if (isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    return token;
  },

  /**
   * Returns the cached user record from storage.
   */
  getStoredUser(): User | null {
    const userStr =
      localStorage.getItem(USER_STORAGE_KEY) ||
      sessionStorage.getItem(USER_STORAGE_KEY);

    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },
};
