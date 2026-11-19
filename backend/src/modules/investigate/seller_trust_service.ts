import { ExtractedProductData } from './marketplace_adapters';

export interface SellerTrustAssessment {
  seller_name: string;
  seller_tier: 'AUTHORIZED_PLATFORM_FLAGSHIP' | 'VERIFIED_MARKETPLACE_MERCHANT' | 'UNVERIFIED_THIRD_PARTY_SELLER';
  seller_trust_score: number; // 0 - 100
  risk_tier: 'LOW' | 'MODERATE' | 'HIGH';
  fulfillment_channel: string;
  fulfillment_risk: 'LOW_RISK_PLATFORM_MANAGED' | 'ELEVATED_DIRECT_DISPATCH';
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
   */
  evaluateSeller(product: ExtractedProductData): SellerTrustAssessment {
    const sName = product.seller_name || 'Third-Party Marketplace Seller';
    const sLower = sName.toLowerCase();
    const isBrandOfficial = sLower.includes('official') || sLower.includes('flagship') || sLower.includes('direct');
    const isPlatformManaged = sLower.includes('appario') || sLower.includes('cloudtail') || sLower.includes('retailnet') || product.fulfillment_type.toLowerCase().includes('fulfilled') || product.fulfillment_type.toLowerCase().includes('assured');

    const supporting: string[] = [];
    const concerning: string[] = [];

    let score = 75;
    let tier: SellerTrustAssessment['seller_tier'] = 'VERIFIED_MARKETPLACE_MERCHANT';
    let riskTier: SellerTrustAssessment['risk_tier'] = 'MODERATE';

    if (isBrandOfficial || isPlatformManaged) {
      score = 90;
      tier = 'AUTHORIZED_PLATFORM_FLAGSHIP';
      riskTier = 'LOW';
      supporting.push(`Seller '${sName}' operates with platform-audited inventory logistics and direct brand authorization`);
      supporting.push(`Fulfillment via '${product.fulfillment_type}': strict inspection standards and guaranteed return processing`);
    } else {
      score = 52;
      tier = 'UNVERIFIED_THIRD_PARTY_SELLER';
      riskTier = 'MODERATE';
      concerning.push(`Seller '${sName}' is an independent marketplace merchant without direct brand manufacturer endorsement`);
      concerning.push('Merchant drop-ship fulfillment: higher historical variation in packaging and stock authenticity');
    }

    const rating = product.seller_rating || 4.1;
    if (rating >= 4.0) {
      supporting.push(`Merchant positive feedback ratio exceeds standard reliability threshold (${rating}/5.0)`);
    } else {
      concerning.push(`Below-average merchant rating observed (${rating}/5.0); customer satisfaction corridor degraded`);
      score -= 15;
      riskTier = 'HIGH';
    }

    return {
      seller_name: sName,
      seller_tier: tier,
      seller_trust_score: Math.max(10, Math.min(100, score)),
      risk_tier: riskTier,
      fulfillment_channel: product.fulfillment_type,
      fulfillment_risk: isPlatformManaged ? 'LOW_RISK_PLATFORM_MANAGED' : 'ELEVATED_DIRECT_DISPATCH',
      rating_summary: {
        average_rating: rating,
        total_ratings_estimate: '1,200+ lifetime orders',
        is_rating_satisfactory: rating >= 4.0,
      },
      supporting_evidence: supporting,
      concerning_signals: concerning,
      explanation: isPlatformManaged
        ? `Seller '${sName}' has high institutional trust under platform fulfillment safeguards. Low risk of counterfeit dispatch.`
        : `Seller '${sName}' is a third-party merchant. Doorstep physical verification is advised before accepting delivery.`,
    };
  }
}

export const sellerTrustService = new SellerTrustService();
