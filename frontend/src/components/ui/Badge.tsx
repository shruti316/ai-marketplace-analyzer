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
      default: 'bg-[#181D2E] text-slate-300 border-white/[0.08]',
      teal: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
      navy: 'bg-[#0B0D14] text-slate-200 border-white/[0.08]',
      sage: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
      lavender: 'bg-purple-950/40 text-purple-300 border-purple-500/30',
      'risk-low': 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
      'risk-moderate': 'bg-amber-950/40 text-amber-300 border-amber-500/30',
      'risk-elevated': 'bg-rose-950/40 text-rose-300 border-rose-500/30',
      'risk-sparse': 'bg-slate-800 text-slate-300 border-slate-700',
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
