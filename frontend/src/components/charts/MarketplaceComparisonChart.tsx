import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export interface MarketplaceStats {
  platform: string;
  products: number;
  listings: number;
}

export interface MarketplaceComparisonChartProps {
  data?: MarketplaceStats[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0D1B2A] text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1.5">
        <p className="font-semibold text-slate-200">{label}</p>
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.name}:</span>
            </span>
            <span className="font-bold text-white">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const MarketplaceComparisonChart: React.FC<MarketplaceComparisonChartProps> = ({
  data,
  isLoading = false,
}) => {
  const chartData = data && data.length > 0 ? data : [
    { platform: 'Amazon India', products: 1240, listings: 2890 },
    { platform: 'Flipkart', products: 980, listings: 2150 },
    { platform: 'Myntra', products: 437, listings: 920 },
  ];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-[#0D1B2A]">Marketplace Coverage Comparison</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-platform product catalog and active listings volume
          </p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FAF7F2] text-slate-600 border border-[#DCE5E7]">
          3 Major Marketplaces
        </span>
      </div>

      <div className="flex-1 min-h-[260px] w-full pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EFF0" />
              <XAxis
                dataKey="platform"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
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
              <Bar
                dataKey="products"
                name="Canonical Products"
                fill="#3D7584"
                radius={[6, 6, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="listings"
                name="Marketplace Listings"
                fill="#89BBBE"
                radius={[6, 6, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
