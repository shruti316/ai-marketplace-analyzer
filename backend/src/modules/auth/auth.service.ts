import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { authRepository, UserRow } from './auth.repository';
import { AuthUser, createAuthToken } from '../../middleware/auth';
import { UnauthorizedError, ConflictError, ValidationError } from '../../middleware/errorHandler';

export const HISTORICAL_BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface AuthSessionResult {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export type LoginResult = AuthSessionResult;

/**
 * Computes a SHA-256 hash of a raw refresh token for safe storage.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export class AuthService {
  /**
   * Registers a new consumer/analyst user account.
   * Validates email uniqueness, hashes password with Argon2id, assigns 'VIEWER' role,
   * generates access token and tracks refresh session in MySQL.
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    userAgent?: string | null,
    ipAddress?: string | null,
    rememberMe = true
  ): Promise<AuthSessionResult> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim();

    // Check for existing user with identical email
    const existing = await authRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new ConflictError(`An account with email "${cleanEmail}" already exists.`, 'EMAIL_ALREADY_EXISTS');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters in length.');
    }

    // Hash password with Argon2id
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });

    const userId = crypto.randomUUID();

    // Self-registration is strictly assigned 'VIEWER' role (ordinary consumer).
    // Privileged 'ADMIN' accounts must be provisioned via the secure offline administrator tool.
    const user = await authRepository.createUser({
      id: userId,
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: cleanName,
      role: 'VIEWER'
    });

    return this.createSessionAndTokens(user, userAgent, ipAddress, rememberMe);
  }

  /**
   * Authenticates user with email and password.
   * Validates against argon2id password hash, checks active status,
   * enforces bootstrap account lock, and generates RFC 7519 JWT + refresh session.
   */
  async login(
    email: string,
    password: string,
    userAgent?: string | null,
    ipAddress?: string | null,
    rememberMe = true
  ): Promise<AuthSessionResult> {
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

    return this.createSessionAndTokens(user, userAgent, ipAddress, rememberMe);
  }

  /**
   * Handles refresh-token rotation:
   * Validates existing refresh token in user_sessions, revokes it,
   * issues a new rotated refresh token and fresh access token.
   */
  async refreshToken(
    rawRefreshToken: string,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<AuthSessionResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedError('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const session = await authRepository.findSessionByHash(tokenHash);

    if (!session) {
      throw new UnauthorizedError('Invalid or expired session. Please sign in again.', 'SESSION_EXPIRED');
    }

    const user = await authRepository.findById(session.user_id);
    if (!user || !Boolean(user.is_active)) {
      throw new UnauthorizedError('User account associated with this session is no longer active', 'ACCOUNT_INACTIVE');
    }

    // Revoke old session immediately (Token Rotation)
    await authRepository.revokeSession(tokenHash);

    // Create new rotated session
    return this.createSessionAndTokens(user, userAgent, ipAddress, true);
  }

  /**
   * Logs out a session by revoking its refresh token in MySQL.
   */
  async logout(rawRefreshToken?: string | null, userId?: string | null): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await authRepository.revokeSession(tokenHash);
    } else if (userId) {
      await authRepository.revokeAllUserSessions(userId);
    }
  }

  /**
   * Internal helper to generate JWT access token, random refresh token, and MySQL session row.
   */
  private async createSessionAndTokens(
    user: UserRow,
    userAgent?: string | null,
    ipAddress?: string | null,
    rememberMe = true
  ): Promise<AuthSessionResult> {
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    // Access token valid for 2 hours (or 24 hours if rememberMe)
    const tokenLifetimeSeconds = rememberMe ? 86400 : 7200;
    const token = createAuthToken(authUser, tokenLifetimeSeconds);

    // Cryptographically random 64-hex-char refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);

    // Session lifetime: 30 days for persistent login
    const sessionDays = rememberMe ? 30 : 1;
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

    const sessionId = crypto.randomUUID();
    await authRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt
    });

    return {
      token,
      refreshToken: rawRefreshToken,
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
