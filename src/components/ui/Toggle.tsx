'use client';
import React, { forwardRef } from 'react';

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Toggle = forwardRef<HTMLLabelElement, ToggleProps>(
  (
    {
      label,
      checked,
      onChange,
      disabled = false,
      className = '',
    },
    ref
  ) => {
    return (
      <label
        ref={ref}
        className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
            checked ? 'bg-accent border-accent' : 'bg-surface border-rule'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform duration-200 ${
              checked ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
        {label && <span className="text-sm text-ink-2">{label}</span>}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';