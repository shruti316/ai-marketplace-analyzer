import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'subtle';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] text-[#16131F]',
      elevated: 'bg-[#FDFBFC] border border-[rgba(193,160,172,0.35)] shadow-[0_16px_36px_rgba(22,19,31,0.08)] text-[#16131F]',
      glass: 'bg-white/95 backdrop-blur-md border border-[rgba(193,160,172,0.35)] shadow-[0_8px_24px_rgba(22,19,31,0.06)] text-[#16131F]',
      subtle: 'bg-[#FDFBFC] border border-[rgba(193,160,172,0.30)] shadow-[0_2px_8px_rgba(22,19,31,0.04)] text-[#16131F]',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-[24px] p-6 transition-all duration-150', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
