import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Camera,
  FileSearch,
  MessageSquare,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface AnalysisStepperProps {
  currentStep: number; // 0 to 4 (4 = completed)
  isComplete?: boolean;
  className?: string;
}

const STEPS = [
  {
    title: 'Pricing Corridor',
    shortName: 'Price Corridor',
    subtitle: 'Computing category IQR, discount dispersion & anomaly z-score',
    icon: TrendingUp,
    modalityTag: 'Price Engine',
  },
  {
    title: 'Computer Vision',
    shortName: 'Vision Embedding',
    subtitle: 'Extracting 512-dim latent embeddings & Laplacian edge sharpness',
    icon: Camera,
    modalityTag: 'ResNet-50 / CLIP',
  },
  {
    title: 'Pack OCR',
    shortName: 'Packaging OCR',
    subtitle: 'Parsing Legal Metrology declarations, batch code & printed MRP',
    icon: FileSearch,
    modalityTag: 'OCR Engine',
  },
  {
    title: 'NLP Review ABSA',
    shortName: 'Aspect Sentiment',
    subtitle: 'Scoring buyer review sentiments across 5 canonical product aspects',
    icon: MessageSquare,
    modalityTag: 'NLP ABSA',
  },
];

export const AnalysisStepper: React.FC<AnalysisStepperProps> = ({
  currentStep,
  isComplete = false,
  className = '',
}) => {
  const activeIndex = isComplete ? 4 : Math.min(Math.max(currentStep, 0), 3);
  const progressPercent = isComplete ? 100 : Math.round(((activeIndex + 0.5) / 4) * 100);

  return (
    <div
      className={`glow-card rounded-[24px] p-6 sm:p-7 border border-[var(--line)] shadow-[0_12px_32px_rgba(22,19,31,0.08)] bg-white space-y-6 ${className}`}
      role="region"
      aria-label="Multimodal Investigation Progress"
    >
      {/* Header with Title & Live Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE8F2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--heather)] text-[var(--accent)] flex items-center justify-center border border-[var(--line)] shrink-0">
            {isComplete ? (
              <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--accent)] px-2 py-0.5 rounded-full bg-[var(--heather)] border border-[var(--line)]">
                {isComplete ? 'Analysis Complete' : 'Investigation In Flight'}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-3)] tabular-nums">
                {isComplete ? 'All 4 Modalities Verified' : `Stage ${activeIndex + 1} of 4`}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-[var(--ink)] font-heading mt-0.5">
              {isComplete
                ? 'Synthesizing Multimodal Report & Risk Tier...'
                : 'Corroborating Multimodal Authenticity Evidence'}
            </h4>
          </div>
        </div>

        {/* Numeric Progress Indicator */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-xs font-mono text-[var(--text-3)] block">Progress</span>
            <span className="text-base font-black font-mono text-[var(--accent)] tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-[#ECE8F2] h-2 rounded-full overflow-hidden relative">
        <motion.div
          className="bg-gradient-to-r from-[var(--accent)] via-[#8E3F7A] to-[#12A36B] h-full rounded-full"
          initial={{ width: '12%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* 4-Step Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {STEPS.map((step, idx) => {
          const isDone = isComplete || activeIndex > idx;
          const isActive = !isComplete && activeIndex === idx;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.title}
              initial={false}
              animate={{
                scale: isActive ? 1.02 : 1,
                borderColor: isActive
                  ? 'rgba(107, 45, 92, 0.45)'
                  : isDone
                  ? 'rgba(18, 163, 107, 0.35)'
                  : 'rgba(236, 232, 242, 1)',
              }}
              transition={{ duration: 0.25 }}
              className={`relative rounded-2xl p-4 border transition-all overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-b from-[var(--heather)]/40 to-white shadow-md ring-2 ring-[var(--accent)]/30'
                  : isDone
                  ? 'bg-emerald-50/40'
                  : 'bg-[#FDFCFE] opacity-75'
              }`}
            >
              {/* Shimmer on active step */}
              {isActive && (
                <div
                  className="absolute inset-0 animate-shimmer pointer-events-none opacity-40"
                  aria-hidden="true"
                />
              )}

              <div className="relative z-10 space-y-2.5">
                <div className="flex items-center justify-between">
                  {/* Step status node icon */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-[var(--ok-bg)] text-[var(--ok-ink)] border border-[var(--ok)]/30'
                        : isActive
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'bg-[#ECE8F2] text-[var(--text-3)]'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {isDone ? (
                        <motion.div
                          key="done"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </motion.div>
                      ) : isActive ? (
                        <motion.div
                          key="active"
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                        >
                          <Loader2 className="w-4 h-4 stroke-[2.5]" />
                        </motion.div>
                      ) : (
                        <span className="font-mono text-[11px]">{idx + 1}</span>
                      )}
                    </AnimatePresence>
                  </div>

                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-white border border-[#ECE8F2] text-[var(--text-3)] font-semibold">
                    {step.modalityTag}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isDone
                          ? 'text-[var(--ok)]'
                          : isActive
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-3)]'
                      }`}
                    />
                    <h5 className="text-xs font-bold text-[var(--ink)] font-heading leading-tight">
                      {step.title}
                    </h5>
                  </div>
                  <p className="text-[11px] text-[var(--text-2)] mt-1 line-clamp-2 leading-relaxed">
                    {step.subtitle}
                  </p>
                </div>

                {/* Status indicator line */}
                <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono font-semibold">
                  {isDone ? (
                    <span className="text-[var(--ok-ink)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" /> Verified & Concordant
                    </span>
                  ) : isActive ? (
                    <span className="text-[var(--accent)] flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> Processing live...
                    </span>
                  ) : (
                    <span className="text-[var(--text-3)]">Queued</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
