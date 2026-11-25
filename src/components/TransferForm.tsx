'use client';

import React, { useState, useMemo } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { CategoryKey } from '@/interfaces/Transfer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { parseMaskedAmount } from '@/lib/formatAmount';
import { validateAmount } from '@/lib/validation';
import { useFieldErrors } from '@/hooks/useFieldErrors';

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

  const { shown, touch, attempt, reset } = useFieldErrors<'from' | 'to' | 'amount'>();
  const available = from ? Math.max(0, remaining[from as CategoryKey] || 0) : undefined;
  const fromError = from ? (available! > 0 ? null : `No queda dinero en ${CATEGORY_LABELS[from]}.`) : 'Elegí de qué fondo sale.';
  const toError = !to ? 'Elegí a qué fondo va.' : to === from ? 'El destino tiene que ser otro fondo.' : null;
  const amountError = validateAmount(amount, {
    max: available,
    maxMessage: from ? `Solo tenés ${formatAmountInner(available ?? 0)} en ${CATEGORY_LABELS[from]}.` : undefined,
  });

  // Picking the destination's fund as origin clears the destination
  const handleFromChange = (v: string) => {
    setFrom(v);
    if (v === to) setTo('');
  };

  const handleTransfer = () => {
    if (!attempt([fromError, toError, amountError])) return;
    const parsedAmount = parseMaskedAmount(amount);

    addTransfer(from as CategoryKey, to as CategoryKey, parsedAmount, 'Transferencia manual', remaining);

    setFrom('');
    setTo('');
    setAmount('');
    reset();
    if (isCompact) {
      onTransferred?.();
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTransfer();
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
            onChange={handleFromChange}
            error={shown('from', fromError)}
            options={availableOptions.length > 0 ? availableOptions : CATEGORY_OPTIONS}
            placeholder="Seleccionar origen"
          />
          <Select
            label="Hacia (Destino)"
            value={to}
            onChange={setTo}
            error={shown('to', toError)}
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
            onBlur={touch('amount')}
            error={shown('amount', amountError)}
            placeholder="150000"
            prefix={<span className="text-muted text-sm">$</span>}
          />
        </div>

        {from && (
          <div className="p-3 bg-paper-2 rounded-input text-sm text-muted flex items-center justify-between">
            <span>Disponible en {CATEGORY_LABELS[from]}:</span>
            <span className="font-bold font-mono text-ink">
              {formatAmountInner(remaining[from as CategoryKey])}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted font-mono hidden sm:inline">
            <kbd className="px-1.5 py-0.5 bg-paper-2 rounded-md border border-rule">⌘/Ctrl+Enter</kbd> para transferir
          </span>
          <Button
            size="md"
            onClick={handleTransfer}
            className="w-full sm:w-auto"
          >
            Confirmar transferencia
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
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-paper-2/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 text-xs font-bold text-ink">
          <i className="pi pi-exchange-alt text-accent text-xs"></i>
          <span>Transferencia manual de fondos</span>
        </div>
        <i className={`pi pi-chevron-down text-xs text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      <div
        className={`transition duration-200 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-5 pb-5 space-y-4 border-t border-rule pt-4" onKeyDown={handleKeyDown}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Desde (Origen)"
              value={from}
              onChange={handleFromChange}
              error={shown('from', fromError)}
              options={availableOptions.length > 0 ? availableOptions : CATEGORY_OPTIONS}
              placeholder="Seleccionar origen"
            />
            <Select
              label="Hacia (Destino)"
              value={to}
              onChange={setTo}
              error={shown('to', toError)}
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
            onBlur={touch('amount')}
            error={shown('amount', amountError)}
            placeholder="150000"
            prefix={<span className="text-muted text-sm">$</span>}
          />

          {from && (
            <div className="p-3 bg-paper-2 rounded-input text-sm text-muted flex items-center justify-between">
              <span>Disponible en {CATEGORY_LABELS[from]}:</span>
              <span className="font-bold font-mono text-ink">
                {formatAmountInner(remaining[from as CategoryKey])}
              </span>
            </div>
          )}

          <Button
            size="md"
            onClick={handleTransfer}
          >
            Confirmar transferencia
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
