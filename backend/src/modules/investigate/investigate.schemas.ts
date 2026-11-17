import { z } from 'zod';

export const investigateUrlSchema = z.object({
  url: z.string().url('Must be a valid marketplace URL').max(2000, 'URL too long')
});

export type InvestigateUrlInput = z.infer<typeof investigateUrlSchema>;

export const investigateImageSchema = z.object({
  image_base64: z.string().min(10, 'Image payload required').max(15 * 1024 * 1024, 'Payload exceeds 15MB limit'),
  canonical_brand: z.string().max(100).optional(),
  product_title: z.string().max(500).optional(),
  canonical_product_id: z.string().max(100).optional()
});

export type InvestigateImageInput = z.infer<typeof investigateImageSchema>;

export const investigateAdhocSchema = z.object({
  product_title: z.string().min(1, 'Product title is required').max(500),
  observed_price_inr: z.number().min(0).optional(),
  mrp_inr: z.number().min(0).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  reviews: z.array(z.string()).optional(),
  images: z.array(z.string()).optional()
});

export type InvestigateAdhocInput = z.infer<typeof investigateAdhocSchema>;

export const assistantChatSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query cannot exceed 1000 characters'),
  canonical_product_id: z.string().max(100).optional(),
  conversation_history: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(4000)
    })
  ).optional()
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;
