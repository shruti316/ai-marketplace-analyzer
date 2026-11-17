-- =============================================================================
-- Migration 002: User Investigations Persistence Schema
-- =============================================================================
-- Provides persistent storage for consumer product checks, marketplace URL
-- audits, packaging OCR inspections, and adhoc trust assessments.
-- Decouples user inquiry history from canonical catalog product definitions.
-- =============================================================================

CREATE TABLE IF NOT EXISTS investigations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    input_type ENUM('URL', 'IMAGE', 'ADHOC', 'CATALOG') NOT NULL,
    title VARCHAR(500) NOT NULL,
    marketplace VARCHAR(50) NULL,
    listing_url TEXT NULL,
    extracted_identifier VARCHAR(128) NULL,
    canonical_product_id VARCHAR(100) NULL,
    overall_risk_tier ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL,
    overall_risk_score DECIMAL(5, 4) NOT NULL,
    verdict_summary TEXT NULL,
    assessment_snapshot JSON NOT NULL,
    evidence_citations JSON NULL,
    status ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_investigations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_investigations_canonical FOREIGN KEY (canonical_product_id) REFERENCES canonical_products(canonical_product_id) ON DELETE SET NULL,
    INDEX idx_investigations_user (user_id, created_at),
    INDEX idx_investigations_risk_tier (overall_risk_tier),
    INDEX idx_investigations_input_type (input_type),
    INDEX idx_investigations_canonical (canonical_product_id),
    INDEX idx_investigations_created (created_at),
    CONSTRAINT chk_investigations_score CHECK (overall_risk_score >= 0.0000 AND overall_risk_score <= 1.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
