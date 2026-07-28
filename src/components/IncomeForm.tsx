'use client';
import React, { useState, useEffect } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import type { SplitPercentages } from '@/interfaces/Income';
import { formatAmount } from '@/lib/formatAmount';
import { getRate, RateSource, DollarRate } from '@/lib/exchangeRate';

const RATE_OPTIONS = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'mep', label: 'MEP (Dólar bolsa)' },
  { key: 'custom', label: 'Personalizado' },
];

const SPLIT_LABELS: Record<keyof SplitPercentages, string> = {
  needs: 'Necesidades',
  wants: 'Deseos',
  savings: 'Ahorro',
};

const IncomeForm: React.FC<{ onAdded?: () => void }> = ({ onAdded }) => {
  const { addIncome } = useExpenseContext();
  const [description, setDescription] = useState('Salario');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [rateSource, setRateSource] = useState<RateSource>('oficial');
  const [customRate, setCustomRate] = useState('');
  const [rate, setRate] = useState<DollarRate | null>(null);
  const [rateError, setRateError] = useState('');
  const [enableSplitOverride, setEnableSplitOverride] = useState(false);
  const [splitOverride, setSplitOverride] = useState<Record<keyof SplitPercentages, string>>({
    needs: '', wants: '', savings: '',
  });

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

  const handleSplitChange = (key: keyof SplitPercentages, value: string) => {
    const num = value === '' ? 0 : Number(value);
    if (value !== '' && (isNaN(num) || num < 0 || num > 100)) return;

    setSplitOverride(prev => {
      const next = { ...prev, [key]: value };
      // Auto-calc the third field when the other two are filled
      const keys: (keyof SplitPercentages)[] = ['needs', 'wants', 'savings'];
      const filled = keys.filter(k => next[k] !== '');
      if (filled.length === 2) {
        const empty = keys.find(k => next[k] === '')!;
        const total = keys.reduce((sum, k) => sum + (Number(next[k]) || 0), 0);
        const auto = 100 - total + (Number(next[empty]) || 0); // re-add the empty field since total already includes it as 0
        if (auto >= 0 && auto <= 100) {
          next[empty] = String(auto);
        }
      }
      return next;
    });
  };

  const splitTotal = Object.values(splitOverride).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const splitValid = enableSplitOverride ? splitTotal === 100 : true;

  const handleAdd = () => {
    const num = Number(amount);
    if (!num || num <= 0 || !description.trim() || !splitValid) return;

    const inc: Parameters<typeof addIncome>[0] = {
      description: description.trim(),
      amount: num,
      currency,
    };

    if (enableSplitOverride && splitTotal === 100) {
      inc.splitOverride = {
        needs: Number(splitOverride.needs),
        wants: Number(splitOverride.wants),
        savings: Number(splitOverride.savings),
      };
    }

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

    setAmount('');
    setEnableSplitOverride(false);
    setSplitOverride({ needs: '', wants: '', savings: '' });
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
        placeholder="Salario, freelance..."
      />

      <div className="flex gap-2 items-end">
        <Input
          type="number"
          label={currency === 'USD' ? 'Monto (USD)' : 'Monto'}
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
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
              ≈ {formatAmount(Number(amount) * effectiveRate)} ARS
            </p>
          )}
        </div>
      )}

      {/* Per-income split override */}
      <div className="pt-2 border-t border-cds-border">
        <Toggle
          label="Split personalizado"
          checked={enableSplitOverride}
          onChange={setEnableSplitOverride}
        />
        {enableSplitOverride && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(['needs', 'wants', 'savings'] as const).map(key => (
                <Input
                  key={key}
                  type="number"
                  label={SPLIT_LABELS[key]}
                  value={splitOverride[key]}
                  onChange={v => handleSplitChange(key, v)}
                  placeholder="%"
                />
              ))}
            </div>
            {splitTotal !== 100 && (
              <p className="text-xs text-cds-warning">
                Los porcentajes deben sumar 100% (actual: {splitTotal}%)
              </p>
            )}
          </div>
        )}
      </div>

      <Button
        size="sm"
        onClick={handleAdd}
        isDisabled={!amount || Number(amount) <= 0 || !description.trim() || (currency === 'USD' && effectiveRate <= 0) || !splitValid}
      >
        Agregar ingreso
      </Button>
    </div>
  );
};

export default IncomeForm;
