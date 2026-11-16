import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'subtle';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-[#DCE5E7] shadow-soft',
      elevated: 'bg-white border border-[#DCE5E7] shadow-soft-md',
      glass: 'glass-card shadow-soft',
      subtle: 'bg-[#FAF7F2] border border-[#E8EFF0]',
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
