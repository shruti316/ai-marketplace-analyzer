import { URL } from 'node:url';
import { MarketplaceAdapter, ExtractedProductData, getCategoryFallbackImage } from './adapter_interface';

export class MyntraAdapter implements MarketplaceAdapter {
  platformId = 'PLATFORM_MYNTRA';
  platformName = 'Myntra';

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'myntra.com' || host.endsWith('.myntra.com');
  }

  extractIdentifier(url: URL): string | null {
    const styleMatch = url.pathname.match(/\/([0-9]{5,10})(?:\/buy)?/);
    if (styleMatch) return styleMatch[1];
    return null;
  }

  extractFromMetadata(url: URL, meta: Record<string, string>): Partial<ExtractedProductData> {
    const title = meta['og:title'] || meta['title'] || '';
    const image = meta['og:image'] || '';
    return {
      title: title ? title.replace(/ - Buy .* online.*$/i, '').trim() : undefined,
      main_image_url: image || undefined,
    };
  }

  extractFromSlug(url: URL): ExtractedProductData {
    const styleId = this.extractIdentifier(url) || 'MYNUNKNOWN';
    const path = url.pathname;

    let cleanSlug = '';
    const match = path.match(/\/([^\/]+)\/[0-9]+/i);
    if (match) cleanSlug = match[1];

    if (!cleanSlug && path.length > 2) {
      cleanSlug = path.split('/').filter(Boolean)[0] || '';
    }

    const title = cleanSlug
      ? cleanSlug.replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Myntra Fashion Offering';

    const lower = (cleanSlug + ' ' + title).toLowerCase();

    let brand = 'Generic';
    if (lower.includes('nike')) brand = 'Nike';
    else if (lower.includes('puma')) brand = 'Puma';
    else if (lower.includes('adidas')) brand = 'Adidas';
    else if (lower.includes('plum')) brand = 'Plum';
    else if (lower.includes('minimalist')) brand = 'Minimalist';
    else if (lower.includes('cetaphil')) brand = 'Cetaphil';
    else if (lower.includes('roadster')) brand = 'Roadster';
    else if (lower.includes('hrx')) brand = 'HRX';
    else if (lower.includes('sojanya')) brand = 'Sojanya';
    else if (title.split(' ')[0]?.length > 2) brand = title.split(' ')[0];

    let category = 'Apparel / Fashion';
    if (lower.match(/facewash|face-wash|face wash|cleanser|moisturiser|moisturizer|serum|sunscreen|lotion|cream|skincare|skin-care/)) {
      category = 'Beauty & Personal Care';
    } else if (lower.match(/shoe|sneaker|runner|footwear|trainer/)) {
      category = 'Footwear / Shoes';
    } else if (lower.match(/jacket|coat|parka|bomber|blazer|windcheater/)) {
      category = "Women's Jackets / Outerwear";
    }

    let price: number | null = null;
    let mrp: number | null = null;

    const qPrice = url.searchParams.get('price') || url.searchParams.get('sp') || url.searchParams.get('cost') || url.searchParams.get('selling_price');
    if (qPrice && !isNaN(Number(qPrice)) && Number(qPrice) > 0) {
      price = Math.round(Number(qPrice));
    }

    const qMrp = url.searchParams.get('mrp') || url.searchParams.get('original_price');
    if (qMrp && !isNaN(Number(qMrp)) && Number(qMrp) > 0) {
      mrp = Math.round(Number(qMrp));
    }

    const discount = price !== null && mrp !== null && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;
    const resolvedImage = getCategoryFallbackImage(category, title);

    return {
      title,
      brand,
      category,
      model: `${brand}-${styleId.slice(0, 6)}`,
      sku_or_asin: styleId,
      observed_price: price,
      mrp,
      currency: 'INR',
      discount_percent: discount,
      availability: 'IN_STOCK',
      seller_name: null,
      seller_rating: null,
      fulfillment_type: null,
      main_image_url: resolvedImage,
      gallery_images: [resolvedImage],
      specs: {
        'Material': 'Cotton / Synthetic Blend',
        'Wash Care': 'Hand Wash Separately',
      },
      marketplace: this.platformName,
      raw_url: url.toString(),
      extraction_provenance: 'MARKETPLACE_SLUG_DERIVED',
      extraction_confidence: 0.90,
      retrieval_timestamp: new Date().toISOString(),
    };
  }
}
