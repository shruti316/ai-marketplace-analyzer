import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-[#16131F] hover:bg-[#4A3F4B] text-white shadow-xs focus-visible:ring-[#16131F] border border-transparent',
      secondary:
        'bg-white hover:bg-[#F8EDF2] text-[#16131F] border border-[rgba(193,160,172,0.35)] shadow-xs hover:border-[#C1A0AC] focus-visible:ring-[#16131F]',
      outline:
        'bg-transparent hover:bg-[#F8EDF2] text-[#16131F] border border-[rgba(193,160,172,0.5)] focus-visible:ring-[#16131F]',
      ghost:
        'bg-transparent hover:bg-[#F8EDF2] text-[#4A3F4B] hover:text-[#16131F] border border-transparent focus-visible:ring-[#16131F]',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white shadow-xs focus-visible:ring-rose-500 border border-transparent',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 rounded-lg min-h-[36px] gap-1.5',
      md: 'text-sm px-4 py-2 rounded-xl min-h-[42px] gap-2',
      lg: 'text-base px-6 py-2.5 rounded-xl min-h-[48px] gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
