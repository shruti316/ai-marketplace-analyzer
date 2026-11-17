import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../../services/catalogService';
import {
  History,
  Search,
  ArrowRight,
  Store,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const InvestigationsHistoryPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const navigate = useNavigate();

  // Query catalog products to act as historical investigation records
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['investigations-history', search, selectedTier, page],
    queryFn: () =>
      catalogService.getProducts({
        page,
        limit: 10,
        search: search.trim() || undefined,
      }),
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <History className="w-5 h-5 text-[#3D7584]" />
            <span>Product Investigations History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit trail of completed multimodal trust assessments and verified catalog records
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/')}
        >
          New Investigation
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#DCE5E7] shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product title or brand..."
            className="w-full bg-[#FAF7F2] text-xs text-slate-800 placeholder:text-slate-400 rounded-xl pl-9 pr-3 py-2 border border-[#BAC7CA] focus:border-[#3D7584] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LOW_ANOMALY', 'MODERATE_ANOMALY', 'ELEVATED_ANOMALY'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedTier === tier
                  ? 'bg-[#0D1B2A] text-white'
                  : 'bg-[#FAF7F2] text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {tier === 'ALL' ? 'All Tiers' : tier.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : productsData && productsData.items.length > 0 ? (
          productsData.items.map((prod) => {
            const categoryBadge = { label: prod.category || 'Verified Catalog', class: 'bg-[#FAF7F2] text-slate-700 border-[#BAC7CA]' };

            return (
              <div
                key={prod.canonical_product_id}
                className="p-5 rounded-2xl bg-white border border-[#DCE5E7] hover:border-[#3D7584] hover:shadow-soft transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {prod.canonical_product_id}
                    </span>
                    <span className="text-xs font-semibold text-[#3D7584]">
                      {prod.brand_name || 'Brand Verified'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoryBadge.class}`}>
                      {categoryBadge.label}
                    </span>
                  </div>

                  <h3
                    onClick={() => navigate(`/investigate/${prod.canonical_product_id}`)}
                    className="text-xs sm:text-sm font-semibold text-[#0D1B2A] line-clamp-1 hover:text-[#3D7584] cursor-pointer"
                  >
                    {prod.product_title || prod.title}
                  </h3>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3" /> Amazon India, Flipkart, Myntra
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Historical Catalog Audit Trail
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/investigate/${prod.canonical_product_id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Inspect Findings
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            No historical investigation records found matching your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
