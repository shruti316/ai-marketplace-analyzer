import React, { useState } from 'react';
import {
  Package,
  Tag,
  IndianRupee,
  Store,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { investigateService, AdhocInferenceResult } from '../../services/investigateService';

export interface ProductDetailsFormData {
  title: string;
  brand: string;
  marketplace: string;
  observedPrice?: number;
  mrp?: number;
  category?: string;
  description?: string;
}

export interface ProductDetailsTabProps {
  onSubmitDetails?: (data: ProductDetailsFormData) => void;
  onSelectSampleProduct?: (productId: string) => void;
}

export const ProductDetailsTab: React.FC<ProductDetailsTabProps> = ({
  onSubmitDetails,
}) => {
  const [formData, setFormData] = useState<ProductDetailsFormData>({
    title: '',
    brand: '',
    marketplace: 'Amazon India',
    observedPrice: undefined,
    mrp: undefined,
    category: 'Electronics',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<AdhocInferenceResult | null>(null);

  // Real-time pricing anomaly heuristic
  const isPriceExceedingMrp =
    Boolean(formData.observedPrice && formData.mrp && formData.observedPrice > formData.mrp);
  const isExtremeDiscount =
    Boolean(
      formData.observedPrice &&
      formData.mrp &&
      formData.mrp > 0 &&
      (formData.mrp - formData.observedPrice) / formData.mrp > 0.85
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Product title is required';
    }
    if (!formData.brand.trim()) {
      newErrors.brand = 'Brand name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await investigateService.inferAdhoc({
        product_title: formData.title.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        observed_price_inr: formData.observedPrice,
        mrp_inr: formData.mrp,
      });
      setInferenceResult(result);

      if (onSubmitDetails) {
        onSubmitDetails(formData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to perform ad-hoc multimodal inference';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL_RISK':
      case 'HIGH_RISK':
      case 'ELEVATED_MULTIMODAL_ANOMALY':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          dot: 'bg-rose-500',
          label: tier.replace(/_/g, ' '),
        };
      case 'MODERATE_RISK':
      case 'MODERATE_SINGLE_MODALITY_ANOMALY':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          label: tier.replace(/_/g, ' '),
        };
      case 'LOW_RISK':
      case 'LOW_OBSERVED_ANOMALY':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          label: tier.replace(/_/g, ' '),
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-300 text-slate-700',
          dot: 'bg-slate-400',
          label: tier.replace(/_/g, ' ') || 'UNASSESSED SPARSE DATA',
        };
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Title */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Product Title <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <Package className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. boAt Rockerz 510 Wireless Bluetooth Headphone"
              className={`w-full bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl pl-10 pr-3 py-2.5 border ${
                errors.title ? 'border-red-400' : 'border-[#BAC7CA]'
              } focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] outline-none transition-all`}
            />
          </div>
          {errors.title && <p className="text-[11px] text-red-600">{errors.title}</p>}
        </div>

        {/* Brand & Marketplace Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0D1B2A]">
              Brand <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. boAt, Apple, Nike"
                className={`w-full bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl pl-10 pr-3 py-2.5 border ${
                  errors.brand ? 'border-red-400' : 'border-[#BAC7CA]'
                } focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] outline-none transition-all`}
              />
            </div>
            {errors.brand && <p className="text-[11px] text-red-600">{errors.brand}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0D1B2A]">
              Target Marketplace
            </label>
            <div className="relative flex items-center">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <select
                value={formData.marketplace}
                onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
                className="w-full bg-white text-xs sm:text-sm text-slate-800 rounded-xl pl-10 pr-3 py-2.5 border border-[#BAC7CA] focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] outline-none transition-all cursor-pointer"
              >
                <option value="Amazon India">Amazon India</option>
                <option value="Flipkart">Flipkart</option>
                <option value="Myntra">Myntra</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0D1B2A]">
              Observed Listing Price (INR ₹)
            </label>
            <div className="relative flex items-center">
              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.observedPrice ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observedPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 1499.00"
                className="w-full bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl pl-10 pr-3 py-2.5 border border-[#BAC7CA] focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#0D1B2A]">
              Manufacturer MRP (INR ₹)
            </label>
            <div className="relative flex items-center">
              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.mrp ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mrp: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 2990.00"
                className="w-full bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl pl-10 pr-3 py-2.5 border border-[#BAC7CA] focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Real-Time Anomaly Flag Previews */}
        {isPriceExceedingMrp && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Pricing Heuristic Flag: PRICE_EXCEEDS_MRP</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Observed price (₹{formData.observedPrice}) exceeds stated maximum retail price (₹{formData.mrp}), violating Indian Consumer Protection (E-Commerce) Rules.
              </p>
            </div>
          </div>
        )}

        {isExtremeDiscount && !isPriceExceedingMrp && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Corridor Anomaly Flag: EXTREME_DEEP_DISCOUNT</span>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Observed discount exceeds 85% below MRP, warranting cross-modal packaging & merchant verification.
              </p>
            </div>
          </div>
        )}

        {/* Category & Description */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Product Description / Specifications (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Include seller statements, claims, or warranty information for NLP review..."
            className="w-full bg-white text-xs text-slate-800 placeholder:text-slate-400 rounded-xl p-3 border border-[#BAC7CA] focus:border-[#3D7584] focus:ring-1 focus:ring-[#3D7584] outline-none transition-all resize-none"
          />
        </div>

        {submitError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSubmitting}
          className="w-full mt-2"
          rightIcon={
            isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )
          }
        >
          {isSubmitting ? 'Evaluating Across Multimodal Engines...' : 'Start Multimodal Investigation'}
        </Button>
      </form>

      {/* Live Ad-hoc Inference Result Display */}
      {inferenceResult && (
        <div className="p-5 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3D7584]" />
              <span className="text-sm font-bold text-[#0D1B2A]">Live Ad-Hoc Multimodal Assessment</span>
            </div>
            {(() => {
              const badge = getRiskBadge(inferenceResult.overall_risk_tier);
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#BAC7CA]/50">
              <span className="text-[11px] text-slate-500 block">Evaluated Modalities</span>
              <span className="text-sm font-bold text-[#3D7584]">
                {inferenceResult.available_modalities_count} / 5 Available
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#BAC7CA]/50">
              <span className="text-[11px] text-slate-500 block">Zero-Penalty Invariant</span>
              <span className="text-sm font-bold text-emerald-700">
                {inferenceResult.zero_penalty_invariant_applied ? 'Active (Protected)' : 'Standard'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#BAC7CA]/50 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-500 block">Marketplace Target</span>
              <span className="text-sm font-bold text-slate-800">
                {formData.marketplace}
              </span>
            </div>
          </div>

          {/* Active Anomaly Flags */}
          {inferenceResult.flags && inferenceResult.flags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Active Signals & Corroborated Flags:</span>
              <div className="flex flex-wrap gap-1.5">
                {inferenceResult.flags.map((flag: string) => (
                  <span
                    key={flag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sparsity note */}
          {inferenceResult.zero_penalty_invariant_applied && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Zero-penalty invariant applied: Newly submitted listing with sparse channels ({inferenceResult.available_modalities_count}/5 modalities) is safeguarded from counterfeit penalty prejudice.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Zero Penalty Invariant Notice */}
      <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#DCE5E7] text-xs text-[#0D1B2A] space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#3D7584]">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero-Penalty Modeling Invariant</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          If certain modalities (such as reviews or packaging photos) are unobserved for a new submission,
          the engine classifies the product under honest sparse data rules (<code>UNASSESSED_SPARSE_DATA</code>) rather than penalizing missing data as negative anomaly evidence.
        </p>
      </div>
    </div>
  );
};
