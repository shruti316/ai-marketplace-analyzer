- =============================================================================
-- AI-Powered Indian Marketplace Trust Intelligence Platform
-- Production Database Schema Specification (MySQL 8.0+)
-- 16 Tables | Full Referential Integrity & Invariant Constraints
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Schema Migrations Tracker
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    status ENUM('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    execution_time_ms INT UNSIGNED NULL,
    error_message TEXT NULL,
    applied_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Users and Authentication
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role ENUM('ADMIN', 'ANALYST', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    INDEX idx_users_role (role),
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@__%.__%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. User Sessions (Refresh Tokens & Revocation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_agent VARCHAR(500) NULL,
    ip_address VARCHAR(45) NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user_active (user_id, is_revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Platforms (Marketplaces)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platforms (
    platform_id VARCHAR(50) PRIMARY KEY,
    platform_name VARCHAR(100) NOT NULL,
    operator_entity VARCHAR(150) NOT NULL,
    marketplace_domain VARCHAR(100) NOT NULL,
    jurisdiction VARCHAR(50) NOT NULL DEFAULT 'India',
    operating_model VARCHAR(100) NOT NULL,
    corporate_cin VARCHAR(50) NULL,
    headquarters VARCHAR(150) NULL,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'OFFICIAL_PLATFORM_OPERATOR',
    provenance VARCHAR(100) NOT NULL,
    created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Brands
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    brand_id VARCHAR(50) PRIMARY KEY,
    brand_name VARCHAR(200) NOT NULL,
    brand_aliases_json JSON NOT NULL,
    product_count INT NOT NULL DEFAULT 0,
    marketplaces_active VARCHAR(100) NOT NULL,
    categories_represented TEXT NOT NULL,
    is_generic_or_unbranded BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'CANONICAL_NORMALIZED_BRAND',
    provenance VARCHAR(100) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    INDEX idx_brands_name (brand_name),
    INDEX idx_brands_generic (is_generic_or_unbranded),
    CONSTRAINT chk_brands_product_count CHECK (product_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Sellers (Governance & Merchant Resolution)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sellers (
    seller_id VARCHAR(100) NOT NULL,
    platform_id VARCHAR(50) NOT NULL,
    marketplace VARCHAR(50) NOT NULL,
    seller_display_name VARCHAR(200) NOT NULL,
    operator_entity VARCHAR(150) NOT NULL,
    seller_type ENUM('PLATFORM_AGGREGATE', 'VERIFIED_MERCHANT', 'UNRESOLVED_MERCHANT_POOL') NOT NULL DEFAULT 'PLATFORM_AGGREGATE',
    is_individual_merchant BOOLEAN NOT NULL DEFAULT FALSE,
    merchant_resolution_status VARCHAR(100) NOT NULL DEFAULT 'UNRESOLVED_THIRD_PARTY_MERCHANT_OMISSION',
    registration_status VARCHAR(50) NOT NULL DEFAULT 'PLATFORM_OPERATOR_VERIFIED',
    source_provenance VARCHAR(100) NOT NULL,
    verification_notes TEXT NOT NULL,
    seller_rating DECIMAL(3, 2) NULL,
    seller_review_count INT NOT NULL DEFAULT 0,
    total_catalog_listings INT NOT NULL DEFAULT 0,
    unique_brands_count INT NOT NULL DEFAULT 0,
    unique_categories_count INT NOT NULL DEFAULT 0,
    median_price_inr DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    mean_price_inr DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (seller_id),
    UNIQUE KEY uk_sellers_composite (seller_id, platform_id),
    CONSTRAINT fk_sellers_platform FOREIGN KEY (platform_id) REFERENCES platforms(platform_id) ON DELETE RESTRICT,
    INDEX idx_sellers_platform (platform_id),
    INDEX idx_sellers_type (seller_type),
    CONSTRAINT chk_sellers_aggregate_not_individual 
        CHECK (seller_type != 'PLATFORM_AGGREGATE' OR is_individual_merchant = FALSE),
    CONSTRAINT chk_sellers_unresolved_not_individual 
        CHECK (seller_type != 'UNRESOLVED_MERCHANT_POOL' OR is_individual_merchant = FALSE),
    CONSTRAINT chk_sellers_individual_must_be_verified 
        CHECK (is_individual_merchant = FALSE OR seller_type = 'VERIFIED_MERCHANT'),
    CONSTRAINT chk_sellers_rating_bounds 
        CHECK (seller_rating IS NULL OR (seller_rating >= 0.00 AND seller_rating <= 5.00)),
    CONSTRAINT chk_sellers_counts_nonnegative 
        CHECK (seller_review_count >= 0 AND total_catalog_listings >= 0 AND unique_brands_count >= 0 AND unique_categories_count >= 0),
    CONSTRAINT chk_sellers_prices_nonnegative 
        CHECK (median_price_inr >= 0.00 AND mean_price_inr >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Canonical Products (Master Catalog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical_products (
    canonical_product_id VARCHAR(100) NOT NULL,
    platform_id VARCHAR(50) NOT NULL,
    brand_id VARCHAR(50) NOT NULL,
    marketplace VARCHAR(50) NOT NULL,
    source_product_id VARCHAR(100) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    product_title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100) NOT NULL,
    product_description TEXT NOT NULL,
    product_url TEXT NOT NULL,
    extracted_attributes_json JSON NOT NULL,
    has_image BOOLEAN NOT NULL DEFAULT FALSE,
    has_review BOOLEAN NOT NULL DEFAULT FALSE,
    has_price BOOLEAN NOT NULL DEFAULT FALSE,
    modality_tier VARCHAR(50) NOT NULL DEFAULT 'TIER_A_COMPLETE',
    domain_partition VARCHAR(50) NOT NULL,
    provenance VARCHAR(100) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (canonical_product_id),
    UNIQUE KEY uk_products_platform_composite (canonical_product_id, platform_id),
    CONSTRAINT fk_products_platform FOREIGN KEY (platform_id) REFERENCES platforms(platform_id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE RESTRICT,
    INDEX idx_products_brand (brand_id),
    INDEX idx_products_category_subcategory (category, subcategory),
    INDEX idx_products_modality (has_image, has_review, has_price),
    CONSTRAINT chk_products_title_not_empty CHECK (LENGTH(product_title) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Marketplace Listings (Platform Offers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_listings (
    listing_id VARCHAR(150) PRIMARY KEY,
    canonical_product_id VARCHAR(100) NOT NULL,
    platform_id VARCHAR(50) NOT NULL,
    seller_id VARCHAR(100) NOT NULL,
    marketplace_product_id VARCHAR(100) NOT NULL,
    listing_title VARCHAR(500) NOT NULL,
    listing_url TEXT NOT NULL,
    crawl_timestamp DATETIME(3) NOT NULL,
    is_active_listing BOOLEAN NOT NULL DEFAULT TRUE,
    fulfillment_type VARCHAR(100) NOT NULL,
    seller_resolution_status VARCHAR(100) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_listings_product_composite FOREIGN KEY (canonical_product_id, platform_id) 
        REFERENCES canonical_products(canonical_product_id, platform_id) ON DELETE CASCADE,
    CONSTRAINT fk_listings_seller_platform FOREIGN KEY (seller_id, platform_id) 
        REFERENCES sellers(seller_id, platform_id) ON DELETE RESTRICT,
    INDEX idx_listings_seller (seller_id),
    INDEX idx_listings_active (is_active_listing)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Price History (Strictly Listing-Scoped Observations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_price_observation_id VARCHAR(100) NOT NULL UNIQUE,
    source_raw_timestamp VARCHAR(100) NOT NULL,
    listing_id VARCHAR(150) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    mrp_inr DECIMAL(10, 2) NULL,
    selling_price_inr DECIMAL(10, 2) NULL,
    discount_percentage DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    observation_timestamp DATETIME(3) NOT NULL,
    observation_type VARCHAR(50) NOT NULL DEFAULT 'CATALOG_CRAWL_SNAPSHOT',
    is_valid_price BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_price_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(listing_id) ON DELETE CASCADE,
    INDEX idx_price_listing_time (listing_id, observation_timestamp),
    INDEX idx_price_discount (discount_percentage),
    CONSTRAINT chk_price_mrp_nonnegative CHECK (mrp_inr IS NULL OR mrp_inr >= 0.00),
    CONSTRAINT chk_price_selling_nonnegative CHECK (selling_price_inr IS NULL OR selling_price_inr >= 0.00),
    CONSTRAINT chk_price_discount_bounds CHECK (discount_percentage >= 0.00 AND discount_percentage <= 100.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Trust Assessments (ML Policy Anomaly Audit Snapshots)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trust_assessments (
    id VARCHAR(36) PRIMARY KEY,
    canonical_product_id VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    predicted_risk_tier ENUM('LOW_OBSERVED_ANOMALY', 'MODERATE_SINGLE_MODALITY_ANOMALY', 'ELEVATED_MULTIMODAL_ANOMALY', 'UNASSESSED_SPARSE_DATA') NOT NULL,
    continuous_anomaly_score DECIMAL(6, 4) NOT NULL,
    calibrated_anomaly_score DECIMAL(6, 4) NOT NULL,
    ci_lower DECIMAL(6, 4) NOT NULL,
    ci_upper DECIMAL(6, 4) NOT NULL,
    active_modalities_count TINYINT UNSIGNED NOT NULL,
    has_pricing_modality BOOLEAN NOT NULL DEFAULT FALSE,
    has_review_modality BOOLEAN NOT NULL DEFAULT FALSE,
    has_image_modality BOOLEAN NOT NULL DEFAULT FALSE,
    has_clip_modality BOOLEAN NOT NULL DEFAULT FALSE,
    has_graph_modality BOOLEAN NOT NULL DEFAULT FALSE,
    zero_penalty_invariant_applied BOOLEAN NOT NULL DEFAULT TRUE,
    multi_task_review_risk DECIMAL(6, 4) NOT NULL DEFAULT 0.0000,
    multi_task_image_risk DECIMAL(6, 4) NOT NULL DEFAULT 0.0000,
    multi_task_price_risk DECIMAL(6, 4) NOT NULL DEFAULT 0.0000,
    multi_task_discordance_risk DECIMAL(6, 4) NOT NULL DEFAULT 0.0000,
    modality_contributions_json JSON NOT NULL,
    recommendation_summary TEXT NOT NULL,
    raw_response_json JSON NOT NULL,
    assessed_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_assessments_product FOREIGN KEY (canonical_product_id) REFERENCES canonical_products(canonical_product_id) ON DELETE CASCADE,
    INDEX idx_assessments_product_time (canonical_product_id, assessed_at),
    INDEX idx_assessments_tier (predicted_risk_tier),
    INDEX idx_assessments_model (model_version),
    CONSTRAINT chk_assessments_model_version CHECK (model_version IN ('2.0.0', '1.1.0', 'heuristic_v1_0')),
    CONSTRAINT chk_assessments_score_bounds CHECK (continuous_anomaly_score >= 0.0000 AND continuous_anomaly_score <= 1.0000),
    CONSTRAINT chk_assessments_calibrated_bounds CHECK (calibrated_anomaly_score >= 0.0000 AND calibrated_anomaly_score <= 1.0000),
    CONSTRAINT chk_assessments_ci_bounds CHECK (ci_lower >= 0.0000 AND ci_upper <= 1.0000 AND ci_lower <= ci_upper),
    CONSTRAINT chk_assessments_mod_count CHECK (active_modalities_count <= 5),
    CONSTRAINT chk_assessments_multitask_bounds CHECK (
        multi_task_review_risk >= 0.0000 AND multi_task_review_risk <= 1.0000 AND
        multi_task_image_risk >= 0.0000 AND multi_task_image_risk <= 1.0000 AND
        multi_task_price_risk >= 0.0000 AND multi_task_price_risk <= 1.0000 AND
        multi_task_discordance_risk >= 0.0000 AND multi_task_discordance_risk <= 1.0000
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Product Comparisons (Master Session Record)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_comparisons (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    comparison_title VARCHAR(255) NULL,
    recommended_product_id VARCHAR(100) NULL,
    recommendation_rationale TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_comparisons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_comparisons_winner FOREIGN KEY (recommended_product_id) REFERENCES canonical_products(canonical_product_id) ON DELETE SET NULL,
    INDEX idx_comparisons_user (user_id),
    INDEX idx_comparisons_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Product Comparison Items (Normalized Relational Membership)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_comparison_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id VARCHAR(36) NOT NULL,
    canonical_product_id VARCHAR(100) NOT NULL,
    display_order TINYINT UNSIGNED NOT NULL,
    evidence_density_rank TINYINT UNSIGNED NOT NULL,
    risk_rank TINYINT UNSIGNED NOT NULL,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    snapshot_price_inr DECIMAL(10, 2) NULL,
    snapshot_risk_tier ENUM('LOW_OBSERVED_ANOMALY', 'MODERATE_SINGLE_MODALITY_ANOMALY', 'ELEVATED_MULTIMODAL_ANOMALY', 'UNASSESSED_SPARSE_DATA') NULL,
    tradeoff_notes TEXT NULL,
    CONSTRAINT fk_comp_items_parent FOREIGN KEY (comparison_id) REFERENCES product_comparisons(id) ON DELETE CASCADE,
    CONSTRAINT fk_comp_items_product FOREIGN KEY (canonical_product_id) REFERENCES canonical_products(canonical_product_id) ON DELETE CASCADE,
    UNIQUE KEY uk_comparison_product (comparison_id, canonical_product_id),
    UNIQUE KEY uk_comparison_order (comparison_id, display_order),
    INDEX idx_comp_items_product (canonical_product_id),
    CONSTRAINT chk_comp_items_order_positive CHECK (display_order >= 1),
    CONSTRAINT chk_comp_items_density_positive CHECK (evidence_density_rank >= 1),
    CONSTRAINT chk_comp_items_risk_positive CHECK (risk_rank >= 1),
    CONSTRAINT chk_comp_items_price_nonnegative CHECK (snapshot_price_inr IS NULL OR snapshot_price_inr >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Annotation Tasks (Double-Blind Evaluation Queue)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS annotation_tasks (
    id VARCHAR(50) PRIMARY KEY,
    canonical_product_id VARCHAR(100) NOT NULL,
    marketplace VARCHAR(50) NOT NULL,
    target_entity_type ENUM('REVIEW', 'IMAGE', 'LISTING', 'PRODUCT') NOT NULL,
    target_entity_id VARCHAR(100) NOT NULL,
    task_payload_json JSON NOT NULL,
    task_status ENUM('PENDING', 'ASSIGNED', 'IN_REVIEW', 'ADJUDICATED', 'DISCARDED') NOT NULL DEFAULT 'PENDING',
    recommended_annotator_count TINYINT UNSIGNED NOT NULL DEFAULT 2,
    target_guidelines_version VARCHAR(50) NOT NULL DEFAULT 'v1.4_ONTOLOGY',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_tasks_product FOREIGN KEY (canonical_product_id) REFERENCES canonical_products(canonical_product_id) ON DELETE CASCADE,
    INDEX idx_tasks_status (task_status),
    INDEX idx_tasks_product (canonical_product_id),
    INDEX idx_tasks_target (target_entity_type, target_entity_id),
    CONSTRAINT chk_tasks_annotator_count CHECK (recommended_annotator_count >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Annotation Task Assignments (Double-Blind Reviewer Allocation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS annotation_task_assignments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,
    assigned_user_id VARCHAR(36) NOT NULL,
    assignment_status ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'REASSIGNED') NOT NULL DEFAULT 'ASSIGNED',
    assigned_at DATETIME(3) NOT NULL,
    completed_at DATETIME(3) NULL,
    CONSTRAINT fk_assignments_task FOREIGN KEY (task_id) REFERENCES annotation_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_task_assigned_user (task_id, assigned_user_id),
    INDEX idx_assignments_user_status (assigned_user_id, assignment_status),
    CONSTRAINT chk_assignments_completed_after_assigned CHECK (completed_at IS NULL OR completed_at >= assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. Ground Truth Annotations (Independent Reviewer Submissions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ground_truth_annotations (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    assigned_taxonomy ENUM('AUTHENTIC', 'UNAUTHORIZED_STOCK_PHOTO', 'SUSPECTED_KNOCKOFF', 'PACKAGING_VIOLATION', 'SPECIFICATION_MISMATCH') NOT NULL,
    confidence_score TINYINT UNSIGNED NOT NULL,
    sentiment_label ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_APPLICABLE',
    authenticity_label ENUM('GENUINE', 'SUSPICIOUS', 'INCONCLUSIVE') NOT NULL DEFAULT 'INCONCLUSIVE',
    aspect_polarities_json JSON NULL,
    review_rationale TEXT NULL,
    submitted_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_annotations_task FOREIGN KEY (task_id) REFERENCES annotation_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_annotations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_task_annotator (task_id, user_id),
    INDEX idx_annotations_user (user_id),
    CONSTRAINT chk_annotations_confidence_likert CHECK (confidence_score >= 1 AND confidence_score <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. Annotation Adjudications (Consensus & Inter-Rater Reliability)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS annotation_adjudications (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL UNIQUE,
    adjudicator_user_id VARCHAR(36) NULL,
    consensus_taxonomy ENUM('AUTHENTIC', 'UNAUTHORIZED_STOCK_PHOTO', 'SUSPECTED_KNOCKOFF', 'PACKAGING_VIOLATION', 'SPECIFICATION_MISMATCH') NOT NULL,
    adjudication_status ENUM('DOUBLE_BLIND_AGREEMENT', 'RESOLVED_BY_THIRD_EXPERT', 'UNRESOLVED_AMBIGUITY') NOT NULL,
    inter_annotator_agreement_cohen_kappa DECIMAL(4, 3) NULL,
    is_multi_annotator_adjudicated BOOLEAN NOT NULL DEFAULT TRUE,
    adjudication_notes TEXT NULL,
    adjudicated_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_adjudications_task FOREIGN KEY (task_id) REFERENCES annotation_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjudications_user FOREIGN KEY (adjudicator_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_adjudications_status (adjudication_status),
    CONSTRAINT chk_adjudications_kappa_bounds 
        CHECK (inter_annotator_agreement_cohen_kappa IS NULL OR 
              (inter_annotator_agreement_cohen_kappa >= -1.000 AND inter_annotator_agreement_cohen_kappa <= 1.000))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
