'use client';

import React, { useState, useEffect } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatAmount, parseMaskedAmount } from '@/lib/formatAmount';
import { getRate, RateSource, DollarRate } from '@/lib/exchangeRate';
import { parseAmount, validateAmount, validateDescription, validateRate, MAX_DESCRIPTION } from '@/lib/validation';
import { useFieldErrors } from '@/hooks/useFieldErrors';
import { toast } from 'sonner';

const RATE_OPTIONS = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'mep', label: 'MEP (Dólar bolsa)' },
  { key: 'custom', label: 'Personalizado' },
];

interface IncomeFormProps {
  onAdded?: () => void;
  compact?: boolean;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ onAdded, compact = false }) => {
  const { addIncome, incomes, globalSplit } = useExpenseContext();
  const [description, setDescription] = useState(() =>
    incomes.length === 0 ? 'Sueldo' : `Ingreso ${incomes.length + 1}`
  );
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [rateSource, setRateSource] = useState<RateSource>('oficial');
  const [customRate, setCustomRate] = useState('');
  const [rate, setRate] = useState<DollarRate | null>(null);
  const [rateError, setRateError] = useState('');

  useEffect(() => {
    if (currency !== 'USD' || rateSource === 'custom') {
      setRate(null);
      setRateError('');
      return;
    }
    let cancelled = false;
    getRate(rateSource)
      .then(r => { if (!cancelled) { setRate(r); setRateError(''); } })
      .catch(() => { if (!cancelled) setRateError('No se pudo obtener el tipo de cambio'); });
    return () => { cancelled = true; };
  }, [currency, rateSource]);

  const effectiveRate = rateSource === 'custom'
    ? (validateRate(customRate) ? 0 : parseAmount(customRate))
    : rate?.venta || 0;

  const numericAmount = parseMaskedAmount(amount);
  const effectiveTotal = currency === 'USD' && effectiveRate > 0
    ? numericAmount * effectiveRate
    : numericAmount;

  const { shown, touch, attempt, reset } = useFieldErrors<'description' | 'amount' | 'rate'>();
  const descriptionError = validateDescription(description, { required: true });
  const amountError = validateAmount(amount);
  const rateFieldError = currency === 'USD' && rateSource === 'custom' ? validateRate(customRate) : null;

  const handleAdd = () => {
    if (!attempt([descriptionError, amountError, rateFieldError])) return;
    if (currency === 'USD' && effectiveRate <= 0) {
      toast.warning(rateError || 'Esperá a que cargue la cotización del dólar.');
      return;
    }

    const inc: Parameters<typeof addIncome>[0] = {
      description: description.trim(),
      amount: numericAmount,
      currency,
    };

    if (currency === 'USD' && effectiveRate > 0) {
      inc.originalAmount = numericAmount;
      inc.exchangeRate = effectiveRate;
      inc.amount = Math.round(numericAmount * effectiveRate * 100) / 100;
      inc.rateSource = rateSource;
      if (rateSource === 'custom') {
        inc.customRate = effectiveRate;
      }
    }

    addIncome(inc);

    setAmount('');
    setDescription(`Ingreso ${incomes.length + 2}`);
    reset();
    onAdded?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (e.target as HTMLElement)?.tagName.toLowerCase() === 'input')) {
      e.preventDefault();
      handleAdd();
    }
  };

  const rateAge = rate?.fechaActualizacion
    ? new Date(rate.fechaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="space-y-3.5" onKeyDown={handleKeyDown}>
      {compact ? (
        <p className="text-sm font-medium text-ink">Agregar nuevo ingreso</p>
      ) : (
        <p className="text-sm text-muted">
          Ingresá tu sueldo o ingresos para dividirlos automáticamente según tu regla ({globalSplit.needs}/{globalSplit.wants}/{globalSplit.savings}%).
        </p>
      )}

      <div className={compact ? 'grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-2.5 items-start' : 'space-y-3.5'}>
        <Input
          label={compact ? 'Fuente' : 'Descripción de la fuente de ingreso'}
          value={description}
          onChange={setDescription}
          onBlur={touch('description')}
          error={shown('description', descriptionError)}
          maxLength={MAX_DESCRIPTION + 20}
          placeholder="Ej. Sueldo, Honorarios, Freelance…"
        />

        <div className="flex gap-2 items-start">
          <Input
            type="text"
            inputMode="decimal"
            label={compact ? 'Monto' : currency === 'USD' ? 'Monto en USD' : 'Monto en ARS'}
            value={amount}
            onChange={setAmount}
            placeholder="1000000"
            prefix={<span className="text-muted text-sm">{currency === 'USD' ? 'US$' : '$'}</span>}
            description={!compact && !amountError && currency === 'ARS' && numericAmount > 0 && formatAmount(numericAmount)}
            error={shown('amount', amountError)}
            onBlur={touch('amount')}
            className="flex-1 min-w-0"
          />
          <div className="calm-segmented-container shrink-0 mt-[1.625rem]" role="group" aria-label="Moneda">
            <button
              type="button"
              onClick={() => setCurrency('ARS')}
              aria-pressed={currency === 'ARS'}
              className={`calm-segmented-tab px-2.5 ${currency === 'ARS' ? 'calm-segmented-tab-active' : ''}`}
            >
              ARS
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              aria-pressed={currency === 'USD'}
              className={`calm-segmented-tab px-2.5 ${currency === 'USD' ? 'calm-segmented-tab-active' : ''}`}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      {/* Live 50/30/20 Division Preview While Typing */}
      {effectiveTotal > 0 && !compact && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex items-baseline justify-between text-sm text-muted">
            <span>División que se aplicará</span>
            <span className="font-medium tabular-nums text-ink">{formatAmount(effectiveTotal)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['needs', 'Necesidades', globalSplit.needs],
              ['wants', 'Imprevistos', globalSplit.wants],
              ['savings', 'Ahorro', globalSplit.savings],
            ] as const).map(([key, name, pct]) => (
              <div key={key} className={`plastic plastic--${key} px-3 py-2.5`}>
                <span className="block text-xs text-ink-2">{pct}% {name}</span>
                <span className="block text-sm font-medium tabular-nums text-ink">{formatAmount(effectiveTotal * (pct / 100))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USD Rate Selector */}
      {currency === 'USD' && (
        <div className="space-y-2 p-3 bg-paper-2 rounded-input border border-rule">
          <Select
            label="Cotización de cambio"
            value={rateSource}
            onChange={(v) => setRateSource(v as RateSource)}
            options={RATE_OPTIONS}
          />

          {rateSource === 'custom' ? (
            <Input
              type="text"
              inputMode="decimal"
              label="Cotización personalizada (ARS por 1 USD)"
              value={customRate}
              onChange={setCustomRate}
              onBlur={touch('rate')}
              error={shown('rate', rateFieldError)}
              placeholder="0.00"
              prefix={<span className="text-muted text-sm">$</span>}
            />
          ) : rate ? (
            <div className="text-xs rounded-input bg-surface border border-rule px-3 py-2 flex items-center justify-between">
              <span>
                1 USD = <strong className="text-ink">${rate.venta.toLocaleString('es-AR')}</strong> ARS
                <span className="text-muted ml-1.5">({rate.nombre})</span>
              </span>
              {rateAge && <span className="label-mono text-muted text-xs">{rateAge}</span>}
            </div>
          ) : rateError ? (
            <p className="text-xs text-error">{rateError}</p>
          ) : (
            <p className="text-xs text-muted">Cargando cotización oficial…</p>
          )}

          {!amountError && effectiveRate > 0 && numericAmount > 0 && (
            <p className="text-xs text-muted font-medium pt-1">
              Equivalente en ARS: <strong className="text-ink">{formatAmount(numericAmount * effectiveRate)}</strong>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          size="md"
          onClick={handleAdd}
          isDisabled={currency === 'USD' && rateSource !== 'custom' && !rate && !rateError}
          startContent={<i className="pi pi-plus text-xs" aria-hidden="true"></i>}
        >
          {compact ? 'Agregar ingreso' : 'Guardar ingreso'}
        </Button>
        <kbd className="hidden sm:inline-block text-xs text-muted border border-rule rounded px-1.5">Enter</kbd>
      </div>
    </div>
  );
};

export default IncomeForm;
