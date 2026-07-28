import React from 'react';
import { Tag } from 'primereact/tag';

type ChipColor = 'primary' | 'success' | 'warning' | 'danger' | 'default';

interface ChipProps {
  color?: ChipColor;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const colorSeverityMap: Record<ChipColor, 'info' | 'success' | 'warning' | 'danger' | 'secondary' | null> = {
  primary: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  default: 'secondary',
};

const colorStyles: Record<ChipColor, string> = {
  primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  default: 'bg-cds-surface text-cds-foreground',
};

export const Chip: React.FC<ChipProps> = ({
  color = 'default',
  children,
  onClose,
  className = '',
}) => {
  return (
    <Tag
      severity={colorSeverityMap[color]}
      className={`${colorStyles[color]} ${className}`}
    >
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          ×
        </button>
      )}
    </Tag>
  );
};
