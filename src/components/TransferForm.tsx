'use client';

import React, { useState, useMemo } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { CategoryKey } from '@/interfaces/Transfer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from 'sonner';
import { parseMaskedAmount } from '@/lib/formatAmount';

const CATEGORY_OPTIONS = [
  { key: 'needs', label: 'Necesidad' },
  { key: 'wants', label: 'Imprevistos' },
  { key: 'savings', label: 'Ahorro' },
];

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

interface TransferFormProps {
  /** When provided, renders as compact form (no accordion) */
  onTransferred?: () => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onTransferred }) => {
  const { cash, addTransfer } = useExpenseContext();
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const isCompact = !!onTransferred;

  const remaining = useMemo(() => {
    if (!cash) return { needs: 0, wants: 0, savings: 0 };
    return {
      needs: cash.needs,
      wants: cash.wants,
      savings: cash.savings,
    };
  }, [cash]);

  const availableOptions = CATEGORY_OPTIONS.filter(opt => {
    const rem = remaining[opt.key as CategoryKey];
    return rem > 0;
  });

  const handleTransfer = () => {
    if (!from || !to || !amount) return;

    if (from === to) {
      toast.warning('No podés transferir a la misma categoría.');
      return;
    }

    const parsedAmount = parseMaskedAmount(amount);
    if (parsedAmount <= 0) {
      toast.warning('El monto debe ser mayor a cero.');
      return;
    }

    if (parsedAmount > (remaining[from as CategoryKey] || 0)) {
      toast.warning(`Solo tenés ${formatAmountInner(remaining[from as CategoryKey])} disponible en ${CATEGORY_LABELS[from]}.`);
      return;
    }

    addTransfer(from as CategoryKey, to as CategoryKey, parsedAmount, 'Transferencia manual', remaining);

    setFrom('');
    setTo('');
    setAmount('');
    if (isCompact) {
      onTransferred?.();
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (from && to && amount && from !== to) {
        handleTransfer();
      }
    }
  };

  // Compact mode — used inside modal
  if (isCompact) {
    return (
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Desde (Origen)"
            value={from}
            onChange={setFrom}
            options={availableOptions.length > 0 ? availableOptions : CATEGORY_OPTIONS}
            placeholder="Seleccionar origen"
          />
          <Select
            label="Hacia (Destino)"
            value={to}
            onChange={setTo}
            options={CATEGORY_OPTIONS.filter(opt => opt.key !== from)}
            placeholder="Seleccionar destino"
          />
        </div>

        <div>
          <Input
            type="text"
            inputMode="decimal"
            label="Monto a transferir"
            value={amount}
            onChange={setAmount}
            placeholder="150000"
            prefix={<span className="text-[#8A9A8E] text-sm">$</span>}
          />
        </div>

        {from && (
          <div className="p-3 bg-[#F4EFE8] dark:bg-[#1E2720] rounded-2xl border border-[#E8E2D8] dark:border-[#2A362D] text-xs text-[#5F6F63] dark:text-[#A3B4A5] flex items-center justify-between">
            <span>Disponible en {CATEGORY_LABELS[from]}:</span>
            <span className="font-bold font-mono text-[#232B25] dark:text-white">
              {formatAmountInner(remaining[from as CategoryKey])}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-[#8A9A8E] font-mono hidden sm:inline">
            <kbd className="px-1.5 py-0.5 bg-[#F4EFE8] dark:bg-[#1E2720] rounded-md border border-[#E8E2D8] dark:border-[#2A362D]">⌘/Ctrl+Enter</kbd> para transferir
          </span>
          <Button
            size="md"
            isDisabled={!from || !to || !amount || from === to}
            onClick={handleTransfer}
            className="w-full sm:w-auto"
          >
            Confirmar Transferencia
          </Button>
        </div>
      </div>
    );
  }

  // Accordion mode — standalone
  return (
    <div className="calm-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F4EFE8]/50 dark:hover:bg-[#1E2720]/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#232B25] dark:text-white uppercase tracking-wider">
          <i className="pi pi-exchange-alt text-[#D46743] text-xs"></i>
          <span>Transferencia manual de fondos</span>
        </div>
        <i className={`pi pi-chevron-down text-xs text-[#8A9A8E] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-5 pb-5 space-y-4 border-t border-[#E8E2D8] dark:border-[#2A362D] pt-4" onKeyDown={handleKeyDown}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Desde (Origen)"
              value={from}
              onChange={setFrom}
              options={availableOptions.length > 0 ? availableOptions : CATEGORY_OPTIONS}
              placeholder="Seleccionar origen"
            />
            <Select
              label="Hacia (Destino)"
              value={to}
              onChange={setTo}
              options={CATEGORY_OPTIONS.filter(opt => opt.key !== from)}
              placeholder="Seleccionar destino"
            />
          </div>

          <Input
            type="text"
            inputMode="decimal"
            label="Monto a transferir"
            value={amount}
            onChange={setAmount}
            placeholder="150000"
            prefix={<span className="text-[#8A9A8E] text-sm">$</span>}
          />

          {from && (
            <div className="p-3 bg-[#F4EFE8] dark:bg-[#1E2720] rounded-2xl border border-[#E8E2D8] dark:border-[#2A362D] text-xs text-[#5F6F63] dark:text-[#A3B4A5] flex items-center justify-between">
              <span>Disponible en {CATEGORY_LABELS[from]}:</span>
              <span className="font-bold font-mono text-[#232B25] dark:text-white">
                {formatAmountInner(remaining[from as CategoryKey])}
              </span>
            </div>
          )}

          <Button
            size="md"
            isDisabled={!from || !to || !amount || from === to}
            onClick={handleTransfer}
          >
            Confirmar Transferencia
          </Button>
        </div>
      </div>
    </div>
  );
};

function formatAmountInner(value: number): string {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default TransferForm;
