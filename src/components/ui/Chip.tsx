'use client';
import React from 'react';

type ChipColor = 'primary' | 'success' | 'warning' | 'danger' | 'default';

interface ChipProps {
  color?: ChipColor;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const colorClasses: Record<ChipColor, string> = {
  primary: 'bg-paper-3 text-ink-2',
  success: 'bg-accent-soft text-accent-deep',
  warning: 'bg-wants-soft text-wants-ink',
  danger: 'bg-error-soft text-error',
  default: 'bg-surface text-ink',
};

export const Chip: React.FC<ChipProps> = ({
  color = 'default',
  children,
  onClose,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]} ${className}`}>
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-ink/10 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
};