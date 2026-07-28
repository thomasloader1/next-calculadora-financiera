'use client';
import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import AddExpenseForm from './AddExpenseForm';
import TransferForm from './TransferForm';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultTab?: 'gastos' | 'transferencias';
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultCategory,
  defaultTab = 'gastos',
}) => {
  const [activeTab, setActiveTab] = useState<'gastos' | 'transferencias'>(defaultTab);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === 'gastos' ? 'Agregar gasto' : 'Transferencia'}
    >
      {/* Tabs */}
      <div className="flex border-b border-cds-border mb-5 -mx-5 px-5" role="tablist" aria-label="Tipo de operación">
        <button
          role="tab"
          aria-selected={activeTab === 'gastos'}
          aria-controls="panel-gastos"
          id="tab-gastos"
          onClick={() => setActiveTab('gastos')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-cds-primary ${
            activeTab === 'gastos'
              ? 'border-cds-primary text-cds-foreground'
              : 'border-transparent text-cds-muted hover:text-cds-foreground'
          }`}
        >
          Gastos
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'transferencias'}
          aria-controls="panel-transferencias"
          id="tab-transferencias"
          onClick={() => setActiveTab('transferencias')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-cds-primary ${
            activeTab === 'transferencias'
              ? 'border-cds-primary text-cds-foreground'
              : 'border-transparent text-cds-muted hover:text-cds-foreground'
          }`}
        >
          Transferencias
        </button>
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={activeTab === 'gastos' ? 'panel-gastos' : 'panel-transferencias'}
        aria-labelledby={activeTab === 'gastos' ? 'tab-gastos' : 'tab-transferencias'}
        className="space-y-1"
      >
        {activeTab === 'gastos' ? (
          <AddExpenseForm defaultCategory={defaultCategory} onAdded={onClose} />
        ) : (
          <TransferForm onTransferred={onClose} />
        )}
      </div>
    </Modal>
  );
};

export default ExpenseModal;
