import crypto from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import {
  comparisonRepository,
  ComparisonWithItems,
  ComparisonRow
} from './comparison.repository';
import { CreateComparisonInput } from './comparison.schemas';
import { query } from '../../config/database';
import { AuthUser } from '../../middleware/auth';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError
} from '../../middleware/errorHandler';

interface ProductInfo extends RowDataPacket {
  canonical_product_id: string;
  product_title: string;
  has_image: number;
  has_review: number;
  has_price: number;
  modality_tier: string;
}

interface PriceSnapshot extends RowDataPacket {
  canonical_product_id: string;
  selling_price_inr: number | null;
}

interface AssessmentSnapshot extends RowDataPacket {
  canonical_product_id: string;
  predicted_risk_tier: string;
  continuous_anomaly_score: number;
}

const RISK_TIER_SEVERITY: Record<string, number> = {
  LOW_OBSERVED_ANOMALY: 1,
  MODERATE_SINGLE_MODALITY_ANOMALY: 2,
  UNASSESSED_SPARSE_DATA: 3,
  ELEVATED_MULTIMODAL_ANOMALY: 4
};

export class ComparisonService {
  async createComparison(
    user: AuthUser,
    input: CreateComparisonInput
  ): Promise<ComparisonWithItems> {
    const productIds = input.canonical_product_ids;

    // 1. Verify existence of all requested canonical products
    const placeholders = productIds.map(() => '?').join(', ');
    const products = await query<ProductInfo[]>(
      `SELECT canonical_product_id, product_title, has_image, has_review, has_price, modality_tier
       FROM canonical_products
       WHERE canonical_product_id IN (${placeholders})`,
      productIds
    );

    const foundIds = new Set(products.map(p => p.canonical_product_id));
    const missingIds = productIds.filter(id => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new ValidationError(
        `One or more canonical product identifiers do not exist: ${missingIds.join(', ')}`,
        { missingIds }
      );
    }

    // 2. Fetch latest price snapshot for each product
    const prices = await query<PriceSnapshot[]>(
      `SELECT ml.canonical_product_id, ph.selling_price_inr
       FROM marketplace_listings ml
       JOIN price_history ph ON ml.listing_id = ph.listing_id
       WHERE ml.canonical_product_id IN (${placeholders})
       AND (ph.listing_id, ph.observation_timestamp) IN (
         SELECT listing_id, MAX(observation_timestamp)
         FROM price_history
         GROUP BY listing_id
       )`,
      productIds
    );
    const priceMap = new Map<string, number | null>();
    for (const p of prices) {
      if (!priceMap.has(p.canonical_product_id) && p.selling_price_inr !== null) {
        priceMap.set(p.canonical_product_id, Number(p.selling_price_inr));
      }
    }

    // 3. Fetch latest trust assessment for each product
    const assessments = await query<AssessmentSnapshot[]>(
      `SELECT ta.canonical_product_id, ta.predicted_risk_tier, ta.continuous_anomaly_score
       FROM trust_assessments ta
       WHERE ta.canonical_product_id IN (${placeholders})
       AND (ta.canonical_product_id, ta.assessed_at) IN (
         SELECT canonical_product_id, MAX(assessed_at)
         FROM trust_assessments
         GROUP BY canonical_product_id
       )`,
      productIds
    );
    const assessmentMap = new Map<string, { tier: string; score: number }>();
    for (const a of assessments) {
      assessmentMap.set(a.canonical_product_id, {
        tier: a.predicted_risk_tier,
        score: Number(a.continuous_anomaly_score)
      });
    }

    // 4. Rank products by trust risk (lower severity is better) and evidence density
    const productStats = productIds.map(id => {
      const p = products.find(prod => prod.canonical_product_id === id)!;
      const price = priceMap.get(id) ?? null;
      const assessment = assessmentMap.get(id);
      const tier = assessment ? assessment.tier : 'UNASSESSED_SPARSE_DATA';
      const severity = RISK_TIER_SEVERITY[tier] || 3;
      const density = (p.has_image ? 1 : 0) + (p.has_review ? 1 : 0) + (p.has_price ? 1 : 0);

      return {
        id,
        title: p.product_title,
        price,
        tier: tier as 'LOW_OBSERVED_ANOMALY' | 'MODERATE_SINGLE_MODALITY_ANOMALY' | 'ELEVATED_MULTIMODAL_ANOMALY' | 'UNASSESSED_SPARSE_DATA',
        severity,
        density
      };
    });

    // Sort by lowest severity, then highest density, then lowest price
    const ranked = [...productStats].sort((a, b) => {
      if (a.severity !== b.severity) return a.severity - b.severity;
      if (b.density !== a.density) return b.density - a.density;
      if (a.price !== null && b.price !== null) return a.price - b.price;
      return 0;
    });

    const recommendedProduct = ranked[0];
    const comparisonId = crypto.randomUUID();

    const rationale = `Recommended "${recommendedProduct.title}" due to optimal trust profile (risk tier: ${recommendedProduct.tier}) and verified multi-source catalog evidence density.`;

    const items = productStats.map((prod, idx) => {
      const riskRank = ranked.findIndex(r => r.id === prod.id) + 1;
      const densityRank = [...productStats].sort((a, b) => b.density - a.density).findIndex(r => r.id === prod.id) + 1;
      const isRecommended = prod.id === recommendedProduct.id;

      return {
        canonical_product_id: prod.id,
        display_order: idx + 1,
        evidence_density_rank: densityRank,
        risk_rank: riskRank,
        is_recommended: isRecommended,
        snapshot_price_inr: prod.price,
        snapshot_risk_tier: prod.tier,
        tradeoff_notes: isRecommended
          ? 'Lowest anomaly risk with corroborated marketplace signals.'
          : `Higher comparative risk (${prod.tier}) or sparse modality density relative to recommended alternative.`
      };
    });

    return comparisonRepository.createComparison({
      id: comparisonId,
      user_id: user.id,
      comparison_title: input.title || 'Product Trust Comparison',
      recommended_product_id: recommendedProduct.id,
      recommendation_rationale: rationale,
      items
    });
  }

  async getComparisonById(id: string, user: AuthUser): Promise<ComparisonWithItems> {
    const comparison = await comparisonRepository.findById(id);
    if (!comparison) {
      throw new NotFoundError(`Product comparison session not found with ID "${id}"`, 'COMPARISON_NOT_FOUND');
    }

    // Ownership check: creator or ADMIN
    if (comparison.user_id && comparison.user_id !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError(
        'Access denied: You do not have permission to view this comparison session',
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    return comparison;
  }

  async getUserComparisons(
    user: AuthUser,
    page = 1,
    limit = 10
  ): Promise<{ items: ComparisonRow[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const { items, total } = await comparisonRepository.findByUserId(user.id, limit, offset);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async deleteComparisonById(id: string, user: AuthUser): Promise<void> {
    const comparison = await comparisonRepository.findById(id);
    if (!comparison) {
      throw new NotFoundError(`Product comparison session not found with ID "${id}"`, 'COMPARISON_NOT_FOUND');
    }

    if (comparison.user_id && comparison.user_id !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError(
        'Access denied: You do not have permission to delete this comparison session',
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    await comparisonRepository.deleteById(id);
  }
}

export const comparisonService = new ComparisonService();
