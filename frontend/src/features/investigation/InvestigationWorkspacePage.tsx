import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  FileText,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
  ShoppingBag,
  ArrowRight,
  Camera,
  Info,
} from 'lucide-react';
import { ImageUploadTab } from './ImageUploadTab';
import { MarketplaceUrlTab } from './MarketplaceUrlTab';
import { ProductDetailsTab, ProductDetailsFormData } from './ProductDetailsTab';
import { CatalogInvestigationLauncher } from './CatalogInvestigationLauncher';
import { BuyingAdvisorSection } from '../advisor/BuyingAdvisorSection';

export type InputMode = 'url' | 'image' | 'details';

export const InvestigationWorkspacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InputMode>('url');
  const [activeHeroAction, setActiveHeroAction] = useState<'check' | 'advisor'>('check');
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
    <div className="space-y-10 animate-fadeIn pb-20 max-w-6xl mx-auto">
      {/* =========================================================================
          1. CONSUMER HERO SECTION
         ========================================================================= */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#100D20] via-[#171329] to-[#080713] text-white p-6 sm:p-10 lg:p-12 border border-purple-900/40 shadow-2xl overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[#C6B5FF] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#9875F5]" />
            <span>AI Shopping Intelligence & Protection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Shop smarter. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9875F5] via-[#6D7CFF] to-[#C6B5FF]">
              Buy with confidence.
            </span>
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-[#A39CB8] leading-relaxed max-w-2xl font-normal">
            TrustSphere analyzes marketplace listing anomalies, suspicious review velocity, and seller governance
            across Amazon India, Flipkart, and Myntra — helping you spot concerning signals and make informed buying decisions.
          </p>

          {/* DUAL PROMINENT ACTION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Action 1: Check a Product */}
            <div
              onClick={() => {
                setActiveHeroAction('check');
                const el = document.getElementById('inspection-intake-card');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                activeHeroAction === 'check'
                  ? 'bg-gradient-to-br from-purple-950/60 to-[#171329] border-[#9875F5]/60 shadow-lg shadow-purple-500/10'
                  : 'bg-[#100D20]/80 border-purple-900/30 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-[#C6B5FF] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#9875F5]" />
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#C6B5FF] bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                  Trust Audit
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Check a Product</h3>
                <p className="text-xs text-[#A39CB8] mt-1">
                  Paste a marketplace URL or upload packaging photos to detect price and review anomalies.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C6B5FF]">
                <span>Analyze Listing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Action 2: Help Me Choose */}
            <div
              onClick={() => {
                setActiveHeroAction('advisor');
                const el = document.getElementById('buying-advisor-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                activeHeroAction === 'advisor'
                  ? 'bg-gradient-to-br from-indigo-950/60 to-[#171329] border-[#6D7CFF]/60 shadow-lg shadow-indigo-500/10'
                  : 'bg-[#100D20]/80 border-purple-900/30 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-[#C6B5FF] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#6D7CFF]" />
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#C6B5FF] bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  Advisor
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Help Me Choose</h3>
                <p className="text-xs text-[#A39CB8] mt-1">
                  Specify budget and preferences. Receive transparent recommendations with trade-offs.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C6B5FF]">
                <span>Explore Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Platform Invariants Footer */}
          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-[#A39CB8]">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#9875F5]" /> 5 Learned Signal Modalities
            </span>
            <span className="text-purple-800">•</span>
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#9875F5]" /> 3,643 Verified Catalog Baselines
            </span>
            <span className="text-purple-800">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#9875F5]" /> Zero-Penalty Guarantee
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. INTERACTIVE PRODUCT INSPECTION INTAKE
         ========================================================================= */}
      <div id="inspection-intake-card" className="bg-[#100D20] rounded-3xl border border-purple-900/40 shadow-soft p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/30">
          <div>
            <h2 className="text-lg font-bold text-white">Product Trust Inspection Intake</h2>
            <p className="text-xs text-[#A39CB8]">
              Choose how to examine product listing trustworthiness across Indian retail marketplaces
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-[#171329] rounded-2xl border border-purple-900/40 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'url'
                  ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-xs'
                  : 'text-[#A39CB8] hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Marketplace URL</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'image'
                  ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-xs'
                  : 'text-[#A39CB8] hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Packaging Image</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'details'
                  ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-xs'
                  : 'text-[#A39CB8] hover:text-white'
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
          3. AI BUYING ADVISOR SECTION
         ========================================================================= */}
      <div id="buying-advisor-section">
        <BuyingAdvisorSection />
      </div>

      {/* =========================================================================
          4. HOW TRUSTSPHERE WORKS (EXPLAINABLE INTELLIGENCE PILLARS)
         ========================================================================= */}
      <div className="rounded-3xl bg-[#100D20] border border-purple-900/40 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">How TrustSphere Evaluates Listings</h2>
          <p className="text-xs text-[#A39CB8] mt-1">
            Empirical multimodal signals corroborating product authenticity and listing trustworthiness
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#171329] border border-purple-900/30 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-purple-500/15 text-[#9875F5] flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h3 className="text-xs font-bold text-white">Price Corridors</h3>
            <p className="text-[11px] text-[#A39CB8] leading-relaxed">
              Detects extreme discounts, artificial MRP markups, and seller price volatility against historical category baselines.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#171329] border border-purple-900/30 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/15 text-[#6D7CFF] flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h3 className="text-xs font-bold text-white">Review Authenticity</h3>
            <p className="text-[11px] text-[#A39CB8] leading-relaxed">
              Analyzes review velocity bursts, sentiment divergence, and synthetic review repetition patterns.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#171329] border border-purple-900/30 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h3 className="text-xs font-bold text-white">Seller Governance</h3>
            <p className="text-[11px] text-[#A39CB8] leading-relaxed">
              Distinguishes verified brand-authorized merchants from unverified third-party merchant pools.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#171329] border border-purple-900/30 space-y-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs">
              04
            </div>
            <h3 className="text-xs font-bold text-white">Packaging OCR</h3>
            <p className="text-[11px] text-[#A39CB8] leading-relaxed">
              Extracts statutory packaging text, batch identifiers, and legal metrology declarations via optical character recognition.
            </p>
          </div>
        </div>

        {/* Policy & Neutrality Note */}
        <div className="p-4 rounded-2xl bg-[#080713]/80 border border-purple-900/30 flex items-start gap-3 text-xs text-[#A39CB8]">
          <Info className="w-4 h-4 text-[#9875F5] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Fair Disclosure:</strong> TrustSphere identifies empirical listing signals and risk patterns
            based on available evidence. It does not legally certify physical counterfeit goods. The <span className="text-[#C6B5FF]">Zero-Penalty Invariant</span> ensures missing observation channels never artificially inflate anomaly scores.
          </p>
        </div>
      </div>

      {/* =========================================================================
          5. CATALOG INVESTIGATION QUICK-LAUNCHER
         ========================================================================= */}
      <CatalogInvestigationLauncher />
    </div>
  );
};
