'use client';

import React, { useState, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[#5F6F63] dark:text-[#A3B4A5]">{label}</label>
      )}
      <Listbox value={value || ''} onChange={onChange}>
        {({ open }) => (
          <div className="relative">
            <button
              type="button"
              className="calm-input w-full text-left flex items-center justify-between cursor-pointer"
            >
              <span className={value ? 'text-[#232B25] dark:text-white font-medium' : 'text-[#8A9A8E]'}>
                {value ? options.find(o => o.key === value)?.label : placeholder}
              </span>
              <svg
                className={`w-4 h-4 text-[#8A9A8E] transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition
              show={open}
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-2xl border border-[#E8E2D8] dark:border-[#2A362D] bg-[#FAF8F5] dark:bg-[#1E2720] shadow-xl p-1.5">
                {options.map((option) => (
                  <Listbox.Option key={option.key} value={option.key} className={({ selected, active }) => (
                    `relative cursor-pointer select-none py-2 px-3 rounded-xl text-xs font-medium transition-colors ${
                      selected ? 'bg-[#FCEEE9] text-[#D46743] dark:bg-[#301C15] dark:text-[#E28669] font-bold' : 'text-[#2C211B] dark:text-white'
                    } ${active && !selected ? 'bg-[#F4EFE8] dark:bg-[#2A362D]' : ''}`
                  )}>
                    {({ selected }) => (
                      <>
                        <span className="block truncate">{option.label}</span>
                        {selected && (
                          <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-badge-fg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </div>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
};