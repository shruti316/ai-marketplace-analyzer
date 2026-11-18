import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'subtle';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-[#111522] border border-white/[0.08] shadow-sm text-slate-100',
      elevated: 'bg-[#181D2E] border border-white/[0.08] shadow-md text-slate-100',
      glass: 'bg-[#111522]/80 backdrop-blur-md border border-white/[0.08] text-slate-100',
      subtle: 'bg-[#181D2E] border border-white/[0.05] text-slate-100',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-card p-5 transition-shadow duration-150', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
