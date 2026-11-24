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
  const { addIncome, incomes, globalSplit } = useExpenseContext();
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

  const numericAmount = parseMaskedAmount(amount);
  const effectiveTotal = currency === 'USD' && effectiveRate > 0
    ? numericAmount * effectiveRate
    : numericAmount;

  const handleAdd = () => {
    if (!numericAmount || numericAmount <= 0 || !description.trim()) return;

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
        inc.customRate = Number(customRate);
      }
    }

    addIncome(inc);

    nextIdRef.current += 1;
    setAmount('');
    setDescription(`Ingreso ${nextIdRef.current}`);
    onAdded?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (numericAmount && numericAmount > 0 && description.trim() && (currency !== 'USD' || effectiveRate > 0)) {
        handleAdd();
      }
    }
  };

  const rateAge = rate?.fechaActualizacion
    ? new Date(rate.fechaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="bg-white dark:bg-[#13151b] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#FCEEE9] dark:bg-[#301C15] text-[#D46743] dark:text-[#E28669] flex items-center justify-center text-xs">
            <i className="pi pi-plus"></i>
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Cargar Ingreso</p>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Regla 50/30/20 automática
        </span>
      </div>

      <Input
        label="Descripción de la fuente de ingreso"
        value={description}
        onChange={setDescription}
        placeholder="Ej. Sueldo, Honorarios, Freelance..."
      />

      <div className="flex gap-2 items-end">
        <Input
          type="text"
          inputMode="decimal"
          label={currency === 'USD' ? 'Monto en USD' : 'Monto en ARS'}
          value={amount}
          onChange={setAmount}
          placeholder="1000000"
          prefix={<span className="text-slate-400 text-sm">{currency === 'USD' ? 'US$' : '$'}</span>}
          description={amount !== '' && currency === 'ARS' && formatAmount(amount)}
          className="flex-1"
        />
        <div className="flex bg-[#FFEAD3] dark:bg-[#261F1A] p-1 rounded-full h-[42px] shrink-0 border border-[#F0D7BC] dark:border-[#3A2E25]">
          <button
            type="button"
            onClick={() => setCurrency('ARS')}
            className={`px-3.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              currency === 'ARS'
                ? 'bg-[#D46743] text-white shadow-xs'
                : 'text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white'
            }`}
          >
            ARS
          </button>
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            className={`px-3.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              currency === 'USD'
                ? 'bg-[#D46743] text-white shadow-xs'
                : 'text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Live 50/30/20 Division Preview While Typing */}
      {effectiveTotal > 0 && (
        <div className="p-3.5 bg-[#FAF6F0] dark:bg-[#1E1814] rounded-2xl border border-[#F0D7BC] dark:border-[#3A2E25] space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B5547] dark:text-[#C4B1A3] uppercase tracking-wider">
            <span>División que se aplicará:</span>
            <span className="font-mono text-[#2C211B] dark:text-white font-bold">{formatAmount(effectiveTotal)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-[#FCEEE9] dark:bg-[#301C15] rounded-xl border border-[#F4C5B5] dark:border-[#5A2C1D]">
              <span className="text-[10px] text-[#D46743] dark:text-[#E28669] font-bold block">{globalSplit.needs}% Necesidades</span>
              <span className="font-mono font-bold text-[#2C211B] dark:text-white text-xs">{formatAmount(effectiveTotal * (globalSplit.needs / 100))}</span>
            </div>
            <div className="p-2.5 bg-[#FDF5EC] dark:bg-[#2D1F13] rounded-xl border border-[#F7D2AF] dark:border-[#56361D]">
              <span className="text-[10px] text-[#C47535] dark:text-[#EFA66C] font-bold block">{globalSplit.wants}% Imprevistos</span>
              <span className="font-mono font-bold text-[#2C211B] dark:text-white text-xs">{formatAmount(effectiveTotal * (globalSplit.wants / 100))}</span>
            </div>
            <div className="p-2.5 bg-[#EDF9FA] dark:bg-[#132426] rounded-xl border border-[#BFE7EA] dark:border-[#1E373A]">
              <span className="text-[10px] text-[#2A8187] dark:text-[#BFE7EA] font-bold block">{globalSplit.savings}% Ahorro</span>
              <span className="font-mono font-bold text-[#2C211B] dark:text-white text-xs">{formatAmount(effectiveTotal * (globalSplit.savings / 100))}</span>
            </div>
          </div>
        </div>
      )}

      {/* USD Rate Selector */}
      {currency === 'USD' && (
        <div className="space-y-2 p-3 bg-[#FAF6F0] dark:bg-[#1E1814] rounded-2xl border border-[#F0D7BC] dark:border-[#3A2E25]">
          <Select
            label="Cotización de cambio"
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
              prefix={<span className="text-[#9E8575] text-sm">$</span>}
            />
          ) : rate ? (
            <div className="text-xs rounded-xl bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] px-3 py-2 flex items-center justify-between">
              <span>
                1 USD = <strong className="text-[#2C211B] dark:text-white">${rate.venta.toLocaleString('es-AR')}</strong> ARS
                <span className="text-[#9E8575] ml-1.5">({rate.nombre})</span>
              </span>
              {rateAge && <span className="text-[#9E8575] font-mono text-[10px]">{rateAge}</span>}
            </div>
          ) : rateError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{rateError}</p>
          ) : (
            <p className="text-xs text-[#9E8575]">Cargando cotización oficial...</p>
          )}

          {amount && effectiveRate > 0 && (
            <p className="text-xs text-[#6B5547] font-medium pt-1">
              Equivalente en ARS: <strong className="text-[#2C211B] dark:text-white">{formatAmount(numericAmount * effectiveRate)}</strong>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          size="md"
          onClick={handleAdd}
          isDisabled={!amount || numericAmount <= 0 || !description.trim() || (currency === 'USD' && effectiveRate <= 0)}
        >
          Guardar Ingreso
        </Button>
        <span className="text-[11px] text-slate-400 font-mono">
          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">⌘/Ctrl+Enter</kbd>
        </span>
      </div>
    </div>
  );
};

export default IncomeForm;
