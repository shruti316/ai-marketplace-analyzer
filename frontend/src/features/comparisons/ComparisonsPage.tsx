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
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { comparisonService, ComparisonRecord } from '../../services/comparisonService';
import { catalogService } from '../../services/catalogService';
import { formatCurrencyINR } from '../../lib/utils';

export const ComparisonsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addParam = searchParams.get('add');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [activeComparison, setActiveComparison] = useState<ComparisonRecord | null>(null);
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

  // Fetch user's previous saved comparisons
  const { data: userComparisons } = useQuery({
    queryKey: ['user-saved-comparisons'],
    queryFn: () => comparisonService.getComparisons(1, 10),
  });

  // Mutation to create comparison
  const createMutation = useMutation({
    mutationFn: (ids: string[]) =>
      comparisonService.createComparison({
        title: `Cross-Marketplace Comparison (${ids.length} Products)`,
        canonical_product_ids: ids,
      }),
    onSuccess: (data) => {
      setActiveComparison(data);
      setErrorMessage(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-saved-comparisons'] });
      if (activeComparison) setActiveComparison(null);
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

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-[#3D7584]" />
            <span>Cross-Marketplace Comparison Studio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Side-by-side listing comparison, price anomaly analysis, and cross-seller arbitrage detection
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <Layers className="w-4 h-4 text-[#3D7584]" />
          <span>Compare 2 to 5 Canonical Offerings</span>
        </div>
      </div>

      {/* Product Selection Tray */}
      <div className="bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0D1B2A]">
            Active Comparison Basket ({selectedProductIds.length}/5)
          </h2>
          {selectedProductIds.length >= 2 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunComparison}
              disabled={createMutation.isPending}
              rightIcon={createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            >
              {createMutation.isPending ? 'Generating Matrix...' : 'Generate Comparison Matrix'}
            </Button>
          )}
        </div>

        {/* Selected Product Pills */}
        <div className="flex flex-wrap gap-2 min-h-10 items-center p-3 rounded-2xl bg-[#FAF7F2] border border-[#BAC7CA]/60">
          {selectedProductIds.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No products selected yet. Search and select products below or click "Compare Offering" from any investigation detail page.
            </span>
          ) : (
            selectedProductIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#3D7584]/40 text-[#0D1B2A] text-xs font-semibold shadow-xs"
              >
                <span className="font-mono text-[11px] text-[#3D7584]">{id}</span>
                <button
                  onClick={() => handleRemoveProductId(id)}
                  className="text-slate-400 hover:text-red-500 transition-colors ml-1"
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search catalog products by title or brand to add to basket..."
              className="w-full bg-[#FAF7F2] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 rounded-xl pl-10 pr-4 py-2.5 border border-[#BAC7CA] focus:border-[#3D7584] outline-none transition-all"
            />
          </div>

          {/* Suggestions Dropdown */}
          {suggestionsData && suggestionsData.items.length > 0 && productSearch.trim().length >= 2 && (
            <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl border border-[#BAC7CA] shadow-soft-lg overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {suggestionsData.items.map((p) => {
                const isSelected = selectedProductIds.includes(p.canonical_product_id);
                return (
                  <div
                    key={p.canonical_product_id}
                    onClick={() => !isSelected && handleAddProductId(p.canonical_product_id)}
                    className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-50 opacity-50 cursor-not-allowed' : 'hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[80%]">
                      <p className="font-semibold text-[#0D1B2A] line-clamp-1">{p.product_title || p.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="text-[#3D7584]">{p.brand_name || 'Brand'}</span>
                        <span>•</span>
                        <span>{p.category}</span>
                        <span>•</span>
                        <span>{p.canonical_product_id}</span>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" disabled={isSelected} className="text-[11px] py-1 px-2.5">
                      {isSelected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Live Active Comparison Results */}
      {activeComparison && (
        <div className="bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Matrix Generated</span>
              </div>
              <h2 className="text-base font-bold text-[#0D1B2A]">{activeComparison.title}</h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {activeComparison.price_dispersion_inr !== null && (
                <div className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Price Dispersion Spread</span>
                  <span className="font-bold text-[#0D1B2A]">{formatCurrencyINR(activeComparison.price_dispersion_inr)}</span>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Max Risk Observed</span>
                <span className="font-bold text-amber-700">{activeComparison.max_risk_tier.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#FAF7F2] text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="p-3.5">Product Title & ID</th>
                  <th className="p-3.5">Brand / Category</th>
                  <th className="p-3.5">Marketplace</th>
                  <th className="p-3.5">Observed Price</th>
                  <th className="p-3.5">Assessed Risk Tier</th>
                  <th className="p-3.5">Anomaly Score</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeComparison.items?.map((item) => (
                  <tr key={item.canonical_product_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 max-w-xs">
                      <p className="font-semibold text-[#0D1B2A] line-clamp-2">{item.product_title || item.canonical_product_id}</p>
                      <span className="font-mono text-[10px] text-slate-400">{item.canonical_product_id}</span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-[#3D7584]">{item.brand_name || 'Brand Verified'}</p>
                      <span className="text-slate-500 text-[11px]">{item.category || 'Standard'}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {item.platform_name || 'Multi-platform'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-[#0D1B2A]">
                        {item.observed_price_inr !== null ? formatCurrencyINR(item.observed_price_inr) : '₹0.00'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          item.predicted_risk_tier === 'LOW_OBSERVED_ANOMALY'
                            ? 'risk-low'
                            : item.predicted_risk_tier === 'MODERATE_SINGLE_MODALITY_ANOMALY'
                            ? 'risk-moderate'
                            : 'risk-elevated'
                        }
                        size="sm"
                      >
                        {item.predicted_risk_tier.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono">
                      {item.continuous_anomaly_score !== null ? item.continuous_anomaly_score.toFixed(3) : '0.000'}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/investigate/${item.canonical_product_id}`)}
                        rightIcon={<ExternalLink className="w-3 h-3" />}
                        className="text-[11px] py-1 px-2.5"
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
        <div className="bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#0D1B2A]">Previously Saved Comparison Audits</h3>
          <div className="space-y-2">
            {userComparisons.items.map((comp) => (
              <div
                key={comp.id}
                className="p-4 rounded-2xl bg-[#FAF7F2] border border-slate-200 hover:border-[#3D7584] transition-all flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#0D1B2A]">{comp.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {comp.product_count} Products • Max Risk: {comp.max_risk_tier.replace(/_/g, ' ')} • Saved {new Date(comp.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => comparisonService.getComparisonById(comp.id).then(setActiveComparison)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Matrix
                  </Button>
                  <button
                    onClick={() => deleteMutation.mutate(comp.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
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
