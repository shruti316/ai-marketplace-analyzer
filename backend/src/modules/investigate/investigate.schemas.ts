import { z } from 'zod';

// Sanitization helpers to safely handle empty strings, nulls, and protocol-omitted URLs
const sanitizeUrl = (val: unknown): unknown => {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'string') {
    let t = val.trim();
    if (!t) return undefined;
    if (!t.includes('://') && !t.startsWith('//')) {
      t = 'https://' + t;
    }
    return t;
  }
  return val;
};

const sanitizeNumber = (val: unknown): unknown => {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? undefined : num;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? undefined : val;
  }
  return val;
};

const sanitizeString = (val: unknown): unknown => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const t = val.trim();
    return t.length === 0 ? undefined : t;
  }
  return val;
};

export const investigateUrlSchema = z.object({
  url: z.preprocess(
    sanitizeUrl,
    z.string({ required_error: 'URL is required' })
      .url('Must be a valid marketplace URL')
      .max(2000, 'URL too long')
  ),
});

export type InvestigateUrlInput = z.infer<typeof investigateUrlSchema>;

export const investigateImageSchema = z.object({
  image_base64: z.string().min(10, 'Image payload required').max(15 * 1024 * 1024, 'Payload exceeds 15MB limit'),
  canonical_brand: z.preprocess(sanitizeString, z.string().max(100).optional()),
  product_title: z.preprocess(sanitizeString, z.string().max(500).optional()),
  canonical_product_id: z.preprocess(sanitizeString, z.string().max(100).optional()),
});

export type InvestigateImageInput = z.infer<typeof investigateImageSchema>;

export const investigateAdhocSchema = z.object({
  product_title: z.preprocess(
    sanitizeString,
    z.string({ required_error: 'Product title is required' }).min(1, 'Product title is required').max(500)
  ),
  observed_price_inr: z.preprocess(sanitizeNumber, z.number().min(0).optional()),
  mrp_inr: z.preprocess(sanitizeNumber, z.number().min(0).optional()),
  brand: z.preprocess(sanitizeString, z.string().max(100).optional()),
  category: z.preprocess(sanitizeString, z.string().max(100).optional()),
  reviews: z.union([
    z.array(z.string()),
    z.array(
      z.object({
        rating: z.preprocess(sanitizeNumber, z.number().optional()),
        review_text: z.string(),
        verified_purchase: z.boolean().optional(),
      })
    ),
  ]).optional(),
  images: z.array(z.string()).optional(),
});

export type InvestigateAdhocInput = z.infer<typeof investigateAdhocSchema>;

export const assistantChatSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query cannot exceed 1000 characters'),
  canonical_product_id: z.preprocess(sanitizeString, z.string().max(100).optional()),
  conversation_history: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(4000),
    })
  ).optional(),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;

export const pipelineInvestigationSchema = z.object({
  url: z.preprocess(
    sanitizeUrl,
    z.string().url('Must be a valid marketplace URL').max(2000, 'URL too long').optional()
  ),
  image_base64: z.preprocess(
    (val) => (typeof val === 'string' && val.trim().length > 0 ? val : undefined),
    z.string().max(15 * 1024 * 1024, 'Payload exceeds 15MB limit').optional()
  ),
  product_title: z.preprocess(sanitizeString, z.string().max(500).optional()),
  brand: z.preprocess(sanitizeString, z.string().max(100).optional()),
  category: z.preprocess(sanitizeString, z.string().max(100).optional()),
  observed_price_inr: z.preprocess(sanitizeNumber, z.number().min(0).optional()),
  mrp_inr: z.preprocess(sanitizeNumber, z.number().min(0).optional()),
  seller_name: z.preprocess(sanitizeString, z.string().max(200).optional()),
  fulfillment_type: z.preprocess(sanitizeString, z.string().max(100).optional()),
  reviews: z.union([
    z.array(z.string()),
    z.array(
      z.object({
        rating: z.preprocess(sanitizeNumber, z.number().optional()),
        review_text: z.string(),
        verified_purchase: z.boolean().optional(),
      })
    ),
  ]).optional(),
  specifications: z.record(z.string(), z.string()).optional(),
});

export type PipelineInvestigationInput = z.infer<typeof pipelineInvestigationSchema>;
