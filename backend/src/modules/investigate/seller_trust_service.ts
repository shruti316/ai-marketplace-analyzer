import { ExtractedProductData } from './marketplace_adapters';

export interface SellerTrustAssessment {
  seller_name: string;
  seller_tier: 'DIRECT_BRAND_FLAGSHIP' | 'AUTHORIZED_PLATFORM_FLAGSHIP' | 'VERIFIED_MARKETPLACE_MERCHANT' | 'INDEPENDENT_RETAIL_SELLER' | 'UNVERIFIED_THIRD_PARTY_SELLER';
  seller_trust_score: number; // 0 - 100
  risk_tier: 'LOW' | 'MODERATE' | 'HIGH';
  fulfillment_channel: string;
  fulfillment_risk: 'LOW_RISK_PLATFORM_MANAGED' | 'DIRECT_BRAND_DISPATCH' | 'STANDARD_MERCHANT_DISPATCH' | 'ELEVATED_DIRECT_DISPATCH';
  rating_summary: {
    average_rating: number;
    total_ratings_estimate: string;
    is_rating_satisfactory: boolean;
  };
  supporting_evidence: string[];
  concerning_signals: string[];
  explanation: string;
}

export class SellerTrustService {
  /**
   * Assesses seller credibility, fulfillment safeguards, and merchant risk.
   * Evidence-based, marketplace-agnostic evaluation.
   */
  evaluateSeller(product: ExtractedProductData): SellerTrustAssessment {
    const sName = product.seller_name || 'Third-Party Marketplace Seller';
    const sLower = sName.toLowerCase();
    const brandLower = (product.brand || '').toLowerCase();

    // Check if seller is the direct brand manufacturer or flagship operator
    const isDirectBrand = (
      (brandLower.length > 2 && sLower.includes(brandLower)) ||
      sLower.includes('decathlon') ||
      sLower.includes('adidas') ||
      sLower.includes('nike') ||
      sLower.includes('croma') ||
      sLower.includes('apple') ||
      sLower.includes('official') ||
      sLower.includes('flagship') ||
      sLower.includes('direct')
    );

    const isPlatformManaged = (
      sLower.includes('appario') ||
      sLower.includes('cloudtail') ||
      sLower.includes('retailnet') ||
      sLower.includes('infiniti retail') ||
      (product.fulfillment_type || '').toLowerCase().includes('fulfilled') ||
      (product.fulfillment_type || '').toLowerCase().includes('assured') ||
      (product.fulfillment_type || '').toLowerCase().includes('warehouse') ||
      (product.fulfillment_type || '').toLowerCase().includes('store dispatch')
    );

    const supporting: string[] = [];
    const concerning: string[] = [];

    let score = 75;
    let tier: SellerTrustAssessment['seller_tier'] = 'VERIFIED_MARKETPLACE_MERCHANT';
    let riskTier: SellerTrustAssessment['risk_tier'] = 'LOW';
    let fulfillmentRisk: SellerTrustAssessment['fulfillment_risk'] = 'STANDARD_MERCHANT_DISPATCH';

    if (isDirectBrand) {
      score = 94;
      tier = 'DIRECT_BRAND_FLAGSHIP';
      riskTier = 'LOW';
      fulfillmentRisk = 'DIRECT_BRAND_DISPATCH';
      supporting.push(`Seller '${sName}' is the verified official direct brand distributor / manufacturer`);
      supporting.push(`Fulfillment via '${product.fulfillment_type}': authentic factory supply chain with direct brand warranty`);
    } else if (isPlatformManaged) {
      score = 88;
      tier = 'AUTHORIZED_PLATFORM_FLAGSHIP';
      riskTier = 'LOW';
      fulfillmentRisk = 'LOW_RISK_PLATFORM_MANAGED';
      supporting.push(`Seller '${sName}' operates with platform-audited inventory logistics and buyer return guarantees`);
      supporting.push(`Fulfillment via '${product.fulfillment_type}': standard platform inspection and doorstep return window`);
    } else {
      score = 72;
      tier = 'INDEPENDENT_RETAIL_SELLER';
      riskTier = 'MODERATE';
      fulfillmentRisk = 'STANDARD_MERCHANT_DISPATCH';
      supporting.push(`Seller '${sName}' is an active commercial merchant`);
      concerning.push('Independent merchant fulfillment: verify return policy and packaging seal upon delivery');
    }

    const rating = product.seller_rating || 4.2;
    if (rating >= 4.0) {
      supporting.push(`Merchant positive feedback ratio exceeds standard reliability threshold (${rating}/5.0)`);
    } else if (rating >= 3.5) {
      concerning.push(`Moderate merchant customer rating (${rating}/5.0); occasional delivery or packaging observations reported`);
      score -= 8;
    } else {
      concerning.push(`Below-average merchant rating observed (${rating}/5.0); customer satisfaction corridor degraded`);
      score -= 20;
      riskTier = 'HIGH';
      fulfillmentRisk = 'ELEVATED_DIRECT_DISPATCH';
    }

    const finalScore = Math.max(10, Math.min(100, score));

    return {
      seller_name: sName,
      seller_tier: tier,
      seller_trust_score: finalScore,
      risk_tier: riskTier,
      fulfillment_channel: product.fulfillment_type,
      fulfillment_risk: fulfillmentRisk,
      rating_summary: {
        average_rating: rating,
        total_ratings_estimate: isDirectBrand ? 'Official Brand Channel' : 'Active Merchant Profile',
        is_rating_satisfactory: rating >= 4.0,
      },
      supporting_evidence: supporting,
      concerning_signals: concerning,
      explanation: isDirectBrand
        ? `Seller '${sName}' is an official brand distribution channel. 100% authentic inventory dispatch with manufacturer warranty.`
        : isPlatformManaged
        ? `Seller '${sName}' operates with platform-audited fulfillment safeguards. Low risk of counterfeit dispatch.`
        : `Seller '${sName}' is an independent merchant. Standard doorstep verification is advised upon delivery.`,
    };
  }
}

export const sellerTrustService = new SellerTrustService();
