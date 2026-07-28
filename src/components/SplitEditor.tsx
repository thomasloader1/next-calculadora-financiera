'use client';
import React, { useState, useEffect } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';

const SplitEditor: React.FC = () => {
  const { globalSplit, setGlobalSplit } = useExpenseContext();
  const [needs, setNeeds] = useState(String(globalSplit.needs));
  const [wants, setWants] = useState(String(globalSplit.wants));
  const [savings, setSavings] = useState(String(globalSplit.savings));

  useEffect(() => {
    setNeeds(String(globalSplit.needs));
    setWants(String(globalSplit.wants));
    setSavings(String(globalSplit.savings));
  }, [globalSplit]);

  const total = Number(needs) + Number(wants) + Number(savings);
  const isValid = Math.abs(total - 100) < 0.01;

  const handleSave = () => {
    if (!isValid) return;
    setGlobalSplit({
      needs: Number(needs),
      wants: Number(wants),
      savings: Number(savings),
    });
  };

  return (
    <div className="border border-cds-border rounded-cds-lg bg-cds-surface px-4 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-cds-foreground">Split</p>
        <Tooltip
          content={
            <TooltipContent
              title="Distribución del presupuesto"
              description="Porcentaje de cada ingreso que se destina a cada categoría. Deben sumar 100%."
              example="50% Necesidad · 30% Imprevistos · 20% Ahorro"
            />
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          label="Necesidad %"
          value={needs}
          onChange={setNeeds}
          placeholder="50"
        />
        <Input
          type="number"
          label="Imprevistos %"
          value={wants}
          onChange={setWants}
          placeholder="30"
        />
        <Input
          type="number"
          label="Ahorro %"
          value={savings}
          onChange={setSavings}
          placeholder="20"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold ${isValid ? 'text-cds-positive' : 'text-cds-negative'}`}>
          Suma: {total}%
          {!isValid && ' — debe ser 100%'}
        </p>
        <Button
          size="sm"
          isDisabled={!isValid}
          onClick={handleSave}
          startContent={<i className="pi pi-save text-xs"></i>}
        >
          Guardar
        </Button>
      </div>

      {/* Visual bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-cds-border">
        <div
          className="bg-cds-primary transition-all duration-300"
          style={{ width: `${isValid ? Number(needs) : 0}%` }}
        />
        <div
          className="bg-cds-negative transition-all duration-300"
          style={{ width: `${isValid ? Number(wants) : 0}%` }}
        />
        <div
          className="bg-cds-positive transition-all duration-300"
          style={{ width: `${isValid ? Number(savings) : 0}%` }}
        />
      </div>
    </div>
  );
};

export default SplitEditor;
