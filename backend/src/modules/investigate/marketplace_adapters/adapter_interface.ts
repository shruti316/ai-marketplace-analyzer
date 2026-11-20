import { URL } from 'node:url';

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
  availability: string;
  seller_name: string;
  seller_rating?: number;
  fulfillment_type: string;
  main_image_url?: string;
  gallery_images: string[];
  specs: Record<string, string>;
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

export function getCategoryFallbackImage(category?: string, title?: string): string {
  const combined = ((category || '') + ' ' + (title || '')).toLowerCase();

  if (combined.match(/\b(apple|iphone)\b/)) {
    return 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/\b(samsung|galaxy)\b/)) {
    return 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/\b(phone|mobile|smartphone|oneplus|pixel|redmi|realme|poco)\b/)) {
    return 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/earphone|headphone|airdope|earbud|audio|tws|neckband|soundbar|speaker|bose|sony/)) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/facewash|face-wash|cleanser|moisturi|serum|sunscreen|cream|lotion|soap|scrub|skin|hair|beauty|shampoo|nykaa|plum|minimalist|cetaphil/)) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/jacket|puffer|coat|outerwear|bomber|parka|blazer|windcheater/)) {
    return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/shoe|sneaker|runner|footwear|boot|sandal|trainer/)) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/watch|smartwatch|band|wearable/)) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  }
  if (combined.match(/tshirt|t-shirt|shirt|hoodie|pant|trouser|apparel|dress|kurta|saree/)) {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';
}

