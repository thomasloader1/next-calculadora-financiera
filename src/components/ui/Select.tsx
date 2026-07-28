'use client';

import React from 'react';
import { Dropdown } from 'primereact/dropdown';

interface SelectOption {
  key: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccione...',
  className = '',
}) => {
  // Transform { key, label } → { label, value } for PrimeReact Dropdown
  const prOptions = options.map((o) => ({ label: o.label, value: o.key }));

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm text-cds-muted font-normal">{label}</label>
      )}
      <Dropdown
        value={value || null}
        options={prOptions}
        onChange={(e) => onChange(e.value)}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
};
