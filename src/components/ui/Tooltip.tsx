'use client';
import React, { useState, useRef, useEffect } from 'react';

const ESTIMATED_HEIGHT = 160; // w-72 with typical content (title + desc + example)

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceAbove < ESTIMATED_HEIGHT + 8 && spaceBelow > ESTIMATED_HEIGHT + 8) {
        setDirection('bottom');
      } else {
        setDirection('top');
      }
    }
    setIsVisible(true);
  };

  // Correct after render if estimate was off
  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    if (direction === 'top' && tooltipRect.top < 0) {
      setDirection('bottom');
    } else if (direction === 'bottom' && tooltipRect.bottom > window.innerHeight) {
      setDirection('top');
    }
  }, [isVisible, direction]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <button className="text-cds-muted hover:text-cds-primary transition-colors">
          <i className="pi pi-info-circle text-sm"></i>
        </button>
      )}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 left-1/2 -translate-x-1/2 w-72 p-3 bg-cds-dark text-cds-canvas text-xs leading-relaxed rounded-cds-md shadow-xl pointer-events-none ${
            direction === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
          }`}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
              direction === 'top'
                ? 'top-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-cds-dark'
                : 'bottom-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-cds-dark'
            }`}
          />
        </div>
      )}
    </div>
  );
};

/** Helper: tooltip content with title, description, and example */
const TooltipContent: React.FC<{
  title: string;
  description: string;
  example: string;
}> = ({ title, description, example }) => (
  <div>
    <p className="font-bold text-sm mb-1">{title}</p>
    <p className="text-white/80 mb-2">{description}</p>
    <div className="bg-white/10 rounded px-2 py-1.5 text-white/60">
      <span className="text-white/40 text-[10px] uppercase tracking-wider">Ejemplo</span>
      <p className="text-white/90 mt-0.5">{example}</p>
    </div>
  </div>
);

export { Tooltip, TooltipContent };
