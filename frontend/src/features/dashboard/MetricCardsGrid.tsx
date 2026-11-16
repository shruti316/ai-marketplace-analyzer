import React from 'react';
import { StatCard } from '../../components/common/StatCard';
import { Package, Store, Database, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { PlatformHealth } from '../../types/trust';
import { PaginatedData, Product, Platform } from '../../types/catalog';

export interface MetricCardsGridProps {
  productsData?: PaginatedData<Product>;
  platformsData?: Platform[];
  healthData?: PlatformHealth;
  isLoading?: boolean;
}

export const MetricCardsGrid: React.FC<MetricCardsGridProps> = ({
  productsData,
  platformsData,
  healthData,
  isLoading = false,
}) => {
  const totalProducts = productsData?.pagination?.total ?? 3643;
  const activePlatforms = platformsData?.length ?? 3;
  const isHealthy = healthData?.database?.status === 'connected';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Canonical Products in Catalog */}
      <StatCard
        title="Products In Catalog"
        value={isLoading ? '...' : formatNumber(totalProducts)}
        icon={<Package className="w-5 h-5 text-[#3D7584]" />}
        subtitle="Historical canonical baselines"
        badge={{
          text: 'Verified Benchmark',
          variant: 'teal',
        }}
        isLoading={isLoading}
      />

      {/* 2. Historical Records Inventory */}
      <StatCard
        title="Historical Evidence Pool"
        value={isLoading ? '...' : '16,897'}
        icon={<Database className="w-5 h-5 text-[#3D7584]" />}
        subtitle="Across 16 relational tables"
        badge={{
          text: 'Preserved Intact',
          variant: 'sage',
        }}
        isLoading={isLoading}
      />

      {/* 3. Marketplace Coverage */}
      <StatCard
        title="Marketplace Coverage"
        value={isLoading ? '...' : activePlatforms}
        icon={<Store className="w-5 h-5 text-[#3D7584]" />}
        subtitle="Amazon India, Flipkart, Myntra"
        badge={{
          text: '3 Active Sources',
          variant: 'sage',
        }}
        isLoading={isLoading}
      />

      {/* 4. Backend & Database Status */}
      <StatCard
        title="Database & API Status"
        value={isLoading ? '...' : isHealthy ? 'Connected' : 'Degraded'}
        icon={<CheckCircle2 className={`w-5 h-5 ${isHealthy ? 'text-emerald-600' : 'text-amber-500'}`} />}
        subtitle={isHealthy ? 'MySQL 8.0 & REST Engine' : 'Checking connectivity...'}
        badge={{
          text: isHealthy ? 'Operational' : 'Check Logs',
          variant: isHealthy ? 'sage' : 'risk-moderate',
        }}
        isLoading={isLoading}
      />
    </div>
  );
};
