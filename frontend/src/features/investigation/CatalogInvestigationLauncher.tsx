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
    <div className="space-y-4 pt-4 border-t border-[var(--line)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2 font-heading">
            <Package className="w-4 h-4 text-[var(--accent)]" />
            <span>Select Product from Verified Marketplace Catalog</span>
          </h3>
          <p className="text-xs text-[var(--text-3)]">
            Choose from 3,643 canonical catalog products across Amazon India, Flipkart, and Myntra
          </p>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-3)] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, brand..."
              className="bg-[var(--canvas)]/40 text-xs text-[var(--ink)] placeholder:text-[var(--text-3)] rounded-xl pl-8 pr-3 py-1.5 border border-[var(--line)] focus:border-[var(--accent)] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--canvas)]/40 border border-[var(--line)] animate-pulse space-y-3">
              <div className="h-4 bg-[var(--canvas)] rounded w-3/4" />
              <div className="h-3 bg-[var(--canvas)] rounded w-1/2" />
              <div className="h-8 bg-[var(--canvas)] rounded w-full" />
            </div>
          ))}
        </div>
      ) : productsData && productsData.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {productsData.items.map((prod) => (
            <div
              key={prod.canonical_product_id}
              className="p-4 rounded-xl bg-white border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-3)]">
                  <span className="font-semibold text-[var(--accent)]">{prod.brand_name || 'Brand Verified'}</span>
                  <span className="font-mono text-[10px] bg-[var(--canvas)]/60 px-1.5 py-0.5 rounded text-[var(--text-3)] border border-[var(--line)]">
                    {prod.category}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-[var(--ink)] line-clamp-2 leading-snug font-heading" title={prod.product_title || prod.title}>
                  {prod.product_title || prod.title || 'Marketplace Item'}
                </h4>
              </div>

              <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[var(--text-3)] truncate max-w-[120px]">
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
        <div className="p-8 text-center bg-white rounded-xl border border-[var(--line)] text-xs text-[var(--text-3)]">
          No catalog products matched your search query.
        </div>
      )}
    </div>
  );
};
