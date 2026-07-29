'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatAmount, parseMaskedAmount } from '@/lib/formatAmount';
import { getRate, RateSource, DollarRate } from '@/lib/exchangeRate';

const RATE_OPTIONS = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'mep', label: 'MEP (Dólar bolsa)' },
  { key: 'custom', label: 'Personalizado' },
];

const IncomeForm: React.FC<{ onAdded?: () => void }> = ({ onAdded }) => {
  const { addIncome, incomes } = useExpenseContext();
  const nextIdRef = useRef(incomes.length + 1);
  const [description, setDescription] = useState(`Ingreso ${nextIdRef.current}`);
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
    ? Number(customRate) || 0
    : rate?.venta || 0;

  const handleAdd = () => {
    const num = parseMaskedAmount(amount);
    if (!num || num <= 0 || !description.trim()) return;

    const inc: Parameters<typeof addIncome>[0] = {
      description: description.trim(),
      amount: num,
      currency,
    };

    if (currency === 'USD' && effectiveRate > 0) {
      inc.originalAmount = num;
      inc.exchangeRate = effectiveRate;
      inc.amount = Math.round(num * effectiveRate * 100) / 100;
      inc.rateSource = rateSource;
      if (rateSource === 'custom') {
        inc.customRate = Number(customRate);
      }
    }

    addIncome(inc);

    nextIdRef.current += 1;
    setAmount('');
    setDescription(`Ingreso ${nextIdRef.current}`);
    onAdded?.();
  };

  const rateAge = rate?.fechaActualizacion
    ? new Date(rate.fechaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="border border-cds-border rounded-cds-lg bg-cds-surface px-4 py-4 space-y-3">
      <p className="text-sm font-semibold text-cds-foreground">Agregar ingreso</p>

      <Input
        label="Descripción"
        value={description}
        onChange={setDescription}
        placeholder="Ingreso, freelance..."
      />

      <div className="flex gap-2 items-end">
        <Input
          type="text"
          inputMode="decimal"
          label={currency === 'USD' ? 'Monto (USD)' : 'Monto'}
          value={amount}
          onChange={setAmount}
          placeholder="150000"
          prefix={<span className="text-cds-muted text-sm">{currency === 'USD' ? 'U$' : '$'}</span>}
          description={amount !== '' && currency === 'ARS' && formatAmount(amount)}
          className="flex-1"
        />
        <div className="flex bg-cds-surface-dark border border-cds-border rounded-cds-sm overflow-hidden h-[38px]">
          <button
            type="button"
            onClick={() => setCurrency('ARS')}
            className={`px-3 text-xs font-semibold transition-colors ${
              currency === 'ARS'
                ? 'bg-cds-primary text-cds-on-primary'
                : 'text-cds-muted hover:text-cds-foreground'
            }`}
          >
            ARS
          </button>
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            className={`px-3 text-xs font-semibold transition-colors ${
              currency === 'USD'
                ? 'bg-cds-primary text-cds-on-primary'
                : 'text-cds-muted hover:text-cds-foreground'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* USD Rate Selector */}
      {currency === 'USD' && (
        <div className="space-y-2">
          <Select
            label="Cotización"
            value={rateSource}
            onChange={(v) => setRateSource(v as RateSource)}
            options={RATE_OPTIONS}
          />

          {rateSource === 'custom' ? (
            <Input
              type="number"
              label="Cotización personalizada (ARS por 1 USD)"
              value={customRate}
              onChange={setCustomRate}
              placeholder="0.00"
              prefix={<span className="text-cds-muted text-sm">$</span>}
            />
          ) : rate ? (
            <div className="text-xs rounded-cds-sm bg-cds-surface dark:bg-cds-surface-dark border border-cds-border px-3 py-2 flex items-center justify-between">
              <span>
                1 USD = <strong className="text-cds-foreground">${rate.venta.toLocaleString('es-AR')}</strong> ARS
                <span className="text-cds-muted ml-2">({rate.nombre})</span>
              </span>
              {rateAge && <span className="text-cds-muted">{rateAge}</span>}
            </div>
          ) : rateError ? (
            <p className="text-xs text-cds-negative">{rateError}</p>
          ) : (
            <p className="text-xs text-cds-muted">Cargando tipo de cambio...</p>
          )}

          {amount && effectiveRate > 0 && (
            <p className="text-xs text-cds-muted">
              ≈ {formatAmount(parseMaskedAmount(amount) * effectiveRate)} ARS
            </p>
          )}
        </div>
      )}

      <Button
        size="sm"
        onClick={handleAdd}
        isDisabled={!amount || parseMaskedAmount(amount) <= 0 || !description.trim() || (currency === 'USD' && effectiveRate <= 0)}
      >
        Agregar ingreso
      </Button>
    </div>
  );
};

export default IncomeForm;
