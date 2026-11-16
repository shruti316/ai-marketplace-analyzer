import React from 'react';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Platform } from '../../types/catalog';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export interface MarketplaceCoverageCardProps {
  platforms?: Platform[];
  isLoading?: boolean;
}

export const MarketplaceCoverageCard: React.FC<MarketplaceCoverageCardProps> = ({
  platforms,
  isLoading = false,
}) => {
  const displayPlatforms = platforms && platforms.length > 0 ? platforms : [
    { id: '1', name: 'Amazon India', platform_name: 'amazon_in', base_url: 'https://www.amazon.in', country: 'IN', currency: 'INR' },
    { id: '2', name: 'Flipkart', platform_name: 'flipkart', base_url: 'https://www.flipkart.com', country: 'IN', currency: 'INR' },
    { id: '3', name: 'Myntra', platform_name: 'myntra', base_url: 'https://www.myntra.com', country: 'IN', currency: 'INR' },
  ];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-[#0D1B2A]">Marketplace Ingestion Feeds</h3>
          <p className="text-xs text-slate-500 mt-0.5">Active retail platform integrations</p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F0F4EC] text-[#2F6B3E] border border-[#C3DFCA]">
          3 Connected
        </span>
      </div>

      <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-around py-1">
        {isLoading ? (
          <div className="space-y-3 py-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          displayPlatforms.map((platform, idx) => {
            const displayName = platform.name || platform.platform_name || 'Marketplace';
            const platformKey = platform.platform_id || platform.id || `platform-${idx}`;
            return (
              <div key={platformKey} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#EBF2F4] text-[#3D7584] flex items-center justify-center font-bold text-xs border border-[#DCE5E7]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#0D1B2A] flex items-center gap-1.5">
                      {displayName}
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4D7C5B]" />
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {platform.currency || 'INR'} • {platform.country || 'IN'}
                    </p>
                  </div>
                </div>

                {platform.base_url && (
                  <a
                    href={platform.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-[#3D7584] transition-colors p-1"
                    aria-label={`Visit ${displayName}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
