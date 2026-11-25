'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ESTIMATED_HEIGHT = 160;
const TOOLTIP_MAX_WIDTH = 288; // w-72
const VIEWPORT_MARGIN = 12;

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
}

interface TooltipCoords {
  top?: number;
  bottom?: number;
  left: number;
  arrowLeft: number;
  direction: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const tooltipW = Math.min(TOOLTIP_MAX_WIDTH, viewportW - VIEWPORT_MARGIN * 2);

    const triggerCenterX = rect.left + rect.width / 2;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(viewportW - tooltipW - VIEWPORT_MARGIN, triggerCenterX - tooltipW / 2)
    );
    const arrowLeft = Math.max(14, Math.min(tooltipW - 14, triggerCenterX - left));

    const actualHeight = tooltipRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;
    const spaceAbove = rect.top;
    const spaceBelow = viewportH - rect.bottom;

    const direction: 'top' | 'bottom' =
      spaceAbove < actualHeight + 12 && spaceBelow > spaceAbove ? 'bottom' : 'top';

    if (direction === 'top') {
      setCoords({
        bottom: viewportH - rect.top + 8,
        left,
        arrowLeft,
        direction: 'top',
      });
    } else {
      setCoords({
        top: rect.bottom + 8,
        left,
        arrowLeft,
        direction: 'bottom',
      });
    }
  }, []);

  const show = () => {
    updatePosition();
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  // Re-measure once tooltip DOM node mounts and keep synced on scroll/resize/outside tap
  useEffect(() => {
    if (!isVisible) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVisible(false);
    };
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isVisible, updatePosition]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isVisible) hide();
            else show();
          }}
        >
          {children}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Más información"
          aria-expanded={isVisible}
          onClick={(e) => {
            e.stopPropagation();
            if (isVisible) hide();
            else show();
          }}
          className="w-8 h-8 -m-1.5 inline-flex items-center justify-center rounded-input text-muted hover:text-accent transition-colors cursor-pointer"
        >
          <i className="pi pi-info-circle text-sm" aria-hidden="true"></i>
        </button>
      )}

      {mounted && isVisible && coords && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            zIndex: 600,
          }}
          className="w-72 max-w-[calc(100vw-24px)] p-3 bg-ink-2 text-paper text-sm leading-relaxed rounded-input shadow-lift pointer-events-none"
        >
          {content}
          {/* Arrow */}
          <div
            style={{ left: coords.arrowLeft }}
            className={`absolute -translate-x-1/2 w-0 h-0 ${
              coords.direction === 'top'
                ? 'top-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-ink-2'
                : 'bottom-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-ink-2'
            }`}
          />
        </div>,
        document.body
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
    <p className="text-paper/80 mb-2">{description}</p>
    <div className="bg-paper/10 rounded px-2 py-1.5 text-paper/70">
      <span className="text-paper/50 text-xs">Ejemplo</span>
      <p className="text-paper/95 mt-0.5">{example}</p>
    </div>
  </div>
);

export { Tooltip, TooltipContent };
