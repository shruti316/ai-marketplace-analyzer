import { RowDataPacket } from 'mysql2/promise';
import { query, queryOne } from '../../config/database';
import { ProductQueryParams, ListingQueryParams, BrandQueryParams } from './catalog.schemas';

export interface CountRow extends RowDataPacket {
  total: number;
}

export interface ProductRow extends RowDataPacket {
  canonical_product_id: string;
  platform_id: string;
  brand_id: string;
  marketplace: string;
  source_product_id: string;
  country: string;
  currency: string;
  product_title: string;
  category: string;
  subcategory: string;
  product_description: string;
  product_url: string;
  extracted_attributes_json: unknown;
  has_image: number | boolean;
  has_review: number | boolean;
  has_price: number | boolean;
  modality_tier: string;
  domain_partition: string;
  provenance: string;
  created_at: string;
  updated_at: string;
  brand_name?: string;
  platform_name?: string;
}

export interface ListingRow extends RowDataPacket {
  listing_id: string;
  canonical_product_id: string;
  platform_id: string;
  seller_id: string;
  marketplace_product_id: string;
  listing_title: string;
  listing_url: string;
  crawl_timestamp: string;
  is_active_listing: number | boolean;
  fulfillment_type: string;
  seller_resolution_status: string;
  created_at: string;
  seller_display_name?: string;
  platform_name?: string;
  current_price_inr?: number;
  mrp_inr?: number;
  discount_percentage?: number;
}

export interface BrandRow extends RowDataPacket {
  brand_id: string;
  brand_name: string;
  brand_aliases_json: unknown;
  product_count: number;
  marketplaces_active: string;
  categories_represented: string;
  is_generic_or_unbranded: number | boolean;
  verification_status: string;
  provenance: string;
  created_at: string;
}

export interface PlatformRow extends RowDataPacket {
  platform_id: string;
  platform_name: string;
  operator_entity: string;
  marketplace_domain: string;
  jurisdiction: string;
  operating_model: string;
  corporate_cin: string | null;
  headquarters: string | null;
  verification_status: string;
  provenance: string;
  created_at: string;
}

export interface SellerRow extends RowDataPacket {
  seller_id: string;
  platform_id: string;
  marketplace: string;
  seller_display_name: string;
  operator_entity: string;
  seller_type: string;
  is_individual_merchant: number | boolean;
  merchant_resolution_status: string;
  registration_status: string;
  source_provenance: string;
  verification_notes: string;
  seller_rating: number | null;
  seller_review_count: number;
  total_catalog_listings: number;
  unique_brands_count: number;
  unique_categories_count: number;
  median_price_inr: number;
  mean_price_inr: number;
  created_at: string;
  platform_name?: string;
}

// Column Allowlist mapping for safe SQL sorting
const PRODUCT_SORT_ALLOWLIST: Record<string, string> = {
  canonical_product_id: 'p.canonical_product_id',
  product_title: 'p.product_title',
  category: 'p.category',
  brand_id: 'p.brand_id',
  created_at: 'p.created_at'
};

const LISTING_SORT_ALLOWLIST: Record<string, string> = {
  listing_id: 'l.listing_id',
  crawl_timestamp: 'l.crawl_timestamp',
  created_at: 'l.created_at'
};

const BRAND_SORT_ALLOWLIST: Record<string, string> = {
  brand_name: 'brand_name',
  product_count: 'product_count',
  created_at: 'created_at'
};

export class CatalogRepository {
  /**
   * Queries products with pagination, search, and dynamic filtering.
   */
  async findProducts(params: ProductQueryParams): Promise<{ items: ProductRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.search) {
      conditions.push('(p.product_title LIKE ? OR p.product_description LIKE ? OR p.canonical_product_id LIKE ?)');
      const pattern = `%${params.search}%`;
      values.push(pattern, pattern, pattern);
    }

    if (params.platform_id) {
      conditions.push('p.platform_id = ?');
      values.push(params.platform_id);
    }

    if (params.brand_id) {
      conditions.push('p.brand_id = ?');
      values.push(params.brand_id);
    }

    if (params.category) {
      conditions.push('p.category = ?');
      values.push(params.category);
    }

    if (params.has_image !== undefined) {
      conditions.push('p.has_image = ?');
      values.push(params.has_image ? 1 : 0);
    }

    if (params.has_price !== undefined) {
      conditions.push('p.has_price = ?');
      values.push(params.has_price ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM canonical_products p
      ${whereClause}
    `;
    const countRows = await query<CountRow[]>(countSql, values);
    const total = countRows[0]?.total ?? 0;

    // Sort order & pagination
    const sortCol = PRODUCT_SORT_ALLOWLIST[params.sort_by] || 'p.created_at';
    const sortDir = params.sort_order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit) || 20)));
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT p.*, b.brand_name, pl.platform_name
      FROM canonical_products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN platforms pl ON p.platform_id = pl.platform_id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const items = await query<ProductRow[]>(dataSql, [...values, limit, offset]);

    return { items, total };
  }

  /**
   * Finds a product by canonical ID including brand, platform, and active listing count.
   */
  async findProductById(id: string): Promise<ProductRow | null> {
    const sql = `
      SELECT p.*, b.brand_name, pl.platform_name
      FROM canonical_products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN platforms pl ON p.platform_id = pl.platform_id
      WHERE p.canonical_product_id = ?
      LIMIT 1
    `;
    return queryOne<ProductRow>(sql, [id]);
  }

  /**
   * Queries marketplace listings with filters and pagination.
   */
  async findListings(params: ListingQueryParams): Promise<{ items: ListingRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.platform_id) {
      conditions.push('l.platform_id = ?');
      values.push(params.platform_id);
    }

    if (params.seller_id) {
      conditions.push('l.seller_id = ?');
      values.push(params.seller_id);
    }

    if (params.canonical_product_id) {
      conditions.push('l.canonical_product_id = ?');
      values.push(params.canonical_product_id);
    }

    if (params.is_active !== undefined) {
      conditions.push('l.is_active_listing = ?');
      values.push(params.is_active ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM marketplace_listings l
      ${whereClause}
    `;
    const countRows = await query<CountRow[]>(countSql, values);
    const total = countRows[0]?.total ?? 0;

    const sortCol = LISTING_SORT_ALLOWLIST[params.sort_by] || 'l.created_at';
    const sortDir = params.sort_order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit) || 20)));
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT l.*, s.seller_display_name, pl.platform_name
      FROM marketplace_listings l
      LEFT JOIN sellers s ON l.seller_id = s.seller_id AND l.platform_id = s.platform_id
      LEFT JOIN platforms pl ON l.platform_id = pl.platform_id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const items = await query<ListingRow[]>(dataSql, [...values, limit, offset]);

    return { items, total };
  }

  /**
   * Finds listing by ID with seller, platform, and latest price observation.
   */
  async findListingById(id: string): Promise<ListingRow | null> {
    const sql = `
      SELECT l.*, s.seller_display_name, pl.platform_name,
             ph.selling_price_inr AS current_price_inr,
             ph.mrp_inr,
             ph.discount_percentage
      FROM marketplace_listings l
      LEFT JOIN sellers s ON l.seller_id = s.seller_id AND l.platform_id = s.platform_id
      LEFT JOIN platforms pl ON l.platform_id = pl.platform_id
      LEFT JOIN (
        SELECT listing_id, selling_price_inr, mrp_inr, discount_percentage
        FROM price_history
        WHERE (listing_id, observation_timestamp) IN (
          SELECT listing_id, MAX(observation_timestamp)
          FROM price_history
          GROUP BY listing_id
        )
      ) ph ON l.listing_id = ph.listing_id
      WHERE l.listing_id = ?
      LIMIT 1
    `;
    return queryOne<ListingRow>(sql, [id]);
  }

  /**
   * Queries brands with pagination and search.
   */
  async findBrands(params: BrandQueryParams): Promise<{ items: BrandRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.search) {
      conditions.push('brand_name LIKE ?');
      values.push(`%${params.search}%`);
    }

    if (params.is_generic !== undefined) {
      conditions.push('is_generic_or_unbranded = ?');
      values.push(params.is_generic ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM brands ${whereClause}`;
    const countRows = await query<CountRow[]>(countSql, values);
    const total = countRows[0]?.total ?? 0;

    const sortCol = BRAND_SORT_ALLOWLIST[params.sort_by] || 'product_count';
    const sortDir = params.sort_order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit) || 20)));
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT *
      FROM brands
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const items = await query<BrandRow[]>(dataSql, [...values, limit, offset]);

    return { items, total };
  }

  /**
   * Returns all platform operators.
   */
  async findAllPlatforms(): Promise<PlatformRow[]> {
    return query<PlatformRow[]>('SELECT * FROM platforms ORDER BY platform_name ASC');
  }

  /**
   * Finds seller by ID.
   */
  async findSellerById(id: string): Promise<SellerRow | null> {
    const sql = `
      SELECT s.*, pl.platform_name
      FROM sellers s
      LEFT JOIN platforms pl ON s.platform_id = pl.platform_id
      WHERE s.seller_id = ?
      LIMIT 1
    `;
    return queryOne<SellerRow>(sql, [id]);
  }
}

export const catalogRepository = new CatalogRepository();
