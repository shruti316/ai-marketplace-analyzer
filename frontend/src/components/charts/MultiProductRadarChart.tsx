import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';

export interface ProductComparisonDimension {
  id: string;
  label: string; // e.g. "Product A (Kotty Jacket)"
  shortName: string; // e.g. "Product A"
  productQuality?: number;
  sellerReliability?: number;
  listingAuthenticity?: number;
  websiteLegitimacy?: number;
  overallTrust?: number;
  trustScore?: number;
  priceScore?: number;
  merchantScore?: number;
  reviewScore?: number;
  specScore?: number;
  isWinner?: boolean;
}

export interface MultiProductRadarChartProps {
  products: ProductComparisonDimension[];
  className?: string;
}

const PALETTE = [
  { stroke: '#6B2D5C', fill: '#6B2D5C', name: 'Plum (Winner)' },
  { stroke: '#8E3F7A', fill: '#8E3F7A', name: 'Heather Rose' },
  { stroke: '#12A36B', fill: '#12A36B', name: 'Emerald' },
  { stroke: '#E09A12', fill: '#E09A12', name: 'Amber' },
  { stroke: '#D63B4B', fill: '#D63B4B', name: 'Coral' },
];

export const MultiProductRadarChart: React.FC<MultiProductRadarChartProps> = ({
  products,
  className = '',
}) => {
  if (!products || products.length === 0) return null;

  // Transform into Recharts Radar format - 5 Standardized Dimensions
  const dimensions = [
    { key: 'productQuality', fallback: 'reviewScore', label: 'Product Quality' },
    { key: 'sellerReliability', fallback: 'merchantScore', label: 'Seller Reliability' },
    { key: 'listingAuthenticity', fallback: 'priceScore', label: 'Listing Authenticity' },
    { key: 'websiteLegitimacy', fallback: 'specScore', label: 'Website Legitimacy' },
    { key: 'overallTrust', fallback: 'trustScore', label: 'Overall Trust' },
  ];

  const radarData = dimensions.map((dim) => {
    const row: Record<string, any> = { dimension: dim.label, fullMark: 100 };
    products.forEach((p, idx) => {
      row[`product_${idx}`] = (p as any)[dim.key] ?? (p as any)[dim.fallback] ?? 75;
    });
    return row;
  });

  return (
    <div className={`p-6 rounded-[24px] bg-white border border-[var(--line)] shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--ink)] font-heading uppercase tracking-wider">
              Multimodal Radar Comparison Overlay
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--heather)] text-[var(--accent)] font-bold">
              {products.length} Offerings Evaluated
            </span>
          </div>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Cross-product footprint across Authenticity, Price, Merchant, Reviews, and Spec dimensions
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {products.map((p, idx) => (
            <span key={p.id || idx} className="flex items-center gap-1.5 font-semibold">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: PALETTE[idx % PALETTE.length].stroke }}
              />
              <span className="text-[var(--ink)]">{p.shortName}</span>
              {p.isWinner && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Top Pick
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Radar Canvas */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <PolarGrid stroke="rgba(193,160,172,0.3)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#4A3F4B', fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#6F5B68', fontSize: 9 }}
              stroke="rgba(193,160,172,0.35)"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-[var(--line)] rounded-xl p-3 shadow-xl text-xs space-y-1.5 font-sans">
                      <div className="font-bold text-[var(--ink)] font-heading">{data.dimension}</div>
                      <div className="space-y-1 pt-1 border-t border-[var(--line)]">
                        {products.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 font-mono">
                            <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: PALETTE[idx % PALETTE.length].stroke }}
                              />
                              <span>{p.shortName}:</span>
                            </span>
                            <span className="font-bold text-[var(--ink)] tabular-nums">
                              {data[`product_${idx}`]}/100
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {products.map((p, idx) => {
              const pal = PALETTE[idx % PALETTE.length];
              return (
                <Radar
                  key={p.id || idx}
                  name={p.label || p.shortName}
                  dataKey={`product_${idx}`}
                  stroke={pal.stroke}
                  fill={pal.fill}
                  fillOpacity={p.isWinner ? 0.35 : 0.18}
                  strokeWidth={p.isWinner ? 2.5 : 1.5}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Footnote */}
      <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--text-3)] font-mono">
        <span>Higher polygon coverage indicates stronger overall commercial footprint</span>
        <span>Normalized scale: 0–100</span>
      </div>
    </div>
  );
};
