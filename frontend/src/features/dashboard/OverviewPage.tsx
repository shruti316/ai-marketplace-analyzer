import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../services/catalogService';
import { healthService } from '../../services/healthService';
import { MetricCardsGrid } from './MetricCardsGrid';
import { RiskDistributionChart } from '../../components/charts/RiskDistributionChart';
import { MarketplaceComparisonChart } from '../../components/charts/MarketplaceComparisonChart';
import { MarketplaceCoverageCard } from './MarketplaceCoverageCard';
import { DataAvailabilityCard } from './DataAvailabilityCard';
import { RecentInvestigationsTable } from './RecentInvestigationsTable';
import { Button } from '../../components/ui/Button';
import { RefreshCw, Download } from 'lucide-react';

export const OverviewPage: React.FC = () => {
  // 1. Fetch real catalog products from MySQL via Node backend
  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
    isRefetching: isProductsRefetching,
  } = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => catalogService.getProducts({ limit: 6 }),
  });

  // 2. Fetch real platforms
  const { data: platformsData, isLoading: isPlatformsLoading } = useQuery({
    queryKey: ['dashboard-platforms'],
    queryFn: () => catalogService.getPlatforms(),
  });

  // 3. Fetch system health
  const { data: healthData, isLoading: isHealthLoading } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => healthService.getHealth(),
  });

  const isLoading = isProductsLoading || isPlatformsLoading || isHealthLoading;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A]">
            Trust Intelligence Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multimodal anomaly surveillance across Amazon India, Flipkart, and Myntra
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetchProducts()}
            isLoading={isProductsRefetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => window.print()}
          >
            Export Brief
          </Button>
        </div>
      </div>

      {/* 1. Metric Cards Grid */}
      <MetricCardsGrid
        productsData={productsData}
        platformsData={platformsData}
        healthData={healthData}
        isLoading={isLoading}
      />

      {/* 2. Analytical Visualizations (Charts Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RiskDistributionChart isLoading={isLoading} />
        <MarketplaceComparisonChart isLoading={isLoading} />
      </div>

      {/* 3. Feeds & Telemetry (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MarketplaceCoverageCard platforms={platformsData} isLoading={isLoading} />
        <DataAvailabilityCard isLoading={isLoading} />
      </div>

      {/* 4. Recent Investigations Table */}
      <div className="pt-2">
        <RecentInvestigationsTable products={productsData?.items} isLoading={isLoading} />
      </div>
    </div>
  );
};
