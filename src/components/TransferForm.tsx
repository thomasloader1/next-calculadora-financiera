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
  const { cash, needs, wants, savings, addTransfer } = useExpenseContext();
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const isCompact = !!onTransferred;

  const remaining = useMemo(() => {
    if (!cash) return { needs: 0, wants: 0, savings: 0 };
    // cash is now post-expense available amounts
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

  // Compact mode — plain form (used inside modal)
  if (isCompact) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Desde"
            value={from}
            onChange={setFrom}
            options={availableOptions.length > 0 ? availableOptions : CATEGORY_OPTIONS}
            placeholder="Categoría origen"
          />
          <Select
            label="Hacia"
            value={to}
            onChange={setTo}
            options={CATEGORY_OPTIONS.filter(opt => opt.key !== from)}
            placeholder="Categoría destino"
          />
          <Input
            type="text"
            inputMode="decimal"
            label="Monto"
            value={amount}
            onChange={setAmount}
            placeholder="150000"
            prefix={<span className="text-cds-muted text-sm">$</span>}
          />
        </div>

        {from && (
          <p className="text-xs text-cds-muted">
            Disponible en {CATEGORY_LABELS[from]}: {formatAmountInner(remaining[from as CategoryKey])}
          </p>
        )}

        <Button
          size="sm"
          isDisabled={!from || !to || !amount || from === to}
          onClick={handleTransfer}
        >
          Transferir
        </Button>
      </div>
    );
  }

  // Accordion mode — standalone (legacy, kept for compatibility)
  return (
    <div className="border border-cds-border rounded-cds-lg bg-cds-surface overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cds-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-cds-foreground">
          <i className="pi pi-exchange-alt text-sm text-cds-primary"></i>
          Transferencia manual
        </div>
        <i className={`pi pi-chevron-down text-xs text-cds-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-cds-border pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Desde"
              value={from}
              onChange={setFrom}
              options={availableOptions.length > 0 ? availableOptions : CATEGORY_OPTIONS}
              placeholder="Categoría origen"
            />
            <Select
              label="Hacia"
              value={to}
              onChange={setTo}
              options={CATEGORY_OPTIONS.filter(opt => opt.key !== from)}
              placeholder="Categoría destino"
            />
            <Input
              type="text"
              inputMode="decimal"
              label="Monto"
              value={amount}
              onChange={setAmount}
              placeholder="150000"
              prefix={<span className="text-cds-muted text-sm">$</span>}
            />
          </div>

          {from && (
            <p className="text-xs text-cds-muted">
              Disponible en {CATEGORY_LABELS[from]}: {formatAmountInner(remaining[from as CategoryKey])}
            </p>
          )}

          <Button
            size="sm"
            isDisabled={!from || !to || !amount || from === to}
            onClick={handleTransfer}
          >
            Transferir
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
