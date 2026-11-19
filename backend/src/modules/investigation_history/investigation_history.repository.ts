import { RowDataPacket } from 'mysql2/promise';
import { query, queryOne, execute } from '../../config/database';

export interface InvestigationRow extends RowDataPacket {
  id: string;
  user_id: string | null;
  input_type: 'URL' | 'IMAGE' | 'ADHOC' | 'CATALOG';
  title: string;
  marketplace: string | null;
  listing_url: string | null;
  extracted_identifier: string | null;
  canonical_product_id: string | null;
  overall_risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  overall_risk_score: number;
  verdict_summary: string | null;
  assessment_snapshot: any;
  evidence_citations: any | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
}

export interface CreateInvestigationDTO {
  id: string;
  user_id: string | null;
  input_type: 'URL' | 'IMAGE' | 'ADHOC' | 'CATALOG';
  title: string;
  marketplace?: string | null;
  listing_url?: string | null;
  extracted_identifier?: string | null;
  canonical_product_id?: string | null;
  overall_risk_tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  overall_risk_score: number;
  verdict_summary?: string | null;
  assessment_snapshot: Record<string, any>;
  evidence_citations?: any | null;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface InvestigationCountRow extends RowDataPacket {
  total: number;
}

export class InvestigationRepository {
  async create(dto: CreateInvestigationDTO): Promise<InvestigationRow> {
    const sql = `
      INSERT INTO investigations (
        id, user_id, input_type, title, marketplace,
        listing_url, extracted_identifier, canonical_product_id,
        overall_risk_tier, overall_risk_score, verdict_summary,
        assessment_snapshot, evidence_citations, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))
    `;

    await execute(sql, [
      dto.id,
      dto.user_id || null,
      dto.input_type,
      dto.title,
      dto.marketplace || null,
      dto.listing_url || null,
      dto.extracted_identifier || null,
      dto.canonical_product_id || null,
      dto.overall_risk_tier,
      dto.overall_risk_score,
      dto.verdict_summary || null,
      JSON.stringify(dto.assessment_snapshot),
      dto.evidence_citations ? JSON.stringify(dto.evidence_citations) : null,
      dto.status || 'COMPLETED',
    ]);

    const created = await this.findById(dto.id);
    if (!created) {
      throw new Error('Failed to retrieve newly created investigation record.');
    }
    return created;
  }

  async findById(id: string): Promise<InvestigationRow | null> {
    const sql = `
      SELECT id, user_id, input_type, title, marketplace,
             listing_url, extracted_identifier, canonical_product_id,
             overall_risk_tier, CAST(overall_risk_score AS DOUBLE) as overall_risk_score,
             verdict_summary, assessment_snapshot, evidence_citations,
             status, created_at, updated_at
      FROM investigations
      WHERE id = ?
      LIMIT 1
    `;
    const row = await queryOne<InvestigationRow>(sql, [id]);
    if (!row) return null;

    if (typeof row.assessment_snapshot === 'string') {
      try {
        row.assessment_snapshot = JSON.parse(row.assessment_snapshot);
      } catch {
        // preserve as string if parsing fails
      }
    }
    if (typeof row.evidence_citations === 'string') {
      try {
        row.evidence_citations = JSON.parse(row.evidence_citations);
      } catch {
        // preserve as string
      }
    }
    return row;
  }

  async findUserInvestigations(
    userId: string | null,
    options: {
      page: number;
      limit: number;
      risk_tier?: string;
      input_type?: string;
      search?: string;
      isAdmin?: boolean;
    }
  ): Promise<{ items: InvestigationRow[]; total: number; page: number; limit: number; totalPages: number }> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (!options.isAdmin && userId) {
      whereClauses.push('user_id = ?');
      params.push(userId);
    } else if (!options.isAdmin && !userId) {
      whereClauses.push('user_id IS NULL');
    }

    if (options.risk_tier) {
      whereClauses.push('overall_risk_tier = ?');
      params.push(options.risk_tier);
    }

    if (options.input_type) {
      whereClauses.push('input_type = ?');
      params.push(options.input_type);
    }

    if (options.search) {
      whereClauses.push('(title LIKE ? OR extracted_identifier LIKE ?)');
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM investigations ${whereSql}`;
    const countRow = await queryOne<InvestigationCountRow>(countSql, params);
    const total = countRow ? Number(countRow.total) : 0;

    const offset = (options.page - 1) * options.limit;
    const listSql = `
      SELECT id, user_id, input_type, title, marketplace,
             listing_url, extracted_identifier, canonical_product_id,
             overall_risk_tier, CAST(overall_risk_score AS DOUBLE) as overall_risk_score,
             verdict_summary, assessment_snapshot, evidence_citations,
             status, created_at, updated_at
      FROM investigations
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = await query<InvestigationRow[]>(listSql, [...params, options.limit, offset]);

    for (const item of items) {
      if (typeof item.assessment_snapshot === 'string') {
        try {
          item.assessment_snapshot = JSON.parse(item.assessment_snapshot);
        } catch {
          // ignore
        }
      }
      if (typeof item.evidence_citations === 'string') {
        try {
          item.evidence_citations = JSON.parse(item.evidence_citations);
        } catch {
          // ignore
        }
      }
    }

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit) || 1,
    };
  }

  async delete(id: string, userId: string | null, isAdmin: boolean): Promise<boolean> {
    let sql: string;
    let params: any[];

    if (isAdmin) {
      sql = `DELETE FROM investigations WHERE id = ?`;
      params = [id];
    } else {
      sql = `DELETE FROM investigations WHERE id = ? AND user_id = ?`;
      params = [id, userId];
    }

    const result: any = await execute(sql, params);
    return result.affectedRows > 0;
  }
}

export const investigationRepository = new InvestigationRepository();
