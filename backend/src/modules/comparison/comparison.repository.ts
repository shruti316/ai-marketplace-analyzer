import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { query, queryOne, withTransaction } from '../../config/database';

export interface ComparisonRow extends RowDataPacket {
  id: string;
  user_id: string | null;
  comparison_title: string | null;
  recommended_product_id: string | null;
  recommendation_rationale: string;
  created_at: string;
}

export interface ComparisonItemRow extends RowDataPacket {
  id: number;
  comparison_id: string;
  canonical_product_id: string;
  display_order: number;
  evidence_density_rank: number;
  risk_rank: number;
  is_recommended: number | boolean;
  snapshot_price_inr: number | null;
  snapshot_risk_tier: string | null;
  tradeoff_notes: string | null;
  product_title?: string;
  category?: string;
  platform_id?: string;
  brand_id?: string;
}

export interface ComparisonWithItems extends ComparisonRow {
  items: ComparisonItemRow[];
}

export interface CreateComparisonDTO {
  id: string;
  user_id: string | null;
  comparison_title: string;
  recommended_product_id: string | null;
  recommendation_rationale: string;
  items: {
    canonical_product_id: string;
    display_order: number;
    evidence_density_rank: number;
    risk_rank: number;
    is_recommended: boolean;
    snapshot_price_inr: number | null;
    snapshot_risk_tier: string | null;
    tradeoff_notes: string | null;
  }[];
}

export interface ComparisonCountRow extends RowDataPacket {
  total: number;
}

export class ComparisonRepository {
  /**
   * Creates a comparison session record and all items atomically within a database transaction.
   */
  async createComparison(dto: CreateComparisonDTO): Promise<ComparisonWithItems> {
    return withTransaction(async (connection: PoolConnection) => {
      // 1. Insert master comparison session
      const insertCompSql = `
        INSERT INTO product_comparisons (
          id, user_id, comparison_title, recommended_product_id,
          recommendation_rationale, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW(3))
      `;
      await connection.query(insertCompSql, [
        dto.id,
        dto.user_id,
        dto.comparison_title,
        dto.recommended_product_id,
        dto.recommendation_rationale
      ]);

      // 2. Insert comparison items
      const insertItemSql = `
        INSERT INTO product_comparison_items (
          comparison_id, canonical_product_id, display_order,
          evidence_density_rank, risk_rank, is_recommended,
          snapshot_price_inr, snapshot_risk_tier, tradeoff_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of dto.items) {
        await connection.query(insertItemSql, [
          dto.id,
          item.canonical_product_id,
          item.display_order,
          item.evidence_density_rank,
          item.risk_rank,
          item.is_recommended ? 1 : 0,
          item.snapshot_price_inr,
          item.snapshot_risk_tier,
          item.tradeoff_notes
        ]);
      }

      // 3. Fetch newly created record with joined product metadata
      const [compRows] = await connection.query<ComparisonRow[]>(
        'SELECT * FROM product_comparisons WHERE id = ?',
        [dto.id]
      );
      const comparison = compRows[0];

      const [itemRows] = await connection.query<ComparisonItemRow[]>(
        `SELECT ci.*, p.product_title, p.category, p.platform_id, p.brand_id
         FROM product_comparison_items ci
         LEFT JOIN canonical_products p ON ci.canonical_product_id = p.canonical_product_id
         WHERE ci.comparison_id = ?
         ORDER BY ci.display_order ASC`,
        [dto.id]
      );

      return {
        ...comparison,
        items: itemRows
      };
    });
  }

  /**
   * Retrieves a comparison by ID with its items.
   */
  async findById(id: string): Promise<ComparisonWithItems | null> {
    const comparison = await queryOne<ComparisonRow>(
      'SELECT * FROM product_comparisons WHERE id = ? LIMIT 1',
      [id]
    );

    if (!comparison) return null;

    const items = await query<ComparisonItemRow[]>(
      `SELECT ci.*, p.product_title, p.category, p.platform_id, p.brand_id
       FROM product_comparison_items ci
       LEFT JOIN canonical_products p ON ci.canonical_product_id = p.canonical_product_id
       WHERE ci.comparison_id = ?
       ORDER BY ci.display_order ASC`,
      [id]
    );

    return {
      ...comparison,
      items
    };
  }

  /**
   * Retrieves paginated comparisons owned by a specific user.
   */
  async findByUserId(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ items: ComparisonRow[]; total: number }> {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit) || 10)));
    const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));

    const [countRow] = await query<ComparisonCountRow[]>(
      'SELECT COUNT(*) AS total FROM product_comparisons WHERE user_id = ?',
      [userId]
    );
    const total = countRow?.total ?? 0;

    const items = await query<ComparisonRow[]>(
      `SELECT * FROM product_comparisons
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, safeLimit, safeOffset]
    );

    return { items, total };
  }

  /**
   * Deletes a comparison session by ID (cascades to comparison items via MySQL FK constraint).
   */
  async deleteById(id: string): Promise<boolean> {
    const [result] = await (await import('../../config/database')).getApplicationPool().query(
      'DELETE FROM product_comparisons WHERE id = ?',
      [id]
    );
    return ((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }
}

export const comparisonRepository = new ComparisonRepository();
