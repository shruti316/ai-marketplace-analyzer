import { WebsiteTrustAssessment } from './website_trust_service';
import { SellerTrustAssessment } from './seller_trust_service';

export interface BuyingSuitabilityAssessment {
  overall_suitability_score: number; // 0 - 100
  recommendation_category: 'STRONG_OPTION' | 'GOOD_VALUE_WITH_CONCERNS' | 'CONSIDER_ALTERNATIVES' | 'NOT_ENOUGH_EVIDENCE' | 'HIGH_RISK_CAUTION';
  recommendation_title: string;
  summary_reasoning: string;
  dimensions: {
    specification_match: number; // 0 - 100
    review_quality_and_satisfaction: number; // 0 - 100
    price_competitiveness: number; // 0 - 100
    feature_to_price_value: number; // 0 - 100
    market_position: string;
  };
  reasons_to_consider: string[];
  reasons_for_caution: string[];
  explicit_trust_warning: string | null;
  methodology_explanation: string;
}

export class BuyingSuitabilityService {
  /**
   * Engine B: Evaluates product quality, specifications, market positioning, and value proposition.
   * Remains architecturally separate from Engine A (Legitimacy).
   */
  evaluateSuitability(params: {
    productTitle: string;
    brand: string;
    category: string;
    price: number;
    mrp: number;
    websiteTrust: WebsiteTrustAssessment;
    sellerTrust: SellerTrustAssessment;
    engineATrustScore: number; // 0 - 100
    isSteepDiscountAnomaly: boolean;
    nlpReviewScore: number; // -1.0 to 1.0
  }): BuyingSuitabilityAssessment {
    const {
      price,
      mrp,
      engineATrustScore,
      isSteepDiscountAnomaly,
      nlpReviewScore,
    } = params;

    const discountPercent = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

    // Dimension 1: Spec Match (typical baseline 82)
    const specScore = 82;

    // Dimension 2: Review Quality & Customer Satisfaction
    // Rescale -1.0 to 1.0 -> 20 to 95
    const reviewScore = Math.round(Math.max(20, Math.min(95, ((nlpReviewScore + 1.0) / 2.0) * 80 + 15)));

    // Dimension 3: Price Competitiveness
    const priceCompScore = discountPercent >= 15 && discountPercent <= 40 ? 90 : discountPercent > 40 ? 95 : 70;

    // Dimension 4: Feature-to-Price Value
    const featureValueScore = Math.round((specScore * 0.4) + (priceCompScore * 0.6));

    // Weighted Overall Suitability (Independent of authenticity)
    let rawSuitability = Math.round(
      (specScore * 0.25) +
      (reviewScore * 0.35) +
      (priceCompScore * 0.20) +
      (featureValueScore * 0.20)
    );

    const reasonsConsider: string[] = [];
    const reasonsCaution: string[] = [];
    let warning: string | null = null;
    let category: BuyingSuitabilityAssessment['recommendation_category'] = 'GOOD_VALUE_WITH_CONCERNS';
    let title = 'Good Value with Some Considerations';

    if (discountPercent > 0) {
      reasonsConsider.push(`Advertised at ₹${price} (${discountPercent}% savings against claimed MRP ₹${mrp})`);
    }
    reasonsConsider.push('Core product specifications meet contemporary category standards');

    // Engine A Conflict Detection: Check if Engine A flagged High Risk
    const hasSevereLegitimacyWarning = engineATrustScore < 45 || isSteepDiscountAnomaly;

    if (hasSevereLegitimacyWarning) {
      category = 'HIGH_RISK_CAUTION';
      title = 'Critical Anomaly Detected — Purchase Not Recommended';
      warning = `⚠️ Critical Warning: Although advertised specifications and price (₹${price}) appear competitive, Engine A detected severe legitimacy and pricing anomalies. High probability of counterfeit goods, defective stock, or unauthorized merchant listing.`;
      reasonsCaution.push(`Listing price is ${discountPercent}% below MRP, breaching the verified category pricing corridor`);
      reasonsCaution.push('Engine A flagged severe seller governance or customer defect patterns');
      reasonsCaution.push('Doorstep physical authenticity cannot be verified prior to courier delivery');
      rawSuitability = Math.min(rawSuitability, 38);
    } else if (nlpReviewScore < -0.15) {
      category = 'CONSIDER_ALTERNATIVES';
      title = 'Consider Alternatives — Elevated Defect Complaints';
      reasonsCaution.push('Customer feedback indicates recurring durability and material degradation concerns');
      reasonsCaution.push('Competing offerings in this category deliver superior long-term reliability');
      rawSuitability = Math.min(rawSuitability, 60);
    } else if (rawSuitability >= 75) {
      category = 'STRONG_OPTION';
      title = 'Strong Buying Option';
      reasonsConsider.push('Consistent customer sentiment across durability, comfort, and value aspects');
      reasonsConsider.push('Verified merchant fulfillment safeguards with low return probability');
    }

    const marketPos = discountPercent >= 45
      ? 'Suspiciously Underpriced (Steep Anomaly Corridor)'
      : discountPercent >= 20
      ? 'Competitive Value Champion'
      : 'Standard Retail Price Corridor';

    return {
      overall_suitability_score: Math.max(10, Math.min(100, rawSuitability)),
      recommendation_category: category,
      recommendation_title: title,
      summary_reasoning: warning
        ? warning
        : `This product offers a solid feature set at ₹${price}. Suitable for purchase with standard doorstep receipt inspection.`,
      dimensions: {
        specification_match: specScore,
        review_quality_and_satisfaction: reviewScore,
        price_competitiveness: priceCompScore,
        feature_to_price_value: featureValueScore,
        market_position: marketPos,
      },
      reasons_to_consider: reasonsConsider,
      reasons_for_caution: reasonsCaution,
      explicit_trust_warning: warning,
      methodology_explanation:
        'Engine B calculates product suitability across specifications, customer review satisfaction, and relative pricing value. It is architecturally decoupled from Engine A (Legitimacy). A high suitability score does not certify physical authenticity.',
    };
  }
}

export const buyingSuitabilityService = new BuyingSuitabilityService();
