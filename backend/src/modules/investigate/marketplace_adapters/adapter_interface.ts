import { URL } from 'node:url';

export type ValidationStatus = 'EXTRACTED' | 'MANUALLY_ENTERED' | 'UNAVAILABLE' | 'BLOCKED' | 'INVALID' | 'STALE';

export type PriceVerificationStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'NOT_FOUND' | 'CONFLICTING_SOURCES' | ValidationStatus;

export type PriceType = 'SELLING_PRICE' | 'MRP' | 'DISCOUNTED_PRICE' | 'EFFECTIVE_OFFER_PRICE' | 'EMI_INSTALLMENT' | 'SUBSCRIPTION' | 'DELIVERY_CHARGE';

export interface FieldProvenance<T = any> {
  value: T | null;
  source: string;
  source_url?: string;
  timestamp: string;
  method: string;
  confidence: number;
  validation_status: ValidationStatus;
}

export interface ValidatedPriceItem {
  value: number | null;
  currency: string;
  price_type: PriceType;
  source: 'OFFICIAL_FEED' | 'JSON_LD' | 'EMBEDDED_STATE' | 'OPEN_GRAPH_META' | 'DOM_SEMANTIC' | 'RETAILER_ADAPTER' | 'FALLBACK_URL' | 'MANUAL_ENTRY';
  extraction_method: string;
  confidence: number;
  verification_status: PriceVerificationStatus;
  extracted_at: string;
  explanation?: string;
  conflicting_sources?: Array<{ source: string; amount: number }>;
}

export interface PriceEvidenceItem {
  amount: number | null;
  currency: string;
  source_url?: string;
  marketplace: string;
  seller?: string;
  product_identity?: string;
  variant?: string;
  retrieval_timestamp: string;
  retrieval_status: 'CONFIRMED' | 'UNAVAILABLE' | 'ESTIMATED';
  price_type: 'OBSERVED_LISTING_PRICE' | 'CLAIMED_MRP' | 'EFFECTIVE_OFFER_PRICE' | 'REFERENCE_MARKET_PRICE';
}

export interface ReferenceMarketPriceInfo {
  min: number;
  max: number;
  median: number;
  reliable_offers_count: number;
  status: 'ESTABLISHED' | 'INSUFFICIENT_DATA';
  explanation: string;
}

export interface ExtractedProductData {
  title: string;
  brand: string;
  category: string;
  model?: string;
  sku_or_asin?: string;
  observed_price: number | null;
  mrp: number | null;
  currency: string;
  discount_percent: number | null;
  effective_offer_price?: number | null;
  reference_market_price?: ReferenceMarketPriceInfo | null;
  price_evidence?: PriceEvidenceItem[];
  validated_price?: ValidatedPriceItem;
  price_verification_status?: PriceVerificationStatus;
  price_diagnostics?: {
    status: PriceVerificationStatus;
    extracted_source: string;
    conflicting_sources?: Array<{ source: string; amount: number }>;
    note: string;
  };
  availability: string;
  seller_name: string | null;
  seller_rating?: number | null;
  fulfillment_type: string | null;
  main_image_url?: string;
  gallery_images: string[];
  specs: Record<string, string>;
  provenance_map?: Record<string, FieldProvenance<any>>;
  marketplace: string;
  raw_url: string;
  extraction_provenance: 'LIVE_STRUCTURED_PAGE' | 'LIVE_PAGE_EXTRACTION' | 'MARKETPLACE_SLUG_DERIVED' | 'INDEXED_CATALOG_RECORD' | 'USER_PROVIDED';
  extraction_confidence: number;
  retrieval_timestamp: string;
  retrieval_status?: 'CONFIRMED' | 'PRICE_UNAVAILABLE' | 'CATALOG_SNAPSHOT';
}

export interface MarketplaceAdapter {
  platformId: string;
  platformName: string;
  canHandle(url: URL): boolean;
  extractIdentifier(url: URL): string | null;
  extractFromMetadata(url: URL, meta: Record<string, string>): Partial<ExtractedProductData>;
  extractFromSlug(url: URL): ExtractedProductData;
}

/**
 * Data integrity invariant:
 * Never invent placeholder/stock photos for unextracted images. Missing images MUST remain undefined/null.
 */
export function getCategoryFallbackImage(_category?: string, _title?: string): string | undefined {
  return undefined;
}

