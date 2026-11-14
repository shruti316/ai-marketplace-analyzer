import { RowDataPacket } from 'mysql2/promise';
import { createMigrationPool } from '../src/config/database';

interface CountResult extends RowDataPacket {
  cnt: number;
}

interface UserResult extends RowDataPacket {
  id: string;
  email: string;
  role: string;
  is_active: number;
}

export async function runPostSeedAudit(): Promise<boolean> {
  const pool = createMigrationPool();
  console.log('=============================================================================');
  console.log('POST-SEEDING INDEPENDENT REFERENTIAL INTEGRITY AUDIT');
  console.log('=============================================================================');

  let allPassed = true;

  try {
    // 1. Table Counts Audit
    const expectedCounts: Record<string, number> = {
      platforms: 3,
      brands: 1593,
      sellers: 4,
      canonical_products: 3643,
      marketplace_listings: 3643,
      price_history: 3667,
      trust_assessments: 3643,
      users: 1,
      annotation_tasks: 600,
      ground_truth_annotations: 100,
      annotation_task_assignments: 0,
      annotation_adjudications: 0,
      product_comparisons: 0,
      product_comparison_items: 0,
      user_sessions: 0,
      schema_migrations: 1
    };

    console.log('\n1. ROW COUNTS AUDIT:');
    for (const [table, expected] of Object.entries(expectedCounts)) {
      const [rows] = await pool.query<CountResult[]>(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
      const actual = rows[0]?.cnt ?? 0;
      const match = actual === expected;
      if (!match) allPassed = false;
      console.log(`   - ${table.padEnd(30)}: Actual: ${String(actual).padEnd(6)} | Expected: ${String(expected).padEnd(6)} [${match ? 'PASS' : 'FAIL'}]`);
    }

    // 2. Orphan Checks
    console.log('\n2. REFERENTIAL INTEGRITY & ORPHAN CHECKS:');

    // GT Annotations -> Annotation Tasks
    const [orphanAnnTasks] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM ground_truth_annotations g
      LEFT JOIN annotation_tasks t ON g.task_id = t.id
      WHERE t.id IS NULL
    `);
    const annTaskOrphans = orphanAnnTasks[0]?.cnt ?? 0;
    console.log(`   - ground_truth_annotations -> annotation_tasks orphans: ${annTaskOrphans} [${annTaskOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (annTaskOrphans > 0) allPassed = false;

    // GT Annotations -> Users
    const [orphanAnnUsers] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM ground_truth_annotations g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE u.id IS NULL
    `);
    const annUserOrphans = orphanAnnUsers[0]?.cnt ?? 0;
    console.log(`   - ground_truth_annotations -> users orphans: ${annUserOrphans} [${annUserOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (annUserOrphans > 0) allPassed = false;

    // Annotation Tasks -> Canonical Products
    const [orphanTaskProducts] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM annotation_tasks t
      LEFT JOIN canonical_products p ON t.canonical_product_id = p.canonical_product_id
      WHERE p.canonical_product_id IS NULL
    `);
    const taskProductOrphans = orphanTaskProducts[0]?.cnt ?? 0;
    console.log(`   - annotation_tasks -> canonical_products orphans: ${taskProductOrphans} [${taskProductOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (taskProductOrphans > 0) allPassed = false;

    // Price History -> Marketplace Listings
    const [orphanPrices] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM price_history ph
      LEFT JOIN marketplace_listings ml ON ph.listing_id = ml.listing_id
      WHERE ml.listing_id IS NULL
    `);
    const priceOrphans = orphanPrices[0]?.cnt ?? 0;
    console.log(`   - price_history -> marketplace_listings orphans: ${priceOrphans} [${priceOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (priceOrphans > 0) allPassed = false;

    // Marketplace Listings -> Canonical Products (composite)
    const [orphanListings] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM marketplace_listings ml
      LEFT JOIN canonical_products cp 
        ON ml.canonical_product_id = cp.canonical_product_id AND ml.platform_id = cp.platform_id
      WHERE cp.canonical_product_id IS NULL
    `);
    const listingOrphans = orphanListings[0]?.cnt ?? 0;
    console.log(`   - marketplace_listings -> canonical_products (composite) orphans: ${listingOrphans} [${listingOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (listingOrphans > 0) allPassed = false;

    // Marketplace Listings -> Sellers (composite)
    const [orphanListingSellers] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM marketplace_listings ml
      LEFT JOIN sellers s 
        ON ml.seller_id = s.seller_id AND ml.platform_id = s.platform_id
      WHERE s.seller_id IS NULL
    `);
    const listingSellerOrphans = orphanListingSellers[0]?.cnt ?? 0;
    console.log(`   - marketplace_listings -> sellers (composite) orphans: ${listingSellerOrphans} [${listingSellerOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (listingSellerOrphans > 0) allPassed = false;

    // Canonical Products -> Brands
    const [orphanProdBrands] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM canonical_products cp
      LEFT JOIN brands b ON cp.brand_id = b.brand_id
      WHERE b.brand_id IS NULL
    `);
    const prodBrandOrphans = orphanProdBrands[0]?.cnt ?? 0;
    console.log(`   - canonical_products -> brands orphans: ${prodBrandOrphans} [${prodBrandOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (prodBrandOrphans > 0) allPassed = false;

    // Trust Assessments -> Canonical Products
    const [orphanAssessments] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM trust_assessments ta
      LEFT JOIN canonical_products cp ON ta.canonical_product_id = cp.canonical_product_id
      WHERE cp.canonical_product_id IS NULL
    `);
    const assessmentOrphans = orphanAssessments[0]?.cnt ?? 0;
    console.log(`   - trust_assessments -> canonical_products orphans: ${assessmentOrphans} [${assessmentOrphans === 0 ? 'PASS' : 'FAIL'}]`);
    if (assessmentOrphans > 0) allPassed = false;

    // 3. Bootstrap System User Verification
    console.log('\n3. BOOTSTRAP USER SECURITY AUDIT:');
    const [users] = await pool.query<UserResult[]>(`
      SELECT id, email, role, is_active FROM users WHERE id = '00000000-0000-0000-0000-000000000001'
    `);
    const bUser = users[0];
    const userValid = (
      bUser &&
      bUser.email === 'system.expert.annotator@marketplace-trust.internal' &&
      bUser.role === 'ANALYST' &&
      bUser.is_active === 0
    );
    console.log(`   - User ID: ${bUser?.id}`);
    console.log(`   - Email: ${bUser?.email}`);
    console.log(`   - Role: ${bUser?.role}`);
    console.log(`   - is_active: ${bUser?.is_active} (Must be 0 / false locked account)`);
    console.log(`   - Bootstrap User Invariant: [${userValid ? 'PASS' : 'FAIL'}]`);
    if (!userValid) allPassed = false;

    // 4. Missing Price 0.00 Sentinel Audit
    console.log('\n4. MISSING PRICE SENTINEL AUDIT:');
    const [missingPrices] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt FROM price_history 
      WHERE is_valid_price = 0 AND mrp_inr = 0.00 AND selling_price_inr = 0.00
    `);
    const missingCount = missingPrices[0]?.cnt ?? 0;
    const [validPrices] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt FROM price_history 
      WHERE is_valid_price = 1
    `);
    const validCount = validPrices[0]?.cnt ?? 0;
    const priceValid = missingCount === 20 && validCount === 3647;
    console.log(`   - Missing prices (0.00 sentinel, is_valid_price = 0): ${missingCount} (Expected: 20)`);
    console.log(`   - Valid prices (is_valid_price = 1): ${validCount} (Expected: 3647)`);
    console.log(`   - Total Price Observations: ${missingCount + validCount} (Expected: 3667)`);
    console.log(`   - Price Sentinel Invariant: [${priceValid ? 'PASS' : 'FAIL'}]`);
    if (!priceValid) allPassed = false;

    // 5. Annotation Tasks Breakdown
    console.log('\n5. ANNOTATION TASKS PARTITIONING AUDIT:');
    const [pendingTasks] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt FROM annotation_tasks WHERE task_status = 'PENDING'
    `);
    const pendingCount = pendingTasks[0]?.cnt ?? 0;

    const [adjudicatedTasks] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt FROM annotation_tasks WHERE task_status = 'ADJUDICATED' AND id LIKE 'task_ann_hist_%'
    `);
    const adjudicatedCount = adjudicatedTasks[0]?.cnt ?? 0;
    const taskValid = pendingCount === 500 && adjudicatedCount === 100;
    console.log(`   - Pending Tasks (Runtime Queue): ${pendingCount} (Expected: 500)`);
    console.log(`   - Historical Parent Tasks (task_ann_hist_*): ${adjudicatedCount} (Expected: 100)`);
    console.log(`   - Annotation Task Partitioning Invariant: [${taskValid ? 'PASS' : 'FAIL'}]`);
    if (!taskValid) allPassed = false;

    // 6. Review Table Non-Existence Invariant
    console.log('\n6. PARQUET REVIEWS STORAGE ISOLATION AUDIT:');
    const [reviewTables] = await pool.query<CountResult[]>(`
      SELECT COUNT(*) AS cnt 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'marketplace_trust_intelligence' AND TABLE_NAME = 'reviews'
    `);
    const reviewTableCount = reviewTables[0]?.cnt ?? 0;
    const reviewIsolationValid = reviewTableCount === 0;
    console.log(`   - 'reviews' Table in MySQL: ${reviewTableCount} (Must be 0; reviews remain in Parquet store)`);
    console.log(`   - Review Storage Isolation Invariant: [${reviewIsolationValid ? 'PASS' : 'FAIL'}]`);
    if (!reviewIsolationValid) allPassed = false;

    console.log('\n=============================================================================');
    console.log(`POST-SEED AUDIT RESULT: ${allPassed ? 'ALL VERIFICATIONS PASSED (100%)' : 'AUDIT FAILED'}`);
    console.log('=============================================================================');

    return allPassed;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runPostSeedAudit()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(err => {
      console.error('[FATAL POST SEED AUDIT ERROR]', err);
      process.exit(1);
    });
}
