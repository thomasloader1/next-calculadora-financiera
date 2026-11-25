'use client';

import React, { useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // Focus trap: autofocus first focusable element
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const content = document.querySelector('[role="dialog"]') as HTMLElement;
        if (content) {
          const focusable = content.querySelector<HTMLElement>('input, select, textarea, button:not([disabled])');
          focusable?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-card bg-surface border border-rule shadow-lift text-left align-middle transition">
                <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
                  <Dialog.Title as="h2" className="text-lg text-ink">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="w-10 h-10 -mr-2 flex items-center justify-center rounded-input text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer"
                    onClick={onClose}
                    aria-label="Cerrar modal"
                  >
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export { Modal };
