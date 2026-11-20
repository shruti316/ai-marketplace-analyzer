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
import { VerdictBadge } from '../../components/ui/VerdictBadge';

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
        return { label: 'Low Risk', bg: 'bg-[var(--ok-bg)] border-[var(--ok)]/30 text-[var(--ok-ink)]' };
      case 'MODERATE':
      case 'MODERATE_SINGLE_MODALITY_ANOMALY':
        return { label: 'Moderate Anomaly', bg: 'bg-[var(--warn-bg)] border-[var(--warn)]/30 text-[var(--warn-ink)]' };
      case 'HIGH':
      case 'CRITICAL':
      case 'ELEVATED_MULTIMODAL_ANOMALY':
        return { label: 'High Divergence', bg: 'bg-[var(--bad-bg)] border-[var(--bad)]/30 text-[var(--bad-ink)]' };
      default:
        return { label: 'Sparse Signal', bg: 'bg-[var(--canvas)]/60 border-[var(--line)] text-[var(--text-3)]' };
    }
  };

  const getInputTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />;
      case 'URL':
        return <LinkIcon className="w-3.5 h-3.5 text-[var(--accent)]" />;
      case 'ADHOC':
        return <Sliders className="w-3.5 h-3.5 text-[var(--warn)]" />;
      default:
        return <Store className="w-3.5 h-3.5 text-[var(--accent)]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] font-heading flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--accent)]" />
            <span>Product Investigations History</span>
          </h1>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Permanent audit trail of your marketplace listings, image packaging scans, and multimodal assessments
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/investigate')}
        >
          New Investigation
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title or identifier..."
            className="w-full bg-[var(--canvas)]/40 text-xs text-[var(--ink)] placeholder:text-[var(--text-3)] rounded-xl pl-9 pr-3 py-2 border border-[var(--line)] focus:border-[var(--accent)] outline-none transition-all"
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
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'bg-white text-[var(--text-2)] hover:text-[var(--ink)] border border-[var(--line)]'
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
              <div key={i} className="p-5 rounded-2xl bg-white border border-[var(--line)] animate-pulse space-y-2">
                <div className="h-4 bg-[var(--canvas)] rounded w-1/3" />
                <div className="h-3 bg-[var(--canvas)] rounded w-2/3" />
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
                className="p-5 rounded-2xl bg-white border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--accent)] bg-[var(--canvas)]/60 border border-[var(--line)] px-2 py-0.5 rounded-full">
                      {getInputTypeIcon(inv.input_type)}
                      <span>{inv.input_type}</span>
                    </span>
                    <VerdictBadge
                      verdict={inv.overall_risk_tier || 'LOW_OBSERVED_ANOMALY'}
                      label={`${tierBadge.label} (Score: ${(inv.overall_risk_score * 100).toFixed(1)}%)`}
                      size="sm"
                    />
                    {inv.extracted_identifier && (
                      <span className="font-mono text-[10px] text-[var(--text-3)] bg-[var(--canvas)]/60 px-2 py-0.5 rounded border border-[var(--line)]">
                        ID: {inv.extracted_identifier}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => navigate(inv.canonical_product_id ? `/investigate/${inv.canonical_product_id}` : `/investigate/${inv.id}`)}
                    className="text-xs sm:text-sm font-semibold text-[var(--ink)] line-clamp-1 hover:text-[var(--accent)] cursor-pointer font-heading"
                  >
                    {inv.title}
                  </h3>

                  {inv.verdict_summary && (
                    <p className="text-xs text-[var(--text-3)] line-clamp-1">
                      {inv.verdict_summary}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)] font-mono">
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-[var(--accent)]" /> {inv.marketplace || 'Marketplace'}
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
                    className="text-xs"
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
                    className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--bad)] hover:bg-[var(--bad-bg)] transition-colors"
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
          <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-[var(--line)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--heather)] border border-[var(--line)] text-[var(--accent)] flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--ink)] font-heading">No Saved Investigations Yet</h3>
              <p className="text-xs text-[var(--text-3)] max-w-md mx-auto mt-1">
                {isAuthenticated
                  ? 'When you check a marketplace link or inspect packaging, your assessments are stored securely here.'
                  : 'Sign in to access and store your personal audit trail of product trust assessments.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/investigate')}
              >
                Inspect a Product Now
              </Button>
            </div>

            {/* Catalog Examples */}
            {sampleProductsData && sampleProductsData.items.length > 0 && (
              <div className="pt-6 border-t border-[var(--line)] text-left">
                <p className="text-xs font-semibold text-[var(--accent)] mb-3 flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Sample Verified Catalog Records to Explore:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleProductsData.items.slice(0, 4).map((p) => (
                    <div
                      key={p.canonical_product_id}
                      onClick={() => navigate(`/investigate/${p.canonical_product_id}`)}
                      className="p-3 rounded-xl bg-[var(--canvas)]/40 border border-[var(--line)] hover:border-[var(--accent)] cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-[var(--ink)] truncate block font-heading">{p.product_title || p.title}</span>
                        <span className="text-[10px] text-[var(--text-3)] font-mono">{p.category || 'Retail Category'}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
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
