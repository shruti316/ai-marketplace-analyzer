import { verify } from '@node-rs/argon2';
import { authRepository, UserRow } from './auth.repository';
import { AuthUser, createAuthToken } from '../../middleware/auth';
import { UnauthorizedError } from '../../middleware/errorHandler';

export const HISTORICAL_BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export class AuthService {
  /**
   * Authenticates user with email and password.
   * Validates against argon2id password hash, checks active status,
   * enforces bootstrap account lock, and generates RFC 7519 JWT.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Invariant: Never permit inactive users to authenticate
    const isActive = Boolean(user.is_active);
    if (!isActive) {
      throw new UnauthorizedError('Account is inactive or disabled', 'ACCOUNT_INACTIVE');
    }

    // Invariant: Never permit the inactive bootstrap system account to authenticate
    if (user.id === HISTORICAL_BOOTSTRAP_USER_ID) {
      throw new UnauthorizedError(
        'Bootstrap system account is locked for interactive login',
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password hash safely
    let isValidPassword = false;
    try {
      isValidPassword = await verify(user.password_hash, password);
    } catch {
      isValidPassword = false;
    }

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    const token = createAuthToken(authUser);

    return {
      token,
      user: {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role,
        fullName: authUser.fullName || user.full_name
      }
    };
  }

  /**
   * Retrieves profile for the current authenticated user and verifies active status.
   */
  async getCurrentUserProfile(userId: string): Promise<{
    id: string;
    email: string;
    role: string;
    fullName: string;
    isActive: boolean;
    createdAt: string;
  }> {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User account not found', 'USER_NOT_FOUND');
    }

    if (!Boolean(user.is_active)) {
      throw new UnauthorizedError('User account is inactive or disabled', 'ACCOUNT_INACTIVE');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      isActive: Boolean(user.is_active),
      createdAt: user.created_at
    };
  }
}

export const authService = new AuthService();
