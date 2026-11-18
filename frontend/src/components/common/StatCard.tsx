import React from 'react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'sage' | 'teal' | 'risk-moderate' | 'risk-elevated' | 'default';
  };
  subtitle?: string;
  isLoading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  badge,
  subtitle,
  isLoading = false,
  className,
}) => {
  const badgeStyles = {
    sage: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
    teal: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
    'risk-moderate': 'bg-amber-950/40 text-amber-300 border-amber-500/30',
    'risk-elevated': 'bg-rose-950/40 text-rose-300 border-rose-500/30',
    default: 'bg-[#181D2E] text-slate-300 border-white/[0.08]',
  };

  return (
    <Card className={cn('relative overflow-hidden transition-all duration-200 hover:border-white/20', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-28 my-1" />
          ) : (
            <div className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-50 font-heading">{value}</div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#181D2E] text-indigo-400 border border-white/[0.08]">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
          {isLoading ? (
            <Skeleton className="h-4 w-36" />
          ) : (
            <>
              {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
              {badge && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-md font-medium text-[11px] border ml-auto',
                    badgeStyles[badge.variant || 'default']
                  )}
                >
                  {badge.text}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};
