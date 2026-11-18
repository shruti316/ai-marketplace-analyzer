import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../../services/catalogService';
import { Search, ArrowRight, Package } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const CatalogInvestigationLauncher: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const navigate = useNavigate();

  // Query real products from MySQL
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['catalog-launcher', search, page],
    queryFn: () =>
      catalogService.getProducts({
        page,
        limit: 6,
        search: search.trim() || undefined,
      }),
  });

  return (
    <div className="space-y-4 pt-4 border-t border-white/[0.08]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-heading">
            <Package className="w-4 h-4 text-indigo-400" />
            <span>Select Product from Verified Marketplace Catalog</span>
          </h3>
          <p className="text-xs text-slate-400">
            Choose from 3,643 canonical catalog products across Amazon India, Flipkart, and Myntra
          </p>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, brand..."
              className="bg-[#181D2E] text-xs text-slate-100 placeholder:text-slate-500 rounded-xl pl-8 pr-3 py-1.5 border border-white/[0.08] focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-[#181D2E] border border-white/[0.08] animate-pulse space-y-3">
              <div className="h-4 bg-[#111522] rounded w-3/4" />
              <div className="h-3 bg-[#111522] rounded w-1/2" />
              <div className="h-8 bg-[#111522] rounded w-full" />
            </div>
          ))}
        </div>
      ) : productsData && productsData.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {productsData.items.map((prod) => (
            <div
              key={prod.canonical_product_id}
              className="p-4 rounded-xl bg-[#181D2E] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-[#1E2438] transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-indigo-400">{prod.brand_name || 'Brand Verified'}</span>
                  <span className="font-mono text-[10px] bg-[#111522] px-1.5 py-0.5 rounded text-slate-400 border border-white/[0.05]">
                    {prod.category}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug font-heading" title={prod.product_title || prod.title}>
                  {prod.product_title || prod.title || 'Marketplace Item'}
                </h4>
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 truncate max-w-[120px]">
                  {prod.canonical_product_id}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/investigate/${prod.canonical_product_id}`)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs py-1 px-2.5"
                >
                  Investigate
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-[#181D2E] rounded-xl border border-white/[0.08] text-xs text-slate-400">
          No catalog products matched your search query.
        </div>
      )}
    </div>
  );
};
