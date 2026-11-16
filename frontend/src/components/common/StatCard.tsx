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
    sage: 'bg-[#F0F4EC] text-[#2F6B3E] border-[#C3DFCA]',
    teal: 'bg-[#EBF2F4] text-[#3D7584] border-[#D0E2E5]',
    'risk-moderate': 'bg-[#FDF4EB] text-[#A65E1E] border-[#F3D4B6]',
    'risk-elevated': 'bg-[#FBECEC] text-[#A83232] border-[#F3BFBF]',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <Card className={cn('relative overflow-hidden transition-all duration-200 hover:shadow-soft-md', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-28 my-1" />
          ) : (
            <div className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0D1B2A]">{value}</div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8EFF0]/70 text-[#3D7584] border border-[#DCE5E7]">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {isLoading ? (
            <Skeleton className="h-4 w-36" />
          ) : (
            <>
              {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
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
