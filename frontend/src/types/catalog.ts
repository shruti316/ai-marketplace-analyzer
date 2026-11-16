export interface Platform {
  id?: string;
  platform_id?: string;
  name?: string;
  platform_name?: string;
  base_url?: string;
  country?: string;
  currency?: string;
  created_at?: string;
}

export interface Brand {
  id: string;
  brand_id?: string;
  name: string;
  canonical_name?: string;
  country_of_origin?: string;
}

export interface Product {
  id?: string;
  canonical_product_id: string;
  title?: string;
  product_title?: string;
  brand_id: string;
  brand_name?: string;
  category: string;
  description?: string;
  product_description?: string;
  model_number?: string;
  created_at: string;
  updated_at?: string;
  total_listings?: number;
  average_price?: number;
}

export interface Listing {
  id: string;
  listing_id: string;
  canonical_product_id: string;
  platform_id: string;
  platform_name?: string;
  seller_id: string;
  title: string;
  price_inr: number;
  currency: string;
  rating?: number;
  review_count?: number;
  availability?: string;
  created_at: string;
}

export interface Seller {
  id: string;
  platform_id: string;
  seller_name: string;
  seller_id_on_platform?: string;
  rating?: number;
  total_ratings?: number;
  is_verified?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T> {
  status: 'success';
  data: T;
}
