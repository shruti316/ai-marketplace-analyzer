import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  FileText,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
  Camera,
  Info,
} from 'lucide-react';
import { ImageUploadTab } from './ImageUploadTab';
import { MarketplaceUrlTab } from './MarketplaceUrlTab';
import { ProductDetailsTab, ProductDetailsFormData } from './ProductDetailsTab';

export type InputMode = 'url' | 'image' | 'details';

export const InvestigationWorkspacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InputMode>('url');
  const navigate = useNavigate();

  const handleStartInvestigation = (data: ProductDetailsFormData) => {
    navigate(
      `/investigate/adhoc-submission?title=${encodeURIComponent(data.title)}&brand=${encodeURIComponent(
        data.brand
      )}&marketplace=${encodeURIComponent(data.marketplace)}&price=${data.observedPrice || ''}&mrp=${data.mrp || ''}`
    );
  };

  const handleStartImageUrl = (url: string, platform: string, detectedId?: string) => {
    if (detectedId) {
      navigate(`/investigate/${detectedId}`);
    } else {
      navigate(`/investigate/url-inquiry?platform=${encodeURIComponent(platform)}&url=${encodeURIComponent(url)}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* =========================================================================
          1. HERO SECTION: Multimodal Trust Intelligence Scanner
         ========================================================================= */}
      <div className="relative rounded-3xl bg-[#111522] text-white p-6 sm:p-10 border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Soft elegant ambient lighting */}
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multimodal Trust Intelligence Engine</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Start a New Product Investigation
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-slate-400 leading-relaxed font-normal">
            Investigate authenticity signals, pricing anomalies, visual packaging consistency, and merchant governance
            across Amazon India, Flipkart, and Myntra using explainable multimodal evidence.
          </p>

          {/* Platform Invariants Footer */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" /> 5 Learned Signal Modalities
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" /> Multi-Marketplace Surveillance
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Zero-Penalty Guarantee Active
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. INTERACTIVE PRODUCT INSPECTION INTAKE
         ========================================================================= */}
      <div id="inspection-intake-card" className="bg-[#111522] rounded-3xl border border-white/[0.08] shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-heading text-lg font-bold text-white">Investigation Intake Method</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose how to submit product offering for cross-marketplace verification
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-[#181D2E] rounded-xl border border-white/[0.08] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'url'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Marketplace URL</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'image'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Packaging Image</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'details'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manual Details</span>
            </button>
          </div>
        </div>

        {/* Tab View Execution */}
        {activeTab === 'url' && (
          <MarketplaceUrlTab onInvestigateUrl={handleStartImageUrl} />
        )}
        {activeTab === 'image' && (
          <ImageUploadTab
            onStartInvestigation={(file) => {
              navigate(`/investigate/sample-visual-investigation?filename=${encodeURIComponent(file.name)}`);
            }}
          />
        )}
        {activeTab === 'details' && (
          <ProductDetailsTab onSubmitDetails={handleStartInvestigation} />
        )}
      </div>

      {/* =========================================================================
          3. HOW TRUSTSPHERE WORKS (EXPLAINABLE INTELLIGENCE PILLARS)
         ========================================================================= */}
      <div className="rounded-3xl bg-[#111522] border border-white/[0.08] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-white">How TrustSphere Evaluates Listings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Empirical multimodal signals corroborating product authenticity and listing trustworthiness
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2 hover:border-slate-700 transition-colors">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs font-mono">
              01
            </div>
            <h3 className="font-heading text-xs font-bold text-white">Price Corridors</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Detects extreme discounts, artificial MRP markups, and seller price volatility against historical category baselines.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2 hover:border-slate-700 transition-colors">
            <div className="h-8 w-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs font-mono">
              02
            </div>
            <h3 className="font-heading text-xs font-bold text-white">Review Authenticity</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Analyzes review velocity bursts, sentiment divergence, and synthetic review repetition patterns.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2 hover:border-slate-700 transition-colors">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
              03
            </div>
            <h3 className="font-heading text-xs font-bold text-white">Seller Governance</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Distinguishes verified brand-authorized merchants from unverified third-party merchant pools.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181D2E] border border-white/[0.08] space-y-2 hover:border-slate-700 transition-colors">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs font-mono">
              04
            </div>
            <h3 className="font-heading text-xs font-bold text-white">Packaging OCR</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Extracts statutory packaging text, batch identifiers, and legal metrology declarations via optical character recognition.
            </p>
          </div>
        </div>

        {/* Policy & Neutrality Note */}
        <div className="p-4 rounded-2xl bg-[#0D101A] border border-white/[0.08] flex items-start gap-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Fair Disclosure:</strong> TrustSphere identifies empirical listing signals and risk patterns
            based on available evidence. It does not legally certify physical counterfeit goods. The <span className="text-indigo-400">Zero-Penalty Invariant</span> ensures missing observation channels never artificially inflate anomaly scores.
          </p>
        </div>
      </div>
    </div>
  );
};
