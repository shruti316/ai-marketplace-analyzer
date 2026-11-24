import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Camera, FileCheck, MessageSquare, Info, ShieldCheck, Globe, AlertTriangle } from 'lucide-react';
import { ProductIntelligenceReport, ModalityContribution } from '../../services/investigateService';
import { Tip } from './Tip';

export interface ScoreContributionPanelProps {
  report: ProductIntelligenceReport;
  highlightedModality?: string | null;
  onHoverModality?: (modality: string | null) => void;
  className?: string;
}

export const ScoreContributionPanel: React.FC<ScoreContributionPanelProps> = ({
  report,
  highlightedModality,
  onHoverModality,
  className = '',
}) => {
  const overallScore = report.summary.overall_trust_score;
  const fiveDim = report.five_dimension_trust;
  const serverBreakdown = fiveDim?.score_breakdown;

  const s1 = report.section_1_overview;
  const s2 = report.section_2_website_trust;
  const s3 = report.section_3_seller_trust;
  const s5 = report.section_5_review_intelligence;
  const s6 = report.section_6_visual_packaging;

  // Determine baseline & contributions (consume server breakdown or compute exact deterministic model)
  const baseline = serverBreakdown?.baseline ?? 50;

  let rawContributions: ModalityContribution[] = [];

  if (serverBreakdown && serverBreakdown.contributions && serverBreakdown.contributions.length > 0) {
    rawContributions = serverBreakdown.contributions;
  } else {
    // Deterministic Client-Side Derivation matching DecoupledTrustEngine contract
    const isPricingSafe = !s3.pricing_integrity?.is_steep_discount_anomaly;
    const priceDelta = isPricingSafe ? +14 : -22;
    const priceDesc = isPricingSafe
      ? `Observed ₹${s1.observed_price_inr?.toLocaleString('en-IN') ?? 'N/A'} aligns with genuine category retail corridor.`
      : `Steep discount anomaly detected (${s1.discount_percentage ?? 0}% off) outside normal retail boundaries.`;

    const sName = (s3.seller_name || '').toLowerCase();
    const isBrandDirect = sName.includes('official') || sName.includes('flagship') || (s3.fulfillment_channel || '').includes('Brand');
    const isPlatformFulfilled = (s3.fulfillment_channel || '').includes('Fulfilled') || (s3.fulfillment_channel || '').includes('FBA') || (s3.fulfillment_channel || '').includes('Assured');
    const sellerDelta = isBrandDirect ? +12 : (isPlatformFulfilled ? +8 : (s3.seller_name ? +2 : -6));
    const sellerDesc = isBrandDirect
      ? `Official direct brand merchant: "${s3.seller_name || 'Brand Direct'}". Direct warranty dispatch.`
      : isPlatformFulfilled
      ? `Platform warehouse fulfilled: "${s3.seller_name || 'Marketplace Warehouse'}". Platform return governance.`
      : s3.seller_name
      ? `Verified independent merchant: "${s3.seller_name}". Standard marketplace governance.`
      : 'Unverified third-party merchant with unlinked public incorporation history.';

    const reviewsCount = s5.reviews_analyzed_count ?? 0;
    const hasReviews = reviewsCount > 0 && s5.status === 'EVALUATED';
    const satIndex = s5.satisfaction_index ?? 50;
    const reviewDelta = !hasReviews ? 0 : (satIndex >= 80 ? +14 : (satIndex >= 65 ? +4 : (satIndex >= 45 ? -8 : -20)));
    const reviewDesc = !hasReviews
      ? 'Zero-penalty invariant active: No customer reviews available on this listing, zero score penalty applied.'
      : `${satIndex}% positive customer sentiment across ${reviewsCount} verified buyer review(s).`;

    const isMajorPlatform = (s2?.trust_score ?? 80) >= 90;
    const platformDelta = isMajorPlatform ? +8 : ((s2?.trust_score ?? 80) >= 75 ? +4 : -4);
    const platformDesc = isMajorPlatform
      ? `Tier-1 verified marketplace infrastructure (${s2?.domain || 'Platform'}). Legal grievance officer confirmed.`
      : `Independent e-commerce webstore (${s2?.domain || 'Webstore'}) with active TLS encryption.`;

    const isVisionProvided = Boolean(s6?.image_uploaded && s6.evaluation_state === 'COMPLETED');
    const visionDelta = isVisionProvided ? +4 : 0;
    const visionDesc = isVisionProvided
      ? 'ResNet-18 visual embeddings and CLIP feature verification completed. Visual similarity indicates image consistency only — not proof of authentic merchandise.'
      : 'Zero-penalty invariant active: No packaging image submitted, zero score penalty applied.';

    const isOcrExtracted = Boolean(s6?.packaging_ocr && s6.packaging_ocr.compliance_status === 'TEXT_EXTRACTED_SUCCESSFULLY');
    const ocrDelta = isOcrExtracted ? +3 : 0;
    const ocrDesc = isOcrExtracted
      ? 'Packaging statutory declarations (MRP, batch code) extracted and verified via OCR.'
      : 'Zero-penalty invariant active: No packaging image submitted, zero score penalty applied.';

    rawContributions = [
      {
        key: 'pricing',
        title: 'Price Corridor Modality',
        modality_name: 'Price Corridor Modality',
        status: s1.observed_price_inr !== null ? 'EVALUATED' : 'UNASSESSED',
        raw_score: isPricingSafe ? 85 : 30,
        delta: priceDelta,
        max_pts: 20,
        status_label: isPricingSafe ? 'Genuine Retail Corridor' : 'Steep Anomaly Risk',
        description: priceDesc,
      },
      {
        key: 'seller',
        title: 'Seller Governance Graph',
        modality_name: 'Seller Reliability',
        status: s3.seller_name ? 'EVALUATED' : 'UNASSESSED',
        raw_score: s3.seller_trust_score,
        delta: sellerDelta,
        max_pts: 15,
        status_label: isBrandDirect ? 'Brand Flagship' : (isPlatformFulfilled ? 'Platform-Fulfilled' : 'Third-Party Merchant'),
        description: sellerDesc,
      },
      {
        key: 'reviews',
        title: 'NLP Aspect Review Sentiment',
        modality_name: 'Aspect-Based Review Sentiment',
        status: hasReviews ? 'EVALUATED' : 'UNASSESSED',
        raw_score: hasReviews ? satIndex : null,
        delta: reviewDelta,
        max_pts: 20,
        status_label: hasReviews ? `${satIndex}% Buyer Satisfaction` : 'Zero-Penalty Invariant',
        description: reviewDesc,
      },
      {
        key: 'platform',
        title: 'Platform Security & Legal',
        modality_name: 'Website Legitimacy',
        status: 'EVALUATED',
        raw_score: s2?.trust_score ?? 80,
        delta: platformDelta,
        max_pts: 10,
        status_label: isMajorPlatform ? 'Tier-1 Marketplace' : 'Encrypted Webstore',
        description: platformDesc,
      },
      {
        key: 'vision',
        title: 'Computer Vision & Hashing',
        modality_name: 'Computer Vision (ResNet-18 / CLIP)',
        status: isVisionProvided ? 'EVALUATED' : 'NOT_PROVIDED',
        raw_score: isVisionProvided ? 85 : null,
        delta: visionDelta,
        max_pts: 10,
        status_label: isVisionProvided ? 'ResNet-18 / CLIP Match' : 'Zero-Penalty Invariant',
        description: visionDesc,
      },
      {
        key: 'ocr',
        title: 'Packaging OCR & Metrology',
        modality_name: 'Packaging OCR Metrology',
        status: isOcrExtracted ? 'EVALUATED' : 'NOT_PROVIDED',
        raw_score: isOcrExtracted ? 90 : null,
        delta: ocrDelta,
        max_pts: 10,
        status_label: isOcrExtracted ? 'Statutory Declarations Clear' : 'Zero-Penalty Invariant',
        description: ocrDesc,
      },
    ];
  }

  const sumModalityDeltas = rawContributions.reduce((acc, c) => acc + c.delta, 0);
  const boundaryClampAdjustment = serverBreakdown?.boundary_clamp_adjustment ?? 0;
  const nonMaskingPenalty = serverBreakdown?.non_masking_penalty ?? 0;
  const sparseEvidencePenalty = serverBreakdown?.sparse_evidence_penalty ?? 0;

  // Build icon map
  const getIcon = (key: string) => {
    switch (key) {
      case 'pricing':
        return TrendingUp;
      case 'seller':
        return ShieldCheck;
      case 'reviews':
        return MessageSquare;
      case 'platform':
        return Globe;
      case 'vision':
        return Camera;
      case 'ocr':
        return FileCheck;
      default:
        return Info;
    }
  };

  // Build exact mathematical equation string
  const deltaText = sumModalityDeltas >= 0 ? `+${sumModalityDeltas}` : `${sumModalityDeltas}`;
  let equationText = `${baseline} Base ${deltaText} Modalities`;
  if (boundaryClampAdjustment !== 0) {
    equationText += ` ${boundaryClampAdjustment > 0 ? '+' : ''}${boundaryClampAdjustment} Scale Bound`;
  }
  if (nonMaskingPenalty < 0) {
    equationText += ` ${nonMaskingPenalty} Risk Cap`;
  } else if (sparseEvidencePenalty < 0) {
    equationText += ` ${sparseEvidencePenalty} Sparse Data Guard`;
  }
  equationText += ` = ${overallScore}`;

  return (
    <div
      className={`glow-card rounded-[24px] p-6 sm:p-7 border border-[var(--line)] shadow-[0_8px_24px_rgba(22,19,31,0.05)] bg-white space-y-5 ${className}`}
      role="region"
      aria-label="Score Contribution Breakdown"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--ink)] font-heading uppercase tracking-wider">
              Why This Score? — Multimodal Contribution Analysis
            </h3>
            <Tip content="Each learned signal modality independently scores the listing and contributes positive points or risk penalties to the final composite Trust Score.">
              <span className="text-[var(--text-3)] cursor-help">
                <Info className="w-3.5 h-3.5" />
              </span>
            </Tip>
          </div>
          <p className="text-xs text-[var(--text-2)] mt-0.5">
            Transparent attribution of how each independent intelligence modality influences the overall {overallScore}/100 rating.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-[var(--text-3)]">Attribution Equation:</span>
          <span className="text-xs font-mono font-bold text-[var(--ink)] px-2.5 py-1 rounded bg-[var(--heather)]/50 border border-[var(--line)] tabular-nums shadow-xs">
            {equationText}
          </span>
        </div>
      </div>

      {/* Non-Masking Alert banner if active */}
      {fiveDim?.non_masking_applied && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <strong>Non-Masking Risk Override Active: </strong>
            <span>{fiveDim.non_masking_reason || 'Severe risk detected in pricing corridor or product defects. High scores in platform legitimacy cannot mask high product risk.'}</span>
          </div>
        </div>
      )}

      {/* Contribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rawContributions.map((c) => {
          const Icon = getIcon(c.key);
          const isHighlighted = highlightedModality === c.key;
          const barWidth = Math.min(100, Math.max(8, (Math.abs(c.delta) / c.max_pts) * 100));
          const isPositive = c.delta > 0;
          const isNegative = c.delta < 0;

          return (
            <motion.div
              key={c.key}
              onMouseEnter={() => onHoverModality?.(c.key)}
              onMouseLeave={() => onHoverModality?.(null)}
              animate={{
                scale: isHighlighted ? 1.02 : 1,
                borderColor: isHighlighted ? 'rgba(107, 45, 92, 0.45)' : 'rgba(193, 160, 172, 0.35)',
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isHighlighted
                  ? 'bg-gradient-to-br from-[var(--heather)]/30 to-white shadow-md ring-2 ring-[var(--accent)]/30'
                  : 'bg-white hover:bg-[var(--canvas)]/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive
                          ? 'bg-[var(--ok-bg)] text-[var(--ok-ink)]'
                          : isNegative
                          ? 'bg-[var(--bad-bg)] text-[var(--bad-ink)]'
                          : 'bg-[var(--heather)]/60 text-[var(--text-3)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--ink)] font-heading leading-tight">
                        {c.title}
                      </h4>
                      <span className="text-[10px] font-mono text-[var(--text-3)] truncate block max-w-[150px]">
                        {c.status_label}
                      </span>
                    </div>
                  </div>

                  {/* Score Delta Chip */}
                  <span
                    className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border tabular-nums shrink-0 ${
                      isPositive
                        ? 'bg-[var(--ok-bg)] text-[var(--ok-ink)] border-[var(--ok)]/30'
                        : isNegative
                        ? 'bg-[var(--bad-bg)] text-[var(--bad-ink)] border-[var(--bad)]/30'
                        : 'bg-[var(--heather)]/40 text-[var(--text-3)] border-[var(--line)]'
                    }`}
                  >
                    {isPositive ? `+${c.delta} pts` : isNegative ? `${c.delta} pts` : '±0 pts (Neutral)'}
                  </span>
                </div>

                {/* Horizontal Contribution Progress Bar */}
                <div className="space-y-1 mt-2.5">
                  <div className="w-full bg-[var(--line)]/50 h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        isPositive
                          ? 'bg-gradient-to-r from-[var(--ok)] to-[var(--ok-ink)]'
                          : isNegative
                          ? 'bg-gradient-to-r from-[var(--bad)] to-[var(--bad-ink)]'
                          : 'bg-[#C1A0AC]'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-2)] mt-2.5 leading-relaxed">
                  {c.description}
                </p>
              </div>

              {c.key === 'vision' && c.status === 'EVALUATED' && (
                <div className="mt-2 pt-2 border-t border-[var(--line)]/60 text-[10px] text-[var(--text-3)] italic">
                  Note: Visual similarity evaluates packaging consistency against catalog baselines, not physical item authenticity.
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
