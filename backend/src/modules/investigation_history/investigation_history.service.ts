import crypto from 'node:crypto';
import {
  InvestigationRepository,
  investigationRepository,
  InvestigationRow
} from './investigation_history.repository';
import {
  CreateInvestigationInput,
  InvestigationQueryInput
} from './investigation_history.schemas';
import { AppError } from '../../middleware/errorHandler';

export class InvestigationService {
  constructor(private repo: InvestigationRepository = investigationRepository) {}

  async saveInvestigation(
    userId: string | null,
    input: CreateInvestigationInput
  ): Promise<InvestigationRow> {
    const id = input.id || crypto.randomUUID();

    return this.repo.create({
      id,
      user_id: userId,
      input_type: input.input_type,
      title: input.title,
      marketplace: input.marketplace || null,
      listing_url: input.listing_url || null,
      extracted_identifier: input.extracted_identifier || null,
      canonical_product_id: input.canonical_product_id || null,
      overall_risk_tier: input.overall_risk_tier,
      overall_risk_score: input.overall_risk_score,
      verdict_summary: input.verdict_summary || null,
      assessment_snapshot: input.assessment_snapshot,
      evidence_citations: input.evidence_citations || null,
      status: input.status || 'COMPLETED',
    });
  }

  async getInvestigationById(
    id: string,
    userId: string | null,
    userRole: string | null
  ): Promise<InvestigationRow> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new AppError('Investigation record not found.', 404, 'INVESTIGATION_NOT_FOUND');
    }

    // Permission check: if record belongs to a user, allow if owner, admin, or if record is public/unassigned
    const isAdmin = userRole === 'ADMIN';
    if (record.user_id && record.user_id !== userId && !isAdmin) {
      // If requested by another user without admin rights
      throw new AppError('You do not have permission to access this investigation.', 403, 'FORBIDDEN');
    }

    return record;
  }

  async listInvestigations(
    userId: string | null,
    userRole: string | null,
    query: InvestigationQueryInput
  ) {
    const isAdmin = userRole === 'ADMIN';
    return this.repo.findUserInvestigations(userId, {
      page: query.page,
      limit: query.limit,
      risk_tier: query.risk_tier,
      input_type: query.input_type,
      search: query.search,
      isAdmin,
    });
  }

  async deleteInvestigation(
    id: string,
    userId: string | null,
    userRole: string | null
  ): Promise<void> {
    const isAdmin = userRole === 'ADMIN';
    const deleted = await this.repo.delete(id, userId, isAdmin);
    if (!deleted) {
      throw new AppError(
        'Investigation not found or you do not have permission to delete it.',
        404,
        'INVESTIGATION_NOT_FOUND'
      );
    }
  }
}

export const investigationService = new InvestigationService();
