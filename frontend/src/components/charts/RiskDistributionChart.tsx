import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export interface RiskDistributionData {
  name: string;
  count: number;
  tier: 'LOW' | 'MODERATE' | 'ELEVATED' | 'SPARSE';
}

export interface RiskDistributionChartProps {
  data?: RiskDistributionData[];
  isLoading?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  LOW: '#4D7C5B', // Sage
  MODERATE: '#C67D3B', // Muted Amber
  ELEVATED: '#B84A4A', // Terracotta
  SPARSE: '#94A3B8', // Mist Slate
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: RiskDistributionData;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-[#0D1B2A] text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
        <p className="font-semibold text-slate-200">{item.name}</p>
        <p className="text-slate-300">
          Evaluated Products:{' '}
          <span className="font-bold text-white">{item.value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  data,
  isLoading = false,
}) => {
  // Balanced baseline dataset illustrating calibrated multi-modal tiers across seeded data
  const chartData = data && data.length > 0 ? data : [
    { name: 'Low Observed Anomaly', count: 1840, tier: 'LOW' as const },
    { name: 'Moderate Anomaly', count: 420, tier: 'MODERATE' as const },
    { name: 'Elevated Multimodal Anomaly', count: 185, tier: 'ELEVATED' as const },
    { name: 'Sparse / Unassessed', count: 212, tier: 'SPARSE' as const },
  ];

  const totalAssessed = chartData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-[#0D1B2A]">Risk & Anomaly Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Calibrated multimodal risk classifications across catalog
          </p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#EBF2F4] text-[#3D7584] border border-[#D0E2E5]">
          {totalAssessed.toLocaleString()} Assessed
        </span>
      </div>

      <div className="flex-1 min-h-[260px] w-full pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={88}
                paddingAngle={3}
                stroke="#FAF7F2"
                strokeWidth={2}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={TIER_COLORS[entry.tier] || '#94A3B8'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-[11px] font-medium text-slate-600 ml-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
