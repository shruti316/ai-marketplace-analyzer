import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <Card className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8EFF0] text-[#3D7584] mb-3">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h4 className="text-sm font-semibold text-[#0D1B2A]">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
};
