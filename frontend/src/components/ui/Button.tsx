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
        'bg-[#7C5DFA] hover:bg-[#6A49F2] text-white shadow-xs focus-visible:ring-[#7C5DFA] border border-transparent',
      secondary:
        'bg-[#F9F8FC] hover:bg-[#EDE9FE]/50 text-[#16131F] border border-[#ECE8F2] shadow-xs hover:border-[#C1A0AC] focus-visible:ring-[#7C5DFA]',
      outline:
        'bg-transparent hover:bg-[#EDE9FE]/40 text-[#7C5DFA] border border-[#7C5DFA]/40 focus-visible:ring-[#7C5DFA]',
      ghost:
        'bg-transparent hover:bg-[#F6F5FA] text-[#4A3F4B] hover:text-[#16131F] border border-transparent focus-visible:ring-slate-400',
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
