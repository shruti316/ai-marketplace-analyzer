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
    healthy: 'bg-[#4D7C5B]',
    connected: 'bg-[#4D7C5B]',
    degraded: 'bg-[#C67D3B]',
    disconnected: 'bg-[#B84A4A]',
    idle: 'bg-slate-400',
  };

  const pingColors = {
    healthy: 'bg-[#4D7C5B]/40',
    connected: 'bg-[#4D7C5B]/40',
    degraded: 'bg-[#C67D3B]/40',
    disconnected: 'bg-[#B84A4A]/40',
    idle: 'bg-slate-400/40',
  };

  return (
    <div className={cn('inline-flex items-center gap-2 text-xs font-medium', className)}>
      <span className="relative flex h-2.5 w-2.5">
        {(isHealthy || isDegraded || isDisconnected) && (
          <span
            className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', pingColors[status])}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', dotColors[status])} />
      </span>
      {label && <span className="text-slate-600">{label}</span>}
    </div>
  );
};
