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
   * Updates a user's is_active status or role.
   */
  async updateStatus(id: string, isActive: boolean): Promise<void> {
    await query(
      'UPDATE users SET is_active = ?, updated_at = NOW(3) WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  }
}

export const authRepository = new AuthRepository();
