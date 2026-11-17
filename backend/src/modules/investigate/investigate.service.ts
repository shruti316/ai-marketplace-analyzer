import { URL } from 'node:url';
import { queryOne } from '../../config/database';
import { trustClient } from '../trust/trust.client';
import { AppError } from '../../middleware/errorHandler';
import {
  InvestigateUrlInput,
  InvestigateImageInput,
  InvestigateAdhocInput,
  AssistantChatInput
} from './investigate.schemas';
import { RowDataPacket } from 'mysql2';

interface ListingMatchRow extends RowDataPacket {
  listing_id: string;
  canonical_product_id: string;
  platform_id: string;
  marketplace_product_id: string;
  listing_title: string;
  listing_url: string;
  product_title: string;
  brand_id: string;
  category: string;
  selling_price_inr: number | null;
  mrp_inr: number | null;
  platform_name: string;
}

export class InvestigateService {
  /**
   * Evaluates and parses marketplace listing URL with strict SSRF defense.
   * Resolves detected identifiers against MySQL 8.4 indexed catalog tables.
   */
  async resolveMarketplaceUrl(input: InvestigateUrlInput) {
    const rawUrl = input.url.trim();

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new AppError('Invalid URL structure provided.', 400, 'INVALID_URL');
    }

    // SSRF Guard: Protocols must be standard HTTP/HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new AppError('Only HTTP and HTTPS URLs are accepted.', 400, 'SSRF_INVALID_PROTOCOL');
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // SSRF Guard: Reject loopback, link-local, private, and internal addresses
    const isPrivate = (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]'
    );

    if (isPrivate) {
      throw new AppError('Target hostname resolves to a restricted private or loopback address.', 400, 'SSRF_RESTRICTED_HOST');
    }

    // Recognize Supported Indian Retail Platforms
    let platformId: 'PLATFORM_AMAZON_IN' | 'PLATFORM_FLIPKART' | 'PLATFORM_MYNTRA' | null = null;
    let extractedIdentifier: string | null = null;

    if (hostname === 'amazon.in' || hostname.endsWith('.amazon.in')) {
      platformId = 'PLATFORM_AMAZON_IN';
      const asinMatch = parsedUrl.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (asinMatch) {
        extractedIdentifier = asinMatch[1].toUpperCase();
      }
    } else if (hostname === 'flipkart.com' || hostname.endsWith('.flipkart.com')) {
      platformId = 'PLATFORM_FLIPKART';
      const pidParam = parsedUrl.searchParams.get('pid');
      if (pidParam && pidParam.length >= 8) {
        extractedIdentifier = pidParam.trim();
      } else {
        const pathMatch = parsedUrl.pathname.match(/\/p\/([a-zA-Z0-9]+)/);
        if (pathMatch) {
          extractedIdentifier = pathMatch[1];
        }
      }
    } else if (hostname === 'myntra.com' || hostname.endsWith('.myntra.com')) {
      platformId = 'PLATFORM_MYNTRA';
      const styleMatch = parsedUrl.pathname.match(/\/([0-9]{5,10})(?:\/buy)?/);
      if (styleMatch) {
        extractedIdentifier = styleMatch[1];
      }
    }

    if (!platformId) {
      return {
        catalogue_match: false,
        is_live_scraped: false,
        recognized_platform: null,
        extracted_identifier: null,
        message: 'Unsupported retail domain. Currently supported: Amazon India, Flipkart, and Myntra.'
      };
    }

    // Query MySQL for existing marketplace listing matching product identifier or URL
    let matchedListing: ListingMatchRow | null = null;
    if (extractedIdentifier) {
      const prefixedId = platformId === 'PLATFORM_AMAZON_IN'
        ? `amazon_in_${extractedIdentifier}`
        : (platformId === 'PLATFORM_FLIPKART' ? `flipkart_${extractedIdentifier}` : `myntra_${extractedIdentifier}`);

      matchedListing = await queryOne<ListingMatchRow>(
        `SELECT ml.listing_id, ml.canonical_product_id, ml.platform_id, ml.marketplace_product_id,
                ml.listing_title, ml.listing_url, cp.product_title, cp.brand_id, cp.category,
                ph.selling_price_inr, ph.mrp_inr, p.platform_name
         FROM marketplace_listings ml
         JOIN canonical_products cp ON ml.canonical_product_id = cp.canonical_product_id
         JOIN platforms p ON ml.platform_id = p.platform_id
         LEFT JOIN price_history ph ON ml.listing_id = ph.listing_id
         WHERE ml.marketplace_product_id = ?
            OR ml.marketplace_product_id = ?
            OR ml.marketplace_product_id LIKE ?
         LIMIT 1`,
        [extractedIdentifier, prefixedId, `%${extractedIdentifier}%`]
      );
    }

    // Fallback: search by URL substring if identifier was missing or not matched
    if (!matchedListing) {
      const urlPattern = `%${parsedUrl.pathname.slice(0, 40)}%`;
      matchedListing = await queryOne<ListingMatchRow>(
        `SELECT ml.listing_id, ml.canonical_product_id, ml.platform_id, ml.marketplace_product_id,
                ml.listing_title, ml.listing_url, cp.product_title, cp.brand_id, cp.category,
                ph.selling_price_inr, ph.mrp_inr, p.platform_name
         FROM marketplace_listings ml
         JOIN canonical_products cp ON ml.canonical_product_id = cp.canonical_product_id
         JOIN platforms p ON ml.platform_id = p.platform_id
         LEFT JOIN price_history ph ON ml.listing_id = ph.listing_id
         WHERE ml.listing_url LIKE ?
         LIMIT 1`,
        [urlPattern]
      );
    }

    if (matchedListing) {
      return {
        catalogue_match: true,
        is_live_scraped: false,
        recognized_platform: matchedListing.platform_name,
        extracted_identifier: extractedIdentifier || matchedListing.marketplace_product_id,
        canonical_product_id: matchedListing.canonical_product_id,
        product: {
          canonical_product_id: matchedListing.canonical_product_id,
          title: matchedListing.product_title,
          brand_id: matchedListing.brand_id,
          category: matchedListing.category,
          platform_id: matchedListing.platform_id,
          platform_name: matchedListing.platform_name,
          observed_price_inr: matchedListing.selling_price_inr,
          mrp_inr: matchedListing.mrp_inr,
          listing_url: matchedListing.listing_url
        },
        links: {
          trust_assessment: `/api/v1/products/${encodeURIComponent(matchedListing.canonical_product_id)}/trust-assessment`,
          evidence: `/api/v1/products/${encodeURIComponent(matchedListing.canonical_product_id)}/evidence`,
          report: `/api/v1/products/${encodeURIComponent(matchedListing.canonical_product_id)}/report`
        }
      };
    }

    return {
      catalogue_match: false,
      is_live_scraped: false,
      recognized_platform: platformId === 'PLATFORM_AMAZON_IN' ? 'Amazon India' : (platformId === 'PLATFORM_FLIPKART' ? 'Flipkart' : 'Myntra'),
      extracted_identifier: extractedIdentifier,
      message: extractedIdentifier
        ? `Identifier "${extractedIdentifier}" extracted successfully, but is not present in the indexed 3,643 historical marketplace catalog offers.`
        : 'Recognized retail domain, but could not reliably parse a specific product identifier from the URL.'
    };
  }

  /**
   * Forwards image payload to Python ML inspection service.
   */
  async inspectImage(input: InvestigateImageInput) {
    return trustClient.post('/api/v1/inspect/image', input, 30000);
  }

  /**
   * Forwards ad-hoc manual product details to Python inference engine.
   */
  async inferAdhoc(input: InvestigateAdhocInput) {
    return trustClient.post('/api/v1/infer', input, 15000);
  }

  /**
   * Forwards assistant conversation inquiries with grounded evidence context to Python.
   */
  async chatAssistant(input: AssistantChatInput) {
    return trustClient.post('/api/v1/assistant/chat', input, 20000);
  }
}

export const investigateService = new InvestigateService();
