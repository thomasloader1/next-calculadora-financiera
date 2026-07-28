import React from 'react';
import { InputText } from 'primereact/inputtext';

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

export const Input: React.FC<InputProps> = ({
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
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm text-cds-muted font-normal">{label}</label>
      )}
      <div className="flex items-center">
        {prefix && (
          <span className="pointer-events-none flex items-center pl-3 text-cds-muted text-sm">
            {prefix}
          </span>
        )}
        <div className="relative flex-1">
          <InputText
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full"
            {...rest}
          />
          {onClear && value !== '' && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-cds-muted hover:text-cds-foreground transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {description && (
        <p className="text-cds-muted text-xs">{description}</p>
      )}
    </div>
  );
};
