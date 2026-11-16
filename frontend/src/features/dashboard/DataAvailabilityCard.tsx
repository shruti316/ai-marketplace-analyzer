import React from 'react';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Check, ShieldAlert } from 'lucide-react';

export interface DataAvailabilityCardProps {
  isLoading?: boolean;
}

export const DataAvailabilityCard: React.FC<DataAvailabilityCardProps> = ({ isLoading = false }) => {
  const modalities = [
    { name: 'Review NLP & Duplication', status: 'Available', percent: 98, source: 'Seeded Amazon/Flipkart corpus' },
    { name: 'Pricing Distribution & Volatility', status: 'Available', percent: 95, source: 'Catalog cross-seller listings' },
    { name: 'Seller Governance & Rating', status: 'Available', percent: 92, source: 'Merchant registration registry' },
    { name: 'Packaging Forensic OCR', status: 'Available', percent: 84, source: 'Image OCR bounding-box cache' },
    { name: 'Graph Network Topology', status: 'Available', percent: 88, source: 'Brand-seller co-occurrence graph' },
    { name: 'Deep Vision Multimodal Embeddings', status: 'Internal Model', percent: 90, source: 'Python FastAPI (Port 8000)' },
  ];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-[#0D1B2A]">Modality Telemetry & Data Coverage</h3>
          <p className="text-xs text-slate-500 mt-0.5">Availability across evidence dimensions</p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FAF7F2] text-slate-600 border border-[#DCE5E7]">
          6 Modalities
        </span>
      </div>

      <div className="divide-y divide-slate-100 flex-1 pt-2">
        {isLoading ? (
          <div className="space-y-3 py-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          modalities.map((mod) => (
            <div key={mod.name} className="py-2.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{mod.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({mod.percent}%)</span>
                </div>
                <p className="text-[11px] text-slate-400">{mod.source}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F0F4EC] text-[#2F6B3E] font-medium text-[11px] border border-[#C3DFCA]">
                <Check className="w-3 h-3 text-[#4D7C5B]" />
                <span>{mod.status}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldAlert className="w-3.5 h-3.5 text-[#3D7584] shrink-0" />
        <span>Gated multimodal confidence applies conservative degradation when sparse.</span>
      </div>
    </Card>
  );
};
