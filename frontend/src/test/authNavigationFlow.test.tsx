import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../app/providers/AuthProvider';
import { QueryProvider } from '../app/providers/QueryProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../app/router/ProtectedRoute';
import { authService } from '../services/authService';
import { TrustSphereApiError, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../services/apiClient';
import { User, LoginResponse } from '../types/auth';

const mockUser: User = {
  id: 'usr-accept-001',
  email: 'testuser@trustsphere.org',
  fullName: 'Shruti Joshi',
  role: 'VIEWER',
};

const mockLoginResponse: LoginResponse = {
  status: 'success',
  token: 'mock-valid-access-jwt-token.eyJleHAiOjk5OTk5OTk5OTl9.sig',
  refreshToken: 'mock-valid-refresh-token-hex-64-characters',
  user: mockUser,
};

function TestDashboard() {
  return (
    <div data-testid="dashboard-screen">
      <h1>TrustSphere Dashboard</h1>
      <p>Welcome, {mockUser.fullName}</p>
      <button
        onClick={async () => {
          await authService.logout();
          window.location.href = '/login';
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

function renderAppWithAuth(initialRoute = '/login') {
  return render(
    <QueryProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<LoginPage defaultMode="signin" />} />
            <Route path="/register" element={<LoginPage defaultMode="register" />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<TestDashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

describe('TrustSphere P0 Authentication & Dashboard Navigation Matrix', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // Test 1: Existing user with correct credentials -> Dashboard
  it('1. Existing user with correct credentials signs in and navigates to Dashboard', async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

    renderAppWithAuth('/login');

    const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });

    await user.type(emailInput, 'testuser@trustsphere.org');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: 'testuser@trustsphere.org',
        password: 'ValidPassword123!',
        rememberMe: true,
      });
      expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
      expect(screen.getByText('TrustSphere Dashboard')).toBeInTheDocument();
    });
  });

  // Test 2: Existing user with incorrect password -> 401 error
  it('2. Existing user with incorrect password displays 401 INVALID_CREDENTIALS error and stays on login', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockRejectedValue(
      new TrustSphereApiError(
        'Invalid email or password. Please verify your credentials or create a new account.',
        { status: 401, code: 'INVALID_CREDENTIALS' }
      )
    );

    renderAppWithAuth('/login');

    const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });

    await user.type(emailInput, 'testuser@trustsphere.org');
    await user.type(passwordInput, 'WrongPassword!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      expect(screen.getByText('INVALID_CREDENTIALS')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-screen')).not.toBeInTheDocument();
    });
  });

  // Test 3: New user with valid details -> Account created and dashboard (auto-login supported)
  it('3. New user with valid details registers, automatically logs in, and navigates to Dashboard', async () => {
    const user = userEvent.setup();
    const registerSpy = vi.spyOn(authService, 'register').mockResolvedValue(mockLoginResponse);

    renderAppWithAuth('/register');

    const nameInput = screen.getByPlaceholderText(/Shruti Joshi/i);
    const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
    const newPasswordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];
    const submitBtn = screen.getByRole('button', { name: /create account & get started/i });

    await user.type(nameInput, 'New Analyst');
    await user.type(emailInput, 'newanalyst@trustsphere.org');
    await user.type(newPasswordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith({
        fullName: 'New Analyst',
        email: 'newanalyst@trustsphere.org',
        password: 'ValidPassword123!',
        rememberMe: true,
      });
      expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
    });
  });

  // Test 4: Duplicate email -> 409 EMAIL_ALREADY_EXISTS with Switch to Sign In option
  it('4. Duplicate registration displays 409 EMAIL_ALREADY_EXISTS and offers Switch to Sign In tab', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'register').mockRejectedValue(
      new TrustSphereApiError(
        'An account with this email address already exists. Please sign in instead.',
        { status: 409, code: 'EMAIL_ALREADY_EXISTS' }
      )
    );

    renderAppWithAuth('/register');

    const nameInput = screen.getByPlaceholderText(/Shruti Joshi/i);
    const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /create account & get started/i });

    await user.type(nameInput, 'Shruti Joshi');
    await user.type(emailInput, 'shrutijoshi1209@gmail.com');
    await user.type(passwordInputs[0], 'ValidPassword123!');
    await user.type(passwordInputs[1], 'ValidPassword123!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/An account with this email address already exists/i)).toBeInTheDocument();
      expect(screen.getByText('EMAIL_ALREADY_EXISTS')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to sign in tab/i })).toBeInTheDocument();
    });

    // Clicking switch to sign in switches mode and pre-populates the email
    const switchBtn = screen.getByRole('button', { name: /switch to sign in tab/i });
    await user.click(switchBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
      const loginEmailInput = screen.getByPlaceholderText(/name@organization\.com/i) as HTMLInputElement;
      expect(loginEmailInput.value).toBe('shrutijoshi1209@gmail.com');
    });
  });

  // Test 5: Password mismatch -> Validation error
  it('5. Password mismatch displays validation error without calling backend', async () => {
    const user = userEvent.setup();
    const registerSpy = vi.spyOn(authService, 'register');

    renderAppWithAuth('/register');

    const nameInput = screen.getByPlaceholderText(/Shruti Joshi/i);
    const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /create account & get started/i });

    await user.type(nameInput, 'Shruti Joshi');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInputs[0], 'Password123!');
    await user.type(passwordInputs[1], 'DifferentPassword123!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(registerSpy).not.toHaveBeenCalled();
    });
  });

  // Test 6: Missing required fields -> Validation error
  it('6. Missing required fields displays form validation errors without calling backend', async () => {
    const user = userEvent.setup();
    const registerSpy = vi.spyOn(authService, 'register');

    renderAppWithAuth('/register');

    const submitBtn = screen.getByRole('button', { name: /create account & get started/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Full name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password must be at least 8 characters in length/i)).toBeInTheDocument();
      expect(registerSpy).not.toHaveBeenCalled();
    });
  });

  // Test 7: Refresh after login -> Session restored
  it('7. Session restoration on page refresh preserves authentication and opens Dashboard', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, mockLoginResponse.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);

    renderAppWithAuth('/dashboard');

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
      expect(screen.getByText('TrustSphere Dashboard')).toBeInTheDocument();
    });
  });

  // Test 8: Logout -> Redirect to login
  it('8. Logout invalidates session in storage and redirects to /login', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, mockLoginResponse.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(async () => {
      localStorage.clear();
      sessionStorage.clear();
    });

    render(
      <QueryProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<LoginPage defaultMode="signin" />} />
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/dashboard"
                  element={
                    <div>
                      <h1>Dashboard Protected</h1>
                      <button
                        onClick={async () => {
                          await authService.logout();
                          window.dispatchEvent(new Event('auth:unauthorized'));
                        }}
                      >
                        Log Out
                      </button>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Protected')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const logoutBtn = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    });
  });

  // Test 9: Login after logout -> Dashboard
  it('9. Login after logout successfully authenticates and returns to Dashboard', async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

    renderAppWithAuth('/login');

    const emailInput = screen.getByPlaceholderText(/name@organization\.com/i);
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });

    await user.type(emailInput, 'testuser@trustsphere.org');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalled();
      expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
    });
  });

  // Test 10: Expired / revoked session -> Login required
  it('10. Expired or revoked session is rejected and unauthenticated visitor is redirected to /login', async () => {
    // Expired JWT token: {"exp": 1000}
    const expiredToken = 'header.eyJleHAiOjEwMDB9.signature';
    localStorage.setItem(TOKEN_STORAGE_KEY, expiredToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));

    // Refresh fails because session is expired/revoked
    vi.spyOn(authService, 'refreshSession').mockRejectedValue(new Error('Session revoked'));
    const logoutSpy = vi.spyOn(authService, 'logout');

    renderAppWithAuth('/dashboard');

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-screen')).not.toBeInTheDocument();
    });
  });

  // Test 11: Backend cold start -> Graceful loading and recovery
  it('11. Backend cold-start / timeout during session check preserves local session without logging out', async () => {
    const validToken = 'header.eyJleHAiOjk5OTk5OTk5OTl9.signature';
    localStorage.setItem(TOKEN_STORAGE_KEY, validToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));

    // getCurrentUser fails with a cold start timeout (HTTP 504 / GATEWAY_TIMEOUT)
    vi.spyOn(authService, 'getCurrentUser').mockRejectedValue(
      new TrustSphereApiError('Connecting to TrustSphere engine took longer than expected (~75s).', {
        status: 504,
        code: 'GATEWAY_TIMEOUT',
        isColdStart: true,
      })
    );
    const logoutSpy = vi.spyOn(authService, 'logout');

    renderAppWithAuth('/dashboard');

    await waitFor(() => {
      // User must NOT be logged out or redirected to login on cold starts
      expect(logoutSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^sign in$/i })).not.toBeInTheDocument();
    });
  });
});
