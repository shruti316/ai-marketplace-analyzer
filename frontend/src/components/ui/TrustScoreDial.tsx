import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { VerdictBadge } from './VerdictBadge';
import { Tip } from './Tip';
import { Info } from 'lucide-react';

export interface TrustScoreDialProps {
  score: number; // 0 - 100
  verdict: string;
  confidenceScore?: number; // 0.0 - 1.0 (e.g., 0.94)
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TrustScoreDial: React.FC<TrustScoreDialProps> = ({
  score,
  verdict,
  confidenceScore = 0.94,
  size = 'md',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  // Confidence margin of error calculation (approximate 95% CI)
  // Higher confidence = narrower margin of error
  const marginOfError = Math.max(3, Math.round((1 - confidenceScore) * 80));
  const ciLow = Math.max(0, score - marginOfError);
  const ciHigh = Math.min(100, score + marginOfError);

  // Determine stroke color and theme based on score
  const isHealthy = score >= 80;
  const isModerate = score >= 60 && score < 80;
  const strokeColor = isHealthy
    ? 'var(--ok)'
    : isModerate
    ? 'var(--warn)'
    : 'var(--bad)';
  const strokeBg = isHealthy
    ? 'var(--ok-bg)'
    : isModerate
    ? 'var(--warn-bg)'
    : 'var(--bad-bg)';

  // Dimensions based on size
  const dim = size === 'sm' ? 120 : size === 'lg' ? 180 : 150;
  const strokeWidth = size === 'sm' ? 9 : size === 'lg' ? 14 : 11;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Spring animation for the score counter and SVG arc
  const springValue = useSpring(0, {
    stiffness: 45,
    damping: 18,
    duration: 900,
  });

  const strokeDashoffset = useTransform(
    springValue,
    [0, 100],
    [circumference, circumference - (circumference * score) / 100]
  );

  useEffect(() => {
    springValue.set(score);
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return () => unsubscribe();
  }, [score, springValue]);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-white border border-[var(--line)] shadow-xs relative ${className}`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="TrustSphere Authenticity Score"
    >
      <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
        {/* Background track circle */}
        <svg
          width={dim}
          height={dim}
          className="transform -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="transparent"
            stroke={strokeBg}
            strokeWidth={strokeWidth}
          />
          {/* Animated active stroke */}
          <motion.circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Content: Animated Number & Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-mono text-[var(--text-3)] uppercase font-bold tracking-wider">
            Trust Score
          </span>
          <div className="flex items-baseline">
            <span
              className={`text-3xl sm:text-4xl font-black font-heading tabular-nums`}
              style={{ color: strokeColor }}
            >
              {displayValue}
            </span>
            <span className="text-xs text-[var(--text-3)] font-mono ml-0.5">/100</span>
          </div>

          {/* Confidence interval chip */}
          <Tip content={`Calculated with ${Math.round(confidenceScore * 100)}% engine confidence across active modalities.`}>
            <div className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-3)] cursor-help mt-0.5">
              <span>95% CI:</span>
              <span className="font-semibold text-[var(--ink)] tabular-nums">{ciLow}–{ciHigh}</span>
              <Info className="w-2.5 h-2.5 opacity-60" />
            </div>
          </Tip>
        </div>
      </div>

      {/* Pop-in Verdict Badge */}
      <motion.div
        className="mt-3"
        initial={{ opacity: 0, scale: 0.85, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.35, ease: 'easeOut' }}
      >
        <VerdictBadge verdict={verdict} size={size === 'sm' ? 'sm' : 'md'} />
      </motion.div>
    </div>
  );
};
