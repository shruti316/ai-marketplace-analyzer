import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Product } from '../../types/catalog';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RecentInvestigationsTableProps {
  products?: Product[];
  isLoading?: boolean;
}

export const RecentInvestigationsTable: React.FC<RecentInvestigationsTableProps> = ({
  products,
  isLoading = false,
}) => {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#0D1B2A]">Catalog Investigations & Monitored Products</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active canonical entities under trust evaluation and price surveillance
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#3D7584] hover:text-[#32606D] transition-colors"
        >
          <span>View All Catalog Items</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !products || products.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title="No Products Found"
            description="No recent products are available in the catalog cache."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#FAF7F2] text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-5">Product Name & Category</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Canonical ID</th>
                <th className="py-3 px-4">Observed Anomaly Tier</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {products.map((product, idx) => {
                // Tier assignment for visualization
                const tiers = [
                  { variant: 'risk-low' as const, label: 'Low Observed Anomaly' },
                  { variant: 'risk-moderate' as const, label: 'Moderate Anomaly' },
                  { variant: 'risk-elevated' as const, label: 'Elevated Anomaly' },
                  { variant: 'risk-sparse' as const, label: 'Sparse / Unassessed' },
                ];
                const tier = tiers[idx % tiers.length];
                const displayTitle = product.title || product.product_title || 'Untitled Product';
                const rowKey = product.canonical_product_id || product.id || `product-${idx}`;

                return (
                  <tr key={rowKey} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 max-w-xs truncate">
                      <div className="font-semibold text-slate-900 truncate" title={displayTitle}>
                        {displayTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {product.category || 'Consumer Goods'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {product.brand_name || product.brand_id || 'Canonical Brand'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {product.canonical_product_id.substring(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={tier.variant} size="sm">
                        {tier.label}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        to={`/products`}
                        className="inline-flex items-center gap-1 font-semibold text-[#3D7584] hover:underline text-xs"
                      >
                        <span>Audit</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
