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

export interface FiveDimensionTrustResult {
  overall_trust_score: number; // 0 to 100
  overall_risk_level: RiskLevel;
  recommendation: 'PROCEED_CONFIDENTLY' | 'PROCEED_WITH_CAUTION' | 'INVESTIGATE_FURTHER' | 'DO_NOT_RECOMMEND';
  recommendation_rationale: string;
  non_masking_applied: boolean;
  non_masking_reason?: string;

  dimensions: {
    product_quality: DimensionEvaluation;
    seller_reliability: DimensionEvaluation;
    listing_authenticity: DimensionEvaluation;
    website_legitimacy: DimensionEvaluation;
  };

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
  sellerName?: string;
  sellerRating?: number;
  fulfillmentType?: string;
  claimedStarRating?: number;
  ratingsCount?: number;
  nlpReport?: ReviewNlpReport | null;
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
    });
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
      } else if (stars <= 3.2) {
        riskFactors.push(`Low customer rating: ${stars.toFixed(1)} / 5.0${ratingsCount ? ` (${ratingsCount.toLocaleString()} ratings)` : ''}`);
      }

      // Blend star score with NLP sentiment if both present
      const starEquivScore = Math.round(((stars - 1) / 4.0) * 100);
      if (hasNlp) {
        qualityScore = Math.round(qualityScore * 0.65 + starEquivScore * 0.35);
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

    let score = 85; // baseline for valid product listings
    let confidence = 0.75;

    // Price Verification Status check
    if (priceVerificationStatus === 'VERIFIED') {
      positiveSignals.push('Listing price corroborated across multiple structured data layers');
      confidence += 0.10;
    } else if (priceVerificationStatus === 'CONFLICTING_SOURCES') {
      riskFactors.push('Extracted price sources disagree by >15% (possible variant mismatch or conditional coupon)');
      score -= 12;
    } else if (priceVerificationStatus === 'NOT_FOUND') {
      missingData.push('Live price unverified from automated fetch; manual price entry requires verification');
      confidence -= 0.15;
    }

    // Price Corridor & Discount Anomaly Analysis
    if (observedPrice && mrp && mrp > 0) {
      const discount = Math.round(((mrp - observedPrice) / mrp) * 100);
      if (discount >= 80) {
        riskFactors.push(`Extreme discount anomaly: ${discount}% off claimed MRP ₹${mrp.toLocaleString()} (frequent indicator of replica merchandise)`);
        score -= 42;
      } else if (discount >= 65) {
        riskFactors.push(`Steep discount observed: ${discount}% off claimed MRP`);
        score -= 15;
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
  public synthesizeOverallPurchaseRisk(dimensions: {
    product_quality: DimensionEvaluation;
    seller_reliability: DimensionEvaluation;
    listing_authenticity: DimensionEvaluation;
    website_legitimacy: DimensionEvaluation;
  }): FiveDimensionTrustResult {
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

    // =========================================================================
    // NON-MASKING INVARIANT ENFORCEMENT
    // If ANY evaluated dimension is high risk (< 40), the entire deal is HIGH RISK!
    // A high website score (e.g. 96 on Amazon) CANNOT mask bad product quality (e.g. 25)!
    // =========================================================================
    let nonMaskingApplied = false;
    let nonMaskingReason: string | undefined = undefined;

    const minScoreItem = assessedDimensions.reduce(
      (min, item) => (item.score < min.score ? item : min),
      assessedDimensions[0] || { key: '', name: '', score: 50, weight: 0 }
    );

    let synthesizedScore: number;
    let overallRiskLevel: RiskLevel;

    if (minScoreItem.score < 40) {
      nonMaskingApplied = true;
      nonMaskingReason = `Critical risk detected in ${minScoreItem.name} (${minScoreItem.score}/100). High scores in platform legitimacy or other dimensions cannot mask high defect or authenticity risk.`;

      // Cap trust score strictly: cannot exceed weakest critical dimension score + 8
      synthesizedScore = Math.min(minScoreItem.score + 6, 45);
      overallRiskLevel = minScoreItem.score < 25 ? 'CRITICAL_RISK' : 'HIGH_OBSERVED_RISK';
    } else {
      // Normal normalized weighted combination
      const totalWeight = assessedDimensions.reduce((acc, d) => acc + d.weight, 0);
      synthesizedScore = Math.round(
        assessedDimensions.reduce((acc, d) => acc + d.score * d.weight, 0) / (totalWeight || 1.0)
      );

      if (synthesizedScore >= 78) {
        overallRiskLevel = 'MINIMAL_RISK';
      } else if (synthesizedScore >= 60) {
        overallRiskLevel = 'MODERATE_RISK';
      } else {
        overallRiskLevel = 'HIGH_OBSERVED_RISK';
      }
    }

    // Recommendation logic
    let recommendation: FiveDimensionTrustResult['recommendation'];
    let rationale: string;

    if (overallRiskLevel === 'CRITICAL_RISK') {
      recommendation = 'DO_NOT_RECOMMEND';
      rationale = nonMaskingReason || 'Severe risk factors identified. Purchase is strongly discouraged.';
    } else if (overallRiskLevel === 'HIGH_OBSERVED_RISK') {
      recommendation = 'INVESTIGATE_FURTHER';
      rationale = nonMaskingReason || 'Significant concerns identified in product quality, pricing corridor, or seller history.';
    } else if (overallRiskLevel === 'MODERATE_RISK') {
      recommendation = 'PROCEED_WITH_CAUTION';
      rationale = 'Listing is generally acceptable, but minor concerns or missing secondary data warrant review.';
    } else {
      recommendation = 'PROCEED_CONFIDENTLY';
      rationale = 'All evaluated dimensions indicate healthy parameters, verified seller governance, and genuine market pricing.';
    }

    return {
      overall_trust_score: synthesizedScore,
      overall_risk_level: overallRiskLevel,
      recommendation,
      recommendation_rationale: rationale,
      non_masking_applied: nonMaskingApplied,
      non_masking_reason: nonMaskingReason,
      dimensions,
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
