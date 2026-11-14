import { z } from 'zod';

export const assessmentQuerySchema = z.object({
  prefer_cached: z.enum(['true', 'false']).transform(v => v === 'true').optional()
});

export type AssessmentQueryParams = z.infer<typeof assessmentQuerySchema>;

export const learnedMultimodalQuerySchema = z.object({
  version: z.enum(['v1.0', 'v1.1']).default('v1.0')
});

export type LearnedMultimodalQueryParams = z.infer<typeof learnedMultimodalQuerySchema>;

export const reportQuerySchema = z.object({
  format: z.enum(['json', 'markdown']).default('json')
});

export type ReportQueryParams = z.infer<typeof reportQuerySchema>;

export const ablationsQuerySchema = z.object({
  version: z.enum(['v1.0', 'v1.1']).default('v1.0')
});

export type AblationsQueryParams = z.infer<typeof ablationsQuerySchema>;
