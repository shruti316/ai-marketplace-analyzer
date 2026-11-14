-- =============================================================================
-- Migration: 001_initial_schema.down.sql
-- Project: AI-Powered Indian Marketplace Trust Intelligence Platform
-- Target Database: MySQL 8.0+ (InnoDB, utf8mb4_unicode_ci)
-- Operation: DESTRUCTIVE ROLLBACK OF INITIAL SCHEMA (16 TABLES)
-- =============================================================================
-- CAUTION:
--   Executing this script permanently drops all 16 application and audit tables.
--   All product catalogs, marketplace listings, price histories, ML trust
--   assessments, comparisons, and human annotations will be irrecoverably destroyed.
--   NEVER execute this script casually against staging or production environments.
-- =============================================================================
-- Invariants:
--   1. Tables are dropped in strict reverse topological dependency order
--      (dependent child tables are dropped before referenced parent tables).
--   2. Foreign key checks remain strictly enabled throughout execution.
--   3. Do NOT disable foreign key checks (referential integrity checks must remain enabled).
-- =============================================================================

-- Step 1: Drop annotation adjudication records (child of annotation_tasks and users)
DROP TABLE IF EXISTS annotation_adjudications;

-- Step 2: Drop ground truth reviewer annotations (child of annotation_tasks and users)
DROP TABLE IF EXISTS ground_truth_annotations;

-- Step 3: Drop double-blind task assignments (child of annotation_tasks and users)
DROP TABLE IF EXISTS annotation_task_assignments;

-- Step 4: Drop annotation tasks (child of canonical_products)
DROP TABLE IF EXISTS annotation_tasks;

-- Step 5: Drop comparison items (child of product_comparisons and canonical_products)
DROP TABLE IF EXISTS product_comparison_items;

-- Step 6: Drop product comparisons (child of users and canonical_products)
DROP TABLE IF EXISTS product_comparisons;

-- Step 7: Drop ML trust assessments (child of canonical_products)
DROP TABLE IF EXISTS trust_assessments;

-- Step 8: Drop price history observations (child of marketplace_listings)
DROP TABLE IF EXISTS price_history;

-- Step 9: Drop marketplace listings (child of canonical_products and sellers)
DROP TABLE IF EXISTS marketplace_listings;

-- Step 10: Drop canonical products (child of platforms and brands)
DROP TABLE IF EXISTS canonical_products;

-- Step 11: Drop sellers (child of platforms)
DROP TABLE IF EXISTS sellers;

-- Step 12: Drop brands (parent to canonical_products)
DROP TABLE IF EXISTS brands;

-- Step 13: Drop platforms (parent to sellers and canonical_products)
DROP TABLE IF EXISTS platforms;

-- Step 14: Drop user sessions (child of users)
DROP TABLE IF EXISTS user_sessions;

-- Step 15: Drop users (parent to sessions, comparisons, assignments, annotations, adjudications)
DROP TABLE IF EXISTS users;

-- Step 16: Drop migration tracking audit table
DROP TABLE IF EXISTS schema_migrations;
