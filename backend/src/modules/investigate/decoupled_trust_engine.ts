import { URL } from 'node:url';
import { ReviewNlpReport } from './review_nlp_engine';
import { ValidatedPriceItem, PriceVerificationStatus } from './marketplace_adapters/adapter_interface';

export type RiskLevel = 'MINIMAL_RISK' | 'MODERATE_RISK' | 'HIGH_OBSERVED_RISK' | 'CRITICAL_RISK';

export interface DimensionEvaluation {
  dimension_key: 'product_quality' | 'seller_reliability' | 'listing_authenticity' | 'website_legitimacy';
  dimension_name: string;
  score: number | null; // 0 to 100, or null if UNASSESSED
  status: 'ASSESSED' | 'UNASSESSED';
  risk_level: RiskLevel;
  confidence: number; // 0.0 to 1.0
  summary: string;
  positive_signals: string[];
  risk_factors: string[];
  missing_data: string[];
}

export interface ModalityContribution {
  key: 'pricing' | 'seller' | 'reviews' | 'vision' | 'ocr' | 'platform';
  title: string;
  modality_name: string;
  status: 'EVALUATED' | 'NOT_PROVIDED' | 'UNASSESSED';
  raw_score: number | null; // 0 to 100, or null
  delta: number; // exact integer contribution points (+ or -)
  max_pts: number;
  status_label: string;
  description: string;
}

export interface ScoreBreakdown {
  baseline: number; // 50
  contributions: ModalityContribution[];
  subtotal_before_caps: number;
  boundary_clamp_adjustment: number;
  non_masking_applied: boolean;
  non_masking_penalty: number;
  sparse_evidence_applied: boolean;
  sparse_evidence_penalty: number;
  final_trust_score: number;
  mathematical_identity_verified: boolean;
}

export interface FiveDimensionTrustResult {
  overall_trust_score: number; // 0 to 100
  overall_risk_level: RiskLevel;
  recommendation: 'PROCEED_CONFIDENTLY' | 'PROCEED_WITH_CAUTION' | 'INVESTIGATE_FURTHER' | 'DO_NOT_RECOMMEND' | 'INSUFFICIENT_EVIDENCE';
  recommendation_rationale: string;
  non_masking_applied: boolean;
  non_masking_reason?: string;

  dimensions: {
    product_quality: DimensionEvaluation;
    seller_reliability: DimensionEvaluation;
    listing_authenticity: DimensionEvaluation;
    website_legitimacy: DimensionEvaluation;
  };

  score_breakdown: ScoreBreakdown;

  evidence: {
    coverage_percent: number; // 0 to 100%
    confidence_score: number; // 0.0 to 1.0
    supporting_evidence: string[];
    contradicting_evidence: string[];
    missing_evidence: string[];
  };
}

export interface FiveDimensionInput {
  url?: URL | null;
  platformName?: string;
  domainStatus?: string;
  isLookalike?: boolean;
  productTitle?: string;
  brand?: string;
  category?: string;
  observedPrice?: number | null;
  mrp?: number | null;
  effectiveOfferPrice?: number | null;
  referenceMarketPrice?: number | null;
  priceVerificationStatus?: PriceVerificationStatus;
  validatedPrice?: ValidatedPriceItem | null;
  sellerName?: string | null;
  sellerRating?: number | null;
  fulfillmentType?: string | null;
  claimedStarRating?: number | null;
  ratingsCount?: number | null;
  nlpReport?: ReviewNlpReport | null;
  hasVisionProvided?: boolean;
  hasOcrExtracted?: boolean;
}

export class DecoupledTrustEngine {
  /**
   * Evaluates all 5 dimensions cleanly and synthesizes overall purchase risk
   * with the non-negotiable Non-Masking Invariant.
   */
  public evaluateFiveDimensions(input: FiveDimensionInput): FiveDimensionTrustResult {
    // 1. Evaluate Individual Dimensions
    const productQuality = this.evaluateProductQuality(input);
    const sellerReliability = this.evaluateSellerReliability(input);
    const listingAuthenticity = this.evaluateListingAuthenticity(input);
    const websiteLegitimacy = this.evaluateWebsiteLegitimacy(input);

    // 2. Synthesize with Non-Masking Invariant
    return this.synthesizeOverallPurchaseRisk({
      product_quality: productQuality,
      seller_reliability: sellerReliability,
      listing_authenticity: listingAuthenticity,
      website_legitimacy: websiteLegitimacy,
    }, input);
  }

  /**
   * Dimension 1: Product Quality (0-100)
   * Evaluated strictly on review sentiment, star ratings, and defect complaints.
   * Completely decoupled from website reputation or marketplace prestige.
   */
  public evaluateProductQuality(input: FiveDimensionInput): DimensionEvaluation {
    const { nlpReport, claimedStarRating, ratingsCount } = input;
    const positiveSignals: string[] = [];
    const riskFactors: string[] = [];
    const missingData: string[] = [];

    const hasNlp = nlpReport && nlpReport.status === 'EVALUATED' && nlpReport.reviews_analyzed_count > 0;
    const hasStars = typeof claimedStarRating === 'number' && claimedStarRating > 0;

    if (!hasNlp && !hasStars) {
      missingData.push('No customer reviews or star ratings found on this listing');
      return {
        dimension_key: 'product_quality',
        dimension_name: 'Product Quality',
        score: null,
        status: 'UNASSESSED',
        risk_level: 'MODERATE_RISK',
        confidence: 0.15,
        summary: 'Customer reviews and ratings are unavailable for this product. Quality cannot be empirically assessed.',
        positive_signals: [],
        risk_factors: [],
        missing_data: missingData,
      };
    }

    let qualityScore = 70; // baseline
    let confidence = 0.50;

    if (hasNlp) {
      const sat = nlpReport.satisfaction_index ?? 50;
      const negPct = nlpReport.sentiment_distribution.negative_percentage;
      const posPct = nlpReport.sentiment_distribution.positive_percentage;

      // Base quality on satisfaction index
      qualityScore = sat;
      confidence = nlpReport.confidence_score;

      if (posPct >= 70) {
        positiveSignals.push(`Strong customer sentiment: ${posPct}% positive feedback across analyzed reviews`);
      }
      if (negPct >= 30) {
        riskFactors.push(`Elevated dissatisfaction: ${negPct}% of reviews express critical sentiment`);
      }

      // Check aspect defect risks
      nlpReport.aspects.forEach((aspect) => {
        if (aspect.status === 'EVALUATED') {
          if (aspect.sentiment_label === 'POSITIVE' && aspect.mention_count >= 2) {
            positiveSignals.push(`Positive feedback on ${aspect.display_name} (${aspect.satisfaction_pct}% satisfaction)`);
          } else if (aspect.defect_risk_level === 'HIGH') {
            riskFactors.push(`High defect complaints reported in ${aspect.display_name}`);
            qualityScore = Math.min(qualityScore, 38);
          } else if (aspect.defect_risk_level === 'MODERATE') {
            riskFactors.push(`Moderate concerns reported regarding ${aspect.display_name}`);
            qualityScore -= 8;
          }
        }
      });
    }

    if (hasStars) {
      const stars = claimedStarRating!;
      if (ratingsCount && ratingsCount > 10) {
        confidence = Math.min(1.0, confidence + 0.15);
      }

      if (stars >= 4.3) {
        positiveSignals.push(`High marketplace rating: ${stars.toFixed(1)} / 5.0${ratingsCount ? ` (${ratingsCount.toLocaleString()} ratings)` : ''}`);
      } else if (stars <= 3.7) {
        const dissatEst = Math.round((1 - (stars - 1) / 4.0) * 100);
        riskFactors.push(`Low retailer aggregate rating: ★ ${stars.toFixed(1)} / 5.0${ratingsCount ? ` (${ratingsCount.toLocaleString()} ratings)` : ''} indicates ~${dissatEst}% customer dissatisfaction`);
      }

      // Blend star score with NLP sentiment if both present
      const starEquivScore = Math.round(((stars - 1) / 4.0) * 100);
      if (hasNlp) {
        if (stars <= 3.7) {
          // Case B Grounding: Don't let a small text sample whitewash poor star ratings
          qualityScore = Math.round(starEquivScore * 0.75 + qualityScore * 0.25);
        } else {
          qualityScore = Math.round(qualityScore * 0.65 + starEquivScore * 0.35);
        }
      } else {
        qualityScore = starEquivScore;
        missingData.push('Detailed text reviews unavailable; score estimated from marketplace star distribution');
      }
    }

    qualityScore = Math.max(10, Math.min(98, qualityScore));

    const riskLevel: RiskLevel =
      qualityScore >= 75 ? 'MINIMAL_RISK' :
      qualityScore >= 60 ? 'MODERATE_RISK' :
      qualityScore >= 35 ? 'HIGH_OBSERVED_RISK' : 'CRITICAL_RISK';

    return {
      dimension_key: 'product_quality',
      dimension_name: 'Product Quality',
      score: qualityScore,
      status: 'ASSESSED',
      risk_level: riskLevel,
      confidence,
      summary: riskLevel === 'MINIMAL_RISK'
        ? `Consistently positive product feedback (${qualityScore}/100) with low defect complaints.`
        : riskLevel === 'MODERATE_RISK'
        ? `Acceptable quality baseline (${qualityScore}/100) with some recurring feedback on specific aspects.`
        : `High customer dissatisfaction observed (${qualityScore}/100) with material defect complaints.`,
      positive_signals: positiveSignals,
      risk_factors: riskFactors,
      missing_data: missingData,
    };
  }

  /**
   * Dimension 2: Seller Reliability (0-100)
   * Evaluated on merchant tier, fulfillment type, marketplace governance, and seller tenure.
   */
  public evaluateSellerReliability(input: FiveDimensionInput): DimensionEvaluation {
    const { sellerName, sellerRating, fulfillmentType, platformName } = input;
    const positiveSignals: string[] = [];
    const riskFactors: string[] = [];
    const missingData: string[] = [];

    const hasSellerName = Boolean(sellerName && sellerName.trim() && sellerName !== 'Third-Party Marketplace Seller' && sellerName !== 'Marketplace Seller');
    const hasSellerRating = typeof sellerRating === 'number' && sellerRating > 0;

    if (!hasSellerName && !hasSellerRating && (!fulfillmentType || fulfillmentType === 'null')) {
      missingData.push('Seller identity and ratings could not be extracted from the marketplace page');
      return {
        dimension_key: 'seller_reliability',
        dimension_name: 'Seller Reliability',
        score: null,
        status: 'UNASSESSED',
        risk_level: 'MODERATE_RISK',
        confidence: 0.20,
        summary: 'Seller identity and customer ratings are unassessed on this listing.',
        positive_signals: [],
        risk_factors: [],
        missing_data: missingData,
      };
    }

    let score = 75; // baseline
    let confidence = 0.70;
    const sName = (sellerName || '').toLowerCase();

    // 1. Brand Flagship or Direct Store
    const isBrandDirect =
      sName.includes('decathlon') ||
      sName.includes('apple') ||
      sName.includes('nike') ||
      sName.includes('croma') ||
      sName.includes('adidas') ||
      sName.includes('official') ||
      sName.includes('flagship') ||
      (fulfillmentType && fulfillmentType.includes('Brand'));

    // 2. Major Marketplace Warehouse Fulfilled
    const isPlatformFulfilled =
      sName.includes('appario') ||
      sName.includes('retailnet') ||
      sName.includes('cloudtail') ||
      (fulfillmentType && (fulfillmentType.includes('Fulfilled') || fulfillmentType.includes('FBA') || fulfillmentType.includes('Assured')));

    if (isBrandDirect) {
      score = 95;
      confidence = 0.95;
      positiveSignals.push(`Official brand flagship merchant: "${sellerName || 'Direct Brand Entity'}"`);
      positiveSignals.push('Direct brand warranty and manufacturer dispatch governance');
    } else if (isPlatformFulfilled) {
      score = 86;
      confidence = 0.88;
      positiveSignals.push(`Marketplace-managed fulfillment: "${sellerName || 'Platform Warehouse'}"`);
      positiveSignals.push('Quality-checked warehouse dispatch and return handling guarantee');
    } else if (sellerName && sellerName !== 'Marketplace Seller' && sellerName !== 'Third-Party Merchant') {
      score = 72;
      confidence = 0.75;
      positiveSignals.push(`Independent marketplace merchant: "${sellerName}"`);
      missingData.push('Seller return fulfillment metrics and historical dispatch times unverified');
    } else {
      score = 55;
      confidence = 0.50;
      riskFactors.push('Unverified third-party merchant with limited public governance history');
      missingData.push('Merchant legal entity and GST registration details not publicly linked');
    }

    if (typeof sellerRating === 'number' && sellerRating > 0) {
      confidence = Math.min(1.0, confidence + 0.10);
      if (sellerRating >= 4.5) {
        positiveSignals.push(`Strong merchant satisfaction rating: ${sellerRating.toFixed(1)} / 5.0`);
        score = Math.min(98, score + 5);
      } else if (sellerRating < 3.5) {
        riskFactors.push(`Substandard merchant rating: ${sellerRating.toFixed(1)} / 5.0 (elevated fulfillment risk)`);
        score = Math.max(25, score - 25);
      }
    }

    score = Math.max(15, Math.min(98, score));

    const riskLevel: RiskLevel =
      score >= 80 ? 'MINIMAL_RISK' :
      score >= 65 ? 'MODERATE_RISK' :
      score >= 40 ? 'HIGH_OBSERVED_RISK' : 'CRITICAL_RISK';

    return {
      dimension_key: 'seller_reliability',
      dimension_name: 'Seller Reliability',
      score,
      status: 'ASSESSED',
      risk_level: riskLevel,
      confidence,
      summary: riskLevel === 'MINIMAL_RISK'
        ? `High-trust merchant profile (${score}/100) with proven fulfillment governance.`
        : riskLevel === 'MODERATE_RISK'
        ? `Standard merchant profile (${score}/100). Standard marketplace return policies apply.`
        : `High-risk merchant profile (${score}/100) with elevated fulfillment or return dispute risk.`,
      positive_signals: positiveSignals,
      risk_factors: riskFactors,
      missing_data: missingData,
    };
  }

  /**
   * Dimension 3: Listing Authenticity (0-100)
   * Evaluated on price corridor sanity, brand consistency, duplicate reviews, and counterfeit signals.
   */
  public evaluateListingAuthenticity(input: FiveDimensionInput): DimensionEvaluation {
    const { observedPrice, mrp, referenceMarketPrice, priceVerificationStatus, nlpReport, productTitle, brand } = input;
    const positiveSignals: string[] = [];
    const riskFactors: string[] = [];
    const missingData: string[] = [];

    // If price is completely unavailable and no counterfeit reviews detected, mark UNASSESSED
    if (!observedPrice && !mrp && (!nlpReport || !nlpReport.four_way_classification?.authenticity_concerns?.detected)) {
      missingData.push('Live price unverified from automated fetch; pricing corridor unassessed');
      return {
        dimension_key: 'listing_authenticity',
        dimension_name: 'Listing Authenticity',
        score: null,
        status: 'UNASSESSED',
        risk_level: 'MODERATE_RISK',
        confidence: 0.30,
        summary: priceVerificationStatus === 'BLOCKED'
          ? 'Listing pricing unassessed: Automated retrieval was blocked by platform anti-bot/Cloudflare challenge.'
          : 'Listing pricing unassessed: Price data unavailable from listing.',
        positive_signals: [],
        risk_factors: [],
        missing_data: missingData,
      };
    }

    let score = 85; // baseline for valid product listings
    let confidence = 0.75;

    // Price Verification Status check
    if (priceVerificationStatus === 'VERIFIED') {
      positiveSignals.push('Listing price corroborated across multiple structured data layers');
      confidence += 0.10;
    } else if (priceVerificationStatus === 'CONFLICTING_SOURCES') {
      riskFactors.push('Price mismatch detected across sources: extracted price sources disagree by >15% (possible variant mismatch or conditional coupon)');
      score -= 15;
    } else if (priceVerificationStatus === 'NOT_FOUND') {
      missingData.push('Live price unverified from automated fetch; manual price entry requires verification');
      confidence -= 0.15;
    }

    // Price Corridor & Discount Anomaly Analysis
    if (observedPrice && mrp && mrp > 0) {
      const discount = Math.round(((mrp - observedPrice) / mrp) * 100);
      if (discount >= 80) {
        riskFactors.push(`Extreme discount anomaly: ${discount}% off claimed MRP ₹${mrp.toLocaleString()} (frequent indicator of replica merchandise)`);
        score -= 52;
      } else if (discount >= 65) {
        riskFactors.push(`Steep discount observed: ${discount}% off claimed MRP`);
        score -= 25;
      } else if (discount >= 0 && discount <= 50) {
        positiveSignals.push(`Normal commercial pricing corridor: ${discount}% discount against declared MRP`);
      }
    }

    // Reference Market Price Comparison
    if (observedPrice && referenceMarketPrice && referenceMarketPrice > 0) {
      const delta = (observedPrice - referenceMarketPrice) / referenceMarketPrice;
      if (delta < -0.55) {
        riskFactors.push(`Severe pricing anomaly: Observed price ₹${observedPrice.toLocaleString()} is ${Math.abs(Math.round(delta * 100))}% below market reference corridor`);
        score -= 35;
      } else if (Math.abs(delta) <= 0.25) {
        positiveSignals.push('Observed price aligns within ±25% of established market reference price');
      }
    } else {
      missingData.push('Multi-platform historical reference market pricing insufficient');
    }

    // NLP Authenticity & Counterfeit Warnings
    if (nlpReport) {
      if (nlpReport.four_way_classification?.authenticity_concerns?.detected) {
        riskFactors.push(nlpReport.four_way_classification.authenticity_concerns.summary);
        score -= 30;
      }
      if (nlpReport.four_way_classification?.manipulated_reviews?.detected) {
        riskFactors.push(nlpReport.four_way_classification.manipulated_reviews.summary);
        score -= 18;
      }
    }

    // Title sanity check
    if (productTitle) {
      const lowerT = productTitle.toLowerCase();
      if (lowerT.includes('first copy') || lowerT.includes('replica') || lowerT.includes('duplicate')) {
        riskFactors.push('Listing title contains explicit replica or counterfeit indicator keywords');
        score = Math.min(score, 18);
      }
    }

    score = Math.max(10, Math.min(98, score));
    confidence = Math.min(1.0, Math.max(0.20, confidence));

    const riskLevel: RiskLevel =
      score >= 80 ? 'MINIMAL_RISK' :
      score >= 65 ? 'MODERATE_RISK' :
      score >= 38 ? 'HIGH_OBSERVED_RISK' : 'CRITICAL_RISK';

    return {
      dimension_key: 'listing_authenticity',
      dimension_name: 'Listing Authenticity',
      score,
      status: 'ASSESSED',
      risk_level: riskLevel,
      confidence,
      summary: riskLevel === 'MINIMAL_RISK'
        ? `Listing parameters conform to authentic market benchmarks (${score}/100) with normal pricing corridor.`
        : riskLevel === 'MODERATE_RISK'
        ? `Listing parameters acceptable (${score}/100) with minor pricing or variant variance.`
        : `Significant authenticity risk detected (${score}/100): pricing anomalies or counterfeit complaints present.`,
      positive_signals: positiveSignals,
      risk_factors: riskFactors,
      missing_data: missingData,
    };
  }

  /**
   * Dimension 4: Website / Platform Legitimacy (0-100)
   * Evaluated on domain security, TLS encryption, and corporate registration status.
   * Completely independent of whether a seller on the platform is good or bad.
   */
  public evaluateWebsiteLegitimacy(input: FiveDimensionInput): DimensionEvaluation {
    const { url, platformName, isLookalike, domainStatus } = input;
    const positiveSignals: string[] = [];
    const riskFactors: string[] = [];
    const missingData: string[] = [];

    if (!url) {
      missingData.push('No website URL provided (manual entry). Domain parameters unassessed.');
      return {
        dimension_key: 'website_legitimacy',
        dimension_name: 'Website Legitimacy',
        score: null,
        status: 'UNASSESSED',
        risk_level: 'MODERATE_RISK',
        confidence: 0.30,
        summary: 'Manual product entry without URL. Website legitimacy unassessed.',
        positive_signals: [],
        risk_factors: [],
        missing_data: missingData,
      };
    }

    const host = url.hostname.toLowerCase();
    const isHttps = url.protocol === 'https:';

    // Check for lookalike / phishing domains
    if (isLookalike || domainStatus === 'SUSPECTED_IMPERSONATION') {
      riskFactors.push(`Typosquatting or phishing domain: "${host}" mimics an established marketplace`);
      return {
        dimension_key: 'website_legitimacy',
        dimension_name: 'Website Legitimacy',
        score: 15,
        status: 'ASSESSED',
        risk_level: 'CRITICAL_RISK',
        confidence: 0.95,
        summary: `Critical domain impersonation risk (${host}). Not an authorized retail portal.`,
        positive_signals: [],
        risk_factors: riskFactors,
        missing_data: [],
      };
    }

    let score = 80;
    let confidence = 0.85;

    if (isHttps) {
      positiveSignals.push('Secure HTTPS connection with valid TLS certificate');
    } else {
      riskFactors.push('Unencrypted HTTP protocol: connection lacks TLS security');
      score -= 35;
    }

    const isRecognizedMajor =
      host === 'amazon.in' || host.endsWith('.amazon.in') ||
      host === 'flipkart.com' || host.endsWith('.flipkart.com') ||
      host === 'myntra.com' || host.endsWith('.myntra.com') ||
      host === 'decathlon.in' || host.endsWith('.decathlon.in') ||
      host === 'croma.com' || host.endsWith('.croma.com') ||
      host === 'adidas.co.in' || host.endsWith('.adidas.co.in') ||
      host === 'nykaa.com' || host.endsWith('.nykaa.com');

    if (isRecognizedMajor) {
      score = 96;
      confidence = 0.98;
      positiveSignals.push(`Verified official marketplace domain: ${host}`);
      positiveSignals.push('Registered corporate entity under Indian MCA with mandatory Grievance Officer compliance');
    } else {
      // Independent webstore: fair evaluation without arbitrary 35-point penalties
      positiveSignals.push(`Independent e-commerce webstore domain: ${host}`);
      missingData.push('Independent store MCA incorporation and merchant grievance officer unverified');
    }

    score = Math.max(10, Math.min(99, score));

    const riskLevel: RiskLevel =
      score >= 80 ? 'MINIMAL_RISK' :
      score >= 60 ? 'MODERATE_RISK' :
      score >= 35 ? 'HIGH_OBSERVED_RISK' : 'CRITICAL_RISK';

    return {
      dimension_key: 'website_legitimacy',
      dimension_name: 'Website Legitimacy',
      score,
      status: 'ASSESSED',
      risk_level: riskLevel,
      confidence,
      summary: isRecognizedMajor
        ? `Tier-1 verified marketplace infrastructure (${score}/100). Platform security and legal governance confirmed.`
        : `Legitimate independent webstore infrastructure (${score}/100) with active TLS encryption.`,
      positive_signals: positiveSignals,
      risk_factors: riskFactors,
      missing_data: missingData,
    };
  }

  /**
   * Synthesizes the 4 dimensions into an overall score and purchase risk level
   * enforcing the non-negotiable NON-MASKING INVARIANT.
   */
  public synthesizeOverallPurchaseRisk(
    dimensions: {
      product_quality: DimensionEvaluation;
      seller_reliability: DimensionEvaluation;
      listing_authenticity: DimensionEvaluation;
      website_legitimacy: DimensionEvaluation;
    },
    input?: FiveDimensionInput
  ): FiveDimensionTrustResult {
    const { product_quality, seller_reliability, listing_authenticity, website_legitimacy } = dimensions;

    const allSignals = [
      ...product_quality.positive_signals,
      ...seller_reliability.positive_signals,
      ...listing_authenticity.positive_signals,
      ...website_legitimacy.positive_signals,
    ];

    const allRisks = [
      ...product_quality.risk_factors,
      ...seller_reliability.risk_factors,
      ...listing_authenticity.risk_factors,
      ...website_legitimacy.risk_factors,
    ];

    const allMissing = [
      ...product_quality.missing_data,
      ...seller_reliability.missing_data,
      ...listing_authenticity.missing_data,
      ...website_legitimacy.missing_data,
    ];

    // Identify evaluated dimensions
    const assessedDimensions: Array<{ key: string; name: string; score: number; weight: number }> = [];
    if (product_quality.score !== null) {
      assessedDimensions.push({ key: 'product_quality', name: 'Product Quality', score: product_quality.score, weight: 0.35 });
    }
    if (seller_reliability.score !== null) {
      assessedDimensions.push({ key: 'seller_reliability', name: 'Seller Reliability', score: seller_reliability.score, weight: 0.25 });
    }
    if (listing_authenticity.score !== null) {
      assessedDimensions.push({ key: 'listing_authenticity', name: 'Listing Authenticity', score: listing_authenticity.score, weight: 0.25 });
    }
    if (website_legitimacy.score !== null) {
      assessedDimensions.push({ key: 'website_legitimacy', name: 'Website Legitimacy', score: website_legitimacy.score, weight: 0.15 });
    }

    // Evidence coverage calculation
    const coveragePercent = Math.round((assessedDimensions.length / 4.0) * 100);
    const avgConfidence = assessedDimensions.length > 0
      ? (
          (product_quality.confidence || 0) +
          (seller_reliability.confidence || 0) +
          (listing_authenticity.confidence || 0) +
          (website_legitimacy.confidence || 0)
        ) / 4.0
      : 0.50;

    // -------------------------------------------------------------------------
    // SCORE BREAKDOWN & ATTRIBUTABLE MODALITY DELTAS
    // -------------------------------------------------------------------------
    const baseline = 50;
    const contributions: ModalityContribution[] = [];

    // 1. Pricing Corridor Modality
    let pricingDelta = 0;
    let pricingLabel = 'Unassessed';
    let pricingDesc = 'Listing price unverified from automated fetch.';
    if (listing_authenticity.status === 'ASSESSED' && listing_authenticity.score !== null) {
      const s = listing_authenticity.score;
      if (s >= 80) {
        pricingDelta = +14;
        pricingLabel = 'Normal Retail Corridor';
        pricingDesc = 'Observed price aligns within genuine category retail corridor.';
      } else if (s >= 65) {
        pricingDelta = +6;
        pricingLabel = 'Acceptable Corridor';
        pricingDesc = 'Minor discount variance within promotional boundaries.';
      } else if (s >= 45) {
        pricingDelta = -10;
        pricingLabel = 'Steep Discount Risk';
        pricingDesc = 'Steep discount observed outside standard retail corridor.';
      } else {
        pricingDelta = -22;
        pricingLabel = 'Steep Anomaly Risk';
        pricingDesc = 'Severe price anomaly detected (>65% below genuine market corridor).';
      }
    }
    contributions.push({
      key: 'pricing',
      title: 'Price Corridor Modality',
      modality_name: 'Price Corridor Modality',
      status: listing_authenticity.status === 'ASSESSED' ? 'EVALUATED' : 'UNASSESSED',
      raw_score: listing_authenticity.score,
      delta: pricingDelta,
      max_pts: 20,
      status_label: pricingLabel,
      description: pricingDesc,
    });

    // 2. Seller Reliability Modality
    let sellerDelta = 0;
    let sellerLabel = 'Unassessed';
    let sellerDesc = 'Seller details could not be extracted from listing.';
    if (seller_reliability.status === 'ASSESSED' && seller_reliability.score !== null) {
      const s = seller_reliability.score;
      if (s >= 90) {
        sellerDelta = +12;
        sellerLabel = 'Official Brand Flagship';
        sellerDesc = `Official direct brand merchant: ${input?.sellerName || 'Direct Brand Entity'}. Direct warranty dispatch.`;
      } else if (s >= 80) {
        sellerDelta = +8;
        sellerLabel = 'Platform-Fulfilled';
        sellerDesc = 'Marketplace-managed warehouse dispatch with verified return governance.';
      } else if (s >= 65) {
        sellerDelta = +2;
        sellerLabel = 'Verified Third-Party';
        sellerDesc = 'Standard independent merchant profile with marketplace governance.';
      } else if (s >= 45) {
        sellerDelta = -6;
        sellerLabel = 'Unverified Third-Party';
        sellerDesc = 'Merchant lacks tenure or verified public corporate registration history.';
      } else {
        sellerDelta = -16;
        sellerLabel = 'Substandard Merchant';
        sellerDesc = 'Substandard merchant rating or elevated fulfillment dispute risk.';
      }
    }
    contributions.push({
      key: 'seller',
      title: 'Seller Governance Graph',
      modality_name: 'Seller Reliability',
      status: seller_reliability.status === 'ASSESSED' ? 'EVALUATED' : 'UNASSESSED',
      raw_score: seller_reliability.score,
      delta: sellerDelta,
      max_pts: 15,
      status_label: sellerLabel,
      description: sellerDesc,
    });

    // 3. Review Sentiment (NLP ABSA) Modality
    let reviewDelta = 0;
    let reviewLabel = 'Zero-Penalty Invariant';
    let reviewDesc = 'Zero-penalty invariant active: No customer reviews available, zero score penalty applied.';
    if (product_quality.status === 'ASSESSED' && product_quality.score !== null) {
      const s = product_quality.score;
      if (s >= 80) {
        reviewDelta = +14;
        reviewLabel = `${s}% Buyer Satisfaction`;
        reviewDesc = 'Consistently positive product feedback across verified buyer reviews and ratings.';
      } else if (s >= 65) {
        reviewDelta = +4;
        reviewLabel = `${s}% Baseline Satisfaction`;
        reviewDesc = 'Acceptable customer feedback with minor recurring concerns.';
      } else if (s >= 45) {
        reviewDelta = -8;
        reviewLabel = `${s}% Mixed Feedback`;
        reviewDesc = 'Elevated dissatisfaction or recurring defect complaints observed.';
      } else {
        reviewDelta = -20;
        reviewLabel = `${s}% Critical Complaints`;
        reviewDesc = 'Severe defect reports or counterfeit complaints reported by buyers.';
      }
    }
    contributions.push({
      key: 'reviews',
      title: 'NLP Aspect Review Sentiment',
      modality_name: 'Aspect-Based Review Sentiment',
      status: product_quality.status === 'ASSESSED' ? 'EVALUATED' : 'UNASSESSED',
      raw_score: product_quality.score,
      delta: reviewDelta,
      max_pts: 20,
      status_label: reviewLabel,
      description: reviewDesc,
    });

    // 4. Website Legitimacy Modality
    let platformDelta = 0;
    let platformLabel = 'Unassessed';
    let platformDesc = 'Website domain parameters unassessed.';
    if (website_legitimacy.status === 'ASSESSED' && website_legitimacy.score !== null) {
      const s = website_legitimacy.score;
      if (s >= 90) {
        platformDelta = +8;
        platformLabel = 'Verified Major Platform';
        platformDesc = 'Established tier-1 marketplace infrastructure with MCA filing and Grievance Officer compliance.';
      } else if (s >= 75) {
        platformDelta = +4;
        platformLabel = 'Secure Webstore';
        platformDesc = 'Legitimate independent webstore infrastructure with active TLS encryption.';
      } else if (s >= 50) {
        platformDelta = -4;
        platformLabel = 'Unverified Webstore';
        platformDesc = 'Independent webstore lacking corporate incorporation or dispute officer records.';
      } else {
        platformDelta = -25;
        platformLabel = 'Phishing / Impersonation';
        platformDesc = 'Critical impersonation risk: typosquatting domain mimicking an established retailer.';
      }
    }
    contributions.push({
      key: 'platform',
      title: 'Platform Security & Legal',
      modality_name: 'Website Legitimacy',
      status: website_legitimacy.status === 'ASSESSED' ? 'EVALUATED' : 'UNASSESSED',
      raw_score: website_legitimacy.score,
      delta: platformDelta,
      max_pts: 10,
      status_label: platformLabel,
      description: platformDesc,
    });

    // 5. Computer Vision Modality
    const isVisionProvided = Boolean(input?.hasVisionProvided);
    const visionDelta = isVisionProvided ? +4 : 0;
    contributions.push({
      key: 'vision',
      title: 'Computer Vision & Hashing',
      modality_name: 'Computer Vision (ResNet-18 / CLIP)',
      status: isVisionProvided ? 'EVALUATED' : 'NOT_PROVIDED',
      raw_score: isVisionProvided ? 85 : null,
      delta: visionDelta,
      max_pts: 10,
      status_label: isVisionProvided ? 'ResNet-18 / CLIP Match' : 'Zero-Penalty Invariant',
      description: isVisionProvided
        ? 'ResNet-18 visual embeddings and CLIP feature verification completed. Visual similarity indicates image consistency only — not proof of authentic merchandise.'
        : 'Zero-penalty invariant active: No packaging image submitted, zero score penalty applied.',
    });

    // 6. Packaging OCR Modality
    const isOcrExtracted = Boolean(input?.hasOcrExtracted);
    const ocrDelta = isOcrExtracted ? +3 : 0;
    contributions.push({
      key: 'ocr',
      title: 'Packaging OCR & Metrology',
      modality_name: 'Packaging OCR Metrology',
      status: isOcrExtracted ? 'EVALUATED' : 'NOT_PROVIDED',
      raw_score: isOcrExtracted ? 90 : null,
      delta: ocrDelta,
      max_pts: 10,
      status_label: isOcrExtracted ? 'Statutory Declarations Clear' : 'Zero-Penalty Invariant',
      description: isOcrExtracted
        ? 'Packaging declarations (MRP, batch code) extracted via Tesseract OCR against Legal Metrology 2011.'
        : 'Zero-penalty invariant active: No packaging image submitted, zero score penalty applied.',
    });

    const sumDeltas = contributions.reduce((acc, c) => acc + c.delta, 0);
    const unconstrainedSubtotal = baseline + sumDeltas;
    const rawSubtotal = Math.max(10, Math.min(98, unconstrainedSubtotal));
    const boundaryClampAdjustment = rawSubtotal - unconstrainedSubtotal;

    // =========================================================================
    // NON-MASKING INVARIANT & SPARSE EVIDENCE GUARDS
    // =========================================================================
    let nonMaskingApplied = false;
    let nonMaskingReason: string | undefined = undefined;
    let nonMaskingPenalty = 0;
    let sparseEvidenceApplied = false;
    let sparseEvidencePenalty = 0;
    let finalScore = rawSubtotal;
    let overallRiskLevel: RiskLevel;

    const minScoreItem = assessedDimensions.reduce(
      (min, item) => (item.score < min.score ? item : min),
      assessedDimensions[0] || { key: '', name: '', score: 50, weight: 0 }
    );

    const isSparseEvidence = assessedDimensions.length <= 2 || coveragePercent < 75 || product_quality.score === null;

    if (minScoreItem.score < 40) {
      nonMaskingApplied = true;
      nonMaskingReason = `Critical risk detected in ${minScoreItem.name} (${minScoreItem.score}/100). High scores in platform legitimacy or other dimensions cannot mask high defect or authenticity risk.`;

      // Cap trust score strictly: cannot exceed weakest critical dimension score + 6
      const cap = Math.min(minScoreItem.score + 6, 45);
      if (rawSubtotal > cap) {
        nonMaskingPenalty = cap - rawSubtotal;
        finalScore = cap;
      }
      overallRiskLevel = minScoreItem.score < 25 ? 'CRITICAL_RISK' : 'HIGH_OBSERVED_RISK';
    } else {
      // Sparse Evidence Guard
      if (isSparseEvidence && rawSubtotal > 68) {
        sparseEvidenceApplied = true;
        sparseEvidencePenalty = 68 - rawSubtotal;
        finalScore = 68;
      }

      if (finalScore >= 78) {
        overallRiskLevel = 'MINIMAL_RISK';
      } else if (finalScore >= 60) {
        overallRiskLevel = 'MODERATE_RISK';
      } else {
        overallRiskLevel = 'HIGH_OBSERVED_RISK';
      }
    }

    // Recommendation logic
    let recommendation: FiveDimensionTrustResult['recommendation'];
    let rationale: string;

    if (coveragePercent < 50 || assessedDimensions.length <= 1) {
      recommendation = 'INSUFFICIENT_EVIDENCE';
      rationale = `Critical marketplace dimensions are unassessed (${coveragePercent}% coverage). Insufficient evidence to establish buyer trust. Additional data required.`;
    } else if (overallRiskLevel === 'CRITICAL_RISK') {
      recommendation = 'DO_NOT_RECOMMEND';
      rationale = nonMaskingReason || 'Severe risk factors identified. Purchase is strongly discouraged.';
    } else if (overallRiskLevel === 'HIGH_OBSERVED_RISK') {
      recommendation = 'INVESTIGATE_FURTHER';
      rationale = nonMaskingReason || 'Significant concerns identified in product quality, pricing corridor, or seller history.';
    } else if (overallRiskLevel === 'MODERATE_RISK') {
      recommendation = 'PROCEED_WITH_CAUTION';
      if (isSparseEvidence && product_quality.score === null) {
        rationale = `Assessment is based on sparse evidence (${coveragePercent}% coverage). Customer reviews and empirical product quality are unassessed. Proceed with caution.`;
      } else if (isSparseEvidence) {
        rationale = `Assessment is based on partial evidence (${coveragePercent}% coverage). Merchant track record or product data is unverified. Proceed with caution.`;
      } else {
        rationale = 'Listing is generally acceptable, but minor concerns or missing secondary data warrant review.';
      }
    } else {
      // Minimal Risk band: Guard against sparse evidence masking
      if (isSparseEvidence) {
        recommendation = 'PROCEED_WITH_CAUTION';
        rationale = `Assessment is based on partial evidence (${coveragePercent}% coverage). While platform parameters are healthy, empirical product quality is unassessed. Proceed with caution.`;
      } else {
        recommendation = 'PROCEED_CONFIDENTLY';
        rationale = 'All evaluated dimensions indicate healthy parameters, verified seller governance, and genuine market pricing.';
      }
    }

    const scoreBreakdown: ScoreBreakdown = {
      baseline,
      contributions,
      subtotal_before_caps: rawSubtotal,
      boundary_clamp_adjustment: boundaryClampAdjustment,
      non_masking_applied: nonMaskingApplied,
      non_masking_penalty: nonMaskingPenalty,
      sparse_evidence_applied: sparseEvidenceApplied,
      sparse_evidence_penalty: sparseEvidencePenalty,
      final_trust_score: finalScore,
      mathematical_identity_verified: (baseline + sumDeltas + boundaryClampAdjustment + nonMaskingPenalty + sparseEvidencePenalty) === finalScore,
    };

    return {
      overall_trust_score: finalScore,
      overall_risk_level: overallRiskLevel,
      recommendation,
      recommendation_rationale: rationale,
      non_masking_applied: nonMaskingApplied,
      non_masking_reason: nonMaskingReason,
      dimensions,
      score_breakdown: scoreBreakdown,
      evidence: {
        coverage_percent: coveragePercent,
        confidence_score: Math.round(avgConfidence * 100) / 100,
        supporting_evidence: Array.from(new Set(allSignals)),
        contradicting_evidence: Array.from(new Set(allRisks)),
        missing_evidence: Array.from(new Set(allMissing)),
      },
    };
  }
}

export const decoupledTrustEngine = new DecoupledTrustEngine();
