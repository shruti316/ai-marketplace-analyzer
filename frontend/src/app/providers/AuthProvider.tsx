import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../../types/auth';
import { authService } from '../../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from storage immediately to prevent unnecessary redirects on refresh
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If a token is in storage, start in loading check state until /me confirms validity
    return Boolean(authService.getStoredToken());
  });

  // Verify and refresh auth state on initial mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const storedToken = authService.getStoredToken();
      if (!storedToken) {
        // Attempt silent refresh via HttpOnly cookie before giving up
        try {
          const refreshedToken = await authService.refreshSession();
          if (refreshedToken && isMounted) {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            setToken(refreshedToken);
            setIsLoading(false);
            return;
          }
        } catch {
          // No active session cookie
        }

        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch (err: unknown) {
        // Attempt silent refresh before logging user out
        try {
          const refreshedToken = await authService.refreshSession();
          if (refreshedToken && isMounted) {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            setToken(refreshedToken);
            return;
          }
        } catch {
          // Refresh failed
        }

        const errorObj = err as { code?: string; message?: string };
        const isAuthRejection =
          errorObj?.code === 'TOKEN_INVALID' ||
          errorObj?.code === 'TOKEN_EXPIRED' ||
          errorObj?.code === 'USER_NOT_FOUND' ||
          errorObj?.code === 'ACCOUNT_INACTIVE' ||
          errorObj?.message?.includes('401') ||
          errorObj?.message?.includes('Unauthorized');

        if (isAuthRejection) {
          if (isMounted) {
            setUser(null);
            setToken(null);
            authService.logout();
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    // Listen for global 401 unauthorized events emitted by apiClient
    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setToken(response.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.register(credentials);
      setUser(response.user);
      setToken(response.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
