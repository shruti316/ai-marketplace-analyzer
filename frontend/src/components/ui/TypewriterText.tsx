import React, { useState, useEffect } from 'react';

export interface TypewriterTextProps {
  text: string;
  speedMs?: number; // ms per chunk
  onComplete?: () => void;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speedMs = 12,
  onComplete,
  className = '',
}) => {
  const [displayedLength, setDisplayedLength] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<boolean>(true);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayedLength(text.length);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    setDisplayedLength(0);
    setIsTyping(true);

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 2; // type 2 characters at a time for natural fast speech tempo
      if (currentIndex >= text.length) {
        setDisplayedLength(text.length);
        setIsTyping(false);
        clearInterval(interval);
        onComplete?.();
      } else {
        setDisplayedLength(currentIndex);
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, speedMs, onComplete]);

  const handleSkip = () => {
    setDisplayedLength(text.length);
    setIsTyping(false);
    onComplete?.();
  };

  return (
    <span
      className={`inline ${className} cursor-pointer`}
      onClick={handleSkip}
      title={isTyping ? 'Click to show all text' : undefined}
    >
      {text.slice(0, displayedLength)}
      {isTyping && (
        <span
          className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--accent)] animate-pulse align-middle"
          aria-hidden="true"
        />
      )}
    </span>
  );
};
