'use client';
import React, { forwardRef, useId } from 'react';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Error message; marks the field invalid and is announced to screen readers */
  error?: string | null;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      value,
      onChange,
      placeholder,
      className = '',
      error,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const id = rest.id ?? autoId;
    const errorId = error ? `${id}-error` : undefined;
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-2">{label}</label>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="notion-input min-h-[100px] resize-y"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...rest}
          id={id}
        />
        {error && (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-error">
            <i className="pi pi-exclamation-circle text-xs mt-1" aria-hidden="true"></i>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';