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

export interface ResetPasswordOptions {
  email: string;
  password: string;
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
 * Resets an existing administrator's password using Argon2id.
 * Validates invariants to ensure the historical bootstrap account is untouched.
 */
export async function resetAdminPassword(options: ResetPasswordOptions): Promise<ProvisionResult> {
  const email = options.email.trim().toLowerCase();
  const password = options.password;

  validateAdminEmail(email);
  validateAdminPassword(password);

  const pool = getApplicationPool();

  const [existingUser] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, full_name, role, is_active FROM users WHERE email = ?',
    [email]
  );

  if (existingUser.length === 0) {
    throw new Error(`No user found with email "${email}".`);
  }

  if (existingUser[0].id === BOOTSTRAP_REVIEWER_ID) {
    throw new Error(
      'Refusing to activate or reassign the historical bootstrap reviewer account.'
    );
  }

  const passwordHash = await hash(password);
  const now = new Date();

  await pool.query<ResultSetHeader>(
    'UPDATE users SET password_hash = ?, is_active = 1, updated_at = ? WHERE id = ?',
    [passwordHash, now, existingUser[0].id]
  );

  return {
    userId: existingUser[0].id,
    email: existingUser[0].email,
    fullName: existingUser[0].full_name,
    role: existingUser[0].role,
    isActive: true
  };
}

/**
 * Safe, robust interactive CLI session for PowerShell and terminal environments.
 * Buffers incoming lines without closing or leaking the underlying standard streams.
 */
export class InteractiveCli {
  private rl: readline.Interface | null = null;
  private queue: string[] = [];
  private pendingResolve: ((value: string) => void) | null = null;
  private isClosed = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.rl.on('line', (line) => {
      const trimmed = line.trim();
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve(trimmed);
      } else {
        this.queue.push(trimmed);
      }
    });

    this.rl.on('close', () => {
      this.isClosed = true;
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve('');
      }
    });
  }

  async ask(query: string): Promise<string> {
    if (this.queue.length > 0) {
      process.stdout.write(query);
      const val = this.queue.shift()!;
      process.stdout.write(val + '\n');
      return val;
    }
    if (this.isClosed) {
      return '';
    }
    process.stdout.write(query);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  async askHidden(query: string): Promise<string> {
    // If not in TTY mode, fall back to buffered ask (for automated pipes / CI)
    if (!process.stdin.isTTY) {
      return this.ask(query);
    }

    return new Promise((resolve) => {
      process.stdout.write(query);

      if (this.rl) {
        this.rl.pause();
      }

      const stdin = process.stdin;
      const oldRaw = stdin.isRaw;
      stdin.setRawMode(true);
      stdin.resume();

      let password = '';

      const onData = (chunk: Buffer) => {
        const str = chunk.toString('utf-8');

        for (let i = 0; i < str.length; i++) {
          const char = str[i];

          // Enter key (\r or \n)
          if (char === '\r' || char === '\n') {
            cleanup();
            process.stdout.write('\n');
            resolve(password);
            return;
          }

          // Ctrl+C
          if (char === '\u0003') {
            cleanup();
            process.stdout.write('\n\n[CANCELLED] Operation cancelled by user.\n');
            process.exit(130);
          }

          // Backspace (\b, \x7f, \x08)
          if (char === '\b' || char === '\x7f' || char === '\x08') {
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            continue;
          }

          // Ignore ANSI escape codes
          if (char === '\u001b') {
            if (i + 1 < str.length && str[i + 1] === '[') {
              i += 2;
              while (i < str.length && str[i] >= '0' && str[i] <= '?') {
                i++;
              }
            }
            continue;
          }

          // Printable characters
          if (char >= ' ' && char <= '~') {
            password += char;
            process.stdout.write('*');
          }
        }
      };

      const cleanup = () => {
        stdin.removeListener('data', onData);
        stdin.setRawMode(Boolean(oldRaw));
        if (this.rl && !this.isClosed) {
          this.rl.resume();
        }
      };

      stdin.on('data', onData);
    });
  }

  close(): void {
    if (this.rl && !this.isClosed) {
      this.rl.close();
      this.isClosed = true;
    }
  }
}

/**
 * CLI Entrypoint.
 */
async function main() {
  const args = process.argv.slice(2);
  let force = args.includes('--force');
  const isReset = args.includes('--reset') || args.includes('--reset-password');

  // Extract optional flags
  const emailIdx = args.indexOf('--email');
  const nameIdx = args.indexOf('--name');
  const passEnvIdx = args.indexOf('--password-env');

  let email = emailIdx !== -1 ? (args[emailIdx + 1] || '') : '';
  let fullName = nameIdx !== -1 ? (args[nameIdx + 1] || '') : '';
  let password = '';

  if (passEnvIdx !== -1) {
    const envVarName = args[passEnvIdx + 1];
    password = (envVarName && process.env[envVarName]) ? process.env[envVarName]! : '';
  }

  console.log('=============================================================================');
  console.log('AI-Powered Indian Marketplace Trust Intelligence Platform');
  console.log(isReset ? 'Secure Offline Administrator Password Reset Tool' : 'Secure Offline Administrator Provisioning Tool');
  console.log('=============================================================================');

  const cli = new InteractiveCli();
  const pool = getApplicationPool();

  try {
    // -------------------------------------------------------------------------
    // PASSWORD RESET WORKFLOW (--reset)
    // -------------------------------------------------------------------------
    if (isReset) {
      while (!email) {
        const inputEmail = await cli.ask('Enter administrator email to reset: ');
        if (!inputEmail) {
          console.log('[ERROR] Email cannot be empty. Please enter an email address.');
          continue;
        }
        try {
          validateAdminEmail(inputEmail);
          email = inputEmail;
        } catch (err: unknown) {
          console.log(`[INVALID EMAIL] ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Verify email exists in database
      const [existingUsers] = await pool.query<RowDataPacket[]>(
        'SELECT id, email, full_name, role, is_active FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length === 0) {
        console.log(`\n[OPERATION FAILED] No user found with email "${email}".`);
        process.exitCode = 1;
        return;
      }

      if (existingUsers[0].id === BOOTSTRAP_REVIEWER_ID) {
        console.log('\n[OPERATION FAILED] Refusing to activate or reassign the historical bootstrap reviewer account.');
        process.exitCode = 1;
        return;
      }

      // Prompt for new password
      while (!password) {
        const inputPass = await cli.askHidden('Enter new administrator password (min 12 chars, upper, lower, digit, special): ');
        try {
          validateAdminPassword(inputPass);
          password = inputPass;
        } catch (err: unknown) {
          console.log(`[INVALID PASSWORD] ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      while (true) {
        const confirm = await cli.askHidden('Confirm new administrator password: ');
        if (confirm === password) {
          break;
        }
        console.log('[MISMATCH] Passwords do not match. Please try again.');
      }

      console.log('\n[INFO] Validating and resetting administrator password in database...');
      const result = await resetAdminPassword({ email, password });

      console.log('\n=============================================================================');
      console.log('[SUCCESS] Administrator password successfully updated.');
      console.log('=============================================================================');
      console.log(`  User ID    : ${result.userId}`);
      console.log(`  Email      : ${result.email}`);
      console.log(`  Full Name  : ${result.fullName}`);
      console.log(`  Role       : ${result.role}`);
      console.log(`  Status     : ${result.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log('=============================================================================');
      console.log('NOTE: The password has been hashed with Argon2id and never logged.');
      return;
    }

    // -------------------------------------------------------------------------
    // STANDARD PROVISIONING WORKFLOW
    // -------------------------------------------------------------------------

    // Step 1: Prompt for administrator email
    while (!email) {
      const inputEmail = await cli.ask('Enter administrator email: ');
      if (!inputEmail) {
        console.log('[ERROR] Email cannot be empty. Please enter an email address.');
        continue;
      }
      try {
        validateAdminEmail(inputEmail);
        email = inputEmail;
      } catch (err: unknown) {
        console.log(`[INVALID EMAIL] ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 2: Prompt for administrator full name
    while (!fullName) {
      const inputName = await cli.ask('Enter administrator full name: ');
      if (!inputName || inputName.length > 150) {
        console.log('[INVALID NAME] Full name is required and must not exceed 150 characters.');
        continue;
      }
      fullName = inputName;
    }

    // Step 3: Detect whether administrator already exists BEFORE asking for password
    const [existingUserRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, full_name, role, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUserRows.length > 0) {
      const existing = existingUserRows[0];
      if (existing.id === BOOTSTRAP_REVIEWER_ID) {
        console.log('\n[OPERATION FAILED] Refusing to activate or reassign the historical bootstrap reviewer account.');
        process.exitCode = 1;
        return;
      }

      console.log(`\n[NOTICE] An account with email "${email}" already exists (Role: ${existing.role}).`);
      const resetChoice = await cli.ask('Would you like to reset their password instead? (y/N): ');
      if (resetChoice.toLowerCase() !== 'y' && resetChoice.toLowerCase() !== 'yes') {
        console.log('\nOperation cancelled. No changes were made.');
        return;
      }

      // Prompt for new password to reset
      while (!password) {
        const inputPass = await cli.askHidden('Enter new administrator password (min 12 chars, upper, lower, digit, special): ');
        try {
          validateAdminPassword(inputPass);
          password = inputPass;
        } catch (err: unknown) {
          console.log(`[INVALID PASSWORD] ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      while (true) {
        const confirm = await cli.askHidden('Confirm new administrator password: ');
        if (confirm === password) {
          break;
        }
        console.log('[MISMATCH] Passwords do not match. Please try again.');
      }

      console.log('\n[INFO] Validating and resetting administrator password in database...');
      const resetResult = await resetAdminPassword({ email, password });

      console.log('\n=============================================================================');
      console.log('[SUCCESS] Administrator password successfully updated.');
      console.log('=============================================================================');
      console.log(`  User ID    : ${resetResult.userId}`);
      console.log(`  Email      : ${resetResult.email}`);
      console.log(`  Full Name  : ${resetResult.fullName}`);
      console.log(`  Role       : ${resetResult.role}`);
      console.log(`  Status     : ${resetResult.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log('=============================================================================');
      console.log('NOTE: The password has been hashed with Argon2id and never logged.');
      return;
    }

    // Step 4: Check if other active administrator(s) exist and prompt confirmation
    const [existingAdmins] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, full_name FROM users WHERE role = ? AND is_active = 1',
      ['ADMIN']
    );

    if (existingAdmins.length > 0 && !force) {
      console.log(`\n[NOTICE] An active administrator account already exists (${existingAdmins[0].email}).`);
      const addChoice = await cli.ask(
        `Would you like to provision "${email}" as an additional administrator? (y/N): `
      );
      if (addChoice.toLowerCase() !== 'y' && addChoice.toLowerCase() !== 'yes') {
        console.log('\nOperation cancelled. No additional administrator was created.');
        return;
      }
      force = true;
    }

    // Step 5: Prompt for masked password
    while (!password) {
      const inputPass = await cli.askHidden('Enter administrator password (min 12 chars, upper, lower, digit, special): ');
      try {
        validateAdminPassword(inputPass);
        password = inputPass;
      } catch (err: unknown) {
        console.log(`[INVALID PASSWORD] ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 6: Confirm password
    while (true) {
      const confirm = await cli.askHidden('Confirm administrator password: ');
      if (confirm === password) {
        break;
      }
      console.log('[MISMATCH] Passwords do not match. Please try again.');
    }

    // Step 7: Create administrator using Argon2id
    console.log('\n[INFO] Validating and provisioning administrator in database...');
    const result = await provisionAdmin({
      email,
      fullName,
      password,
      force
    });

    // Step 8: Safe success confirmation
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
    console.error('\n[OPERATION FAILED]');
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    cli.close();
    await closeApplicationPool();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(process.exitCode || 0);
    })
    .catch((err) => {
      console.error('\n[FATAL ERROR]', err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
