import { z } from 'zod';

export const createComparisonSchema = z.object({
  title: z.string().trim().min(1).max(255).optional().default('Product Trust Comparison'),
  canonical_product_ids: z
    .array(z.string().trim().min(1))
    .min(2, 'At least 2 products are required to generate a comparison')
    .max(5, 'A maximum of 5 products can be compared simultaneously')
    .refine(items => new Set(items).size === items.length, {
      message: 'Product comparison list must contain unique canonical product identifiers'
    })
});

export type CreateComparisonInput = z.infer<typeof createComparisonSchema>;

export const comparisonQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export type ComparisonQueryParams = z.infer<typeof comparisonQuerySchema>;
