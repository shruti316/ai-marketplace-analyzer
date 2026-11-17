import { z } from 'zod';

export const createInvestigationSchema = z.object({
  id: z.string().uuid().optional(),
  input_type: z.enum(['URL', 'IMAGE', 'ADHOC', 'CATALOG']),
  title: z.string().min(1).max(500),
  marketplace: z.string().max(50).nullable().optional(),
  listing_url: z.string().nullable().optional(),
  extracted_identifier: z.string().max(128).nullable().optional(),
  canonical_product_id: z.string().max(100).nullable().optional(),
  overall_risk_tier: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  overall_risk_score: z.number().min(0).max(1),
  verdict_summary: z.string().nullable().optional(),
  assessment_snapshot: z.record(z.any()),
  evidence_citations: z.union([z.array(z.any()), z.record(z.any())]).nullable().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).default('COMPLETED').optional(),
});

export const investigationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  risk_tier: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  input_type: z.enum(['URL', 'IMAGE', 'ADHOC', 'CATALOG']).optional(),
  search: z.string().trim().optional(),
});

export const investigationIdParamSchema = z.object({
  id: z.string().min(1).max(100),
});

export type CreateInvestigationInput = z.infer<typeof createInvestigationSchema>;
export type InvestigationQueryInput = z.infer<typeof investigationQuerySchema>;
