import { RowDataPacket } from 'mysql2/promise';
import { queryOne, query } from '../../config/database';
import { UserRole } from '../../middleware/auth';

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSessionRow extends RowDataPacket {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  is_revoked: number | boolean;
  expires_at: Date | string;
  created_at: string;
}

export class AuthRepository {
  /**
   * Retrieves a user by their unique email address.
   */
  async findByEmail(email: string): Promise<UserRow | null> {
    const sql = `
      SELECT id, email, password_hash, full_name, role, is_active, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `;
    return queryOne<UserRow>(sql, [email.toLowerCase().trim()]);
  }

  /**
   * Retrieves a user by their primary key id.
   */
  async findById(id: string): Promise<UserRow | null> {
    const sql = `
      SELECT id, email, password_hash, full_name, role, is_active, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    return queryOne<UserRow>(sql, [id]);
  }

  /**
   * Creates a new user record in the database.
   * By default, self-registered users receive 'VIEWER' role.
   */
  async createUser(userData: {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: UserRole;
  }): Promise<UserRow> {
    const insertSql = `
      INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW(3), NOW(3))
    `;
    await query(insertSql, [
      userData.id,
      userData.email.toLowerCase().trim(),
      userData.password_hash,
      userData.full_name.trim(),
      userData.role
    ]);

    const created = await this.findById(userData.id);
    if (!created) {
      throw new Error('Failed to retrieve user immediately after creation');
    }
    return created;
  }

  /**
   * Updates a user's is_active status or role.
   */
  async updateStatus(id: string, isActive: boolean): Promise<void> {
    await query(
      'UPDATE users SET is_active = ?, updated_at = NOW(3) WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  }

  /**
   * Stores a newly issued cryptographically hashed refresh token in user_sessions.
   */
  async createSession(session: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const sql = `
      INSERT INTO user_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, is_revoked, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, NOW(3))
    `;
    await query(sql, [
      session.id,
      session.userId,
      session.refreshTokenHash,
      session.userAgent || null,
      session.ipAddress || null,
      session.expiresAt
    ]);
  }

  /**
   * Finds an active, unrevoked user session by its refresh token hash.
   */
  async findSessionByHash(refreshTokenHash: string): Promise<UserSessionRow | null> {
    const sql = `
      SELECT id, user_id, refresh_token_hash, user_agent, ip_address, is_revoked, expires_at, created_at
      FROM user_sessions
      WHERE refresh_token_hash = ?
        AND is_revoked = 0
        AND expires_at > NOW(3)
      LIMIT 1
    `;
    return queryOne<UserSessionRow>(sql, [refreshTokenHash]);
  }

  /**
   * Revokes a session by marking is_revoked = 1.
   */
  async revokeSession(refreshTokenHash: string): Promise<void> {
    const sql = `
      UPDATE user_sessions
      SET is_revoked = 1
      WHERE refresh_token_hash = ?
    `;
    await query(sql, [refreshTokenHash]);
  }

  /**
   * Revokes all active sessions for a given user (e.g. on security reset / full logout).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sql = `
      UPDATE user_sessions
      SET is_revoked = 1
      WHERE user_id = ?
    `;
    await query(sql, [userId]);
  }
}

export const authRepository = new AuthRepository();
