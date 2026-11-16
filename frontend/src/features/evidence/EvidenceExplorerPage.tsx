import React from 'react';
import { Card } from '../../components/ui/Card';
import { SearchCode, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EvidenceExplorerPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A]">
          Evidence Explorer
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Atomic evidence records, forensic provenance trails, and modality confidence breakdowns
        </p>
      </div>

      <Card className="p-8 text-center max-w-xl mx-auto my-8 border-dashed border-2 border-[#DCE5E7]">
        <div className="w-12 h-12 rounded-2xl bg-[#EBF2F4] text-[#3D7584] flex items-center justify-center mx-auto mb-4">
          <SearchCode className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[#0D1B2A]">Atomic Evidence & Provenance Inspector</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Detailed inspection of OCR bounding boxes, review duplication clusters, and price dispersion
          outliers will be rendered here.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3D7584] hover:underline"
          >
            <span>Return to Overview Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
};
