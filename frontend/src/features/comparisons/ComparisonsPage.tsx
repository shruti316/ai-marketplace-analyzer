import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitCompare,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Search,
  ExternalLink,
  Loader2,
  Award,
  TrendingDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { comparisonService } from '../../services/comparisonService';
import { catalogService } from '../../services/catalogService';
import { formatCurrencyINR } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export const ComparisonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const addParam = searchParams.get('add');
  const idParam = searchParams.get('id');

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If ?add=productId was passed in URL, pre-populate it
  useEffect(() => {
    if (addParam && !selectedProductIds.includes(addParam)) {
      setSelectedProductIds((prev) => [...prev, addParam]);
    }
  }, [addParam]);

  // Fetch product search suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: ['comparison-product-suggestions', productSearch],
    queryFn: () => catalogService.getProducts({ search: productSearch.trim(), limit: 5 }),
    enabled: productSearch.trim().length >= 2,
  });

  // Fetch user's previous saved comparisons from MySQL
  const { data: userComparisons } = useQuery({
    queryKey: ['user-saved-comparisons'],
    queryFn: () => comparisonService.getComparisons(1, 10),
    enabled: isAuthenticated,
  });

  // Fetch persistent comparison session by ID (persisting across refresh & sessions)
  const {
    data: fetchedComparison,
    isLoading: isComparisonLoading,
  } = useQuery({
    queryKey: ['comparison-detail', idParam],
    queryFn: () => comparisonService.getComparisonById(idParam!),
    enabled: !!idParam,
  });

  // Mutation to create comparison
  const createMutation = useMutation({
    mutationFn: (ids: string[]) =>
      comparisonService.createComparison({
        title: `Product Intelligence Comparison (${ids.length} Offerings)`,
        canonical_product_ids: ids,
      }),
    onSuccess: (data) => {
      setErrorMessage(null);
      setSearchParams({ id: data.id });
      queryClient.invalidateQueries({ queryKey: ['user-saved-comparisons'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to generate cross-marketplace comparison';
      setErrorMessage(msg);
    },
  });

  // Mutation to delete comparison
  const deleteMutation = useMutation({
    mutationFn: (id: string) => comparisonService.deleteComparison(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['user-saved-comparisons'] });
      if (idParam === id) {
        setSearchParams({});
      }
    },
  });

  const handleAddProductId = (id: string) => {
    if (selectedProductIds.includes(id)) return;
    if (selectedProductIds.length >= 5) {
      setErrorMessage('A maximum of 5 products can be compared simultaneously.');
      return;
    }
    setSelectedProductIds((prev) => [...prev, id]);
    setProductSearch('');
    setErrorMessage(null);
  };

  const handleRemoveProductId = (id: string) => {
    setSelectedProductIds((prev) => prev.filter((item) => item !== id));
  };

  const handleRunComparison = () => {
    if (selectedProductIds.length < 2) {
      setErrorMessage('Please select at least 2 distinct products to compare.');
      return;
    }
    createMutation.mutate(selectedProductIds);
  };

  const activeComparison = fetchedComparison || null;

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-[#9875F5]" />
            <span>Product Comparison & Buying Matrix</span>
          </h1>
          <p className="text-xs text-[#A39CB8] mt-1">
            Compare candidate items side-by-side: evaluate listing trust signals, price dispersion, and suitability trade-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#C6B5FF] bg-[#100D20] px-3.5 py-1.5 rounded-xl border border-purple-900/40 shadow-xs">
          <Layers className="w-4 h-4 text-[#9875F5]" />
          <span>Compare 2 to 5 Offerings</span>
        </div>
      </div>

      {/* Product Selection Tray */}
      <div className="bg-[#100D20] rounded-3xl border border-purple-900/40 shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            Comparison Basket ({selectedProductIds.length}/5)
          </h2>
          {selectedProductIds.length >= 2 && (
            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-[#9875F5] to-[#6D7CFF] text-white border-0 shadow-md"
              onClick={handleRunComparison}
              disabled={createMutation.isPending}
              rightIcon={createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            >
              {createMutation.isPending ? 'Generating Matrix...' : 'Generate Matrix'}
            </Button>
          )}
        </div>

        {/* Selected Product Pills */}
        <div className="flex flex-wrap gap-2 min-h-10 items-center p-3 rounded-2xl bg-[#171329] border border-purple-900/40">
          {selectedProductIds.length === 0 ? (
            <span className="text-xs text-[#A39CB8]/60 italic">
              No products selected yet. Search products below or click &quot;Compare&quot; from catalog or investigation details.
            </span>
          ) : (
            selectedProductIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#201A35] border border-purple-500/30 text-white text-xs font-semibold shadow-xs"
              >
                <span className="font-mono text-[11px] text-[#C6B5FF]">{id}</span>
                <button
                  onClick={() => handleRemoveProductId(id)}
                  className="text-[#A39CB8] hover:text-rose-400 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Product Search & Dropdown Picker */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#A39CB8] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search catalog products by title or brand to add..."
              className="w-full bg-[#171329] text-xs sm:text-sm text-white placeholder:text-[#A39CB8]/50 rounded-xl pl-10 pr-4 py-2.5 border border-purple-900/40 focus:border-[#9875F5] outline-none transition-all"
            />
          </div>

          {/* Suggestions Dropdown */}
          {suggestionsData && suggestionsData.items.length > 0 && productSearch.trim().length >= 2 && (
            <div className="absolute z-20 left-0 right-0 mt-2 bg-[#171329] rounded-2xl border border-purple-800/40 shadow-xl overflow-hidden divide-y divide-purple-900/30 max-h-60 overflow-y-auto">
              {suggestionsData.items.map((p) => {
                const isSelected = selectedProductIds.includes(p.canonical_product_id);
                return (
                  <div
                    key={p.canonical_product_id}
                    onClick={() => !isSelected && handleAddProductId(p.canonical_product_id)}
                    className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-purple-950/40 opacity-50 cursor-not-allowed' : 'hover:bg-purple-900/20'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[80%]">
                      <p className="font-semibold text-white line-clamp-1">{p.product_title || p.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#A39CB8] font-mono">
                        <span className="text-[#C6B5FF]">{p.brand_name || 'Brand'}</span>
                        <span>•</span>
                        <span>{p.category}</span>
                        <span>•</span>
                        <span>{p.canonical_product_id}</span>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" disabled={isSelected} className="text-[11px] py-1 px-2.5 bg-[#201A35] border-purple-900/40 text-white">
                      {isSelected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Comparison Loading Skeleton */}
      {isComparisonLoading && (
        <div className="bg-[#100D20] rounded-3xl border border-purple-900/40 p-8 text-center space-y-3 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-[#9875F5] mx-auto" />
          <p className="text-xs text-[#A39CB8]">Loading comparison session from database...</p>
        </div>
      )}

      {/* Active Comparison Results */}
      {activeComparison && !isComparisonLoading && (
        <div className="bg-[#100D20] rounded-3xl border border-purple-900/40 shadow-soft p-6 sm:p-8 space-y-6 animate-fadeIn">
          {/* Top Recommendation Banner */}
          {activeComparison.recommendation_rationale && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 to-indigo-950/60 border border-purple-500/30 flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-[#C6B5FF] shrink-0 mt-0.5">
                <Award className="w-5 h-5 text-[#9875F5]" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#C6B5FF] tracking-wider uppercase">
                  TrustSphere Buying Advisor Finding
                </span>
                <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                  {activeComparison.recommendation_rationale}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-900/30">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Matrix (Saved to Session)</span>
              </div>
              <h2 className="text-base font-bold text-white">{activeComparison.title}</h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {activeComparison.price_dispersion_inr !== null && (
                <div className="px-3 py-1.5 rounded-xl bg-[#171329] border border-purple-900/40">
                  <span className="text-[#A39CB8] text-[11px] block flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-[#9875F5]" /> Price Spread
                  </span>
                  <span className="font-bold text-white">{formatCurrencyINR(activeComparison.price_dispersion_inr)}</span>
                </div>
              )}
              {activeComparison.max_risk_tier && (
                <div className="px-3 py-1.5 rounded-xl bg-[#171329] border border-purple-900/40">
                  <span className="text-[#A39CB8] text-[11px] block">Highest Risk Observed</span>
                  <span className="font-bold text-amber-300">{activeComparison.max_risk_tier.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-purple-900/40 bg-[#171329] text-[#A39CB8] uppercase text-[10px] font-semibold tracking-wider">
                  <th className="p-3.5">Product Title & ID</th>
                  <th className="p-3.5">Brand / Category</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Risk Tier</th>
                  <th className="p-3.5">Recommendation</th>
                  <th className="p-3.5">Trade-off Notes</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/20">
                {activeComparison.items?.map((item) => (
                  <tr
                    key={item.canonical_product_id}
                    className={`transition-colors ${
                      item.is_recommended ? 'bg-purple-950/20' : 'hover:bg-[#171329]/50'
                    }`}
                  >
                    <td className="p-3.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        {item.is_recommended && (
                          <span title="Top Recommendation">
                            <Award className="w-4 h-4 text-[#9875F5] shrink-0" />
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-white line-clamp-2">
                            {item.product_title || item.canonical_product_id}
                          </p>
                          <span className="font-mono text-[10px] text-[#A39CB8]">
                            {item.canonical_product_id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-[#C6B5FF]">{item.brand_name || 'Brand Verified'}</p>
                      <span className="text-[#A39CB8] text-[11px]">{item.category || 'Standard'}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-white text-sm">
                        {item.observed_price_inr !== null ? formatCurrencyINR(item.observed_price_inr) : '₹0.00'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.predicted_risk_tier === 'LOW_OBSERVED_ANOMALY'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : item.predicted_risk_tier === 'MODERATE_SINGLE_MODALITY_ANOMALY'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {item.predicted_risk_tier.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {item.is_recommended ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Best Choice
                        </span>
                      ) : (
                        <span className="text-[#A39CB8] text-xs">Alternative</span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs text-[#A39CB8] text-[11px] leading-relaxed">
                      {item.tradeoff_notes || 'Standard catalog profile.'}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/investigate/${item.canonical_product_id}`)}
                        rightIcon={<ExternalLink className="w-3 h-3" />}
                        className="text-[11px] py-1 px-2.5 bg-[#201A35] border-purple-900/40 text-white hover:bg-purple-900/30"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical Saved Comparisons */}
      {userComparisons && userComparisons.items.length > 0 && (
        <div className="bg-[#100D20] rounded-3xl border border-purple-900/40 shadow-soft p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Your Saved Comparison Sessions</h3>
          <div className="space-y-2">
            {userComparisons.items.map((comp) => (
              <div
                key={comp.id}
                className="p-4 rounded-2xl bg-[#171329] border border-purple-900/30 hover:border-purple-500/50 transition-all flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{comp.title}</h4>
                  <p className="text-[11px] text-[#A39CB8] mt-0.5">
                    {comp.product_count} Products • Max Risk: {comp.max_risk_tier.replace(/_/g, ' ')} • Saved {new Date(comp.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-[#201A35] border-purple-900/40 text-white hover:bg-purple-900/30 text-xs"
                    onClick={() => setSearchParams({ id: comp.id })}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Matrix
                  </Button>
                  <button
                    onClick={() => deleteMutation.mutate(comp.id)}
                    className="p-2 text-[#A39CB8] hover:text-rose-400 rounded-lg transition-colors"
                    title="Delete comparison"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
