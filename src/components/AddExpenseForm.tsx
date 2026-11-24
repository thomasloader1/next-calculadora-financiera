import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Expense } from '@/interfaces/Expense';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { getOfficialRate, DollarRate } from '@/lib/exchangeRate';
import { parseMaskedAmount } from '@/lib/formatAmount';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const CATEGORY_MAP: Record<string, 'needs' | 'wants' | 'savings'> = {
  'Necesidad': 'needs',
  'Imprevistos': 'wants',
  'Ahorro': 'savings',
};

const REVERSE_CATEGORY_MAP: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

interface AddExpenseFormProps {
  defaultCategory?: string;
  onAdded?: () => void;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ defaultCategory, onAdded }) => {
  const { addExpenseToCategory } = useExpenseContext();
  const [expense, setExpense] = useState<string>('');
  const [groupNames] = useState<{ name: string }[]>([{ name: 'Necesidad' }, { name: 'Imprevistos' }, { name: 'Ahorro' }]);
  const [expenseCategory, setExpenseCategory] = useState<string>(defaultCategory ? REVERSE_CATEGORY_MAP[defaultCategory] || '' : '');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [isUsd, setIsUsd] = useState<boolean>(false);
  const [rate, setRate] = useState<DollarRate | null>(null);
  const [rateError, setRateError] = useState<string>('');

  useEffect(() => {
    if (!isUsd) {
      setRate(null);
      setRateError('');
      return;
    }
    let cancelled = false;
    getOfficialRate()
      .then(r => { if (!cancelled) { setRate(r); setRateError(''); } })
      .catch(() => { if (!cancelled) setRateError('No se pudo obtener el tipo de cambio'); });
    return () => { cancelled = true; };
  }, [isUsd]);

  const handleAddExpense = () => {
    const categoryKey = CATEGORY_MAP[expenseCategory];
    if (!categoryKey) {
      toast.error('Seleccione una categoria');
      return;
    }

    const numericAmount = parseMaskedAmount(expense);
    const newExpense: Expense = {
      id: (Math.random() + Date.now()).toString(),
      description: expenseDescription !== "" ? `${expenseDescription}` : "Sin descripción",
      amount: numericAmount,
    };

    if (isUsd && rate) {
      newExpense.currency = 'USD';
      newExpense.originalAmount = numericAmount;
      newExpense.exchangeRate = rate.venta;
      newExpense.amount = Math.round(numericAmount * rate.venta * 100) / 100;
    }

    addExpenseToCategory(categoryKey, newExpense);

    setExpense('');
    setExpenseCategory(defaultCategory ? REVERSE_CATEGORY_MAP[defaultCategory] || '' : '');
    setExpenseDescription('');
    onAdded?.();
  };

  const handleToggleUsd = (checked: boolean) => {
    if (checked && !rate && !rateError) {
      // Will trigger useEffect to fetch rate
    }
    setIsUsd(checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (expense !== '' && expenseCategory !== '' && (!isUsd || rate)) {
        handleAddExpense();
      }
    }
  };

  const rateAge = rate?.fechaActualizacion
    ? new Date(rate.fechaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Currency Segmented Pill */}
      <div className="calm-segmented-container">
        <button
          type="button"
          onClick={() => handleToggleUsd(false)}
          className={`calm-segmented-tab ${!isUsd ? 'calm-segmented-tab-active' : ''}`}
        >
          Pesos (ARS)
        </button>
        <button
          type="button"
          onClick={() => handleToggleUsd(true)}
          className={`calm-segmented-tab ${isUsd ? 'calm-segmented-tab-active' : ''}`}
        >
          Dólares (USD)
        </button>
      </div>

      {isUsd && (
        <div className="text-xs rounded-2xl bg-[#F4EFE8] dark:bg-[#1E2720] border border-[#E8E2D8] dark:border-[#2A362D] px-3.5 py-2.5">
          {rateError ? (
            <span className="text-[#B44C4C]">{rateError}</span>
          ) : rate ? (
            <div className="flex flex-col gap-0.5">
              <span>1 USD = <strong className="font-bold text-[#232B25] dark:text-white">${rate.venta.toLocaleString('es-AR')}</strong> ARS</span>
              {rateAge && <span className="text-[#5F6F63] dark:text-[#A3B4A5]">Actualizado: {rateAge}</span>}
            </div>
          ) : (
            <span className="text-[#5F6F63] dark:text-[#A3B4A5]">Cargando cotización oficial...</span>
          )}
        </div>
      )}

      <Input
        type="text"
        inputMode="decimal"
        label={isUsd ? 'Monto del gasto (USD)' : 'Monto del gasto (ARS)'}
        description={expense !== '' && (isUsd && rate ? `≈ ${formatAmountInner(parseMaskedAmount(expense) * rate.venta)}` : `$ ${expense}`)}
        value={expense}
        onChange={setExpense}
        placeholder='15000'
        className='w-full'
        prefix={<span className="text-[#8A9A8E] text-sm">{isUsd ? 'US$' : '$'}</span>}
      />

      <Select
        label="Categoría del fondo"
        placeholder="Seleccione una categoría"
        value={expenseCategory}
        onChange={setExpenseCategory}
        options={groupNames.map((g) => ({ key: g.name, label: g.name }))}
      />

      <Textarea
        className='w-full'
        label="Descripción del gasto"
        placeholder='Ej. Supermercado, Alquiler, Salida...'
        value={expenseDescription}
        onChange={setExpenseDescription}
      />

      <div className="flex items-center justify-between pt-2">
        <Button
          size='md'
          isDisabled={expense === '' || expenseCategory === '' || (isUsd && !rate)}
          onClick={handleAddExpense}
        >
          Confirmar Gasto
        </Button>
        <span className="text-[11px] text-[#8A9A8E] font-mono">
          <kbd className="px-1.5 py-0.5 bg-[#F4EFE8] dark:bg-[#1E2720] border border-[#E8E2D8] dark:border-[#2A362D] rounded-md text-[10px]">⌘/Ctrl+Enter</kbd>
        </span>
      </div>
    </div>
  );
};

function formatAmountInner(amount: number): string {
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

export default AddExpenseForm;
