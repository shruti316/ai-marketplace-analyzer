import { z } from 'zod';

export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_REVIEW', 'ADJUDICATED', 'DISCARDED']).optional(),
  target_type: z.enum(['REVIEW', 'IMAGE', 'LISTING', 'PRODUCT']).optional(),
  canonical_product_id: z.string().trim().optional()
});

export type TaskListQueryParams = z.infer<typeof taskListQuerySchema>;

export const submitAnnotationSchema = z.object({
  assigned_taxonomy: z.enum([
    'AUTHENTIC',
    'UNAUTHORIZED_STOCK_PHOTO',
    'SUSPECTED_KNOCKOFF',
    'PACKAGING_VIOLATION',
    'SPECIFICATION_MISMATCH'
  ]),
  confidence_score: z.coerce.number().int().min(1).max(5),
  sentiment_label: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NOT_APPLICABLE']).default('NOT_APPLICABLE'),
  authenticity_label: z.enum(['GENUINE', 'SUSPICIOUS', 'INCONCLUSIVE']).default('INCONCLUSIVE'),
  aspect_polarities: z.record(z.unknown()).optional(),
  review_rationale: z.string().trim().min(1).max(2000).optional()
});

export type SubmitAnnotationInput = z.infer<typeof submitAnnotationSchema>;

export const adjudicateTaskSchema = z.object({
  consensus_taxonomy: z.enum([
    'AUTHENTIC',
    'UNAUTHORIZED_STOCK_PHOTO',
    'SUSPECTED_KNOCKOFF',
    'PACKAGING_VIOLATION',
    'SPECIFICATION_MISMATCH'
  ]),
  adjudication_status: z.enum([
    'DOUBLE_BLIND_AGREEMENT',
    'RESOLVED_BY_THIRD_EXPERT',
    'UNRESOLVED_AMBIGUITY'
  ]),
  inter_annotator_agreement_cohen_kappa: z.coerce.number().min(-1.000).max(1.000).optional(),
  is_multi_annotator_adjudicated: z.boolean().default(true),
  adjudication_notes: z.string().trim().min(1).max(2000).optional()
});

export type AdjudicateTaskInput = z.infer<typeof adjudicateTaskSchema>;
