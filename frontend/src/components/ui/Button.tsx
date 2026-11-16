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
        'bg-[#3D7584] hover:bg-[#32606D] text-white shadow-sm focus-visible:ring-[#3D7584] border border-transparent',
      secondary:
        'bg-white hover:bg-[#F6EFE3]/50 text-[#0D1B2A] border border-[#DCE5E7] shadow-sm hover:border-[#89BBBE] focus-visible:ring-[#3D7584]',
      outline:
        'bg-transparent hover:bg-[#EBF2F4] text-[#3D7584] border border-[#3D7584] focus-visible:ring-[#3D7584]',
      ghost:
        'bg-transparent hover:bg-[#E8EFF0]/60 text-slate-700 hover:text-[#0D1B2A] border border-transparent focus-visible:ring-slate-400',
      danger:
        'bg-[#B84A4A] hover:bg-[#A33D3D] text-white shadow-sm focus-visible:ring-[#B84A4A] border border-transparent',
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
