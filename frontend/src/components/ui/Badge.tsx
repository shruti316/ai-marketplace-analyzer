import React from 'react';
import { cn } from '../../lib/utils';
import { RiskTier } from '../../types/trust';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'teal' | 'navy' | 'sage' | 'lavender' | 'risk-low' | 'risk-moderate' | 'risk-elevated' | 'risk-sparse';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-100 text-slate-700 border-slate-200',
      teal: 'bg-[#EBF2F4] text-[#3D7584] border-[#D0E2E5]',
      navy: 'bg-[#0D1B2A] text-white border-transparent',
      sage: 'bg-[#F0F4EC] text-[#4D7C5B] border-[#D5E3CE]',
      lavender: 'bg-[#F3F1F9] text-[#6E63A6] border-[#DDD8F0]',
      'risk-low': 'bg-[#EEF6F0] text-[#2F6B3E] border-[#C3DFCA]',
      'risk-moderate': 'bg-[#FDF4EB] text-[#A65E1E] border-[#F3D4B6]',
      'risk-elevated': 'bg-[#FBECEC] text-[#A83232] border-[#F3BFBF]',
      'risk-sparse': 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
    };

    const sizes = {
      sm: 'text-[11px] font-semibold px-2 py-0.5 rounded-md border',
      md: 'text-xs font-semibold px-2.5 py-1 rounded-lg border',
    };

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center gap-1.5 font-medium tracking-wide', variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export function getRiskTierBadge(tier: RiskTier | string | undefined): { variant: BadgeProps['variant']; label: string } {
  switch (tier) {
    case 'LOW_OBSERVED_ANOMALY':
      return { variant: 'risk-low', label: 'Low Observed Anomaly' };
    case 'MODERATE_SINGLE_MODALITY_ANOMALY':
      return { variant: 'risk-moderate', label: 'Moderate Anomaly' };
    case 'ELEVATED_MULTIMODAL_ANOMALY':
      return { variant: 'risk-elevated', label: 'Elevated Anomaly' };
    case 'UNASSESSED_SPARSE_DATA':
    default:
      return { variant: 'risk-sparse', label: 'Sparse / Unassessed' };
  }
}
