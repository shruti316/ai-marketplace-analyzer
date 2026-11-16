import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
  className,
}) => {
  return (
    <Card className={cn('p-6 border-[#F0B8B8] bg-[#FBECEC]/30 text-center flex flex-col items-center justify-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBECEC] text-[#B84A4A] mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-semibold text-[#571B1B]">{title}</h4>
      <p className="mt-1 text-xs text-slate-600 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </Card>
  );
};
