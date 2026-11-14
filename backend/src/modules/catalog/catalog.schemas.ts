import { z } from 'zod';

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  platform_id: z.string().trim().optional(),
  brand_id: z.string().trim().optional(),
  category: z.string().trim().optional(),
  has_image: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  has_price: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sort_by: z.enum(['canonical_product_id', 'product_title', 'category', 'brand_id', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type ProductQueryParams = z.infer<typeof productQuerySchema>;

export const listingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  platform_id: z.string().trim().optional(),
  seller_id: z.string().trim().optional(),
  canonical_product_id: z.string().trim().optional(),
  is_active: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sort_by: z.enum(['listing_id', 'crawl_timestamp', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type ListingQueryParams = z.infer<typeof listingQuerySchema>;

export const brandQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  is_generic: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  sort_by: z.enum(['brand_name', 'product_count', 'created_at']).default('product_count'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type BrandQueryParams = z.infer<typeof brandQuerySchema>;

export const entityIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Entity identifier cannot be empty')
});

export type EntityIdParams = z.infer<typeof entityIdParamSchema>;
