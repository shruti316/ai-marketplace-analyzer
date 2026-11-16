import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../../services/catalogService';
import {
  PackageSearch,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatNumber } from '../../lib/utils';

export const ProductIntelligencePage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const navigate = useNavigate();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['catalog-products-list', search, page, selectedCategory],
    queryFn: () =>
      catalogService.getProducts({
        page,
        limit: 12,
        search: search.trim() || undefined,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      }),
  });

  const totalPages = productsData?.pagination?.totalPages || 1;
  const totalItems = productsData?.pagination?.total || 3643;

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-[#3D7584]" />
            <span>Product Intelligence Catalog</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and audit 3,643 verified canonical marketplace products across Amazon India, Flipkart, and Myntra
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <Database className="w-4 h-4 text-[#3D7584]" />
          <span>Showing {formatNumber(totalItems)} Canonical Products</span>
        </div>
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
            placeholder="Search products by title or brand..."
            className="w-full bg-[#FAF7F2] text-xs text-slate-800 placeholder:text-slate-400 rounded-xl pl-9 pr-3 py-2 border border-[#BAC7CA] focus:border-[#3D7584] outline-none"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          {['ALL', 'Electronics', 'Apparel', 'Footwear', 'Beauty'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#0D1B2A] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-10 bg-slate-100 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : productsData && productsData.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsData.items.map((prod) => (
            <div
              key={prod.canonical_product_id}
              className="p-5 rounded-2xl bg-white border border-[#DCE5E7] hover:border-[#3D7584] hover:shadow-soft transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#3D7584] truncate max-w-[150px]">
                    {prod.brand_name || 'Brand Verified'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF7F2] text-slate-600 border border-slate-200">
                    {prod.category}
                  </span>
                </div>

                <h3
                  onClick={() => navigate(`/investigate/${prod.canonical_product_id}`)}
                  className="text-xs sm:text-sm font-semibold text-[#0D1B2A] line-clamp-2 leading-snug cursor-pointer group-hover:text-[#3D7584] transition-colors"
                  title={prod.product_title || prod.title}
                >
                  {prod.product_title || prod.title}
                </h3>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                  {prod.canonical_product_id}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/investigate/${prod.canonical_product_id}`)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs py-1 px-3"
                >
                  Investigate
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
          No products found matching your search.
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
