import { URL } from 'node:url';
import { MarketplaceAdapter, ExtractedProductData, getCategoryFallbackImage } from './adapter_interface';

export class GenericEcomAdapter implements MarketplaceAdapter {
  platformId = 'PLATFORM_GENERIC_RETAIL';
  platformName = 'Retail Webstore';

  canHandle(_url: URL): boolean {
    return true;
  }

  extractIdentifier(url: URL): string | null {
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : 'GEN_ITEM';
  }

  extractFromMetadata(url: URL, meta: Record<string, string>): Partial<ExtractedProductData> {
    const title = meta['og:title'] || meta['title'] || '';
    const image = meta['og:image'] || '';
    const priceStr = meta['product:price:amount'] || meta['price'] || '';
    const price = parseFloat(priceStr) || 0;

    return {
      title: title || undefined,
      main_image_url: image || undefined,
      observed_price: price > 0 ? price : undefined,
    };
  }

  extractFromSlug(url: URL): ExtractedProductData {
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    const slug = segments.length > 0 ? segments[segments.length - 1] : 'E-Commerce Product';
    const title = slug.replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const lower = (slug + ' ' + title + ' ' + host).toLowerCase();

    let brand = title.split(' ')[0] || 'Generic Merchant';
    let marketplace = url.hostname;
    let category = 'General Goods';
    let price: number | null = null;
    let mrp: number | null = null;

    if (host.includes('nike')) {
      brand = 'Nike';
      marketplace = 'Nike India';
      category = 'Footwear / Shoes';
    } else if (host.includes('adidas')) {
      brand = 'Adidas';
      marketplace = 'Adidas India';
      category = 'Footwear / Shoes';
    } else if (host.includes('plum')) {
      brand = 'Plum';
      marketplace = 'Plum Goodness';
      category = 'Beauty & Personal Care';
    } else if (host.includes('nykaa')) {
      brand = 'Nykaa';
      marketplace = 'Nykaa';
      category = 'Beauty & Personal Care';
    } else if (host.includes('tatacliq')) {
      marketplace = 'Tata CLiQ';
    } else if (host.includes('ajio')) {
      marketplace = 'AJIO';
      category = 'Apparel / Fashion';
    }

    if (lower.match(/facewash|face-wash|cleanser|moisturi|serum|sunscreen|cream|lotion|soap|scrub|skin|hair|beauty|shampoo/)) {
      category = 'Beauty & Personal Care';
    } else if (lower.match(/shoe|sneaker|runner|boot|footwear|trainer/)) {
      category = 'Footwear / Shoes';
    }

    // Direct price parameter extraction from URL query or path
    const qPrice = url.searchParams.get('price') || url.searchParams.get('sp') || url.searchParams.get('cost') || url.searchParams.get('selling_price');
    if (qPrice && !isNaN(Number(qPrice)) && Number(qPrice) > 0) {
      price = Math.round(Number(qPrice));
    } else {
      const matchP = url.pathname.match(/(?:price|rs|inr)[-_:=]*(\d{2,6})/i);
      if (matchP && Number(matchP[1]) > 50) {
        price = Math.round(Number(matchP[1]));
      }
    }

    const qMrp = url.searchParams.get('mrp') || url.searchParams.get('original_price');
    if (qMrp && !isNaN(Number(qMrp)) && Number(qMrp) > 0) {
      mrp = Math.round(Number(qMrp));
    }

    const discount = price !== null && mrp !== null && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;

    const isDirectBrandStore = host.includes('nike') || host.includes('adidas') || host.includes('plum') || host.includes('nykaa') || host.includes('sonata');
    const identifier = this.extractIdentifier(url) || 'SKU_UNKNOWN';

    return {
      title: title || 'Product Listing',
      brand,
      category,
      model: identifier,
      sku_or_asin: identifier,
      observed_price: price,
      mrp,
      currency: 'INR',
      discount_percent: discount,
      availability: 'IN_STOCK',
      seller_name: isDirectBrandStore ? marketplace : null,
      seller_rating: null,
      fulfillment_type: isDirectBrandStore ? 'Direct Brand Fulfillment' : null,
      main_image_url: undefined,
      gallery_images: [],
      specs: {},
      marketplace,
      raw_url: url.toString(),
      extraction_provenance: 'MARKETPLACE_SLUG_DERIVED',
      extraction_confidence: 0.85,
      retrieval_timestamp: new Date().toISOString(),
    };
  }
}
