import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Globe,
  FileText,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
} from 'lucide-react';
import { ImageUploadTab } from './ImageUploadTab';
import { MarketplaceUrlTab } from './MarketplaceUrlTab';
import { ProductDetailsTab, ProductDetailsFormData } from './ProductDetailsTab';
import { CatalogInvestigationLauncher } from './CatalogInvestigationLauncher';

export type InputMode = 'image' | 'url' | 'details';

export const InvestigationWorkspacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InputMode>('details');
  const navigate = useNavigate();

  const handleStartInvestigation = (data: ProductDetailsFormData) => {
    // If the user submits manual product details, we direct to an ad-hoc investigation view or sample
    navigate(`/investigate/adhoc-submission?title=${encodeURIComponent(data.title)}&brand=${encodeURIComponent(data.brand)}&marketplace=${encodeURIComponent(data.marketplace)}&price=${data.observedPrice || ''}&mrp=${data.mrp || ''}`);
  };

  const handleStartImageUrl = (url: string, platform: string, detectedId?: string) => {
    if (detectedId) {
      // If an ASIN or FSN was extracted, search or launch investigation directly
      navigate(`/investigate/${detectedId}`);
    } else {
      navigate(`/investigate/url-inquiry?platform=${encodeURIComponent(platform)}&url=${encodeURIComponent(url)}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* 1. Investigation Workspace Hero */}
      <div className="relative rounded-3xl bg-[#0D1B2A] text-white p-6 sm:p-10 border border-slate-800 shadow-soft-lg overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#3D7584]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#89BBBE]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#89BBBE] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multimodal Trust Intelligence Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#FAF7F2] leading-tight">
            Start a New Product Investigation
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Investigate authenticity signals, pricing anomalies, visual asset reuse, and merchant network topology
            across Amazon India, Flipkart, and Myntra using explainable multimodal evidence.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#89BBBE]" /> 5 Learned Fusion Modalities
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#89BBBE]" /> 3,643 Verified Catalog Baselines
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#89BBBE]" /> Zero-Penalty Invariant Active
            </span>
          </div>
        </div>
      </div>

      {/* 2. Investigation Input Card */}
      <div className="bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-6 sm:p-8 space-y-6">
        {/* Segmented Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-[#0D1B2A]">Investigation Intake Method</h2>
            <p className="text-xs text-slate-500">Choose how to submit product offering for cross-marketplace verification</p>
          </div>

          <div className="flex items-center p-1 bg-[#FAF7F2] rounded-2xl border border-[#BAC7CA] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'details'
                  ? 'bg-white text-[#0D1B2A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Product Details</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'image'
                  ? 'bg-white text-[#0D1B2A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>

            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'url'
                  ? 'bg-white text-[#0D1B2A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Marketplace URL</span>
            </button>
          </div>
        </div>

        {/* Tab View Execution */}
        {activeTab === 'details' && (
          <ProductDetailsTab onSubmitDetails={handleStartInvestigation} />
        )}
        {activeTab === 'image' && (
          <ImageUploadTab
            onStartInvestigation={(file) => {
              navigate(`/investigate/sample-visual-investigation?filename=${encodeURIComponent(file.name)}`);
            }}
          />
        )}
        {activeTab === 'url' && (
          <MarketplaceUrlTab onInvestigateUrl={handleStartImageUrl} />
        )}
      </div>

      {/* 3. Catalog Investigation Quick-Launcher */}
      <CatalogInvestigationLauncher />
    </div>
  );
};
