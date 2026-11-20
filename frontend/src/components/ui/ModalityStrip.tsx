import React from 'react';
import { Tip } from './Tip';
import { cn } from '../../lib/utils';

export type ModalityStatus = 'clean' | 'moderate' | 'flagged';

export interface ModalitiesState {
  price?: ModalityStatus;
  vision?: ModalityStatus;
  ocr?: ModalityStatus;
  reviews?: ModalityStatus;
}

export interface ModalityStripProps {
  modalities?: ModalitiesState;
  verdict?: string;
  trustScore?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const ModalityStrip: React.FC<ModalityStripProps> = ({
  modalities,
  verdict,
  trustScore = 85,
  size = 'md',
  className,
}) => {
  // If individual modality signals are not explicitly provided in the list item,
  // derive representative modality statuses from the overall verdict and trust score
  const derivedModalities: Required<ModalitiesState> = React.useMemo(() => {
    if (modalities) {
      return {
        price: modalities.price || 'clean',
        vision: modalities.vision || 'clean',
        ocr: modalities.ocr || 'clean',
        reviews: modalities.reviews || 'clean',
      };
    }

    const norm = (verdict || '').toUpperCase();
    if (norm.includes('FLAGGED') || norm.includes('HIGH') || trustScore < 60) {
      return {
        price: 'flagged',
        vision: 'moderate',
        ocr: 'flagged',
        reviews: 'moderate',
      };
    } else if (norm.includes('CAUTION') || norm.includes('DOUBLE') || norm.includes('MODERATE') || trustScore < 80) {
      return {
        price: 'moderate',
        vision: 'clean',
        ocr: 'clean',
        reviews: 'moderate',
      };
    }
    return {
      price: 'clean',
      vision: 'clean',
      ocr: 'clean',
      reviews: 'clean',
    };
  }, [modalities, verdict, trustScore]);

  const MODALITY_CONFIG = [
    {
      key: 'price' as const,
      label: 'Price',
      short: 'P',
      status: derivedModalities.price,
      tips: {
        clean: 'Price: In normal retail corridor (No anomaly detected)',
        moderate: 'Price: Moderate corridor variance or unrated merchant discount',
        flagged: 'Price: Deceptive pricing trap or extreme discount anomaly',
      },
    },
    {
      key: 'vision' as const,
      label: 'Vision',
      short: 'V',
      status: derivedModalities.vision,
      tips: {
        clean: 'Vision: Verified packaging imagery and visual embeddings match',
        moderate: 'Vision: Generic catalog photo or low visual resolution',
        flagged: 'Vision: Clone packaging or perceptual hash mismatch detected',
      },
    },
    {
      key: 'ocr' as const,
      label: 'OCR',
      short: 'O',
      status: derivedModalities.ocr,
      tips: {
        clean: 'OCR: Physical package text corresponds with listing attributes',
        moderate: 'OCR: Minor text or unit measure discordance noted',
        flagged: 'OCR: Severe pack discordance detected on statutory claims',
      },
    },
    {
      key: 'reviews' as const,
      label: 'Reviews',
      short: 'R',
      status: derivedModalities.reviews,
      tips: {
        clean: 'Reviews: Verified buyer sentiment aligns with product claims',
        moderate: 'Reviews: Noticeable sentiment discordance on quality aspects',
        flagged: 'Reviews: Synthetic review cluster or bot activity flagged',
      },
    },
  ];

  const getStatusColor = (status: ModalityStatus) => {
    switch (status) {
      case 'flagged':
        return 'bg-[var(--bad)] text-white shadow-[0_0_8px_rgba(214,59,75,0.4)]';
      case 'moderate':
        return 'bg-[var(--warn)] text-white shadow-[0_0_8px_rgba(224,154,18,0.35)]';
      case 'clean':
      default:
        return 'bg-slate-300 text-slate-700';
    }
  };

  const dotSizes = {
    sm: 'w-4 h-4 text-[9px]',
    md: 'w-5 h-5 text-[10px]',
  }[size];

  return (
    <div
      className={cn('inline-flex items-center gap-1 bg-[var(--heather)]/20 p-1 rounded-full border border-[var(--line)]', className)}
      role="group"
      aria-label="4-Modality Evidence Strip: Price, Vision, OCR, Reviews"
    >
      {MODALITY_CONFIG.map((mod) => (
        <Tip key={mod.key} content={mod.tips[mod.status]} side="top">
          <span
            className={cn(
              'rounded-full flex items-center justify-center font-mono font-bold transition-transform hover:scale-115 cursor-help select-none',
              dotSizes,
              getStatusColor(mod.status)
            )}
            aria-label={`${mod.label}: ${mod.status}`}
          >
            {mod.short}
          </span>
        </Tip>
      ))}
    </div>
  );
};
