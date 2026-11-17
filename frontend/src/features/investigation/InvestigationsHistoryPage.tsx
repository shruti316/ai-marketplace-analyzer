import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { investigateService, InvestigationRecord } from '../../services/investigateService';
import { catalogService } from '../../services/catalogService';
import { useAuth } from '../../hooks/useAuth';
import {
  History,
  Search,
  ArrowRight,
  Store,
  Calendar,
  Trash2,
  ExternalLink,
  Camera,
  Link as LinkIcon,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const InvestigationsHistoryPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Query persistent investigations from MySQL
  const {
    data: historyData,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['investigations-history', search, selectedTier, page, user?.id],
    queryFn: () =>
      investigateService.getInvestigations({
        page,
        limit: 10,
        search: search.trim() || undefined,
        risk_tier: selectedTier === 'ALL' ? undefined : selectedTier,
      }),
    enabled: isAuthenticated,
  });

  // 2. Query fallback catalog offerings if user has 0 saved investigations
  const { data: sampleProductsData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['sample-catalog-investigations'],
    queryFn: () => catalogService.getProducts({ page: 1, limit: 5 }),
    enabled: !isAuthenticated || (historyData && historyData.total === 0),
  });

  // Mutation to delete investigation record
  const deleteMutation = useMutation({
    mutationFn: (id: string) => investigateService.deleteInvestigation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations-history'] });
    },
  });

  const isLoading = isHistoryLoading || (!isAuthenticated && isCatalogLoading);
  const savedInvestigations: InvestigationRecord[] = historyData?.items || [];
  const hasSavedInvestigations = savedInvestigations.length > 0;

  const getTierBadge = (tier: string) => {
    switch (tier.toUpperCase()) {
      case 'LOW':
      case 'LOW_OBSERVED_ANOMALY':
        return { label: 'Low Risk', bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
      case 'MODERATE':
      case 'MODERATE_SINGLE_MODALITY_ANOMALY':
        return { label: 'Moderate Anomaly', bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };
      case 'HIGH':
      case 'CRITICAL':
      case 'ELEVATED_MULTIMODAL_ANOMALY':
        return { label: 'High Divergence', bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300' };
      default:
        return { label: 'Sparse Signal', bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300' };
    }
  };

  const getInputTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <Camera className="w-3.5 h-3.5 text-[#9875F5]" />;
      case 'URL':
        return <LinkIcon className="w-3.5 h-3.5 text-[#6D7CFF]" />;
      case 'ADHOC':
        return <Sliders className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Store className="w-3.5 h-3.5 text-[#C6B5FF]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#9875F5]" />
            <span>Product Investigations History</span>
          </h1>
          <p className="text-xs text-[#A39CB8] mt-1">
            Permanent audit trail of your marketplace listings, image packaging scans, and multimodal assessments
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] hover:from-[#8964e8] hover:to-[#5e6deb] text-white border-0 shadow-md"
          onClick={() => navigate('/investigate')}
        >
          New Investigation
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#100D20] p-4 rounded-2xl border border-purple-900/40 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A39CB8] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title or identifier..."
            className="w-full bg-[#171329] text-xs text-white placeholder:text-[#A39CB8]/60 rounded-xl pl-9 pr-3 py-2 border border-purple-900/40 focus:border-[#9875F5] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((tier) => (
            <button
              key={tier}
              onClick={() => {
                setSelectedTier(tier);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedTier === tier
                  ? 'bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white shadow-sm'
                  : 'bg-[#171329] text-[#A39CB8] hover:text-white border border-purple-900/40'
              }`}
            >
              {tier === 'ALL' ? 'All Tiers' : tier}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-[#100D20] border border-purple-900/40 animate-pulse space-y-2">
                <div className="h-4 bg-purple-900/30 rounded w-1/3" />
                <div className="h-3 bg-purple-900/20 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : hasSavedInvestigations ? (
          savedInvestigations.map((inv) => {
            const tierBadge = getTierBadge(inv.overall_risk_tier);
            const formattedDate = new Date(inv.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={inv.id}
                className="p-5 rounded-2xl bg-[#100D20] border border-purple-900/40 hover:border-[#9875F5]/60 hover:shadow-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#C6B5FF] bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-full">
                      {getInputTypeIcon(inv.input_type)}
                      <span>{inv.input_type}</span>
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tierBadge.bg}`}>
                      {tierBadge.label} (Score: {(inv.overall_risk_score * 100).toFixed(1)}%)
                    </span>
                    {inv.extracted_identifier && (
                      <span className="font-mono text-[10px] text-[#A39CB8] bg-white/5 px-2 py-0.5 rounded">
                        ID: {inv.extracted_identifier}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => navigate(inv.canonical_product_id ? `/investigate/${inv.canonical_product_id}` : `/investigate/${inv.id}`)}
                    className="text-xs sm:text-sm font-semibold text-white line-clamp-1 hover:text-[#C6B5FF] cursor-pointer"
                  >
                    {inv.title}
                  </h3>

                  {inv.verdict_summary && (
                    <p className="text-xs text-[#A39CB8] line-clamp-1">
                      {inv.verdict_summary}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-[#A39CB8]">
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-[#9875F5]" /> {inv.marketplace || 'Marketplace'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formattedDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-[#171329] border-purple-900/40 text-white hover:bg-purple-900/20 text-xs"
                    onClick={() => navigate(inv.canonical_product_id ? `/investigate/${inv.canonical_product_id}` : `/investigate/${inv.id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Reopen
                  </Button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this investigation record?')) {
                        deleteMutation.mutate(inv.id);
                      }
                    }}
                    className="p-2 rounded-xl text-[#A39CB8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete record"
                    aria-label="Delete investigation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 sm:p-12 text-center bg-[#100D20] rounded-2xl border border-purple-900/40 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[#9875F5] flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No Saved Investigations Yet</h3>
              <p className="text-xs text-[#A39CB8] max-w-md mx-auto mt-1">
                {isAuthenticated
                  ? 'When you check a marketplace link or inspect packaging, your assessments are stored securely here.'
                  : 'Sign in to access and store your personal audit trail of product trust assessments.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white"
                onClick={() => navigate('/investigate')}
              >
                Inspect a Product Now
              </Button>
            </div>

            {/* Catalog Examples */}
            {sampleProductsData && sampleProductsData.items.length > 0 && (
              <div className="pt-6 border-t border-purple-900/30 text-left">
                <p className="text-xs font-semibold text-[#C6B5FF] mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#9875F5]" />
                  <span>Sample Verified Catalog Records to Explore:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleProductsData.items.slice(0, 4).map((p) => (
                    <div
                      key={p.canonical_product_id}
                      onClick={() => navigate(`/investigate/${p.canonical_product_id}`)}
                      className="p-3 rounded-xl bg-[#171329] border border-purple-900/30 hover:border-purple-500/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-white truncate block">{p.product_title || p.title}</span>
                        <span className="text-[10px] text-[#A39CB8]">{p.category || 'Retail Category'}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#C6B5FF] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
