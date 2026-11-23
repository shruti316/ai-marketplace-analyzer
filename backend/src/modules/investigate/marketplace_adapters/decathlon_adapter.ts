import { URL } from 'node:url';
import { MarketplaceAdapter, ExtractedProductData, getCategoryFallbackImage } from './adapter_interface';

export class DecathlonAdapter implements MarketplaceAdapter {
  platformId = 'PLATFORM_DECATHLON';
  platformName = 'Decathlon India';

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'decathlon.in' || host.endsWith('.decathlon.in');
  }

  extractIdentifier(url: URL): string | null {
    // /p/8832420/jogflow-190-1...
    const match = url.pathname.match(/\/p\/([0-9]+)/i);
    if (match) return match[1];

    const segments = url.pathname.split('/').filter(Boolean);
    const num = segments.find(s => /^\d{5,9}$/.test(s));
    if (num) return num;

    return null;
  }

  extractFromMetadata(url: URL, meta: Record<string, string>): Partial<ExtractedProductData> {
    let title = meta['og:title'] || meta['title'] || '';
    const cleanLower = title.toLowerCase().trim();
    if (
      cleanLower === 'decathlon' ||
      cleanLower === 'decathlon india' ||
      cleanLower === 'decathlon.in' ||
      cleanLower.includes('access denied') ||
      cleanLower.includes('robot check') ||
      cleanLower.includes('captcha')
    ) {
      title = '';
    }
    const image = meta['og:image'] || '';
    const priceStr = meta['product:price:amount'] || meta['og:price:amount'] || meta['price'] || '';
    const price = parseFloat(priceStr) || 0;
    const mrpStr = meta['product:original_price:amount'] || meta['mrp'] || '';
    const mrp = parseFloat(mrpStr) || 0;

    return {
      title: title ? title.replace(/ \| Decathlon.*$/i, '').trim() : undefined,
      main_image_url: image || undefined,
      observed_price: price > 0 ? price : undefined,
      mrp: mrp > 0 ? mrp : undefined,
    };
  }

  extractFromSlug(url: URL): ExtractedProductData {
    const sku = this.extractIdentifier(url) || 'DEC_ITEM';
    const segments = url.pathname.split('/').filter(Boolean);

    // Look for the text slug segment (not just numbers)
    const textSegment = segments.find(s => s !== 'p' && !/^\d+$/.test(s) && s.length > 3);
    const cleanSlug = textSegment || (segments.length > 0 ? segments[segments.length - 1] : '');

    const title = cleanSlug && !/^\d+$/.test(cleanSlug)
      ? cleanSlug.replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Decathlon Sports Gear';

    const lower = (cleanSlug + ' ' + title).toLowerCase();
    let category = 'Sports & Fitness Equipment';
    if (lower.match(/shoe|sneaker|runner|footwear|boot|jogflow|cushion|grip/)) {
      category = 'Footwear / Shoes';
    } else if (lower.match(/tshirt|t-shirt|short|pant|tight|jacket|hoodie|jersey/)) {
      category = 'Activewear & Apparel';
    } else if (lower.match(/cycle|bike|helmet|glove|bottle|backpack|bag|mat|tent/)) {
      category = 'Sports & Outdoor Gear';
    }

    let brand = 'Decathlon';
    if (lower.includes('kalenji')) brand = 'Kalenji (Decathlon)';
    else if (lower.includes('kiprun')) brand = 'Kiprun (Decathlon)';
    else if (lower.includes('domyos')) brand = 'Domyos (Decathlon)';
    else if (lower.includes('quechua')) brand = 'Quechua (Decathlon)';
    else if (lower.includes('btwin') || lower.includes('triban')) brand = 'B\'Twin (Decathlon)';

    // Price hints
    let price: number | null = null;
    let mrp: number | null = null;

    const qPrice = url.searchParams.get('price') || url.searchParams.get('sp');
    if (qPrice && !isNaN(Number(qPrice)) && Number(qPrice) > 0) {
      price = Math.round(Number(qPrice));
    }

    const qMrp = url.searchParams.get('mrp');
    if (qMrp && !isNaN(Number(qMrp)) && Number(qMrp) > 0) {
      mrp = Math.round(Number(qMrp));
    }

    const discount = price !== null && mrp !== null && mrp > price
      ? Math.round(((mrp - price) / mrp) * 100)
      : null;

    const fallbackImage = getCategoryFallbackImage(category, title);

    return {
      title,
      brand,
      category,
      model: `DEC-${sku}`,
      sku_or_asin: sku,
      observed_price: price,
      mrp,
      currency: 'INR',
      discount_percent: discount,
      availability: 'IN_STOCK',
      seller_name: 'Decathlon Sports India',
      seller_rating: null,
      fulfillment_type: 'Direct Brand Warehouse Dispatch',
      main_image_url: fallbackImage,
      gallery_images: [fallbackImage],
      specs: {
        'Retail Entity': 'Decathlon Sports India Pvt Ltd',
        'Official Brand': brand,
        'Item Model Code': sku,
      },
      marketplace: 'Decathlon India',
      raw_url: url.toString(),
      extraction_provenance: 'MARKETPLACE_SLUG_DERIVED',
      extraction_confidence: 0.88,
      retrieval_timestamp: new Date().toISOString(),
    };
  }
}
