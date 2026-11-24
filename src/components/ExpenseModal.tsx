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
      title={activeTab === 'gastos' ? 'Agregar Gasto' : 'Transferencia entre Fondos'}
    >
      {/* Modern Segmented Control Pills (Item 09 in study) */}
      <div className="calm-segmented-container mb-5" role="tablist" aria-label="Tipo de operación">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'gastos'}
          aria-controls="panel-gastos"
          id="tab-gastos"
          onClick={() => setActiveTab('gastos')}
          className={`calm-segmented-tab ${activeTab === 'gastos' ? 'calm-segmented-tab-active' : ''}`}
        >
          Gastos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transferencias'}
          aria-controls="panel-transferencias"
          id="tab-transferencias"
          onClick={() => setActiveTab('transferencias')}
          className={`calm-segmented-tab ${activeTab === 'transferencias' ? 'calm-segmented-tab-active' : ''}`}
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
