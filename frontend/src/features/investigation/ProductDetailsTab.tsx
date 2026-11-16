import React, { useState } from 'react';
import { Package, Tag, IndianRupee, Store, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

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

  const handleSubmit = (e: React.FormEvent) => {
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
    if (onSubmitDetails) {
      onSubmitDetails(formData);
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

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Start Multimodal Investigation
        </Button>
      </form>

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
