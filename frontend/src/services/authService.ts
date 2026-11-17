import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from './apiClient';
import { LoginCredentials, RegisterCredentials, LoginResponse, User } from '../types/auth';

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
   * Registers a new consumer user account.
   */
  async register(credentials: RegisterCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/register', {
      email: credentials.email.trim(),
      password: credentials.password,
      fullName: credentials.fullName.trim(),
      rememberMe: credentials.rememberMe !== false,
    });

    if (response.data?.token) {
      this.persistAuthData(response.data, credentials.rememberMe !== false);
    }

    return response.data;
  },

  /**
   * Submits credentials to the backend Express authentication endpoint.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
      rememberMe: credentials.rememberMe !== false,
    });

    if (response.data?.token) {
      this.persistAuthData(response.data, credentials.rememberMe !== false);
    }

    return response.data;
  },

  /**
   * Triggers session refresh and token rotation.
   */
  async refreshSession(): Promise<string | null> {
    const fallbackRefresh =
      localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
      undefined;

    try {
      const response = await apiClient.post<{ status: string; token: string; refreshToken?: string; user?: User }>(
        '/api/v1/auth/refresh',
        { refreshToken: fallbackRefresh }
      );

      if (response.data?.token) {
        const isRemember = Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
        const targetStorage = isRemember ? localStorage : sessionStorage;
        targetStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
        if (response.data.refreshToken) {
          targetStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.data.refreshToken);
        }
        if (response.data.user) {
          targetStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
        }
        return response.data.token;
      }
      return null;
    } catch {
      return null;
    }
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
      const fallbackRefresh =
        localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
        sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
        undefined;
      await apiClient.post('/api/v1/auth/logout', { refreshToken: fallbackRefresh });
    } catch {
      // Best-effort server notification: even if server fails or network drop, clear client tokens
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  },

  /**
   * Internal helper to persist tokens and user profile across localStorage or sessionStorage.
   */
  persistAuthData(data: LoginResponse, isRemember: boolean): void {
    const primaryStorage = isRemember ? localStorage : sessionStorage;
    const secondaryStorage = isRemember ? sessionStorage : localStorage;

    primaryStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    primaryStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    if (data.refreshToken) {
      primaryStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
    }

    secondaryStorage.removeItem(TOKEN_STORAGE_KEY);
    secondaryStorage.removeItem(USER_STORAGE_KEY);
    secondaryStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  },

  /**
   * Returns the stored token from localStorage or sessionStorage if valid.
   */
  getStoredToken(): string | null {
    return (
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY)
    );
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
