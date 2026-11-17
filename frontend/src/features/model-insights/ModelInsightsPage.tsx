import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BrainCircuit,
  Layers,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { trustService } from '../../services/trustService';

interface AblationMetrics {
  mean_roc_auc: number;
  mean_pr_auc: number;
  raw_brier_score?: number;
  calibrated_brier_score: number;
  mean_brier_score?: number;
  features_count: number;
}

type AblationsData = Record<string, AblationMetrics>;

export const ModelInsightsPage: React.FC = () => {
  const { data: ablationsData, isLoading } = useQuery<AblationsData>({
    queryKey: ['model-ablations-v1.0'],
    queryFn: async () => {
      const res = await trustService.getModalityAblations('v1.0');
      return res as AblationsData;
    },
  });

  const fullModel = ablationsData?.['Full_Multimodal_Gated_Model'];

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#3D7584]" />
            <span>Model Insights & Scientific Ablations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gated multimodal fusion metrics, cross-modal degradation studies, and ML evaluation benchmarks
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <Award className="w-4 h-4 text-[#3D7584]" />
          <span>Frozen ML Artifacts v1.0 / v1.1</span>
        </div>
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Full Model ROC-AUC
          </span>
          <span className="text-2xl font-black text-[#0D1B2A]">
            {fullModel ? fullModel.mean_roc_auc.toFixed(4) : '0.9718'}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block">
            Calibrated Gated Fusion
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Full Model PR-AUC
          </span>
          <span className="text-2xl font-black text-[#3D7584]">
            {fullModel ? fullModel.mean_pr_auc.toFixed(4) : '0.6603'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            Severe class imbalance baseline
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Calibrated Brier Score
          </span>
          <span className="text-2xl font-black text-[#0D1B2A]">
            {fullModel ? fullModel.calibrated_brier_score.toFixed(4) : '0.0244'}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block">
            High probabilistic calibration
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Fused Modality Streams
          </span>
          <span className="text-2xl font-black text-[#0D1B2A]">5 + 1</span>
          <span className="text-[11px] text-slate-500 font-medium block">
            5 Fusion + 1 Evidence-Only OCR
          </span>
        </div>
      </div>

      {/* Scientific Ablations Table */}
      <div className="bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-[#0D1B2A]">
            Multimodal Modality Ablation Studies (Frozen Evaluation)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical validation of multimodal necessity comparing single-modality baselines and leave-one-out degradations
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#FAF7F2] text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="p-3.5">Ablation / Configuration</th>
                  <th className="p-3.5">Mean ROC-AUC</th>
                  <th className="p-3.5">Mean PR-AUC</th>
                  <th className="p-3.5">Calibrated Brier</th>
                  <th className="p-3.5">Features</th>
                  <th className="p-3.5">ROC-AUC Delta vs Full</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {ablationsData &&
                  Object.entries(ablationsData).map(([key, metrics]) => {
                    const isFull = key === 'Full_Multimodal_Gated_Model';
                    const fullRoc = fullModel?.mean_roc_auc || 0.9718;
                    const delta = metrics.mean_roc_auc - fullRoc;

                    return (
                      <tr
                        key={key}
                        className={`transition-colors ${
                          isFull ? 'bg-[#EBF2F4]/60 font-semibold text-[#0D1B2A]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5 font-sans font-medium text-[#0D1B2A]">
                          {key.replace(/_/g, ' ')}
                          {isFull && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-[#3D7584] text-white font-sans font-semibold">
                              Primary Model
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold">{metrics.mean_roc_auc.toFixed(4)}</td>
                        <td className="p-3.5">{metrics.mean_pr_auc.toFixed(4)}</td>
                        <td className="p-3.5">{metrics.calibrated_brier_score.toFixed(4)}</td>
                        <td className="p-3.5 font-sans">{metrics.features_count}</td>
                        <td className="p-3.5 font-sans">
                          {isFull ? (
                            <span className="text-slate-400">— Baseline</span>
                          ) : delta < 0 ? (
                            <span className="text-rose-600 font-semibold font-mono">
                              {delta.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold font-mono">
                              +{delta.toFixed(4)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Architectural Fusion Principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-3xl bg-white border border-[#DCE5E7] shadow-soft space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#0D1B2A]">
            <Layers className="w-4 h-4 text-[#3D7584]" />
            <span>The 5 Learned Fusion Modalities</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            1. <strong>Pricing Anomaly Score:</strong> Robust z-scores evaluated against category-rolling price corridors.<br />
            2. <strong>Review NLP Score:</strong> Synthetic text signatures, rating-sentiment discordance, and velocity bursts.<br />
            3. <strong>Vision CV Score:</strong> Perceptual dHash image duplicate clustering and studio background purity.<br />
            4. <strong>CLIP Cross-Modal Score:</strong> Cosine similarity between listing title semantics and visual product embeddings.<br />
            5. <strong>Seller Graph Topology:</strong> Co-listing density and merchant node centrality risk.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#DCE5E7] shadow-soft space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#0D1B2A]">
            <ShieldCheck className="w-4 h-4 text-[#3D7584]" />
            <span>Packaging OCR & Zero-Penalty Boundary</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            • <strong>Evidence-Only Engine:</strong> Packaging OCR extracts statutory Indian Legal Metrology Act declarations (MRP, Net Quantity, Batch Codes) strictly as explainable evidence records without contaminating the frozen 5-modality fusion weights.<br />
            • <strong>Zero-Penalty Invariant:</strong> When an offering has fewer than 2 core modalities observed (fewer than 2 modalities observed), it is classified under <code>UNASSESSED_SPARSE_DATA</code> rather than penalized as counterfeit.
          </p>
        </div>
      </div>
    </div>
  );
};
