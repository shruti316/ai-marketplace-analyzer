import { RowDataPacket } from 'mysql2/promise';
import { createMigrationPool } from '../src/config/database';
import { getEnv } from '../src/config/env';

interface TableRow extends RowDataPacket {
  TABLE_NAME: string;
  ENGINE: string;
  TABLE_COLLATION: string;
}

interface ConstraintRow extends RowDataPacket {
  CONSTRAINT_NAME: string;
  TABLE_NAME: string;
  CONSTRAINT_TYPE: string;
}

interface KeyUsageRow extends RowDataPacket {
  CONSTRAINT_NAME: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  ORDINAL_POSITION: number;
}

interface CheckConstraintRow extends RowDataPacket {
  CONSTRAINT_NAME: string;
  CHECK_CLAUSE: string;
}

interface MigrationRow extends RowDataPacket {
  version: number;
  name: string;
  checksum: string;
  status: string;
  execution_time_ms: number;
  applied_at: string;
}

export async function verifyLiveSchema(): Promise<boolean> {
  const env = getEnv();
  const dbName = env.DB_NAME;
  const pool = createMigrationPool();

  console.log('=============================================================================');
  console.log(`LIVE MYSQL SCHEMA AUDIT: [${dbName}]`);
  console.log('=============================================================================');

  try {
    // 1. Table Inventory
    const [tables] = await pool.query<TableRow[]>(
      `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? 
       ORDER BY TABLE_NAME ASC`,
      [dbName]
    );

    console.log(`\n1. TABLES IN DATABASE (${tables.length} tables found):`);
    for (const t of tables) {
      console.log(`   - ${t.TABLE_NAME.padEnd(30)} [Engine: ${t.ENGINE}, Collation: ${t.TABLE_COLLATION}]`);
    }

    const expectedDomainTables = [
      'annotation_adjudications',
      'annotation_task_assignments',
      'annotation_tasks',
      'brands',
      'canonical_products',
      'ground_truth_annotations',
      'marketplace_listings',
      'platforms',
      'price_history',
      'product_comparison_items',
      'product_comparisons',
      'schema_migrations',
      'sellers',
      'trust_assessments',
      'user_sessions',
      'users'
    ];

    const actualTableNames = tables.map(t => t.TABLE_NAME);
    const hasAllTables = expectedDomainTables.every(t => actualTableNames.includes(t));
    console.log(`\nTable Set Verification: ${hasAllTables && tables.length === 16 ? 'PASS (Exactly 16 expected tables)' : 'FAIL'}`);

    // 2. Foreign Key Constraints
    const [fks] = await pool.query<ConstraintRow[]>(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE 
       FROM information_schema.TABLE_CONSTRAINTS 
       WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'
       ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
      [dbName]
    );

    console.log(`\n2. FOREIGN KEY CONSTRAINTS (${fks.length} found, expected 19):`);
    for (const fk of fks) {
      console.log(`   - Table: ${fk.TABLE_NAME.padEnd(28)} FK: ${fk.CONSTRAINT_NAME}`);
    }

    // Detailed Composite FK check on marketplace_listings
    const [keyCols] = await pool.query<KeyUsageRow[]>(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, ORDINAL_POSITION
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE CONSTRAINT_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
      [dbName]
    );

    console.log(`\n3. KEY COLUMN USAGE & COMPOSITE FK VERIFICATION:`);
    const listingsFks = keyCols.filter(k => k.TABLE_NAME === 'marketplace_listings');
    for (const k of listingsFks) {
      console.log(`   - ${k.TABLE_NAME}.${k.COLUMN_NAME} -> ${k.REFERENCED_TABLE_NAME}.${k.REFERENCED_COLUMN_NAME} (${k.CONSTRAINT_NAME} pos:${k.ORDINAL_POSITION})`);
    }

    // 4. CHECK Constraints
    const [checks] = await pool.query<CheckConstraintRow[]>(
      `SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
       FROM information_schema.CHECK_CONSTRAINTS 
       WHERE CONSTRAINT_SCHEMA = ?
       ORDER BY CONSTRAINT_NAME`,
      [dbName]
    );

    console.log(`\n4. CHECK CONSTRAINTS (${checks.length} found, expected 26):`);
    for (const c of checks) {
      console.log(`   - ${c.CONSTRAINT_NAME.padEnd(36)}: ${c.CHECK_CLAUSE}`);
    }

    // 5. Schema Migrations Table Record
    const [migrations] = await pool.query<MigrationRow[]>(
      `SELECT version, name, checksum, status, execution_time_ms, applied_at 
       FROM schema_migrations 
       ORDER BY version ASC`
    );

    console.log(`\n5. SCHEMA MIGRATIONS AUDIT:`);
    for (const m of migrations) {
      console.log(`   - Version ${m.version}: ${m.name} | Status: ${m.status} | Execution: ${m.execution_time_ms}ms | Checksum: ${m.checksum} | Applied: ${m.applied_at}`);
    }

    // 6. Summary Evaluation
    const passed = (
      tables.length === 16 &&
      hasAllTables &&
      fks.length === 19 &&
      checks.length === 26 &&
      migrations.length === 1 &&
      migrations[0].status === 'COMPLETED'
    );

    console.log('\n=============================================================================');
    console.log(`SCHEMA AUDIT SUMMARY: ${passed ? 'ALL CHECKS PASSED (100%)' : 'AUDIT FAILED'}`);
    console.log('=============================================================================');

    return passed;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  verifyLiveSchema()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(err => {
      console.error('[FATAL SCHEMA AUDIT ERROR]', err);
      process.exit(1);
    });
}
