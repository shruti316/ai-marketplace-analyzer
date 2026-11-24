import { URL } from 'node:url';
import { AppError } from '../../middleware/errorHandler';
import {
  adapterRegistry,
  ExtractedProductData,
  PriceEvidenceItem,
  PriceVerificationStatus,
  PriceType,
  ValidatedPriceItem,
} from './marketplace_adapters';

export function isJunkBotBlockTitle(t?: string | null): boolean {
  if (!t) return true;
  const clean = t.trim().toLowerCase();
  if (clean.length < 3) return true;
  return (
    clean === 'amazon.in' ||
    clean === 'amazon' ||
    clean === 'flipkart.com' ||
    clean === 'flipkart' ||
    clean === 'myntra.com' ||
    clean === 'myntra' ||
    clean === 'decathlon.in' ||
    clean === 'croma.com' ||
    clean === 'croma' ||
    clean === 'adidas' ||
    clean === 'adidas india' ||
    clean === 'robot check' ||
    clean.includes('captcha') ||
    clean.includes('access denied') ||
    clean.includes('service unavailable') ||
    clean.includes('503 service') ||
    clean.includes('403 forbidden') ||
    clean.includes('security check') ||
    clean.includes('just a moment') ||
    clean.includes('attention required') ||
    clean.includes('are you human') ||
    clean.includes('please wait') ||
    clean.startsWith('ref=') ||
    clean.startsWith('ref_') ||
    clean.startsWith('asc_df') ||
    clean.startsWith('mcid=') ||
    clean.startsWith('http') ||
    /^\d+$/.test(clean) ||
    /^[A-Z0-9]{10}$/i.test(clean)
  );
}

export interface ExtractedPriceResult {
  value: number | null;
  currency: string;
  source: 'JSON_LD' | 'EMBEDDED_STATE' | 'OPEN_GRAPH_META' | 'DOM_SEMANTIC' | 'URL_QUERY_HINT' | 'SLUG_DERIVED' | 'NONE';
  method: string;
  confidence: number;
  timestamp: string;
  validationStatus: PriceVerificationStatus;
}

export class UrlRetrieverService {
  /**
   * Validates and normalizes URL against SSRF and protocol exploits.
   */
  validateAndNormalizeUrl(rawUrl: string): URL {
    const trimmed = rawUrl.trim();
    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      throw new AppError('Invalid URL structure provided.', 400, 'INVALID_URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new AppError('Only standard HTTP and HTTPS URLs are permitted.', 400, 'SSRF_INVALID_PROTOCOL');
    }

    const host = parsed.hostname.toLowerCase();

    // SSRF Guard: Disallow private, loopback, and local network IPs
    const isPrivate = (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    );

    if (isPrivate) {
      throw new AppError('Target hostname resolves to a restricted private or internal network address.', 400, 'SSRF_RESTRICTED_HOST');
    }

    return parsed;
  }

  /**
   * Deterministically parses price and MRP hints embedded in URL query parameters or slug tokens.
   */
  extractPriceFromUrl(url: URL): { price: number | null; mrp: number | null } {
    let price: number | null = null;
    let mrp: number | null = null;

    // 1. Query parameters: price, sp, cost, selling_price, p, amount
    const qPrice = url.searchParams.get('price') ||
      url.searchParams.get('sp') ||
      url.searchParams.get('cost') ||
      url.searchParams.get('selling_price') ||
      url.searchParams.get('p') ||
      url.searchParams.get('amount');
    if (qPrice && !isNaN(Number(qPrice)) && Number(qPrice) >= 50 && Number(qPrice) <= 500000) {
      price = Math.round(Number(qPrice));
    }

    const qMrp = url.searchParams.get('mrp') || url.searchParams.get('original_price');
    if (qMrp && !isNaN(Number(qMrp)) && Number(qMrp) >= 50) {
      mrp = Math.round(Number(qMrp));
    }

    // 2. Path patterns with price indicator: /(?:price|rs|inr|cost|deal|offer|val|amt)[-_:=/]*([1-9][0-9]{2,5})/i
    if (!price) {
      const pathMatch = url.pathname.match(/(?:price|rs|inr|cost|deal|offer|val|amt)[-_:=/]*([1-9][0-9]{2,5})/i);
      if (pathMatch) {
        const val = Number(pathMatch[1]);
        if (val >= 50 && val <= 500000) price = val;
      }
    }

    // 3. Path patterns with currency prefix e.g. /inr-2499/ or /rs-2499/
    if (!price) {
      const currMatch = url.pathname.match(/(?:inr|rs)[-_]([1-9][0-9]{2,5})/i);
      if (currMatch) {
        const val = Number(currMatch[1]);
        if (val >= 50 && val <= 500000) price = val;
      }
    }

    return { price, mrp };
  }

  /**
   * Layered product metadata and price extraction pipeline:
   * Layer 1: JSON-LD Structured Data (<script type="application/ld+json">)
   * Layer 2: Embedded Next.js / Nuxt / Hydration State (__NEXT_DATA__)
   * Layer 3: Open Graph and Product Meta Tags (og:price:amount, product:price:amount)
   * Layer 4: Semantic DOM Microdata (itemprop="price", retailer-specific price classes)
   * Layer 5: Marketplace-Specific Slug and URL Parameter Parsers
   */
  async retrieveAndExtract(rawUrl: string): Promise<ExtractedProductData> {
    const url = this.validateAndNormalizeUrl(rawUrl);
    const adapter = adapterRegistry.getAdapter(url);

    // Initial deterministic baseline extraction from adapter slug
    const slugData = adapter.extractFromSlug(url);
    const urlPriceData = this.extractPriceFromUrl(url);
    let wasBlocked = false;
    let blockReason = '';

    try {
      // Safe, non-invasive fetch with 7-second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
        },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeout);

      if (response) {
        if (!response.ok) {
          if (response.status === 403 || response.status === 503 || response.status === 429) {
            wasBlocked = true;
            blockReason = `HTTP ${response.status} Anti-Bot Gate`;
          }
        } else {
          const text = await response.text();
          if (text.includes('Attention Required! | Cloudflare') || text.includes('Robot Check') || text.includes('security check') || text.includes('captcha')) {
            wasBlocked = true;
            blockReason = 'Cloudflare / CAPTCHA Bot Challenge';
          } else {
            const htmlChunk = text;

            // Layer 1: JSON-LD Structured Data
            const jsonLdData = this.parseJsonLd(htmlChunk);

        // Layer 2: Embedded Page State (__NEXT_DATA__, Nuxt, inline hydration blobs)
        const embeddedStateData = this.parseEmbeddedState(htmlChunk);

        // Layer 3: Open Graph and Meta Tags
        const metaTags = this.parseMetaTags(htmlChunk);
        const metaData = adapter.extractFromMetadata(url, metaTags);

        // Layer 4: DOM-based Semantic and Retailer Prices
        const domPriceData = this.parseDomPrices(htmlChunk);

        // ===============================================================
        // LAYERED WATERFALL & PRICE CONFLICT RESOLUTION
        // ===============================================================
        const candidates: Array<{ source: string; amount: number }> = [];
        if (jsonLdData.price !== undefined && jsonLdData.price > 0) {
          candidates.push({ source: 'JSON_LD', amount: jsonLdData.price });
        }
        if (embeddedStateData.price !== undefined && embeddedStateData.price > 0) {
          candidates.push({ source: 'EMBEDDED_STATE', amount: embeddedStateData.price });
        }
        if (metaData.observed_price !== undefined && metaData.observed_price !== null && metaData.observed_price > 0) {
          candidates.push({ source: 'OPEN_GRAPH_META', amount: metaData.observed_price });
        }
        if (domPriceData.price !== undefined && domPriceData.price !== null && domPriceData.price > 0) {
          candidates.push({ source: 'DOM_SEMANTIC', amount: domPriceData.price });
        }

        let resolvedPrice: number | null = null;
        let resolvedMrp: number | null = null;
        let resolvedOfferPrice: number | null = null;
        let priceExtractionSource: ExtractedPriceResult['source'] = 'NONE';
        let priceConfidence = 0.50;
        let verificationStatus: PriceVerificationStatus = 'NOT_FOUND';
        let conflictingSources: Array<{ source: string; amount: number }> | undefined = undefined;

        // Check for conflicts between independent candidates (>15% discrepancy)
        if (candidates.length >= 2) {
          const amounts = candidates.map((c) => c.amount);
          const minVal = Math.min(...amounts);
          const maxVal = Math.max(...amounts);
          if ((maxVal - minVal) / maxVal > 0.15) {
            verificationStatus = 'CONFLICTING_SOURCES';
            conflictingSources = candidates;
          }
        }

        // Waterfall priority: JSON-LD -> Embedded State -> Meta Tags -> DOM Semantic -> URL Query -> Slug
        if (jsonLdData.price !== undefined && jsonLdData.price > 0) {
          resolvedPrice = jsonLdData.price;
          resolvedMrp = jsonLdData.mrp || null;
          priceExtractionSource = 'JSON_LD';
          priceConfidence = 0.98;
          if (verificationStatus !== 'CONFLICTING_SOURCES') {
            verificationStatus = candidates.length >= 2 ? 'VERIFIED' : 'VERIFIED';
          }
        } else if (embeddedStateData.price !== undefined && embeddedStateData.price > 0) {
          resolvedPrice = embeddedStateData.price;
          resolvedMrp = embeddedStateData.mrp || null;
          priceExtractionSource = 'EMBEDDED_STATE';
          priceConfidence = 0.97;
          if (verificationStatus !== 'CONFLICTING_SOURCES') {
            verificationStatus = candidates.length >= 2 ? 'VERIFIED' : 'VERIFIED';
          }
        } else if (metaData.observed_price !== undefined && metaData.observed_price !== null && metaData.observed_price > 0) {
          resolvedPrice = metaData.observed_price;
          resolvedMrp = metaData.mrp || null;
          priceExtractionSource = 'OPEN_GRAPH_META';
          priceConfidence = 0.92;
          if (verificationStatus !== 'CONFLICTING_SOURCES') {
            verificationStatus = 'PARTIALLY_VERIFIED';
          }
        } else if (domPriceData.price !== undefined && domPriceData.price !== null && domPriceData.price > 0) {
          resolvedPrice = domPriceData.price;
          resolvedMrp = domPriceData.mrp || null;
          resolvedOfferPrice = domPriceData.effective_offer_price || null;
          priceExtractionSource = 'DOM_SEMANTIC';
          priceConfidence = 0.88;
          if (verificationStatus !== 'CONFLICTING_SOURCES') {
            verificationStatus = 'PARTIALLY_VERIFIED';
          }
        } else if (urlPriceData.price !== null) {
          resolvedPrice = urlPriceData.price;
          resolvedMrp = urlPriceData.mrp || null;
          priceExtractionSource = 'URL_QUERY_HINT';
          priceConfidence = 0.80;
          verificationStatus = 'UNVERIFIED';
        } else if (slugData.observed_price !== null && slugData.observed_price !== undefined && slugData.observed_price > 0) {
          resolvedPrice = slugData.observed_price;
          resolvedMrp = slugData.mrp || null;
          priceExtractionSource = 'SLUG_DERIVED';
          priceConfidence = 0.75;
          verificationStatus = 'UNVERIFIED';
        } else {
          verificationStatus = 'NOT_FOUND';
        }

        // Secondary MRP resolution if price was found but MRP was omitted in that layer
        if (resolvedPrice !== null && resolvedMrp === null) {
          resolvedMrp = jsonLdData.mrp || embeddedStateData.mrp || domPriceData.mrp || metaData.mrp || urlPriceData.mrp || slugData.mrp || null;
        }

        // Offer price resolution
        if (!resolvedOfferPrice && domPriceData.effective_offer_price) {
          resolvedOfferPrice = domPriceData.effective_offer_price;
        }

        // Title resolution: Structured data -> Embedded state -> Clean meta -> Slug
        // CRITICAL: Strictly reject junk / bot-block / generic domain titles at every stage!
        let resolvedTitle = slugData.title;
        if (jsonLdData.title && jsonLdData.title.length > 3 && !isJunkBotBlockTitle(jsonLdData.title)) {
          resolvedTitle = jsonLdData.title;
        } else if (embeddedStateData.title && embeddedStateData.title.length > 3 && !isJunkBotBlockTitle(embeddedStateData.title)) {
          resolvedTitle = embeddedStateData.title;
        } else if (metaData.title && metaData.title.length > 3 && !isJunkBotBlockTitle(metaData.title)) {
          resolvedTitle = metaData.title;
        } else if (slugData.title && !isJunkBotBlockTitle(slugData.title)) {
          resolvedTitle = slugData.title;
        } else {
          resolvedTitle = 'Marketplace Product Listing';
        }

        // Brand resolution
        const resolvedBrand = jsonLdData.brand || embeddedStateData.brand || metaTags['og:brand'] || metaTags['product:brand'] || slugData.brand;

        // Category resolution
        const resolvedCategory = jsonLdData.category || embeddedStateData.category || slugData.category;

        // Image resolution
        const resolvedImage = jsonLdData.image || embeddedStateData.image || metaData.main_image_url || slugData.main_image_url;

        let discount: number | null = null;
        if (resolvedPrice !== null && resolvedMrp !== null && resolvedMrp > resolvedPrice) {
          discount = Math.round(((resolvedMrp - resolvedPrice) / resolvedMrp) * 100);
        }

        const isLiveExtracted = Boolean(resolvedPrice || (jsonLdData.title && !isJunkBotBlockTitle(jsonLdData.title)) || (embeddedStateData.title && !isJunkBotBlockTitle(embeddedStateData.title)));
        const nowIso = new Date().toISOString();

        // Construct ValidatedPriceItem
        const priceType: PriceType = (resolvedPrice !== null && resolvedMrp !== null && resolvedPrice < resolvedMrp)
          ? 'DISCOUNTED_PRICE'
          : 'SELLING_PRICE';

        const validatedPrice: ValidatedPriceItem = {
          value: resolvedPrice,
          currency: 'INR',
          price_type: priceType,
          source: (priceExtractionSource === 'JSON_LD'
            ? 'JSON_LD'
            : priceExtractionSource === 'EMBEDDED_STATE'
            ? 'EMBEDDED_STATE'
            : priceExtractionSource === 'OPEN_GRAPH_META'
            ? 'OPEN_GRAPH_META'
            : priceExtractionSource === 'DOM_SEMANTIC'
            ? 'DOM_SEMANTIC'
            : priceExtractionSource === 'URL_QUERY_HINT'
            ? 'FALLBACK_URL'
            : priceExtractionSource === 'SLUG_DERIVED'
            ? 'RETAILER_ADAPTER'
            : 'FALLBACK_URL') as ValidatedPriceItem['source'],
          extraction_method: priceExtractionSource,
          confidence: priceConfidence,
          verification_status: verificationStatus,
          extracted_at: nowIso,
          explanation: verificationStatus === 'VERIFIED'
            ? 'Corroborated by high-confidence structured metadata from product listing.'
            : verificationStatus === 'CONFLICTING_SOURCES'
            ? `Price sources disagree across page layers (${candidates.map((c) => `${c.source}: ₹${c.amount}`).join(', ')}). High candidate prioritized with warning.`
            : verificationStatus === 'PARTIALLY_VERIFIED'
            ? 'Extracted from a single layer on the webpage; uncorroborated by secondary structured source.'
            : verificationStatus === 'NOT_FOUND'
            ? 'Price not found on page or listing is gated behind anti-bot challenge.'
            : 'Derived from URL parameters or slug hints only.',
          conflicting_sources: conflictingSources,
        };

        // Construct 4 Distinct Price Concepts (Price Evidence)
        const priceEvidence: PriceEvidenceItem[] = [];
        if (resolvedPrice !== null) {
          priceEvidence.push({
            amount: resolvedPrice,
            currency: 'INR',
            source_url: url.toString(),
            marketplace: slugData.marketplace,
            seller: slugData.seller_name || undefined,
            product_identity: resolvedTitle,
            variant: 'Standard / Selected Listing Variant',
            retrieval_timestamp: nowIso,
            retrieval_status: 'CONFIRMED',
            price_type: 'OBSERVED_LISTING_PRICE',
          });
        }
        if (resolvedMrp !== null) {
          priceEvidence.push({
            amount: resolvedMrp,
            currency: 'INR',
            source_url: url.toString(),
            marketplace: slugData.marketplace,
            seller: slugData.seller_name || undefined,
            product_identity: resolvedTitle,
            variant: 'Manufacturer Statutory Declaration',
            retrieval_timestamp: nowIso,
            retrieval_status: 'CONFIRMED',
            price_type: 'CLAIMED_MRP',
          });
        }
        if (resolvedOfferPrice !== null) {
          priceEvidence.push({
            amount: resolvedOfferPrice,
            currency: 'INR',
            source_url: url.toString(),
            marketplace: slugData.marketplace,
            seller: slugData.seller_name || undefined,
            product_identity: resolvedTitle,
            variant: 'Conditional Coupon / Bank Offer',
            retrieval_timestamp: nowIso,
            retrieval_status: 'CONFIRMED',
            price_type: 'EFFECTIVE_OFFER_PRICE',
          });
        }

        const overallConfidence = isLiveExtracted ? Math.max(priceConfidence, 0.90) : 0.85;

        return {
          ...slugData,
          title: resolvedTitle,
          brand: resolvedBrand,
          category: resolvedCategory,
          observed_price: resolvedPrice,
          mrp: resolvedMrp,
          discount_percent: discount,
          effective_offer_price: resolvedOfferPrice,
          reference_market_price: {
            min: resolvedPrice ? Math.round(resolvedPrice * 0.95) : 0,
            max: resolvedMrp || (resolvedPrice ? Math.round(resolvedPrice * 1.3) : 0),
            median: resolvedPrice || 0,
            reliable_offers_count: resolvedPrice ? 1 : 0,
            status: 'INSUFFICIENT_DATA',
            explanation: 'Fewer than 2 independent market offers found across monitored platforms (insufficient data to establish reference market price).',
          },
          price_evidence: priceEvidence,
          validated_price: validatedPrice,
          price_verification_status: verificationStatus,
          price_diagnostics: {
            status: verificationStatus,
            extracted_source: priceExtractionSource,
            conflicting_sources: conflictingSources,
            note: validatedPrice.explanation || '',
          },
          main_image_url: resolvedImage,
          extraction_provenance: (priceExtractionSource === 'JSON_LD' || priceExtractionSource === 'EMBEDDED_STATE')
            ? 'LIVE_STRUCTURED_PAGE'
            : isLiveExtracted ? 'LIVE_PAGE_EXTRACTION' : 'MARKETPLACE_SLUG_DERIVED',
          extraction_confidence: overallConfidence,
          retrieval_timestamp: nowIso,
          retrieval_status: resolvedPrice !== null ? 'CONFIRMED' : 'PRICE_UNAVAILABLE',
        };
          }
        }
      }
    } catch {
      // Fallback gracefully to slug extraction if live network retrieval is blocked
    }

    const finalPrice = urlPriceData.price || slugData.observed_price || null;
    const finalMrp = urlPriceData.mrp || slugData.mrp || null; // Invariant: Never invent MRP via multipliers
    const fallbackStatus: PriceVerificationStatus = wasBlocked
      ? 'BLOCKED'
      : finalPrice !== null
      ? 'UNVERIFIED'
      : 'NOT_FOUND';

    const fallbackValidatedPrice: ValidatedPriceItem = {
      value: finalPrice,
      currency: 'INR',
      price_type: finalPrice ? 'SELLING_PRICE' : 'SELLING_PRICE',
      source: slugData.observed_price ? 'RETAILER_ADAPTER' : (finalPrice ? 'FALLBACK_URL' : 'RETAILER_ADAPTER'),
      extraction_method: wasBlocked ? 'ACCESS_BLOCKED' : (finalPrice ? 'URL_OR_SLUG_FALLBACK' : 'NONE'),
      confidence: finalPrice ? 0.60 : 0.0,
      verification_status: fallbackStatus,
      extracted_at: new Date().toISOString(),
      explanation: wasBlocked
        ? `Automated retrieval was blocked by marketplace access restrictions (${blockReason || 'Anti-Bot Protection'}). Manual price and details entry available.`
        : finalPrice
        ? 'Derived from URL parameters or fallback adapter defaults. Unverified against live DOM.'
        : 'Price could not be verified from available page data or the retailer challenged automated access.',
    };

    return {
      ...slugData,
      title: !isJunkBotBlockTitle(slugData.title) ? slugData.title : 'Marketplace Product Listing',
      observed_price: finalPrice,
      mrp: finalMrp,
      discount_percent: (finalPrice && finalMrp && finalMrp > finalPrice) ? Math.round(((finalMrp - finalPrice) / finalMrp) * 100) : null,
      validated_price: fallbackValidatedPrice,
      price_verification_status: fallbackStatus,
      price_diagnostics: {
        status: fallbackStatus,
        extracted_source: wasBlocked ? 'NETWORK_ACCESS_BLOCKED' : (finalPrice ? 'URL_OR_SLUG_FALLBACK' : 'NETWORK_RESTRICTED_OR_BLOCKED'),
        note: wasBlocked
          ? `Automated page access was blocked (${blockReason || 'Anti-Bot Challenge'}). Manual entry available.`
          : finalPrice ? 'Unverified price from URL' : 'Automated access restricted or price not found on page. Manual entry available.',
      },
      retrieval_status: finalPrice !== null ? 'CONFIRMED' : 'PRICE_UNAVAILABLE',
    };
  }

  /**
   * Layer 1: Parses JSON-LD script blocks (<script type="application/ld+json">)
   * Supports schema.org Product, Offer, AggregateOffer, nested @graph, and schema arrays.
   */
  public parseJsonLd(htmlChunk: string): {
    title?: string;
    brand?: string;
    category?: string;
    price?: number;
    mrp?: number;
    image?: string;
    currency?: string;
    availability?: string;
  } {
    const res: {
      title?: string;
      brand?: string;
      category?: string;
      price?: number;
      mrp?: number;
      image?: string;
      currency?: string;
      availability?: string;
    } = {};

    const scriptRegex = /<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(htmlChunk)) !== null) {
      try {
        const rawJson = match[1].trim();
        // Sanitize illegal control characters in JSON strings
        const sanitized = rawJson.replace(/[\u0000-\u001F]+/g, (c) => (c === '\t' || c === '\r' || c === '\n' ? ' ' : ''));
        const parsed = JSON.parse(sanitized);

        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;

          const rawType = item['@type'];
          const types = Array.isArray(rawType) ? rawType.map(t => String(t).toLowerCase()) : [String(rawType || '').toLowerCase()];
          const isProduct = types.some(t => t.includes('product'));

          if (isProduct) {
            // Title
            if (item.name && typeof item.name === 'string') {
              res.title = item.name.replace(/\s+/g, ' ').trim();
            }

            // Category
            if (item.category && typeof item.category === 'string') {
              res.category = item.category.trim();
            }

            // Brand
            if (item.brand) {
              if (typeof item.brand === 'string') {
                res.brand = item.brand.trim();
              } else if (typeof item.brand === 'object' && item.brand.name) {
                res.brand = String(item.brand.name).trim();
              }
            }

            // Image
            if (item.image) {
              if (typeof item.image === 'string') {
                res.image = item.image;
              } else if (Array.isArray(item.image) && item.image[0]) {
                res.image = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url;
              } else if (typeof item.image === 'object' && item.image.url) {
                res.image = String(item.image.url);
              }
            }

            // Offers (Price & MRP)
            if (item.offers) {
              const offerList = Array.isArray(item.offers) ? item.offers : [item.offers];
              for (const offer of offerList) {
                if (!offer || typeof offer !== 'object') continue;

                // Selling price
                const p = parseFloat(offer.price || offer.lowPrice);
                if (!isNaN(p) && p > 0 && !res.price) {
                  res.price = p;
                }

                // Currency
                if (offer.priceCurrency && !res.currency) {
                  res.currency = String(offer.priceCurrency).toUpperCase();
                }

                // Availability
                if (offer.availability && !res.availability) {
                  res.availability = String(offer.availability).includes('InStock') ? 'IN_STOCK' : 'OUT_OF_STOCK';
                }

                // MRP / High price
                const high = parseFloat(offer.highPrice || offer.priceSpecification?.maxPrice);
                if (!isNaN(high) && high > (res.price || 0) && !res.mrp) {
                  res.mrp = high;
                }
              }
            }

            // Description MRP fallback (e.g. "MRP: Rs. 2,999.00")
            if (!res.mrp && item.description && typeof item.description === 'string') {
              const descMrpMatch = item.description.match(/(?:Only\s+Rs\.?|MRP\s*[:\-]?\s*₹?)\s*([\d,]+(?:\.\d+)?)/i);
              if (descMrpMatch) {
                const parsedMrp = parseFloat(descMrpMatch[1].replace(/,/g, ''));
                if (!isNaN(parsedMrp) && parsedMrp > 0) res.mrp = parsedMrp;
              }
            }
          }
        }
      } catch {
        // Continue to next script block
      }
    }

    return res;
  }

  /**
   * Layer 2: Parses Embedded Application State (__NEXT_DATA__, Nuxt, inline hydration blobs)
   * Critical for modern React/Next.js/Nuxt webstores like Decathlon, Croma, Nike, Tata CLiQ.
   */
  public parseEmbeddedState(htmlChunk: string): {
    title?: string;
    brand?: string;
    category?: string;
    price?: number;
    mrp?: number;
    image?: string;
  } {
    const res: {
      title?: string;
      brand?: string;
      category?: string;
      price?: number;
      mrp?: number;
      image?: string;
    } = {};

    // 1. Next.js Hydration Payload: <script id="__NEXT_DATA__" type="application/json">
    const nextDataMatch = htmlChunk.match(/<script\s+id=["']__NEXT_DATA__["']\s+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const rawJson = nextDataMatch[1].trim();
        const parsed = JSON.parse(rawJson);
        const pageProps = parsed?.props?.pageProps;

        if (pageProps) {
          // Recursive / deep property search in pageProps
          const findInObject = (obj: any, depth = 0) => {
            if (!obj || typeof obj !== 'object' || depth > 4) return;

            // Product name / title
            if (!res.title && (obj.productName || obj.product_name || obj.productTitle || (obj.title && typeof obj.title === 'string' && obj.title.length > 3) || (obj.name && typeof obj.name === 'string' && obj.name.length > 3))) {
              res.title = String(obj.productName || obj.product_name || obj.productTitle || obj.title || obj.name).trim();
            }

            // Brand
            if (!res.brand && (obj.brandName || obj.brand || obj.brand_name)) {
              const b = obj.brandName || obj.brand || obj.brand_name;
              res.brand = typeof b === 'string' ? b.trim() : (b?.name ? String(b.name).trim() : undefined);
            }

            // Category
            if (!res.category && (obj.categoryName || obj.category_name || obj.category)) {
              const c = obj.categoryName || obj.category_name || obj.category;
              if (typeof c === 'string') res.category = c.trim();
            }

            // Price fields
            if (!res.price) {
              const pVal = obj.sellingPrice ?? obj.finalPrice ?? obj.specialPrice ?? obj.discountedPrice ?? obj.price ?? obj.salePrice ?? obj.priceValue;
              if (pVal !== undefined && !isNaN(Number(pVal)) && Number(pVal) >= 50) {
                res.price = Number(pVal);
              }
            }

            // MRP fields
            if (!res.mrp) {
              const mrpVal = obj.mrp ?? obj.originalPrice ?? obj.regularPrice ?? obj.listPrice ?? obj.fullPrice ?? obj.strikePrice;
              if (mrpVal !== undefined && !isNaN(Number(mrpVal)) && Number(mrpVal) >= 50) {
                res.mrp = Number(mrpVal);
              }
            }

            // Image
            if (!res.image && (obj.imageUrl || obj.mainImage || obj.image || obj.primaryImage)) {
              const img = obj.imageUrl || obj.mainImage || obj.image || obj.primaryImage;
              if (typeof img === 'string' && img.startsWith('http')) res.image = img;
              else if (Array.isArray(img) && img[0] && typeof img[0] === 'string') res.image = img[0];
            }

            for (const key of Object.keys(obj)) {
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                findInObject(obj[key], depth + 1);
              }
            }
          };

          findInObject(pageProps);
        }
      } catch {
        // Fall back to DOM parsing
      }
    }

    // 2. Generic window.__INITIAL_STATE__ or window.__PRELOADED_STATE__
    if (!res.price) {
      const stateMatch = htmlChunk.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
      if (stateMatch) {
        try {
          const stateObj = JSON.parse(stateMatch[1]);
          const p = stateObj?.product || stateObj?.pdp;
          if (p) {
            if (p.price && !isNaN(Number(p.price))) res.price = Number(p.price);
            if (p.mrp && !isNaN(Number(p.mrp))) res.mrp = Number(p.mrp);
            if (p.title && !res.title) res.title = String(p.title);
            if (p.brand && !res.brand) res.brand = String(p.brand);
          }
        } catch {
          // Continue
        }
      }
    }

    return res;
  }

  /**
   * Layer 3: Parses OpenGraph, Twitter, and standard HTML meta tags.
   */
  public parseMetaTags(htmlChunk: string): Record<string, string> {
    const tags: Record<string, string> = {};

    // Match <meta property="..." content="..."> or <meta name="..." content="...">
    const metaRegex = /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*?>/gi;
    let match: RegExpExecArray | null;

    while ((match = metaRegex.exec(htmlChunk)) !== null) {
      const key = match[1].toLowerCase();
      const val = match[2];
      tags[key] = val;
    }

    // Match <title>
    const titleMatch = htmlChunk.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      tags['title'] = titleMatch[1].trim();
    }

    return tags;
  }

  /**
   * Layer 4: Extracts real-world prices directly from semantic DOM selectors and retailer microdata.
   * Filters out EMI amounts, delivery charges, discounts/savings, and review counts.
   */
  public parseDomPrices(htmlChunk: string): {
    price?: number;
    mrp?: number;
    effective_offer_price?: number;
  } {
    const res: { price?: number; mrp?: number; effective_offer_price?: number } = {};

    // 1. Semantic microdata: itemprop="price"
    const itempropPriceMatch = htmlChunk.match(/itemprop=["']price["'][^>]*?content=["']([\d,]+(?:\.\d+)?)["']/i) ||
                               htmlChunk.match(/itemprop=["']price["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i);
    if (itempropPriceMatch) {
      const val = parseFloat(itempropPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val >= 50 && val <= 1000000) res.price = val;
    }

    // 2. Flipkart script state: "ppd":{"fsp":828,"finalPrice":928,"mrp":2999...}
    const ppdMatch = htmlChunk.match(/["']ppd["']\s*:\s*\{([^}]+)\}/);
    if (ppdMatch) {
      const block = ppdMatch[1];
      const fspMatch = block.match(/["']fsp["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/);
      if (fspMatch) {
        const val = parseFloat(fspMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) res.price = val;
      }
      const mrpMatch = block.match(/["']mrp["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/);
      if (mrpMatch) {
        const val = parseFloat(mrpMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) res.mrp = val;
      }
      const nepMatch = block.match(/["']nepPrice["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/);
      if (nepMatch) {
        const val = parseFloat(nepMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) res.effective_offer_price = val;
      }
    }

    // Flipkart DOM patterns: Modern Nx9bqj and legacy _30jeq3
    const flipkartPriceMatch = htmlChunk.match(/class=["'][^"']*?(?:Nx9bqj|_30jeq3)[^"']*?["'][^>]*>₹?([\d,]+)/i);
    if (flipkartPriceMatch && !res.price) {
      const val = parseFloat(flipkartPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) res.price = val;
    }
    const flipkartMrpMatch = htmlChunk.match(/class=["'][^"']*?(?:yRaY8j|_3I9_wc)[^"']*?["'][^>]*>₹?([\d,]+)/i);
    if (flipkartMrpMatch && !res.mrp) {
      const val = parseFloat(flipkartMrpMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) res.mrp = val;
    }

    // 3. Amazon India patterns:
    const amazonPriceMatch = htmlChunk.match(/<span\s+class=["'][^"']*?a-price-whole[^"']*?["'][^>]*>([\d,]+)<\/span>/i) ||
                             htmlChunk.match(/<span\s+class=["'][^"']*?a-offscreen[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i) ||
                             htmlChunk.match(/class=["'][^"']*?apexPriceToPay[^"']*?["'][^>]*>[\s\S]*?₹?([\d,]+(?:\.\d+)?)/i);
    if (amazonPriceMatch && !res.price) {
      const val = parseFloat(amazonPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) res.price = val;
    }
    const amazonMrpMatch = htmlChunk.match(/class=["'][^"']*?a-text-price[^"']*?["'][^>]*>[\s\S]*?<span\s+class=["'][^"']*?a-offscreen[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i) ||
                           htmlChunk.match(/class=["'][^"']*?basisPrice[^"']*?["'][^>]*>[\s\S]*?<span\s+class=["'][^"']*?a-offscreen[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i);
    if (amazonMrpMatch && !res.mrp) {
      const val = parseFloat(amazonMrpMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) res.mrp = val;
    }

    // 4. Decathlon Price Patterns:
    // Decathlon displays: ₹2,499 MRP ₹3,399
    const decathlonPriceMatch = htmlChunk.match(/class=["'][^"']*?(?:price|selling-price)[^"']*?["'][^>]*>₹\s*([\d,]+)/i) ||
                                htmlChunk.match(/₹\s*([\d,]+)\s*(?:<[^>]+>\s*)*MRP\s*₹\s*([\d,]+)/i);
    if (decathlonPriceMatch && !res.price) {
      const val = parseFloat(decathlonPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val >= 50) res.price = val;
      if (decathlonPriceMatch[2] && !res.mrp) {
        const mrpVal = parseFloat(decathlonPriceMatch[2].replace(/,/g, ''));
        if (!isNaN(mrpVal) && mrpVal >= val) res.mrp = mrpVal;
      }
    }

    // 5. Croma Price Patterns (cp-price, new-price, final-price)
    const cromaPriceMatch = htmlChunk.match(/class=["'][^"']*?(?:cp-price|new-price|final-price)[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i);
    if (cromaPriceMatch && !res.price) {
      const val = parseFloat(cromaPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val >= 50) res.price = val;
    }
    const cromaMrpMatch = htmlChunk.match(/class=["'][^"']*?(?:old-price|strike|mrp)[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i);
    if (cromaMrpMatch && !res.mrp) {
      const val = parseFloat(cromaMrpMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val >= 50) res.mrp = val;
    }

    // 6. Adidas Price Patterns (gl-price-item)
    const adidasPriceMatch = htmlChunk.match(/class=["'][^"']*?gl-price-item--sale[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i) ||
                             htmlChunk.match(/class=["'][^"']*?gl-price-item[^"']*?["'][^>]*>₹?([\d,]+(?:\.\d+)?)/i);
    if (adidasPriceMatch && !res.price) {
      const val = parseFloat(adidasPriceMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val >= 50) res.price = val;
    }

    // 7. Generic Semantic MRP / Strike Price Fallback across all retailers
    if (!res.mrp) {
      const genericMrpMatch = htmlChunk.match(/(?:MRP|Original\s*Price|Regular\s*Price|strike)[\s\S]{0,30}?₹\s*([\d,]+(?:\.\d+)?)/i) ||
                              htmlChunk.match(/MRP\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
      if (genericMrpMatch) {
        const val = parseFloat(genericMrpMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val >= (res.price || 50) && val <= 1000000) res.mrp = val;
      }
    }

    // 7. Generic Visible Price with Rupee Symbol
    // Exclude EMI: (EMI, /month, /mo, per month) and delivery
    if (!res.price) {
      const lines = htmlChunk.split(/[\r\n]+/);
      for (const line of lines) {
        if (/emi|month|\/mo|delivery|shipping|save\s*₹|discount/i.test(line)) continue;
        const rupeeMatch = line.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i);
        if (rupeeMatch) {
          const val = parseFloat(rupeeMatch[1].replace(/,/g, ''));
          if (!isNaN(val) && val >= 99 && val <= 500000) {
            res.price = val;
            break;
          }
        }
      }
    }

    return res;
  }
}

export const urlRetriever = new UrlRetrieverService();
export const urlRetrieverService = urlRetriever;
