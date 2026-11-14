import { createMigrationPool } from '../src/config/database';

async function main() {
  const pool = createMigrationPool();
  try {
    console.log('[INFO] Widening brand_id column to VARCHAR(100)...');
    
    // 1. Drop foreign key
    console.log('1. Dropping foreign key fk_products_brand on canonical_products...');
    await pool.query('ALTER TABLE canonical_products DROP FOREIGN KEY fk_products_brand');

    // 2. Modify brands.brand_id
    console.log('2. Modifying brands.brand_id to VARCHAR(100)...');
    await pool.query('ALTER TABLE brands MODIFY COLUMN brand_id VARCHAR(100) NOT NULL');

    // 3. Modify canonical_products.brand_id
    console.log('3. Modifying canonical_products.brand_id to VARCHAR(100)...');
    await pool.query('ALTER TABLE canonical_products MODIFY COLUMN brand_id VARCHAR(100) NOT NULL');

    // 4. Re-add foreign key fk_products_brand
    console.log('4. Re-adding foreign key fk_products_brand...');
    await pool.query(`
      ALTER TABLE canonical_products 
      ADD CONSTRAINT fk_products_brand 
      FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE RESTRICT
    `);

    console.log('[SUCCESS] Successfully widened brand_id to VARCHAR(100) and verified foreign key constraint!');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
