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
      default: 'bg-[#EDE9FE] text-[#7C5DFA] border-[#7C5DFA]/20',
      teal: 'bg-[#EDE9FE] text-[#7C5DFA] border-[#7C5DFA]/30',
      navy: 'bg-[#F9F8FC] text-[#16131F] border-[#ECE8F2]',
      sage: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      lavender: 'bg-[#F0D9E4]/60 text-[#4A3F4B] border-[#C1A0AC]/30',
      'risk-low': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'risk-moderate': 'bg-amber-50 text-amber-800 border-amber-200',
      'risk-elevated': 'bg-rose-50 text-rose-800 border-rose-200',
      'risk-sparse': 'bg-slate-100 text-slate-700 border-slate-200',
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
