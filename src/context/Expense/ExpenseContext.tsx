import { CashState } from '@/interfaces/Cash';
import { Expense, ExpenseContextType } from '@/interfaces/Expense';
import React, { createContext, useContext, useState, ReactNode } from 'react';

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function useExpenseContext() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenseContext must be used within an ExpenseProvider');
  }
  return context;
}

interface ExpenseProviderProps {
  children: ReactNode;
}

export function ExpenseProvider({ children }: ExpenseProviderProps) {
  const [needs, setNeeds] = useState<Expense[]>([]);
  const [wants, setWants] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Expense[]>([]);
  const [cash, setCash] = useState<CashState | null>(null);


  const updateNeeds = (newNeeds: Expense[]) => {
    setNeeds(newNeeds);
  };

  const updateWants = (newWants: Expense[]) => {
    setWants(newWants);
  };

  const updateSavings = (newSavings: Expense[]) => {
    setSavings(newSavings);
  };

  const updateCash = (newState: CashState | null) => {
    setCash(newState);
  };

  return (
    <ExpenseContext.Provider
      value={{
        needs,
        wants,
        savings,
        cash,
        updateNeeds,
        updateWants,
        updateSavings,
        updateCash
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}
