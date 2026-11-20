import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, shimmer = true, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        shimmer
          ? 'animate-shimmer border border-[var(--line)] bg-[var(--heather)]/20'
          : 'animate-pulse bg-[var(--heather)]/40',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
};
