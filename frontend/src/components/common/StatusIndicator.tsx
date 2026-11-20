import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusIndicatorProps {
  status: 'healthy' | 'degraded' | 'disconnected' | 'connected' | 'idle';
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, className }) => {
  const isHealthy = status === 'healthy' || status === 'connected';
  const isDegraded = status === 'degraded';
  const isDisconnected = status === 'disconnected';

  const dotColors = {
    healthy: 'bg-emerald-600',
    connected: 'bg-emerald-600',
    degraded: 'bg-amber-500',
    disconnected: 'bg-rose-500',
    idle: 'bg-slate-400',
  };

  const pingColors = {
    healthy: 'bg-emerald-400/40',
    connected: 'bg-emerald-400/40',
    degraded: 'bg-amber-400/40',
    disconnected: 'bg-rose-400/40',
    idle: 'bg-slate-400/40',
  };

  return (
    <div className={cn('inline-flex items-center gap-2 text-xs font-medium', className)}>
      <span className="relative flex h-2 w-2">
        {(isHealthy || isDegraded || isDisconnected) && (
          <span
            className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', pingColors[status])}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColors[status])} />
      </span>
      {label && <span className="text-[#4A3F4B]">{label}</span>}
    </div>
  );
};
