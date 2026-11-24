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
  primary: 'bg-notion-badge-bg text-notion-badge-fg',
  success: 'bg-notion-success-badge-bg text-notion-success-badge-fg',
  warning: 'bg-notion-warn-badge-bg text-notion-warn-badge-fg',
  danger: 'bg-notion-danger-badge-bg text-notion-danger-badge-fg',
  default: 'bg-notion-surface text-notion-fg',
};

export const Chip: React.FC<ChipProps> = ({
  color = 'default',
  children,
  onClose,
  className = '',
}) => {
  return (
    <span className={`notion-pill ${colorClasses[color]} ${className}`}>
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
};