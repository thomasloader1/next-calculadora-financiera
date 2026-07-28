'use client';
import React, { useEffect } from 'react';
import { Dialog } from 'primereact/dialog';

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
        const el = document.querySelector('[data-pc-section="header"] + [data-pc-section="content"]') as HTMLElement;
        if (el) {
          const focusable = el.querySelector<HTMLElement>('input, select, textarea, button:not([disabled])');
          focusable?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={title}
      modal
      closable
      closeOnEscape
      dismissableMask
      draggable={false}
      resizable={false}
      blockScroll
      aria-labelledby="modal-title"
      aria-modal="true"
      className="max-w-md w-full"
      contentClassName="p-0"
      pt={{
        header: {
          className: 'px-5 py-4 border-b border-cds-border',
        },
        headerTitle: {
          className: 'text-sm font-semibold text-cds-foreground dark:text-white',
        },
        closeButton: {
          className: 'w-7 h-7 flex items-center justify-center rounded-full hover:bg-cds-surface dark:hover:bg-cds-surface-dark text-cds-muted hover:text-cds-foreground transition-colors',
        },
        content: {
          className: 'p-5 bg-cds-surface rounded-b-cds-lg',
        },
      }}
    >
      {children}
    </Dialog>
  );
};

export { Modal };
