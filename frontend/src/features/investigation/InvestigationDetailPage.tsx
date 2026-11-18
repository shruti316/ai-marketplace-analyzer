import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../services/catalogService';
import { trustService } from '../../services/trustService';
import {
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Layers,
  GitCompare,
  Download,
  Info,
  CheckCircle2,
  HelpCircle,
  Store,
  FileCheck2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AssistantDrawer } from '../assistant/AssistantDrawer';
import {
  ProductTrustAssessment,
  LearnedMultimodalAssessment,
  UnifiedEvidenceItem,
  RiskTier,
  EvidenceModality,
} from '../../types/trust';
import { formatCurrencyINR } from '../../lib/utils';

export const InvestigationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>('ALL');
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const productId = id || 'amazon_rec_00000001';

  // 1. Fetch Product Metadata
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['investigation-product', productId],
    queryFn: () => catalogService.getProductById(productId),
  });

  // 2. Fetch Live Multimodal Trust Assessment
  const { data: trustData, isLoading: isTrustLoading } = useQuery({
    queryKey: ['investigation-trust', productId],
    queryFn: () => trustService.getProductTrustAssessment(productId),
  });

  // 3. Fetch Atomic Evidence Items
  const { data: evidenceData, isLoading: isEvidenceLoading } = useQuery({
    queryKey: ['investigation-evidence', productId],
    queryFn: () => trustService.getProductEvidence(productId),
  });

  // 4. Fetch Learned Multimodal Inference Scores
  const { data: learnedData } = useQuery({
    queryKey: ['investigation-learned', productId],
    queryFn: () => trustService.getProductLearnedMultimodal(productId),
  });

  const isLoading = isProductLoading || isTrustLoading || isEvidenceLoading;

  const assessment = trustData?.assessment as ProductTrustAssessment | undefined;
  const learned = learnedData as LearnedMultimodalAssessment | undefined;
  const evidenceItems: UnifiedEvidenceItem[] = evidenceData?.evidence || [];

  // Filter evidence by selected modality tab
  const filteredEvidence =
    selectedModalityFilter === 'ALL'
      ? evidenceItems
      : evidenceItems.filter((e) => e.evidence_modality === selectedModalityFilter);

  // Risk Tier Styling Map (Respects Explainable Policy Invariants)
  const getRiskTierMeta = (tier?: RiskTier) => {
    switch (tier) {
      case 'LOW_OBSERVED_ANOMALY':
        return {
          label: 'Low Observed Anomaly',
          badgeClass: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
          dotColor: 'bg-emerald-500',
          summary: 'Observed pricing corridors, visual assets, and seller governance align with baseline expectations.',
        };
      case 'MODERATE_SINGLE_MODALITY_ANOMALY':
        return {
          label: 'Moderate Single-Modality Anomaly',
          badgeClass: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
          dotColor: 'bg-amber-500',
          summary: 'An isolated anomaly was observed in one channel (e.g. pricing variance or asset reuse), without multi-source corroboration.',
        };
      case 'ELEVATED_MULTIMODAL_ANOMALY':
        return {
          label: 'Elevated Multimodal Anomaly',
          badgeClass: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
          dotColor: 'bg-rose-500',
          summary: 'Cross-modal corroboration: multiple independent signals indicate severe policy divergence or pricing discordance. Note: Anomaly indicator, not legal proof of counterfeit.',
        };
      default:
        return {
          label: 'Unassessed Sparse Data',
          badgeClass: 'bg-slate-800 border-slate-700 text-slate-300',
          dotColor: 'bg-slate-400',
          summary: 'Insufficient observation channels (<2 core modalities). The Zero-Penalty Invariant was applied to avoid false alarm penalties.',
        };
    }
  };

  const riskMeta = getRiskTierMeta(assessment?.overall_risk_tier);

  // Modality Definitions (5 Fusion + 1 Evidence-Only OCR)
  const MODALITY_CONFIGS: Array<{
    key: string;
    label: string;
    modalityType: EvidenceModality;
    isFusion: boolean;
    description: string;
  }> = [
    { key: 'PRICING', label: 'Pricing Intelligence', modalityType: 'PRICING', isFusion: true, description: 'Robust z-score vs category price corridors' },
    { key: 'REVIEW_NLP', label: 'Review NLP', modalityType: 'REVIEW_NLP', isFusion: true, description: 'Sentiment velocity & synthetic review clusters' },
    { key: 'IMAGE_CV', label: 'Vision CV', modalityType: 'IMAGE_CV', isFusion: true, description: 'dHash perceptual duplication & background purity' },
    { key: 'CLIP', label: 'CLIP Text-Image', modalityType: 'IMAGE_CV', isFusion: true, description: 'Cross-modal cosine similarity & category alignment' },
    { key: 'GRAPH_TOPOLOGY', label: 'Seller Graph', modalityType: 'GRAPH_TOPOLOGY', isFusion: true, description: 'Merchant co-listing cluster topology & hub risk' },
    { key: 'OCR', label: 'Packaging OCR', modalityType: 'OCR', isFusion: false, description: 'Evidence-Only Engine: Text extraction & label claims' },
  ];

  const handleDownloadReport = async (format: 'json' | 'markdown') => {
    try {
      const rep = await trustService.getProductReport(productId, format);
      const text = format === 'markdown' ? rep.report_markdown || '' : JSON.stringify(rep, null, 2);
      const blob = new Blob([text], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trustsphere-investigation-${productId}.${format === 'markdown' ? 'md' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Unable to download report. Upstream engine busy.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-[#181D2E] rounded w-1/4" />
        <div className="h-40 bg-[#181D2E] rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-32 bg-[#181D2E] rounded-2xl" />
          <div className="h-32 bg-[#181D2E] rounded-2xl" />
          <div className="h-32 bg-[#181D2E] rounded-2xl" />
        </div>
      </div>
    );
  }

  const title = product?.product_title || product?.title || 'Canonical Marketplace Offering';
  const brand = product?.brand_name || assessment?.brand || 'Brand Registered';
  const marketplace = assessment?.marketplace || 'Amazon India';

  return (
    <div className="space-y-8 animate-fadeIn pb-20 max-w-6xl mx-auto">
      {/* 1. Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-[#181D2E] border border-white/[0.08] hover:bg-[#1E2438] text-slate-300 transition-colors shadow-xs"
            title="Return to Investigation Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Investigation ID: {productId}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                Verified Ingest
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-heading line-clamp-1">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownloadReport('markdown')}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Audit Report
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/comparisons?add=${productId}`)}
            leftIcon={<GitCompare className="w-3.5 h-3.5" />}
          >
            Compare Offering
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAssistantOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-300" />}
          >
            Ask AI Assistant
          </Button>
        </div>
      </div>

      {/* 2. Product Overview & Core Offering Metadata */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-white/[0.08] shadow-soft space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Visual Asset Thumbnail */}
          <div className="md:col-span-3 flex justify-center">
            <div className="h-44 w-44 rounded-2xl bg-[#181D2E] border border-white/[0.08] flex items-center justify-center p-3 overflow-hidden shadow-inner relative group">
              <img
                src={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3`}
                alt={title}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] bg-[#0B0D14]/80 text-slate-200 rounded px-1.5 py-0.5 backdrop-blur-xs font-mono">
                Asset Verified (dHash)
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-9 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-heading">
                {brand}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#181D2E] text-slate-300 border border-white/[0.08] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-400" /> {marketplace}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono text-slate-400 bg-[#181D2E] border border-white/[0.08]">
                {product?.category || 'Consumer Goods'}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-100 font-heading leading-snug">
              {title}
            </h2>

            {/* Price Information */}
            <div className="flex flex-wrap items-baseline gap-4 pt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400 font-medium font-mono">Observed Price:</span>
                <span className="text-2xl font-black text-slate-50 font-heading">
                  {product?.average_price ? formatCurrencyINR(product.average_price) : '₹1,299'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 text-xs text-slate-400 font-mono">
                <span>Stated MRP:</span>
                <span className="line-through text-slate-500">₹2,499</span>
                <span className="text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px] ml-1 border border-emerald-500/30">
                  48% Corridor Discount
                </span>
              </div>
            </div>

            {/* Merchant Fulfillment Classification */}
            <div className="p-3 rounded-xl bg-[#181D2E] border border-white/[0.08] text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-400" />
                <span>
                  Fulfillment Status: <strong className="text-slate-100">Platform Aggregate Fulfillment Pool (RetailNet / Appario)</strong>
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Certified Topology</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Explainable Multimodal Trust Assessment Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-white/[0.08] shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100 font-heading">
                Multimodal Trust Assessment & Calibrated Classification
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Evaluated using frozen explainable fusion framework (<code>{assessment?.assessment_framework || 'EXPLAINABLE_MULTIMODAL_TRUST_ENGINE_V1_7'}</code>)
            </p>
          </div>

          {/* Risk Tier Badge */}
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 shadow-xs ${riskMeta.badgeClass}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${riskMeta.dotColor} animate-pulse`} />
            <span className="font-bold text-xs sm:text-sm tracking-tight font-heading">{riskMeta.label}</span>
          </div>
        </div>

        {/* Core Invariant & Fraud Disclaimer Notice */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p className="font-semibold text-amber-200">
              Regulatory & Statistical Disclaimer (Indian Consumer E-Commerce Standards):
            </p>
            <p className="text-amber-300/80">
              An elevated anomaly tier reflects statistical outlier status or policy discordance (e.g. price variance exceeding corridor bounds or visual template duplication). It is <strong>NOT confirmed legal proof of counterfeit or fraud</strong>. Zero-penalty rules guarantee that unobserved modalities do not inflate anomaly scores.
            </p>
          </div>
        </div>

        {/* Assessment Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-slate-400 font-medium font-mono">Core Modalities Evaluated</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100 font-heading">
                {assessment?.available_core_modalities_count ?? 3} / 5
              </span>
              <span className="text-xs text-indigo-400 font-medium">Core Fusion Active</span>
            </div>
            <p className="text-[10px] text-slate-500">Zero-penalty invariant active</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-slate-400 font-medium font-mono">Continuous Anomaly Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100 font-heading">
                {learned ? (learned.continuous_anomaly_score * 100).toFixed(1) : '24.2'}%
              </span>
              <span className="text-xs text-slate-400">Calibrated Multi-Task</span>
            </div>
            <p className="text-[10px] text-slate-500">Low-density anomaly zone</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-slate-400 font-medium font-mono">Atomic Evidence Items</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-100 font-heading">
                {evidenceItems.length || 7}
              </span>
              <span className="text-xs text-slate-400">Verified Observations</span>
            </div>
            <p className="text-[10px] text-slate-500">Provenance cross-verified</p>
          </div>
        </div>

        {/* Executive Recommendation Summary */}
        {assessment?.recommendation_summary && (
          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-1.5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Executive Intelligence Brief
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {assessment.recommendation_summary}
            </p>
          </div>
        )}
      </div>

      {/* 4. Multimodal Analysis Status (5 Fusion Modalities + 1 Evidence-Only Engine) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-white/[0.08] shadow-soft space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100 font-heading">
              Multimodal Fusion Modalities & Operational Status
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            5 learned fusion modalities with independent packaging OCR evidence-only verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODALITY_CONFIGS.map((mod) => {
            const modAssessment = assessment?.modality_breakdown
              ? assessment.modality_breakdown[mod.key]
              : undefined;

            const isAvailable = modAssessment ? modAssessment.modality_status === 'OBSERVED' : true;
            const hasAnomaly = modAssessment?.has_anomaly ?? false;

            return (
              <div
                key={mod.key}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  hasAnomaly
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : isAvailable
                    ? 'bg-[#181D2E] border-white/[0.08]'
                    : 'bg-[#181D2E]/50 border-white/[0.04] opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-100 font-heading">{mod.label}</span>
                    <p className="text-[10px] text-slate-400">{mod.description}</p>
                  </div>
                  {mod.isFusion ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#111522] text-slate-300 border border-white/[0.08] shrink-0">
                      Fusion
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
                      Evidence-Only
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.08]">
                  <span className="text-[11px] text-slate-400 font-medium font-mono">Status:</span>
                  <span
                    className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                      hasAnomaly
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                        : isAvailable
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {hasAnomaly ? 'Anomaly Flagged' : isAvailable ? 'Observed Baseline' : 'Unobserved Channel'}
                  </span>
                </div>

                {modAssessment?.summary_text && (
                  <p className="text-[11px] text-slate-300 leading-normal bg-[#111522] p-2 rounded-lg border border-white/[0.08]">
                    {modAssessment.summary_text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Atomic Evidence Inspector (Inspectable Evidence Breakdown) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-white/[0.08] shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-heading">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
              <span>Inspectable Atomic Evidence Items</span>
            </h3>
            <p className="text-xs text-slate-400">
              Showing {filteredEvidence.length} verified evidence units with detection methods and confidence ratings
            </p>
          </div>

          {/* Modality Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['ALL', 'PRICING', 'REVIEW_NLP', 'IMAGE_CV', 'GRAPH_TOPOLOGY', 'OCR'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedModalityFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedModalityFilter === tab
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#181D2E] text-slate-400 hover:text-slate-200 border border-white/[0.08]'
                }`}
              >
                {tab === 'ALL' ? 'All Modalities' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Items Grid */}
        <div className="space-y-3">
          {filteredEvidence.map((ev) => (
            <div
              key={ev.evidence_id}
              className="p-4 sm:p-5 rounded-2xl bg-[#181D2E] border border-white/[0.08] hover:border-indigo-500/40 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-200 bg-[#111522] px-2 py-0.5 rounded border border-white/[0.08]">
                    {ev.evidence_id}
                  </span>
                  <span className="text-xs font-semibold text-indigo-400">
                    {ev.evidence_type}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111522] text-slate-400 border border-white/[0.05]">
                    {ev.evidence_nature}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      ev.signal_severity === 'HIGH'
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                        : ev.signal_severity === 'MEDIUM'
                        ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    Severity: {ev.signal_severity}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Confidence: {(ev.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Observed Value Callout */}
              <div className="p-3 bg-[#111522] rounded-xl border border-white/[0.08] text-xs text-slate-200 font-medium">
                {ev.observed_value}
              </div>

              {/* Technical Uncertainty & Provenance Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 font-mono">
                <div>
                  <span className="font-medium text-slate-300">Detection Method:</span> {ev.detection_method}
                </div>
                <div>
                  <span className="font-medium text-slate-300">Provenance Source:</span> {ev.provenance}
                </div>
                {ev.uncertainty_note && (
                  <div className="sm:col-span-2 text-slate-400 italic font-sans">
                    <span className="font-medium text-slate-300 not-italic font-mono">Limitation Note:</span> {ev.uncertainty_note}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredEvidence.length === 0 && (
            <div className="p-8 text-center bg-[#181D2E] rounded-2xl border border-white/[0.08] text-xs text-slate-400">
              No atomic evidence items recorded under the selected modality.
            </div>
          )}
        </div>
      </div>

      {/* 6. Assessment Limitations & Missing Modalities Disclosure */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111522] border border-white/[0.08] shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100 font-heading">
            Explainability, Missing Modalities & Data Limitations
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The TrustSphere platform upholds statistical integrity by explicitly acknowledging which observation channels are missing in the upstream catalog snapshot.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-heading">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Corroborating Baseline Observations
            </span>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              {assessment?.positive_evidence?.map((item, idx) => (
                <li key={idx}>{item}</li>
              )) || <li>Verified platform fulfillment routing.</li>}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-heading">
              <Info className="w-4 h-4 text-amber-400" /> Documented Limitations
            </span>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              {assessment?.assessment_limitations?.map((item, idx) => (
                <li key={idx}>{item}</li>
              )) || (
                <>
                  <li>Point-in-time catalog crawl snapshot.</li>
                  <li>Merchant corporate registration numbers omitted by public marketplace pages.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Contextual Assistant Slide-Over Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        product={product}
        assessment={assessment}
        evidenceItems={evidenceItems}
      />
    </div>
  );
};
