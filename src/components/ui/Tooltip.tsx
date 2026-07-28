'use client';
import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <button className="text-cds-muted hover:text-cds-primary transition-colors">
          <i className="pi pi-info-circle text-sm"></i>
        </button>
      )}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-cds-dark text-cds-canvas text-xs leading-relaxed rounded-cds-md shadow-xl pointer-events-none">
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-cds-dark" />
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
