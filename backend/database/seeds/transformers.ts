import { NormalizedTimestamp } from './types';

// =============================================================================
// Phase 3 Step 2B.3.1: Data Transformation and Validation Utilities
// =============================================================================

/**
 * Parses and normalizes diverse source timestamps into MySQL UTC DATETIME(3) strings.
 *
 * Requirements:
 * 1. For explicit timezone strings (e.g. +05:30 or Z), converts strictly to UTC.
 * 2. For naive crawl timestamps (e.g. '2026-10-28T10:46:05.896857'), preserves the verbatim
 *    raw string and applies the documented IST convention (UTC = IST - 5h 30m).
 * 3. Records provenance marker: SOURCE_TZ_UNCONFIRMED_PARSED_AS_IST for naive dates.
 */
export function normalizeTimestamp(rawInput: string | Date | null | undefined): NormalizedTimestamp {
  if (!rawInput) {
    const fallbackRaw = '2026-11-06T00:00:00.000Z';
    return {
      utcDateTime: '2026-11-06 00:00:00.000',
      rawSourceTimestamp: fallbackRaw,
      provenanceMarker: 'FALLBACK_DATASET_RELEASE_UTC',
      hasTimezoneOffset: true
    };
  }

  const rawStr = typeof rawInput === 'string' ? rawInput.trim() : rawInput.toISOString();

  // Check if string has explicit timezone indicator (+05:30, -04:00, Z)
  const hasTimezoneOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(rawStr);

  let dateObj: Date;
  let provenanceMarker = 'EXPLICIT_UTC_SOURCE';

  if (hasTimezoneOffset) {
    dateObj = new Date(rawStr);
    provenanceMarker = rawStr.includes('+05:30') ? 'EXPLICIT_IST_OFFSET_CONVERTED_TO_UTC' : 'EXPLICIT_UTC_SOURCE';
  } else {
    // Naive timestamp: Apply documented IST parsing convention
    // In e-commerce crawl environments in India, naive timestamps are local IST (UTC+05:30).
    // Convert: UTC_millis = IST_millis - (5.5 * 3600 * 1000)
    provenanceMarker = 'SOURCE_TZ_UNCONFIRMED_PARSED_AS_IST';
    const naiveUtcMillis = Date.parse(rawStr + 'Z'); // parse as base numeric wall-clock
    if (isNaN(naiveUtcMillis)) {
      throw new Error(`Unparseable naive timestamp: "${rawStr}"`);
    }
    const istOffsetMillis = 5.5 * 3600 * 1000;
    dateObj = new Date(naiveUtcMillis - istOffsetMillis);
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date representation encountered: "${rawStr}"`);
  }

  // Format to MySQL DATETIME(3): YYYY-MM-DD HH:mm:ss.SSS
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const hours = String(dateObj.getUTCHours()).padStart(2, '0');
  const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');
  const millis = String(dateObj.getUTCMilliseconds()).padStart(3, '0');

  const utcDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;

  return {
    utcDateTime,
    rawSourceTimestamp: rawStr,
    provenanceMarker,
    hasTimezoneOffset
  };
}

/**
 * Safely parses and stringifies JSON attributes, handling lists, dicts, strings, and nulls.
 */
export function safeJsonStringify(val: unknown): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'null' || trimmed === '[]' || trimmed === '{}') {
      return trimmed === '[]' ? '[]' : (trimmed === '{}' ? '{}' : null);
    }
    // If it's already a valid JSON string, validate and return trimmed
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Treat as plain string in array or object
      return JSON.stringify([trimmed]);
    }
  }
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

/**
 * Validates and normalizes price observations.
 *
 * Requirements (Step 2B.3.1):
 * 1. Because the frozen DDL enforces `NOT NULL` on `mrp_inr` and `selling_price_inr`,
 *    missing price values are stored as the documented zero sentinel `0.00`.
 * 2. Missing price observations explicitly enforce `is_valid_price = false`.
 * 3. Never fabricates a price.
 * 4. Preserves unusual price observations from the source dataset without synthetic invalidation heuristics.
 * 5. Respects the source dataset's own `is_valid_price` flag.
 */
export function normalizePriceRecord(raw: {
  mrp?: number | string | null;
  selling_price?: number | string | null;
  discount_percentage?: number | string | null;
  is_valid_price?: boolean | null;
}): {
  mrp_inr: number;
  selling_price_inr: number;
  discount_percentage: number;
  is_valid_price: boolean;
  price_provenance: string;
} {
  const isMrpPresent = raw.mrp !== null && raw.mrp !== undefined && raw.mrp !== '';
  const isSellingPresent = raw.selling_price !== null && raw.selling_price !== undefined && raw.selling_price !== '';

  const mrpNum = isMrpPresent ? Number(raw.mrp) : NaN;
  const sellingNum = isSellingPresent ? Number(raw.selling_price) : NaN;
  const discountNum = Number(raw.discount_percentage);

  const hasValidMrpNumber = !isNaN(mrpNum) && mrpNum > 0;
  const hasValidSellingNumber = !isNaN(sellingNum) && sellingNum > 0;
  const hasValidDiscountNumber = !isNaN(discountNum) && discountNum >= 0 && discountNum <= 100;

  let isValidPrice = true;
  let priceProvenance = 'OBSERVED_PRICE_VALID';

  // 1. Missing price detection:
  if (!isMrpPresent || !isSellingPresent || !hasValidMrpNumber || !hasValidSellingNumber) {
    isValidPrice = false;
    priceProvenance = 'MISSING_PRICE_ZERO_SENTINEL';
  } else if (raw.is_valid_price === false) {
    // 2. Upstream marked invalid:
    isValidPrice = false;
    priceProvenance = 'UPSTREAM_FLAGGED_INVALID';
  }

  // Preserve prices or apply documented 0.00 sentinel for missing values
  const finalMrp = hasValidMrpNumber ? Math.round(mrpNum * 100) / 100 : 0.0;
  const finalSelling = hasValidSellingNumber ? Math.round(sellingNum * 100) / 100 : 0.0;

  // Calculate or preserve discount percentage
  let finalDiscount = 0.0;
  if (hasValidDiscountNumber) {
    finalDiscount = Math.round(discountNum * 100) / 100;
  } else if (finalMrp > 0 && finalSelling > 0 && finalSelling <= finalMrp) {
    finalDiscount = Math.round(((finalMrp - finalSelling) / finalMrp) * 10000) / 100;
  }

  return {
    mrp_inr: finalMrp,
    selling_price_inr: finalSelling,
    discount_percentage: Math.max(0, Math.min(100, finalDiscount)),
    is_valid_price: isValidPrice,
    price_provenance: priceProvenance
  };
}
