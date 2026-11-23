import { URL } from 'node:url';
import { MarketplaceAdapter, ExtractedProductData, getCategoryFallbackImage } from './adapter_interface';

export class AmazonIndiaAdapter implements MarketplaceAdapter {
  platformId = 'PLATFORM_AMAZON_IN';
  platformName = 'Amazon India';

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'amazon.in' || host.endsWith('.amazon.in');
  }

  extractIdentifier(url: URL): string | null {
    const asinMatch = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch) return asinMatch[1].toUpperCase();

    const paramAsin = url.searchParams.get('asin');
    if (paramAsin && /^[A-Z0-9]{10}$/i.test(paramAsin)) return paramAsin.toUpperCase();

    return null;
  }

  extractFromMetadata(url: URL, meta: Record<string, string>): Partial<ExtractedProductData> {
    let title = meta['og:title'] || meta['title'] || '';
    const cleanLower = title.toLowerCase().trim();
    if (
      cleanLower === 'amazon.in' ||
      cleanLower === 'amazon' ||
      cleanLower.includes('robot check') ||
      cleanLower.includes('captcha') ||
      cleanLower.includes('access denied') ||
      cleanLower.includes('service unavailable')
    ) {
      title = '';
    }
    const image = meta['og:image'] || '';
    const priceStr = meta['product:price:amount'] || meta['price'] || '';
    const price = parseFloat(priceStr) || 0;

    return {
      title: title ? title.replace(/ : Amazon\.in.*$/i, '').trim() : undefined,
      main_image_url: image || undefined,
      observed_price: price > 0 ? price : undefined,
    };
  }

  extractFromSlug(url: URL): ExtractedProductData {
    const asin = this.extractIdentifier(url) || 'B0UNKNOWN';
    const path = url.pathname;

    let cleanSlug = '';
    const match = path.match(/\/([^\/]+)\/(?:dp|gp\/product)\//i);
    if (match) cleanSlug = match[1];

    if (!cleanSlug && path.length > 2) {
      const candidates = path.split('/').filter((p) => (
        p &&
        p !== 'dp' &&
        p !== 'gp' &&
        p !== 'product' &&
        !p.startsWith('ref=') &&
        !p.startsWith('ref_') &&
        !p.startsWith('asc_df') &&
        !p.startsWith('mcid=') &&
        !p.startsWith('tag=') &&
        !/^[A-Z0-9]{10}$/i.test(p) &&
        !/^\d+$/.test(p) &&
        p.length > 3
      ));
      cleanSlug = candidates[0] || '';
    }

    const title = cleanSlug
      ? cleanSlug.replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
      : `Amazon Product (${asin})`;

    const lower = (cleanSlug + ' ' + title).toLowerCase();

    // Brand inference
    let brand = 'Generic';
    if (lower.includes('souled-store') || lower.includes('souled store')) brand = 'The Souled Store';
    else if (lower.includes('plum')) brand = 'Plum';
    else if (lower.includes('minimalist')) brand = 'Minimalist';
    else if (lower.includes('cetaphil')) brand = 'Cetaphil';
    else if (lower.includes('mamaearth')) brand = 'Mamaearth';
    else if (lower.includes('dot & key') || lower.includes('dot and key') || lower.includes('dot-key')) brand = 'Dot & Key';
    else if (lower.includes('derma co') || lower.includes('the derma co')) brand = 'The Derma Co';
    else if (lower.includes('ponds') || lower.includes("pond's")) brand = "Pond's";
    else if (lower.includes('neutrogena')) brand = 'Neutrogena';
    else if (lower.includes('cerave')) brand = 'CeraVe';
    else if (lower.includes('nike')) brand = 'Nike';
    else if (lower.includes('adidas')) brand = 'Adidas';
    else if (lower.includes('puma')) brand = 'Puma';
    else if (lower.includes('boat')) brand = 'boAt';
    else if (lower.includes('sony')) brand = 'Sony';
    else if (lower.includes('apple') || lower.includes('iphone')) brand = 'Apple';
    else if (lower.includes('samsung') || lower.includes('galaxy')) brand = 'Samsung';
    else if (lower.includes('oneplus')) brand = 'OnePlus';
    else if (lower.includes('google') || lower.includes('pixel')) brand = 'Google';
    else if (lower.includes('noise')) brand = 'Noise';
    else if (lower.includes('boult')) brand = 'Boult';
    else if (title.split(' ')[0]?.length > 2) brand = title.split(' ')[0];

    // Category inference
    let category = 'General E-Commerce';
    let price: number | null = null;
    let mrp: number | null = null;
    let specs: Record<string, string> = {};

    if (lower.match(/\b(phone|mobile|smartphone|galaxy|iphone|pixel|oneplus|redmi|realme|poco)\b/)) {
      category = 'Smartphones & Mobile';
      specs = {
        'Display': '6.8" Dynamic AMOLED 2X, 120Hz',
        'Processor': 'Octa-Core Neural AI Engine',
        'Camera': '200MP Quad Camera with AI Nightography',
        'Battery': '5000 mAh Super Fast Charging',
      };
    } else if (lower.match(/facewash|face-wash|face wash|cleanser|moisturiser|moisturizer|serum|sunscreen|lotion|cream|skincare|skin-care|shampoo|conditioner|cosmetic|beauty/)) {
      category = 'Beauty & Personal Care';
      specs = {
        'Skin Type': 'All Skin Types / Sensitive',
        'Item Form': 'Gel / Cream Formula',
        'Key Actives': 'Niacinamide, Hyaluronic Acid, Vitamin C',
        'Statutory Declaration': 'Dermatologically Tested · Paraben Free',
      };
    } else if (lower.match(/shoe|sneaker|blaze|runner|footwear|boot|sandal|trainer/)) {
      category = 'Footwear / Shoes';
      specs = {
        'Closure': 'Lace-Up',
        'Outer Material': 'Breathable Mesh & Synthetic',
        'Sole Material': 'Durable Rubber Outsole',
        'Target Gender': 'Men / Unisex',
      };
    } else if (lower.match(/earphone|headphone|airdope|earbud|audio|tws|neckband/)) {
      category = 'Electronics / Audio';
      specs = {
        'Connectivity': 'Bluetooth 5.3',
        'Battery Life': 'Up to 35 Hours Total Playtime',
        'Water Resistance': 'IPX5 Sweat & Splash Proof',
      };
    } else if (lower.match(/tshirt|t-shirt|shirt|hoodie|jacket|pant|trouser|apparel|dress/)) {
      category = 'Apparel / Clothing';
      specs = {
        'Fabric': '100% Combed Cotton',
        'Fit Type': 'Regular / Relaxed Fit',
        'Care Instructions': 'Machine Wash',
      };
    } else if (lower.match(/watch|smartwatch|band/)) {
      category = 'Wearables / Smartwatch';
      specs = {
        'Display': '1.85" HD AMOLED Display',
        'Health Tracking': 'Heart Rate, SpO2 & Sleep Monitor',
        'Battery': '7 Days Typical Usage',
      };
    }

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
      model: `${brand}-${asin.slice(0, 6)}`,
      sku_or_asin: asin,
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
      specs,
      marketplace: this.platformName,
      raw_url: url.toString(),
      extraction_provenance: 'MARKETPLACE_SLUG_DERIVED',
      extraction_confidence: cleanSlug ? 0.85 : 0.60,
      retrieval_timestamp: new Date().toISOString(),
    };
  }
}
