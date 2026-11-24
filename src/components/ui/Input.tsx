'use client';
import React, { forwardRef } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  description?: React.ReactNode;
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
      type = 'text',
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label className="text-xs font-semibold text-[#6B5547] dark:text-[#C4B1A3]">{label}</label>
        )}
        <div className="flex items-center">
          {prefix && (
            <span className="pointer-events-none flex items-center pl-3.5 text-sm text-[#9E8575]">
              {prefix}
            </span>
          )}
          <div className="relative flex-1">
            <input
              ref={ref}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="calm-input"
              {...rest}
            />
            {onClear && value !== '' && (
              <button
                type="button"
                onClick={onClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-[#9E8575] hover:text-[#2C211B] dark:hover:text-white transition-colors cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>
        {description && (
          <p className="notion-body-sm text-notion-meta">{description}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';