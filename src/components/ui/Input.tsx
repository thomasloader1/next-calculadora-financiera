'use client';
import React, { forwardRef, useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  description?: React.ReactNode;
  /** Error message; marks the field invalid and is announced to screen readers */
  error?: string | null;
  type?: string;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      value,
      onChange,
      onClear,
      placeholder,
      prefix,
      description,
      error,
      type = 'text',
      className = '',
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const id = rest.id ?? autoId;
    const descId = description ? `${id}-desc` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, descId].filter(Boolean).join(' ') || undefined;
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-2">{label}</label>
        )}
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-sm text-muted">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={`calm-input ${prefix ? 'pl-10' : ''} ${onClear ? 'pr-10' : ''}`}
            {...rest}
            id={id}
          />
          {onClear && value !== '' && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Borrar"
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-input text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <i className="pi pi-times text-xs" aria-hidden="true"></i>
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-error">
            <i className="pi pi-exclamation-circle text-xs mt-1" aria-hidden="true"></i>
            <span>{error}</span>
          </p>
        )}
        {description && !error && (
          <p id={descId} className="text-sm text-muted tabular-nums min-h-[1lh]">{description}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';