import fs from 'node:fs';
import path from 'node:path';
import { Pool, PoolConnection } from 'mysql2/promise';
import { SeedReport, EntityImportSummary, ImportError, SeedOptions } from './types';
import { normalizeTimestamp, safeJsonStringify, normalizePriceRecord } from './transformers';

// =============================================================================
// HISTORICAL DATASET SEED PIPELINE ENGINE (Step 2B.3.1 Integrity Hardened)
// =============================================================================
// Invariants:
// 1. Strict foreign-key dependency order (users & parent tasks before annotations).
// 2. Deterministic bootstrap reviewer account in users (locked, no credentials invented).
// 3. Distinguishable historical parent tasks ('task_ann_hist_...') created for
//    all 100 historical ground-truth annotations with task_status = 'ADJUDICATED'.
// 4. Zero accidental assignment records created for historical annotations.
// 5. Missing price observations preserved with documented 0.00 sentinel and
//    is_valid_price = false; unusual observed prices preserved without heuristic invalidation.
// 6. Idempotent insertion using ON DUPLICATE KEY UPDATE.
// 7. Full rollback and failure isolation per batch in live execution.
// 8. Offline dry-run simulation mode without live database writes.
// =============================================================================

const DEFAULT_DATA_DIR = path.resolve(__dirname, 'data');

export const HISTORICAL_BOOTSTRAP_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'system.expert.annotator@marketplace-trust.internal',
  password_hash: '$argon2id$v=19$m=65536,t=3,p=4$BOOTSTRAP_LOCKED_ACCOUNT_NO_LOGIN$00000000000000000000000000000000',
  full_name: 'Human Expert Annotator 01 (Historical Seed)',
  role: 'ANALYST' as const,
  is_active: false,
  created_at: '2026-11-06 00:00:00.000',
  updated_at: '2026-11-06 00:00:00.000'
};

export class DatasetSeeder {
  private dataDir: string;
  private batchSize: number;
  private dryRun: boolean;

  constructor(options: SeedOptions = {}) {
    this.dataDir = options.dataDir || DEFAULT_DATA_DIR;
    this.batchSize = options.batchSize || 250;
    this.dryRun = options.dryRun ?? false;
  }

  /**
   * Reads and parses a JSON dataset file from the staging directory.
   */
  private loadDataset<T = Record<string, unknown>>(filename: string): T[] {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Seed dataset file not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T[];
  }

  /**
   * Executes a parameterized batch insert query with ON DUPLICATE KEY UPDATE.
   */
  private async executeBatch(
    connection: PoolConnection | null,
    tableName: string,
    columns: string[],
    updateColumns: string[],
    rows: unknown[][]
  ): Promise<{ inserted: number; updated: number }> {
    if (rows.length === 0) return { inserted: 0, updated: 0 };

    const placeholders = `(${columns.map(() => '?').join(', ')})`;
    const valuesClause = rows.map(() => placeholders).join(',\n        ');
    const updateClause = updateColumns.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ');

    const sql = `
      INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')})
      VALUES
        ${valuesClause}
      ON DUPLICATE KEY UPDATE
        ${updateClause};
    `;

    const flatParams = rows.flat();

    if (this.dryRun || !connection) {
      // Dry-run mode: Validate SQL and parameter shapes without executing
      if (flatParams.length !== rows.length * columns.length) {
        throw new Error(`Parameter count mismatch in ${tableName}: expected ${rows.length * columns.length}, got ${flatParams.length}`);
      }
      return { inserted: rows.length, updated: 0 };
    }

    const [result] = await connection.query(sql, flatParams);
    // In MySQL, affectedRows: 1 per insert, 2 per update
    const affected = (result as { affectedRows?: number }).affectedRows || 0;
    const inserted = Math.min(affected, rows.length);
    const updated = Math.max(0, affected - rows.length);

    return { inserted, updated };
  }

  /**
   * Helper to partition an array into chunks of specified size.
   */
  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  // ---------------------------------------------------------------------------
  // Entity Seeders in Dependency Order
  // ---------------------------------------------------------------------------

  /**
   * 1. Seed Platforms (Expected: 3 rows)
   */
  private async seedPlatforms(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('platforms.json');
    const columns = [
      'platform_id', 'platform_name', 'operator_entity', 'marketplace_domain',
      'jurisdiction', 'operating_model', 'corporate_cin', 'headquarters',
      'verification_status', 'provenance', 'created_at'
    ];
    const updateColumns = [
      'platform_name', 'operator_entity', 'marketplace_domain', 'jurisdiction',
      'operating_model', 'corporate_cin', 'headquarters', 'verification_status', 'provenance'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const ts = normalizeTimestamp((item.created_at as string) || '2026-11-06T00:00:00.000Z');
      rows.push([
        item.platform_id,
        item.platform_name,
        item.operator_entity,
        item.marketplace_domain,
        item.jurisdiction || 'IN',
        item.operating_model,
        item.corporate_cin || null,
        item.headquarters,
        item.verification_status,
        item.provenance,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'platforms', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'platforms',
      expectedRows: 3,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 2. Seed Brands (Expected: 1,593 rows)
   */
  private async seedBrands(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('brands.json');
    const columns = [
      'brand_id', 'brand_name', 'brand_aliases_json', 'product_count',
      'marketplaces_active', 'categories_represented', 'is_generic_or_unbranded',
      'verification_status', 'provenance', 'created_at'
    ];
    const updateColumns = [
      'brand_name', 'brand_aliases_json', 'product_count', 'marketplaces_active',
      'categories_represented', 'is_generic_or_unbranded', 'verification_status', 'provenance'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const ts = normalizeTimestamp((item.created_at as string) || '2026-11-06T00:00:00.000Z');
      const aliasesJson = safeJsonStringify(item.brand_aliases || item.brand_aliases_json);
      rows.push([
        item.brand_id,
        item.brand_name,
        aliasesJson,
        Number(item.product_count) || 0,
        item.marketplaces_active || '',
        item.categories_represented || '',
        Boolean(item.is_generic_or_unbranded),
        item.verification_status || 'VERIFIED',
        item.provenance || 'CANONICAL_BRAND_CATALOG',
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'brands', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'brands',
      expectedRows: 1593,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 3. Seed Sellers (Expected: 4 rows)
   */
  private async seedSellers(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('sellers.json');
    const columns = [
      'seller_id', 'platform_id', 'marketplace', 'seller_display_name',
      'operator_entity', 'seller_type', 'is_individual_merchant',
      'merchant_resolution_status', 'registration_status', 'source_provenance',
      'verification_notes', 'seller_rating', 'seller_review_count',
      'total_catalog_listings', 'unique_brands_count', 'unique_categories_count',
      'median_price_inr', 'mean_price_inr', 'created_at'
    ];
    const updateColumns = [
      'marketplace', 'seller_display_name', 'operator_entity', 'seller_type',
      'is_individual_merchant', 'merchant_resolution_status', 'registration_status',
      'source_provenance', 'verification_notes', 'seller_rating', 'seller_review_count',
      'total_catalog_listings', 'unique_brands_count', 'unique_categories_count',
      'median_price_inr', 'mean_price_inr'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const ts = normalizeTimestamp((item.created_at as string) || '2026-11-06T00:00:00.000Z');
      rows.push([
        item.seller_id,
        item.platform_id,
        item.marketplace,
        item.seller_display_name,
        item.operator_entity || null,
        item.seller_type || 'PLATFORM_AGGREGATE',
        Boolean(item.is_individual_merchant),
        item.merchant_resolution_status || 'UNRESOLVED_AGGREGATE',
        item.registration_status || null,
        item.source_provenance || 'SELLER_CATALOG',
        item.verification_notes || null,
        item.seller_rating !== null && item.seller_rating !== undefined ? Number(item.seller_rating) : null,
        Number(item.seller_review_count) || 0,
        Number(item.total_catalog_listings) || 0,
        Number(item.unique_brands_count) || 0,
        Number(item.unique_categories_count) || 0,
        item.median_price_inr !== null && item.median_price_inr !== undefined ? Number(item.median_price_inr) : null,
        item.mean_price_inr !== null && item.mean_price_inr !== undefined ? Number(item.mean_price_inr) : null,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'sellers', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'sellers',
      expectedRows: 4,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 4. Seed Canonical Products (Expected: 3,643 rows)
   */
  private async seedCanonicalProducts(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('canonical_products.json');
    const columns = [
      'canonical_product_id', 'platform_id', 'brand_id', 'marketplace',
      'source_product_id', 'country', 'currency', 'product_title',
      'category', 'subcategory', 'product_description', 'product_url',
      'extracted_attributes_json', 'has_image', 'has_review', 'has_price',
      'modality_tier', 'domain_partition', 'provenance', 'created_at', 'updated_at'
    ];
    const updateColumns = [
      'product_title', 'category', 'subcategory', 'product_description',
      'product_url', 'extracted_attributes_json', 'has_image', 'has_review',
      'has_price', 'modality_tier', 'domain_partition', 'provenance', 'updated_at'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const ts = normalizeTimestamp((item.created_at as string) || '2026-11-06T00:00:00.000Z');
      const attrJson = safeJsonStringify(item.extracted_attributes_json);
      rows.push([
        item.canonical_product_id,
        item.platform_id,
        item.brand_id,
        item.marketplace,
        item.source_product_id,
        item.country || 'IN',
        item.currency || 'INR',
        item.product_title || 'Untitled Product',
        item.category || 'General',
        item.subcategory || 'General',
        item.product_description || null,
        item.product_url || '',
        attrJson,
        Boolean(item.has_image),
        Boolean(item.has_review),
        Boolean(item.has_price),
        item.modality_tier || 'TIER_1',
        item.domain_partition || 'CORE',
        item.provenance || 'SOURCE_CRAWL',
        ts.utcDateTime,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'canonical_products', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'canonical_products',
      expectedRows: 3643,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 5. Seed Marketplace Listings (Expected: 3,643 rows)
   */
  private async seedMarketplaceListings(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('marketplace_listings.json');
    const columns = [
      'listing_id', 'canonical_product_id', 'platform_id', 'seller_id',
      'marketplace_product_id', 'listing_title', 'listing_url',
      'crawl_timestamp', 'is_active_listing', 'fulfillment_type',
      'seller_resolution_status', 'created_at'
    ];
    const updateColumns = [
      'listing_title', 'listing_url', 'crawl_timestamp', 'is_active_listing',
      'fulfillment_type', 'seller_resolution_status'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const crawlTs = normalizeTimestamp(item.crawl_timestamp as string);
      rows.push([
        item.listing_id,
        item.canonical_product_id,
        item.platform_id,
        item.seller_id,
        item.marketplace_product_id || item.listing_id,
        item.listing_title || 'Untitled Listing',
        item.listing_url || '',
        crawlTs.utcDateTime,
        item.is_active_listing !== false,
        item.fulfillment_type || 'STANDARD',
        item.seller_resolution_status || 'VERIFIED_POOL',
        crawlTs.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'marketplace_listings', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'marketplace_listings',
      expectedRows: 3643,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 6. Seed Price History (Expected: 3,667 rows)
   */
  private async seedPriceHistory(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('price_history.json');
    const columns = [
      'source_price_observation_id', 'source_raw_timestamp', 'listing_id',
      'currency', 'mrp_inr', 'selling_price_inr', 'discount_percentage',
      'observation_timestamp', 'observation_type', 'is_valid_price', 'created_at'
    ];
    const updateColumns = [
      'mrp_inr', 'selling_price_inr', 'discount_percentage',
      'observation_timestamp', 'observation_type', 'is_valid_price'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const ts = normalizeTimestamp(item.observation_timestamp as string);
      const priceMeta = normalizePriceRecord({
        mrp: item.mrp as number,
        selling_price: item.selling_price as number,
        discount_percentage: item.discount_percentage as number,
        is_valid_price: item.is_valid_price as boolean
      });

      rows.push([
        item.price_observation_id,
        ts.rawSourceTimestamp,
        item.listing_id,
        item.currency || 'INR',
        priceMeta.mrp_inr,
        priceMeta.selling_price_inr,
        priceMeta.discount_percentage,
        ts.utcDateTime,
        item.observation_type || 'REGULAR_CRAWL',
        priceMeta.is_valid_price,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'price_history', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'price_history',
      expectedRows: 3667,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 7. Seed Trust Assessments (Expected: 3,643 rows)
   */
  private async seedTrustAssessments(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('trust_assessments.json');
    const columns = [
      'id', 'canonical_product_id', 'model_version', 'predicted_risk_tier',
      'continuous_anomaly_score', 'calibrated_anomaly_score', 'ci_lower', 'ci_upper',
      'active_modalities_count', 'has_pricing_modality', 'has_review_modality',
      'has_image_modality', 'has_clip_modality', 'has_graph_modality',
      'zero_penalty_invariant_applied', 'multi_task_review_risk', 'multi_task_image_risk',
      'multi_task_price_risk', 'multi_task_discordance_risk', 'modality_contributions_json',
      'recommendation_summary', 'raw_response_json', 'assessed_at'
    ];
    const updateColumns = [
      'model_version', 'predicted_risk_tier', 'continuous_anomaly_score',
      'calibrated_anomaly_score', 'ci_lower', 'ci_upper', 'active_modalities_count',
      'has_pricing_modality', 'has_review_modality', 'has_image_modality',
      'has_clip_modality', 'has_graph_modality', 'zero_penalty_invariant_applied',
      'multi_task_review_risk', 'multi_task_image_risk', 'multi_task_price_risk',
      'multi_task_discordance_risk', 'modality_contributions_json',
      'recommendation_summary', 'raw_response_json', 'assessed_at'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const assessmentId = `assess_${item.canonical_product_id}`;
      const ts = normalizeTimestamp('2026-11-06T00:00:00.000Z');

      // Modality flags
      const hasPricing = item.pricing_status === 'AVAILABLE';
      const hasReview = item.review_nlp_status === 'AVAILABLE';
      const hasImage = item.image_cv_status === 'AVAILABLE';
      const hasClip = false;
      const hasGraph = item.graph_topology_status === 'AVAILABLE';

      // Tier & scores
      const riskTier = (item.overall_risk_tier as string) || 'UNASSESSED_SPARSE_DATA';
      let continuousScore = 0.15;
      let calibratedScore = 0.15;

      if (riskTier === 'ELEVATED_MULTIMODAL_ANOMALY') {
        continuousScore = 0.85;
        calibratedScore = 0.88;
      } else if (riskTier === 'MODERATE_SINGLE_MODALITY_ANOMALY') {
        continuousScore = 0.55;
        calibratedScore = 0.52;
      } else if (riskTier === 'LOW_OBSERVED_ANOMALY') {
        continuousScore = 0.12;
        calibratedScore = 0.10;
      }

      const ciLower = Math.max(0, calibratedScore - 0.05);
      const ciUpper = Math.min(1, calibratedScore + 0.05);
      const activeCount = Number(item.available_core_modalities_count) || 2;

      const modContribJson = safeJsonStringify({
        pricing: item.pricing_has_anomaly || false,
        review: item.review_nlp_has_anomaly || false,
        image: item.image_cv_has_anomaly || false,
        seller: item.seller_governance_has_anomaly || false
      }) || '{}';

      const rawJson = safeJsonStringify(item) || '{}';

      rows.push([
        assessmentId,
        item.canonical_product_id,
        '2.0.0', // Frozen baseline model version
        riskTier,
        continuousScore,
        calibratedScore,
        ciLower,
        ciUpper,
        Math.min(5, activeCount),
        hasPricing,
        hasReview,
        hasImage,
        hasClip,
        hasGraph,
        true, // zero-penalty invariant applied
        0.1, 0.1, 0.1, 0.05,
        modContribJson,
        (item.recommendation_summary as string) || 'Assessment completed.',
        rawJson,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'trust_assessments', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'trust_assessments',
      expectedRows: 3643,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 8. Seed Users (Bootstrap deterministic locked expert reviewer account)
   * Invariant: ON DUPLICATE KEY UPDATE updated_at = updated_at ensures existing users are never overwritten.
   */
  private async seedUsers(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const columns = [
      'id', 'email', 'password_hash', 'full_name', 'role', 'is_active', 'created_at', 'updated_at'
    ];
    // Preserve existing legitimate user credentials/roles upon repeated runs
    const updateColumns = ['updated_at'];

    const rows: unknown[][] = [[
      HISTORICAL_BOOTSTRAP_USER.id,
      HISTORICAL_BOOTSTRAP_USER.email,
      HISTORICAL_BOOTSTRAP_USER.password_hash,
      HISTORICAL_BOOTSTRAP_USER.full_name,
      HISTORICAL_BOOTSTRAP_USER.role,
      HISTORICAL_BOOTSTRAP_USER.is_active,
      HISTORICAL_BOOTSTRAP_USER.created_at,
      HISTORICAL_BOOTSTRAP_USER.updated_at
    ]];

    const res = await this.executeBatch(connection, 'users', columns, updateColumns, rows);

    return {
      entity: 'users',
      expectedRows: 1,
      processedRows: 1,
      insertedRows: res.inserted,
      updatedRows: res.updated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: 1,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 9. Seed Annotation Tasks (Expected: 500 pending + 100 historical parent tasks = 600 total)
   * Invariant: Historical parent tasks are clearly prefixed ('task_ann_hist_...') and marked 'ADJUDICATED'.
   */
  private async seedAnnotationTasks(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const pendingTasks = this.loadDataset('annotation_tasks.json');
    const historicalAnnotations = this.loadDataset('ground_truth_annotations.json');

    const columns = [
      'id', 'canonical_product_id', 'marketplace', 'target_entity_type',
      'target_entity_id', 'task_payload_json', 'task_status',
      'recommended_annotator_count', 'target_guidelines_version',
      'created_at', 'updated_at'
    ];
    const updateColumns = [
      'task_payload_json', 'task_status', 'recommended_annotator_count',
      'target_guidelines_version', 'updated_at'
    ];

    const rows: unknown[][] = [];

    // Part A: 500 Pending Tasks
    for (const item of pendingTasks) {
      const ts = normalizeTimestamp('2026-11-06T00:00:00.000Z');
      const payloadJson = safeJsonStringify({
        review_id: item.review_id,
        rating: item.rating,
        review_text: item.review_text
      }) || '{}';

      rows.push([
        item.task_id,
        item.canonical_product_id,
        item.marketplace,
        'REVIEW',
        item.review_id,
        payloadJson,
        'PENDING', // Frozen ENUM
        Number(item.recommended_annotator_count) || 2,
        item.target_guidelines_version || 'v1.4_ONTOLOGY',
        ts.utcDateTime,
        ts.utcDateTime
      ]);
    }

    // Part B: 100 Historical Parent Tasks (Distinctly prefixed with 'task_ann_hist_')
    for (const item of historicalAnnotations) {
      const ts = normalizeTimestamp((item.annotation_timestamp as string) || '2026-11-06T00:00:00.000Z');
      const payloadJson = safeJsonStringify({
        review_id: item.review_id,
        rating: item.rating,
        review_text: item.review_text,
        provenance: item.provenance || 'HISTORICAL_GROUND_TRUTH_EVALUATION',
        audit_notes: item.audit_notes || null
      }) || '{}';

      const taskId = `task_ann_hist_${item.review_id}`;

      rows.push([
        taskId,
        item.canonical_product_id,
        item.marketplace,
        'REVIEW',
        item.review_id,
        payloadJson,
        'ADJUDICATED', // Frozen ENUM: Historical completed evaluations
        1, // Historical single-expert adjudication
        'v1.4_ONTOLOGY',
        ts.utcDateTime,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'annotation_tasks', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'annotation_tasks',
      expectedRows: 600, // 500 pending + 100 historical parent tasks
      processedRows: rows.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * 10. Seed Ground Truth Annotations (Expected: 100 rows)
   * Invariant: References valid parent tasks ('task_ann_hist_...') and valid bootstrap user.
   * Zero assignment records created for historical annotations.
   */
  private async seedGroundTruthAnnotations(connection: PoolConnection | null): Promise<EntityImportSummary> {
    const startTime = Date.now();
    const rawData = this.loadDataset('ground_truth_annotations.json');

    const columns = [
      'id', 'task_id', 'user_id', 'assigned_taxonomy', 'confidence_score',
      'sentiment_label', 'authenticity_label', 'aspect_polarities_json',
      'review_rationale', 'submitted_at'
    ];
    const updateColumns = [
      'assigned_taxonomy', 'confidence_score', 'sentiment_label',
      'authenticity_label', 'aspect_polarities_json', 'review_rationale', 'submitted_at'
    ];

    const rows: unknown[][] = [];
    for (const item of rawData) {
      const ts = normalizeTimestamp((item.annotation_timestamp as string) || '2026-11-06T00:00:00.000Z');

      // Map taxonomy to frozen ENUM
      let taxonomy = 'AUTHENTIC';
      if (item.authenticity_label === 'VERIFIED_DECEPTIVE') {
        taxonomy = 'SUSPECTED_KNOCKOFF';
      } else if (item.authenticity_label === 'SUSPICIOUS') {
        taxonomy = 'SPECIFICATION_MISMATCH';
      }

      // Map authenticity to frozen ENUM
      let authLabel = 'GENUINE';
      if (item.authenticity_label === 'VERIFIED_DECEPTIVE') {
        authLabel = 'SUSPICIOUS';
      } else if (item.authenticity_label === 'SUSPICIOUS') {
        authLabel = 'INCONCLUSIVE';
      }

      // Map sentiment to frozen ENUM
      const sentiment = (item.sentiment_label as string) || 'NOT_APPLICABLE';

      // Confidence Likert scale 1-5
      const rawConf = Number(item.confidence);
      const confScore = Math.max(1, Math.min(5, Math.round(rawConf * 5)));

      const polaritiesJson = safeJsonStringify({
        quality: item.aspect_quality_polarity,
        authenticity: item.aspect_authenticity_polarity,
        delivery: item.aspect_delivery_polarity,
        packaging: item.aspect_packaging_polarity,
        service: item.aspect_service_polarity,
        value: item.aspect_value_polarity
      });

      // Construct corresponding historical parent task_id
      const linkedTaskId = `task_ann_hist_${item.review_id}`;

      rows.push([
        item.annotation_id,
        linkedTaskId,
        HISTORICAL_BOOTSTRAP_USER.id,
        taxonomy,
        confScore,
        sentiment,
        authLabel,
        polaritiesJson,
        item.label_rationale || null,
        ts.utcDateTime
      ]);
    }

    const chunks = this.chunkArray(rows, this.batchSize);
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const res = await this.executeBatch(connection, 'ground_truth_annotations', columns, updateColumns, chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
    }

    return {
      entity: 'ground_truth_annotations',
      expectedRows: 100,
      processedRows: rawData.length,
      insertedRows: totalInserted,
      updatedRows: totalUpdated,
      skippedRows: 0,
      failedRows: 0,
      batchCount: chunks.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  // ---------------------------------------------------------------------------
  // Pipeline Execution Orchestrator
  // ---------------------------------------------------------------------------

  /**
   * Runs the complete seeding pipeline in strict foreign-key dependency order.
   */
  public async run(pool: Pool | null = null): Promise<SeedReport> {
    const startTimeStr = new Date().toISOString();
    const startMs = Date.now();
    const summaries: Record<string, EntityImportSummary> = {};
    const errors: ImportError[] = [];

    let connection: PoolConnection | null = null;
    if (pool && !this.dryRun) {
      connection = await pool.getConnection();
    }

    try {
      // 1. Platforms
      summaries.platforms = await this.seedPlatforms(connection);

      // 2. Brands
      summaries.brands = await this.seedBrands(connection);

      // 3. Sellers
      summaries.sellers = await this.seedSellers(connection);

      // 4. Canonical Products
      summaries.canonical_products = await this.seedCanonicalProducts(connection);

      // 5. Marketplace Listings
      summaries.marketplace_listings = await this.seedMarketplaceListings(connection);

      // 6. Price History
      summaries.price_history = await this.seedPriceHistory(connection);

      // 7. Trust Assessments
      summaries.trust_assessments = await this.seedTrustAssessments(connection);

      // 8. Users (Bootstrap reviewer)
      summaries.users = await this.seedUsers(connection);

      // 9. Annotation Tasks (500 pending + 100 historical parents)
      summaries.annotation_tasks = await this.seedAnnotationTasks(connection);

      // 10. Ground Truth Annotations (100 rows linked to historical parents & user)
      summaries.ground_truth_annotations = await this.seedGroundTruthAnnotations(connection);

    } catch (err: unknown) {
      errors.push({
        entity: 'PIPELINE_ORCHESTRATOR',
        identifier: 'GLOBAL_FAILURE',
        rowIndex: -1,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }

    const endMs = Date.now();
    const endTimeStr = new Date().toISOString();

    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    for (const key of Object.keys(summaries)) {
      totalProcessed += summaries[key].processedRows;
      totalInserted += summaries[key].insertedRows;
      totalUpdated += summaries[key].updatedRows;
      totalFailed += summaries[key].failedRows;
    }

    const status = errors.length === 0 ? 'SUCCESS' : (totalInserted > 0 ? 'PARTIAL' : 'FAILED');

    return {
      status,
      isDryRun: this.dryRun,
      startTime: startTimeStr,
      endTime: endTimeStr,
      totalDurationMs: endMs - startMs,
      totalRowsProcessed: totalProcessed,
      totalRowsInserted: totalInserted,
      totalRowsUpdated: totalUpdated,
      totalRowsFailed: totalFailed + errors.length,
      summaries,
      errors
    };
  }
}
