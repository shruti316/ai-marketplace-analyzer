import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  children,
  ...props
}) => {
  const configs = {
    info: {
      container: 'bg-[#EBF2F4] text-[#1E3E47] border-[#BCD4D8]',
      icon: <Info className="w-5 h-5 text-[#3D7584] shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-[#F0F4EC] text-[#22442C] border-[#C7DCBF]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#4D7C5B] shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-[#FDF4EB] text-[#5C340F] border-[#F2D1B2]',
      icon: <AlertTriangle className="w-5 h-5 text-[#C67D3B] shrink-0 mt-0.5" />,
    },
    danger: {
      container: 'bg-[#FBECEC] text-[#571B1B] border-[#F0B8B8]',
      icon: <AlertCircle className="w-5 h-5 text-[#B84A4A] shrink-0 mt-0.5" />,
    },
  };

  const config = configs[variant];

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-3 p-4 rounded-xl border text-sm', config.container, className)}
      {...props}
    >
      {config.icon}
      <div className="space-y-0.5 flex-1">
        {title && <h5 className="font-semibold text-sm">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-95">{children}</div>
      </div>
    </div>
  );
};
