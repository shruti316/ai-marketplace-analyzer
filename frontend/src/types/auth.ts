export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | string;
  fullName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  status: 'success';
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
