import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type VerdictType =
  | 'LOW_OBSERVED_ANOMALY'
  | 'MODERATE_SINGLE_MODALITY_ANOMALY'
  | 'ELEVATED_MULTIMODAL_ANOMALY'
  | 'UNASSESSED_SPARSE_DATA'
  | 'Authentic'
  | 'Caution'
  | 'Flagged'
  | 'Safe'
  | 'Double-Check'
  | 'High Anomaly'
  | 'Unassessed'
  | string;

export interface VerdictBadgeProps {
  verdict: VerdictType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  verdict,
  label,
  size = 'md',
  showDot = true,
  showIcon = true,
  className,
}) => {
  const norm = (verdict || '').toUpperCase().trim();

  let category: 'ok' | 'warn' | 'bad' | 'info' = 'info';
  let defaultLabel = verdict || 'Unassessed';
  let Icon = Info;

  if (
    norm.includes('LOW') ||
    norm.includes('AUTHENTIC') ||
    norm.includes('SAFE') ||
    norm.includes('VERIFIED')
  ) {
    category = 'ok';
    defaultLabel = label || 'Authentic';
    Icon = ShieldCheck;
  } else if (
    norm.includes('MODERATE') ||
    norm.includes('CAUTION') ||
    norm.includes('DOUBLE-CHECK') ||
    norm.includes('REVIEW ANOMAL')
  ) {
    category = 'warn';
    defaultLabel = label || 'Caution';
    Icon = AlertTriangle;
  } else if (
    norm.includes('ELEVATED') ||
    norm.includes('FLAGGED') ||
    norm.includes('HIGH ANOMAL') ||
    norm.includes('COUNTERFEIT')
  ) {
    category = 'bad';
    defaultLabel = label || 'Flagged';
    Icon = ShieldAlert;
  } else {
    category = 'info';
    defaultLabel = label || (norm.includes('SPARSE') ? 'Sparse Data' : verdict || 'Monitored');
    Icon = Info;
  }

  const styles = {
    ok: {
      container: 'bg-[var(--ok-bg)] text-[var(--ok-ink)] border-[var(--ok)]/25',
      dot: 'bg-[var(--ok)]',
      icon: 'text-[var(--ok-ink)]',
    },
    warn: {
      container: 'bg-[var(--warn-bg)] text-[var(--warn-ink)] border-[var(--warn)]/30',
      dot: 'bg-[var(--warn)]',
      icon: 'text-[var(--warn-ink)]',
    },
    bad: {
      container: 'bg-[var(--bad-bg)] text-[var(--bad-ink)] border-[var(--bad)]/30',
      dot: 'bg-[var(--bad)]',
      icon: 'text-[var(--bad-ink)]',
    },
    info: {
      container: 'bg-[var(--info-bg)] text-[var(--info-ink)] border-[var(--info)]/25',
      dot: 'bg-[var(--info)]',
      icon: 'text-[var(--info-ink)]',
    },
  }[category];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 rounded-md font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-full font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 rounded-full font-extrabold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3 shrink-0',
    md: 'w-3.5 h-3.5 shrink-0',
    lg: 'w-4 h-4 shrink-0',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center border shadow-xs tracking-tight select-none',
        styles.container,
        sizeStyles,
        className
      )}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', styles.dot)}
          aria-hidden="true"
        />
      )}
      {showIcon && <Icon className={cn(iconSizes, styles.icon)} aria-hidden="true" />}
      <span>{label || defaultLabel}</span>
    </span>
  );
};
