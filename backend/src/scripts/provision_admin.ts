import readline from 'readline';
import crypto from 'crypto';
import { hash } from '@node-rs/argon2';
import { getApplicationPool, closeApplicationPool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Historical bootstrap account invariant — must NEVER be modified or activated
export const BOOTSTRAP_REVIEWER_ID = '00000000-0000-0000-0000-000000000001';
export const BOOTSTRAP_REVIEWER_EMAIL = 'reviewer.bootstrap@marketplace.internal';

export interface ProvisionAdminOptions {
  email: string;
  fullName: string;
  password: string;
  force?: boolean;
}

export interface ProvisionResult {
  userId: string;
  email: string;
  fullName: string;
  role: 'ADMIN';
  isActive: boolean;
}

/**
 * Validates administrative email format against database constraints.
 */
export function validateAdminEmail(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('Email cannot be empty.');
  }
  // Enforces chk_users_email constraint (email LIKE '%_@__%.__%')
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 255) {
    throw new Error(`Email "${trimmed}" is invalid. Must conform to standard email syntax.`);
  }
  if (trimmed.toLowerCase() === BOOTSTRAP_REVIEWER_EMAIL.toLowerCase()) {
    throw new Error(
      'Cannot provision or overwrite the historical bootstrap reviewer account. Administrative provisioning requires a new operator identity.'
    );
  }
}

/**
 * Enforces strong password requirements for administrative accounts.
 */
export function validateAdminPassword(password: string): void {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters in length.');
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    throw new Error(
      'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.'
    );
  }
}

/**
 * Core administrative user provisioning logic.
 * Parameterized SQL, Argon2id hashing, and initial administrator collision guards.
 */
export async function provisionAdmin(options: ProvisionAdminOptions): Promise<ProvisionResult> {
  const email = options.email.trim().toLowerCase();
  const fullName = options.fullName.trim();
  const password = options.password;
  const force = Boolean(options.force);

  validateAdminEmail(email);
  if (!fullName || fullName.length > 150) {
    throw new Error('Full name is required and must not exceed 150 characters.');
  }
  validateAdminPassword(password);

  const pool = getApplicationPool();

  // 1. Invariant Check: Prevent accidental creation of multiple initial administrators
  const [existingAdmins] = await pool.query<RowDataPacket[]>(
    'SELECT id, email FROM users WHERE role = ? AND is_active = 1',
    ['ADMIN']
  );

  if (existingAdmins.length > 0 && !force) {
    throw new Error(
      `An active administrator account already exists (${existingAdmins[0].email}). ` +
      'Initial administrator provisioning is locked to prevent duplicate admins. Pass --force to create an additional administrator.'
    );
  }

  // 2. Invariant Check: Ensure email is not already taken
  const [existingUser] = await pool.query<RowDataPacket[]>(
    'SELECT id, role, is_active FROM users WHERE email = ?',
    [email]
  );

  if (existingUser.length > 0) {
    if (existingUser[0].id === BOOTSTRAP_REVIEWER_ID) {
      throw new Error(
        'Refusing to activate or reassign the historical bootstrap reviewer account.'
      );
    }
    throw new Error(`A user with email "${email}" already exists in the system.`);
  }

  // 3. Hash password using Argon2id with standard parameters
  const passwordHash = await hash(password);

  const userId = crypto.randomUUID();
  const now = new Date();

  // 4. Parameterized Insert into users table
  await pool.query<ResultSetHeader>(
    `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ADMIN', 1, ?, ?)`,
    [userId, email, passwordHash, fullName, now, now]
  );

  return {
    userId,
    email,
    fullName,
    role: 'ADMIN',
    isActive: true
  };
}

/**
 * Interactive masked password reader for secure terminal input.
 */
async function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const stdin = process.stdin as any;
    process.stdout.write(query);

    let password = '';
    if (process.stdin.isTTY) {
      stdin.setRawMode(true);
      const onData = (chunk: Buffer) => {
        const char = chunk.toString();
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (char === '\u0003') {
          process.exit(1);
        } else if (char === '\b' || char === '\x7f') {
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Simple question prompter.
 */
async function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

/**
 * CLI Entrypoint.
 */
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  // Extract optional flags
  const emailIdx = args.indexOf('--email');
  const nameIdx = args.indexOf('--name');
  const passEnvIdx = args.indexOf('--password-env');

  let email = emailIdx !== -1 ? args[emailIdx + 1] : '';
  let fullName = nameIdx !== -1 ? args[nameIdx + 1] : '';
  let password = '';

  if (passEnvIdx !== -1) {
    const envVarName = args[passEnvIdx + 1];
    password = process.env[envVarName] || '';
  }

  console.log('=============================================================================');
  console.log('AI-Powered Indian Marketplace Trust Intelligence Platform');
  console.log('Secure Offline Administrator Provisioning Tool');
  console.log('=============================================================================');

  try {
    if (!email) {
      email = await prompt('Enter administrator email: ');
    }
    if (!fullName) {
      fullName = await prompt('Enter administrator full name: ');
    }
    if (!password) {
      password = await promptHidden('Enter administrator password (min 12 chars, upper, lower, digit, special): ');
      const confirm = await promptHidden('Confirm administrator password: ');
      if (password !== confirm) {
        throw new Error('Passwords do not match.');
      }
    }

    console.log('\n[INFO] Validating and provisioning administrator in database...');
    const result = await provisionAdmin({
      email,
      fullName,
      password,
      force
    });

    console.log('\n=============================================================================');
    console.log('[SUCCESS] Administrator account successfully provisioned.');
    console.log('=============================================================================');
    console.log(`  User ID    : ${result.userId}`);
    console.log(`  Email      : ${result.email}`);
    console.log(`  Full Name  : ${result.fullName}`);
    console.log(`  Role       : ${result.role}`);
    console.log(`  Status     : ${result.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log('=============================================================================');
    console.log('NOTE: The password has been hashed with Argon2id and never logged.');
  } catch (err: unknown) {
    console.error('\n[PROVISIONING FAILED]');
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await closeApplicationPool();
  }
}

if (require.main === module) {
  main();
}
