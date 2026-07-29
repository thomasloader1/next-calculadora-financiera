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

  const rateAge = rate?.fechaActualizacion
    ? new Date(rate.fechaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className={`text-sm font-medium ${!isUsd ? 'text-cds-foreground' : 'text-cds-muted'}`}>ARS</span>
        <Toggle
          checked={isUsd}
          onChange={handleToggleUsd}
          label=""
        />
        <span className={`text-sm font-medium ${isUsd ? 'text-cds-foreground' : 'text-cds-muted'}`}>USD</span>
      </div>

      {isUsd && (
        <div className="text-xs rounded-cds-sm bg-cds-surface border border-cds-border px-3 py-2">
          {rateError ? (
            <span className="text-red-600">{rateError}</span>
          ) : rate ? (
            <div className="flex flex-col gap-0.5">
              <span>1 USD = <strong>${rate.venta.toLocaleString('es-AR')}</strong> ARS</span>
              {rateAge && <span className="text-cds-muted">Actualizado: {rateAge}</span>}
            </div>
          ) : (
            <span className="text-cds-muted">Cargando tipo de cambio...</span>
          )}
        </div>
      )}

      <Input
        type="text"
        inputMode="decimal"
        label={isUsd ? 'Gasto (USD)' : 'Gasto'}
        description={expense !== '' && (isUsd && rate ? `≈ ${formatAmountInner(parseMaskedAmount(expense) * rate.venta)}` : `$ ${expense}`)}
        value={expense}
        onChange={setExpense}
        placeholder='150000'
        className='w-full'
        prefix={<span className="text-cds-muted text-sm">{isUsd ? 'U$' : '$'}</span>}
      />

      <Select
        label="Categoria"
        placeholder="Seleccione una categoria"
        value={expenseCategory}
        onChange={setExpenseCategory}
        options={groupNames.map((g) => ({ key: g.name, label: g.name }))}
      />

      <Textarea
        className='w-full'
        label="Descripcion del gasto"
        placeholder='Un panchito y una coca.'
        value={expenseDescription}
        onChange={setExpenseDescription}
      />

      <Button
        size='sm'
        isDisabled={expense === '' || expenseCategory === '' || (isUsd && !rate)}
        onClick={handleAddExpense}
      >
        Agregar Gasto
      </Button>
    </div>
  );
};

function formatAmountInner(amount: number): string {
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

export default AddExpenseForm;
