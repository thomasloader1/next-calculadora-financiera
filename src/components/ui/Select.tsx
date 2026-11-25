'use client';

import React, { useState, useEffect } from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Label } from '@headlessui/react';

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
  /** Error message; marks the field invalid and is announced to screen readers */
  error?: string | null;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccione...',
  className = '',
  error,
}) => {
  const errorId = React.useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Listbox value={value || ''} onChange={onChange}>
        {({ open }) => (
          <div className="relative flex flex-col gap-1.5">
            {label && (
              <Label className="text-sm font-medium text-ink-2">{label}</Label>
            )}
            <ListboxButton
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="calm-input w-full text-left flex items-center justify-between cursor-pointer"
            >
              <span className={value ? 'text-ink font-medium' : 'text-muted'}>
                {value ? options.find(o => o.key === value)?.label : placeholder}
              </span>
              <svg aria-hidden="true"
                className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </ListboxButton>
            <ListboxOptions
              transition
              className="absolute top-full z-50 mt-1 w-full max-h-60 overflow-auto rounded-card border border-rule bg-surface shadow-lift p-1.5 focus:outline-none origin-top transition duration-micro ease-out data-[closed]:opacity-0 data-[closed]:scale-95"
            >
                {options.map((option) => (
                  <ListboxOption key={option.key} value={option.key} className={({ selected, focus }) => (
                    `relative cursor-pointer select-none py-2.5 pl-9 pr-3 rounded-input text-sm font-medium transition-colors ${
                      selected ? 'bg-paper-3 text-accent font-bold' : 'text-ink'
                    } ${focus && !selected ? 'bg-paper-2' : ''}`
                  )}>
                    {({ selected }) => (
                      <>
                        <span className="block truncate">{option.label}</span>
                        {selected && (
                          <svg aria-hidden="true"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </>
                    )}
                  </ListboxOption>
                ))}
            </ListboxOptions>
            {error && (
              <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-error">
                <i className="pi pi-exclamation-circle text-xs mt-1" aria-hidden="true"></i>
                <span>{error}</span>
              </p>
            )}
          </div>
        )}
      </Listbox>
    </div>
  );
};