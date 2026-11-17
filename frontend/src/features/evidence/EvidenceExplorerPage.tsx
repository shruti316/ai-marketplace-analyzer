import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SearchCode,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { trustService } from '../../services/trustService';
import { catalogService } from '../../services/catalogService';
import { UnifiedEvidenceItem } from '../../types/trust';
import { Button } from '../../components/ui/Button';

export const EvidenceExplorerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialProductId = searchParams.get('product') || 'myntra_8987003_L';
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [selectedModality, setSelectedModality] = useState<string>('ALL');

  // Fetch sample products for selection
  const { data: catalogProducts } = useQuery({
    queryKey: ['evidence-catalog-selector'],
    queryFn: () => catalogService.getProducts({ limit: 6 }),
  });

  // Fetch product metadata
  const { data: activeProduct } = useQuery({
    queryKey: ['evidence-product-meta', selectedProductId],
    queryFn: () => catalogService.getProductById(selectedProductId),
    enabled: Boolean(selectedProductId),
  });

  // Fetch atomic evidence items
  const { data: evidenceData, isLoading: isEvidenceLoading } = useQuery({
    queryKey: ['evidence-items', selectedProductId],
    queryFn: () => trustService.getProductEvidence(selectedProductId),
    enabled: Boolean(selectedProductId),
  });

  const evidenceItems: UnifiedEvidenceItem[] = evidenceData?.evidence || [];

  const filteredEvidence =
    selectedModality === 'ALL'
      ? evidenceItems
      : evidenceItems.filter((e) => e.evidence_modality === selectedModality);

  const getSeverityBadge = (sev: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (sev) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const MODALITIES: Array<{ key: string; label: string; count?: number }> = [
    { key: 'ALL', label: 'All Modalities' },
    { key: 'PRICING', label: 'Pricing Intelligence' },
    { key: 'REVIEW_NLP', label: 'Review NLP' },
    { key: 'IMAGE_CV', label: 'Vision CV' },
    { key: 'GRAPH_TOPOLOGY', label: 'Seller Graph' },
    { key: 'PACKAGING_OCR', label: 'Packaging OCR (Evidence-Only)' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <SearchCode className="w-5 h-5 text-[#3D7584]" />
            <span>Forensic Evidence Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atomic evidence records, signal detection provenance, and explainable multimodal audit trails
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Atomic Evidence Active</span>
        </div>
      </div>

      {/* Product Anchor Bar */}
      <div className="bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Target Product
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#3D7584] bg-[#EBF2F4] px-2 py-0.5 rounded">
                {selectedProductId}
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#0D1B2A] truncate max-w-md">
                {activeProduct?.product_title || activeProduct?.title || 'Selected Offering'}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/investigate/${selectedProductId}`)}
            rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Open Full Investigation Detail
          </Button>
        </div>

        {/* Quick Context Switcher Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 shrink-0 font-medium">Quick switch:</span>
          {catalogProducts?.items.map((prod) => (
            <button
              key={prod.canonical_product_id}
              onClick={() => setSelectedProductId(prod.canonical_product_id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-all border ${
                selectedProductId === prod.canonical_product_id
                  ? 'bg-[#0D1B2A] text-white border-transparent'
                  : 'bg-[#FAF7F2] text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              {prod.canonical_product_id}
            </button>
          ))}
        </div>
      </div>

      {/* Modality Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {MODALITIES.map((mod) => (
          <button
            key={mod.key}
            onClick={() => setSelectedModality(mod.key)}
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${
              selectedModality === mod.key
                ? 'bg-[#3D7584] text-white border-transparent shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-[#BAC7CA]'
            }`}
          >
            {mod.label}
          </button>
        ))}
      </div>

      {/* Evidence Items Grid */}
      {isEvidenceLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-[#BAC7CA] space-y-2">
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-[#0D1B2A]">No Evidence Recorded in this Modality</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            This offering has no active atomic signals in the "{selectedModality}" channel. Under our Zero-Penalty Modeling Invariant, unobserved channels are excluded rather than scored as anomaly points.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((ev) => (
            <div
              key={ev.evidence_id}
              className="p-5 rounded-2xl bg-white border border-[#DCE5E7] hover:border-[#3D7584] shadow-soft transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#3D7584] bg-[#EBF2F4] px-2 py-0.5 rounded">
                    {ev.evidence_id}
                  </span>
                  <span className="font-semibold text-xs text-[#0D1B2A]">{ev.detection_method.replace(/_/g, ' ')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getSeverityBadge(ev.signal_severity)}`}>
                    Severity: {ev.signal_severity}
                  </span>
                  {ev.signal_severity === 'HIGH' || ev.signal_severity === 'MEDIUM' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Anomaly Signal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Baseline Aligned
                    </span>
                  )}
                </div>
              </div>

              {/* Observed Value & Claim */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-[#0D1B2A]">{ev.observed_value}</p>
                {ev.evidence_type && (
                  <p className="text-[11px] font-mono text-slate-500">
                    Evidence Type: <span className="text-slate-800">{ev.evidence_type}</span>
                  </p>
                )}
              </div>

              {/* Uncertainty Note & Legal Metadata */}
              {ev.uncertainty_note && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">{ev.uncertainty_note}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zero Penalty Invariant Notice */}
      <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#DCE5E7] text-xs text-[#0D1B2A] space-y-1">
        <div className="flex items-center gap-2 font-semibold text-[#3D7584]">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero-Penalty Modeling Invariant & OCR Boundary</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Packaging OCR extractions (MRP, Net Quantity, Batch Codes) operate strictly as an independent evidence-only engine under the Indian Legal Metrology Act, 2009. They do not alter the frozen 5-modality fusion weights.
        </p>
      </div>
    </div>
  );
};
