import { createMigrationPool } from '../src/config/database';

async function main() {
  const pool = createMigrationPool();
  try {
    const [cols] = await pool.query(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA='marketplace_trust_intelligence' AND COLUMN_NAME LIKE '%brand%'`
    );
    console.log('Columns matching brand:');
    console.table(cols);

    const [createTable] = await pool.query('SHOW CREATE TABLE brands');
    console.log('SHOW CREATE TABLE brands:');
    console.log((createTable as any)[0]['Create Table']);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
