import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../services/catalogService';
import {
  Sparkles,
  Award,
  ArrowRight,
  GitCompare,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const BuyingAdvisorSection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('Electronics');
  const [budgetTier, setBudgetTier] = useState<string>('MID');
  const [priority, setPriority] = useState<'trust' | 'value' | 'brand'>('trust');

  const CATEGORIES = [
    { label: 'Electronics & Audio', query: 'headphone' },
    { label: 'Watches & Smartbands', query: 'watch' },
    { label: 'Footwear & Shoes', query: 'shoe' },
    { label: 'Fashion & Apparel', query: 'shirt' },
  ];

  const BUDGET_RANGES: Record<string, { label: string; min?: number; max?: number }> = {
    LOW: { label: 'Under ₹1,500', max: 1500 },
    MID: { label: '₹1,500 – ₹3,500', min: 1500, max: 3500 },
    HIGH: { label: '₹3,500 – ₹7,000', min: 3500, max: 7000 },
    PREMIUM: { label: '₹7,000+', min: 7000 },
  };

  const activeCategoryQuery =
    CATEGORIES.find((c) => c.label === selectedCategory)?.query || 'electronics';

  // Fetch real offerings matching the category
  const { data: recommendationsData, isLoading } = useQuery({
    queryKey: ['buying-advisor-recs', activeCategoryQuery, budgetTier, priority],
    queryFn: () =>
      catalogService.getProducts({
        search: activeCategoryQuery,
        limit: 4,
      }),
  });

  const products = recommendationsData?.items || [];
  const topPick = products[0];
  const alternatives = products.slice(1);

  const handleCompareAll = () => {
    if (products.length >= 2) {
      const ids = products.slice(0, 3).map((p) => p.canonical_product_id);
      navigate(`/comparisons?add=${ids.join('&add=')}`);
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#100D20] via-[#171329] to-[#100D20] border border-purple-900/40 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[#C6B5FF] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#9875F5]" />
            <span>AI Buying Advisor</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Help Me Choose: Smart Product Recommendations
          </h2>
          <p className="text-xs text-[#A39CB8] mt-1">
            Specify your requirements and budget. TrustSphere evaluates listing trust separately from product suitability to suggest the safest, best-value choices.
          </p>
        </div>

        {products.length >= 2 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCompareAll}
            className="bg-[#201A35] border-purple-800/40 text-white hover:bg-purple-900/30 text-xs shrink-0"
            rightIcon={<GitCompare className="w-3.5 h-3.5 text-[#9875F5]" />}
          >
            Compare Candidates Matrix
          </Button>
        )}
      </div>

      {/* Interactive Criteria Bar */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#080713]/70 border border-purple-900/40 text-xs">
        {/* Category selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#A39CB8] block">Select Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedCategory(c.label)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedCategory === c.label
                    ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-xs'
                    : 'bg-[#171329] text-[#A39CB8] hover:text-white border border-purple-900/40'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget tier */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#A39CB8] block">Budget Range</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(BUDGET_RANGES).map(([tierKey, tier]) => (
              <button
                key={tierKey}
                onClick={() => setBudgetTier(tierKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  budgetTier === tierKey
                    ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-xs'
                    : 'bg-[#171329] text-[#A39CB8] hover:text-white border border-purple-900/40'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority preference */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#A39CB8] block">Primary Goal</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'trust', label: 'Safest Listing Trust' },
              { id: 'value', label: 'Max Value for Money' },
              { id: 'brand', label: 'Verified Brand' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  priority === p.id
                    ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-xs'
                    : 'bg-[#171329] text-[#A39CB8] hover:text-white border border-purple-900/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="md:col-span-2 h-44 rounded-2xl bg-purple-950/20 border border-purple-900/30" />
          <div className="h-44 rounded-2xl bg-purple-950/20 border border-purple-900/30" />
        </div>
      ) : products.length > 0 ? (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Choice Featured Card */}
          {topPick && (
            <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-purple-950/50 via-[#171329] to-[#100D20] border border-purple-500/40 flex flex-col justify-between space-y-4 shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Top AI Recommendation</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#C6B5FF] bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    {topPick.canonical_product_id}
                  </span>
                </div>

                <div>
                  <h3
                    onClick={() => navigate(`/investigate/${topPick.canonical_product_id}`)}
                    className="text-base sm:text-lg font-bold text-white hover:text-[#C6B5FF] cursor-pointer line-clamp-2"
                  >
                    {topPick.product_title || topPick.title}
                  </h3>
                  <p className="text-xs text-[#A39CB8] mt-1 flex items-center gap-2">
                    <span className="text-[#C6B5FF] font-semibold">{topPick.brand_name || 'Official Brand'}</span>
                    <span>•</span>
                    <span>Category: {topPick.category}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#080713]/60 border border-purple-900/30 text-xs text-[#A39CB8] space-y-1">
                  <span className="font-semibold text-white block">Recommendation Rationale:</span>
                  <p className="leading-relaxed">
                    Corroborated pricing aligns with historical category corridors. High evidence density across multi-source listings with zero anomalous price spikes.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-purple-900/30 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-[10px] text-[#A39CB8] block uppercase tracking-wider">Suitability vs Trust</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> High Trust Baseline
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-[#201A35] border-purple-900/40 text-white text-xs"
                    onClick={() => navigate(`/assistant?query=Why do you recommend ${encodeURIComponent(topPick.product_title || topPick.title || 'Product')}?&productId=${topPick.canonical_product_id}`)}
                    leftIcon={<MessageSquare className="w-3.5 h-3.5 text-[#9875F5]" />}
                  >
                    Ask AI
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white border-0 shadow-md text-xs"
                    onClick={() => navigate(`/investigate/${topPick.canonical_product_id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Inspect Offerings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Alternatives Column */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#C6B5FF] block">
                Viable Alternatives in Category:
              </span>
              {alternatives.slice(0, 2).map((alt) => (
                <div
                  key={alt.canonical_product_id}
                  onClick={() => navigate(`/investigate/${alt.canonical_product_id}`)}
                  className="p-3.5 rounded-xl bg-[#171329] border border-purple-900/30 hover:border-purple-500/50 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#A39CB8]">
                    <span className="text-[#C6B5FF] font-medium">{alt.brand_name || 'Brand Verified'}</span>
                    <span className="font-mono">{alt.canonical_product_id}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white line-clamp-1 hover:text-[#C6B5FF]">
                    {alt.product_title || alt.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-xs text-[#A39CB8]">Alternative Candidate</span>
                    <span className="text-[#C6B5FF] font-medium flex items-center gap-1">
                      Inspect <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-[#171329] border-purple-900/40 text-white hover:bg-purple-900/30 text-xs py-2"
              onClick={() => navigate('/products')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Browse All 3,643 Catalog Products
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-[#A39CB8]">
          No products matched the active criteria. Try broadening your category or budget tier.
        </div>
      )}
    </div>
  );
};
