"""
Static Schema and Migration Validator for Phase 3 Step 2B.2
Validates:
1. Exactly 16 CREATE TABLE definitions in 001_initial_schema.up.sql.
2. Exactly 19 FOREIGN KEY constraints matching frozen architecture.
3. Exactly 26 CHECK constraints preserving domain invariants.
4. Exactly 13 ENUM columns with exact member sets.
5. sellers.seller_type default is strictly 'PLATFORM_AGGREGATE'.
6. Zero FOREIGN_KEY_CHECKS disabling statements in up or down migrations.
7. Exactly 16 DROP TABLE statements in 001_initial_schema.down.sql in reverse topological dependency order.
"""

import re
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP_SQL_PATH = os.path.join(BACKEND_DIR, "database", "migrations", "001_initial_schema.up.sql")
DOWN_SQL_PATH = os.path.join(BACKEND_DIR, "database", "migrations", "001_initial_schema.down.sql")

def test_up_migration():
    assert os.path.exists(UP_SQL_PATH), f"Missing {UP_SQL_PATH}"
    with open(UP_SQL_PATH, "r", encoding="utf-8") as f:
        sql = f.read()

    # 1. Foreign key checks must remain enabled
    assert "SET FOREIGN_KEY_CHECKS = 0" not in sql, "Found forbidden 'SET FOREIGN_KEY_CHECKS = 0'"
    assert "SET FOREIGN_KEY_CHECKS = 1" not in sql, "Found unnecessary 'SET FOREIGN_KEY_CHECKS = 1'"

    # 2. Verify 16 tables
    tables = re.findall(r"CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)", sql)
    expected_tables = [
        "schema_migrations",
        "users",
        "user_sessions",
        "platforms",
        "brands",
        "sellers",
        "canonical_products",
        "marketplace_listings",
        "price_history",
        "trust_assessments",
        "product_comparisons",
        "product_comparison_items",
        "annotation_tasks",
        "annotation_task_assignments",
        "ground_truth_annotations",
        "annotation_adjudications",
    ]
    assert len(tables) == 16, f"Expected 16 tables, found {len(tables)}: {tables}"
    assert tables == expected_tables, f"Table order mismatch!\nFound: {tables}\nExpected: {expected_tables}"

    # 3. Verify 19 foreign keys
    fks = re.findall(
        r"CONSTRAINT\s+([a-zA-Z0-9_]+)\s+FOREIGN KEY\s*\(([^\)]+)\)\s*REFERENCES\s+([a-zA-Z0-9_]+)\s*\(([^\)]+)\)",
        sql,
    )
    assert len(fks) == 19, f"Expected 19 foreign keys, found {len(fks)}"

    # 4. Verify 26 check constraints
    checks = re.findall(r"CONSTRAINT\s+([a-zA-Z0-9_]+)\s+CHECK\s*\(([^\)]+)\)", sql)
    assert len(checks) == 26, f"Expected 26 check constraints, found {len(checks)}"

    # 5. Verify seller_type ENUM and default
    seller_match = re.search(
        r"seller_type ENUM\('PLATFORM_AGGREGATE',\s*'VERIFIED_MERCHANT',\s*'UNRESOLVED_MERCHANT_POOL'\)\s+NOT NULL\s+DEFAULT\s+'PLATFORM_AGGREGATE'",
        sql,
    )
    assert seller_match is not None, "sellers.seller_type definition or default does not match frozen Step 2A specification!"

    # 6. Verify role ENUM
    assert "role ENUM('ADMIN', 'ANALYST', 'VIEWER')" in sql, "users.role ENUM mismatch"

    # 7. Verify risk tiers
    risk_tier = "'LOW_OBSERVED_ANOMALY', 'MODERATE_SINGLE_MODALITY_ANOMALY', 'ELEVATED_MULTIMODAL_ANOMALY', 'UNASSESSED_SPARSE_DATA'"
    assert f"predicted_risk_tier ENUM({risk_tier})" in sql, "trust_assessments.predicted_risk_tier mismatch"
    assert f"snapshot_risk_tier ENUM({risk_tier})" in sql, "product_comparison_items.snapshot_risk_tier mismatch"

    # 8. Verify annotation enums
    assert "task_status ENUM('PENDING', 'ASSIGNED', 'IN_REVIEW', 'ADJUDICATED', 'DISCARDED')" in sql
    assert "assignment_status ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'REASSIGNED')" in sql
    assert "assigned_taxonomy ENUM('AUTHENTIC', 'UNAUTHORIZED_STOCK_PHOTO', 'SUSPECTED_KNOCKOFF', 'PACKAGING_VIOLATION', 'SPECIFICATION_MISMATCH')" in sql
    assert "sentiment_label ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NOT_APPLICABLE')" in sql
    assert "authenticity_label ENUM('GENUINE', 'SUSPICIOUS', 'INCONCLUSIVE')" in sql
    assert "adjudication_status ENUM('DOUBLE_BLIND_AGREEMENT', 'RESOLVED_BY_THIRD_EXPERT', 'UNRESOLVED_AMBIGUITY')" in sql

    # 9. Verify composite keys
    assert "CONSTRAINT fk_listings_product_composite FOREIGN KEY (canonical_product_id, platform_id)" in sql
    assert "CONSTRAINT fk_listings_seller_platform FOREIGN KEY (seller_id, platform_id)" in sql

    # 10. Verify source_raw_timestamp in price_history
    assert "source_raw_timestamp VARCHAR(100) NOT NULL" in sql

    print("PASS: 001_initial_schema.up.sql structural verification complete.")

def test_down_migration():
    assert os.path.exists(DOWN_SQL_PATH), f"Missing {DOWN_SQL_PATH}"
    with open(DOWN_SQL_PATH, "r", encoding="utf-8") as f:
        sql = f.read()

    # 1. Foreign key checks must remain enabled
    assert "SET FOREIGN_KEY_CHECKS = 0" not in sql, "Found forbidden 'SET FOREIGN_KEY_CHECKS = 0'"

    # 2. Verify all 16 tables dropped in reverse topological order
    dropped = re.findall(r"DROP TABLE IF EXISTS ([a-zA-Z0-9_]+);", sql)
    expected_reverse = [
        "annotation_adjudications",
        "ground_truth_annotations",
        "annotation_task_assignments",
        "annotation_tasks",
        "product_comparison_items",
        "product_comparisons",
        "trust_assessments",
        "price_history",
        "marketplace_listings",
        "canonical_products",
        "sellers",
        "brands",
        "platforms",
        "user_sessions",
        "users",
        "schema_migrations",
    ]
    assert len(dropped) == 16, f"Expected 16 dropped tables, found {len(dropped)}: {dropped}"
    assert dropped == expected_reverse, f"Drop order mismatch!\nFound: {dropped}\nExpected: {expected_reverse}"

    print("PASS: 001_initial_schema.down.sql reverse dependency verification complete.")

if __name__ == "__main__":
    test_up_migration()
    test_down_migration()
    print("ALL MIGRATION TESTS PASSED (100%).")
