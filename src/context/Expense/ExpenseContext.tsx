import { CashState } from '@/interfaces/Cash';
import { Expense, ExpenseContextType, ExpenseCategory } from '@/interfaces/Expense';
import { Income, SplitPercentages } from '@/interfaces/Income';
import { Transfer, CategoryKey } from '@/interfaces/Transfer';
import { createManualTransfer, recalculateCashFromScratch } from '@/lib/budgetCalculator';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { saveMonthBudget, loadMonthBudget, getUserMonths } from '@/Services/firebase';
import { toast } from 'sonner';

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function useExpenseContext() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenseContext must be used within an ExpenseProvider');
  }
  return context;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT_SPLIT: SplitPercentages = { needs: 50, wants: 30, savings: 20 };

interface ExpenseProviderProps {
  children: ReactNode;
}

export function ExpenseProvider({ children }: ExpenseProviderProps) {
  const { user } = useAuthContext();
  const [needs, setNeeds] = useState<Expense[]>([]);
  const [wants, setWants] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Expense[]>([]);
  const [cash, setCash] = useState<CashState | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [globalSplit, setGlobalSplitState] = useState<SplitPercentages>(DEFAULT_SPLIT);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [savedMonths, setSavedMonths] = useState<string[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to always access latest needs/wants/savings/transfers without stale closures
  const latestStateRef = useRef({
    needs: [] as Expense[],
    wants: [] as Expense[],
    savings: [] as Expense[],
    transfers: [] as Transfer[],
  });

  // Keep ref in sync with state for use in useCallback functions
  useEffect(() => {
    latestStateRef.current = { needs, wants, savings, transfers };
  }, [needs, wants, savings, transfers]);

  // Fetch saved months on mount and when user changes
  useEffect(() => {
    if (!user) {
      setSavedMonths([]);
      setIsInitialLoading(false);
      return;
    }

    setIsInitialLoading(true);

    getUserMonths(user.uid)
      .then(months => {
        setSavedMonths(months);
        const current = getCurrentMonth();
        if (!months.includes(current)) return;
        return loadMonthBudget(user.uid, current).then(data => {
          if (!data) return;
          setCash(data.cash);
          setNeeds(data.needs);
          setWants(data.wants);
          setSavings(data.savings);
          setCurrentMonth(current);
          setIncomes(data.incomes || []);
          setTransfers(data.transfers || []);
          setGlobalSplitState(data.globalSplit || DEFAULT_SPLIT);
          // v2+ data: recalculate cash from scratch using loaded data
          if (!data.schemaVersion || data.schemaVersion >= 2) {
            const expenses = { needs: data.needs, wants: data.wants, savings: data.savings };
            const { cash: newCash, autoLoans } = recalculateCashFromScratch(
              data.incomes || [],
              data.transfers || [],
              expenses,
              data.globalSplit || DEFAULT_SPLIT
            );
            setCash(newCash);
            setTransfers(prev => {
              const manual = prev.filter(t => !t.isAutomatic);
              return [...manual, ...autoLoans];
            });
          }
        });
      })
      .catch(() => {})
      .finally(() => setIsInitialLoading(false));
  }, [user]);

  // Auto-save: debounced 300ms after any mutation to needs/wants/savings/incomes/transfers/cash
  useEffect(() => {
    if (!user || !cash) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveMonthBudget(user.uid, currentMonth, {
          totalAmount: cash.needs + cash.wants + cash.savings,
          cash,
          needs,
          wants,
          savings,
          incomes,
          transfers,
          globalSplit,
          schemaVersion: 2,
          updatedAt: new Date().toISOString(),
        });
        // Refresh saved months list after save (silently ignore permission errors)
        getUserMonths(user.uid).then(setSavedMonths).catch(() => {});
      } catch (error: any) {
        console.error('Auto-save error:', error);
        // Silently ignore permission errors (rules not deployed yet)
        const isPermissionError = error?.code === 'permission-denied' ||
          error?.message?.includes('permission') ||
          error?.message?.includes('insufficient');
        if (!isPermissionError) {
          toast.error('No se pudo guardar automáticamente.');
        }
      } finally {
        setIsSaving(false);
      }
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [needs, wants, savings, incomes, transfers, cash, user, currentMonth, globalSplit]);

  const updateNeeds = useCallback((newNeeds: Expense[]) => setNeeds(newNeeds), []);
  const updateWants = useCallback((newWants: Expense[]) => setWants(newWants), []);
  const updateSavings = useCallback((newSavings: Expense[]) => setSavings(newSavings), []);

  const updateCash = useCallback((newState: CashState | null) => setCash(newState), []);

  const resetAll = useCallback(() => {
    setNeeds([]);
    setWants([]);
    setSavings([]);
    setIncomes([]);
    setTransfers([]);
    setCash(null);
    setGlobalSplitState(DEFAULT_SPLIT);
  }, []);

  const deleteExpense = useCallback((category: string, id: string) => {
    switch (category) {
      case 'needs':
        setNeeds(prev => prev.filter(e => e.id !== id));
        break;
      case 'wants':
        setWants(prev => prev.filter(e => e.id !== id));
        break;
      case 'savings':
        setSavings(prev => prev.filter(e => e.id !== id));
        break;
    }
  }, []);

  // --- Add expense with auto-loan (synchronous, no setTimeout) ---
  const addExpenseToCategory = useCallback((category: ExpenseCategory, expense: Expense) => {
    const { needs, wants, savings, transfers } = latestStateRef.current;

    // Compute new expenses (including the new expense)
    const currentExpenses = category === 'needs' ? needs : category === 'wants' ? wants : savings;
    const newExpenses = [...currentExpenses, expense];

    const allExpenses = {
      needs: category === 'needs' ? newExpenses : needs,
      wants: category === 'wants' ? newExpenses : wants,
      savings: category === 'savings' ? newExpenses : savings,
    };

    // Recalculate cash from scratch — synchronous, no setTimeout(0) race
    const { cash: newCash, autoLoans } = recalculateCashFromScratch(
      incomes,
      transfers,
      allExpenses,
      globalSplit
    );

    // Update state: add expense to category
    if (category === 'needs') setNeeds(newExpenses);
    else if (category === 'wants') setWants(newExpenses);
    else setSavings(newExpenses);

    // Update cash (post-expense available amounts)
    setCash(newCash);

    // Update auto-loans in transfers (replace existing auto-loans)
    setTransfers(prev => {
      const manualTransfers = prev.filter(t => !t.isAutomatic);
      return [...manualTransfers, ...autoLoans];
    });

    // Show warning if any category is still negative after auto-borrowing
    if (newCash.needs < 0 || newCash.wants < 0 || newCash.savings < 0) {
      toast('No hay suficiente en otras categorías para cubrir el déficit completo.', { icon: '⚠️' });
    }
  }, [incomes, globalSplit]);

  // --- Income CRUD ---
  const addIncome = useCallback((income: Omit<Income, 'id'>) => {
    const newIncome: Income = {
      ...income,
      id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    setIncomes(prev => [...prev, newIncome]);
  }, []);

  const updateIncome = useCallback((id: string, updates: Partial<Income>) => {
    setIncomes(prev => {
      const updated = prev.map(inc => inc.id === id ? { ...inc, ...updates } : inc);
      const { needs, wants, savings, transfers } = latestStateRef.current;

      setCash(cashPrev => {
        if (!cashPrev) return cashPrev;
        const { cash: newCash, autoLoans } = recalculateCashFromScratch(
          updated,
          transfers,
          { needs, wants, savings },
          globalSplit
        );
        // Update auto-loans in transfers (replace existing auto-loans)
        setTransfers(prevTransfers => {
          const manualTransfers = prevTransfers.filter(t => !t.isAutomatic);
          return [...manualTransfers, ...autoLoans];
        });
        return newCash;
      });

      return updated;
    });
  }, [globalSplit]);

  const removeIncome = useCallback((id: string) => {
    setIncomes(prev => {
      const updated = prev.filter(inc => inc.id !== id);
      const { needs, wants, savings, transfers } = latestStateRef.current;

      setCash(cashPrev => {
        if (updated.length === 0) {
          // No incomes left → reset everything
          return null;
        }
        if (!cashPrev) return cashPrev;

        const { cash: newCash, autoLoans } = recalculateCashFromScratch(
          updated,
          transfers,
          { needs, wants, savings },
          globalSplit
        );
        // Update auto-loans in transfers (replace existing auto-loans)
        setTransfers(prevTransfers => {
          const manualTransfers = prevTransfers.filter(t => !t.isAutomatic);
          return [...manualTransfers, ...autoLoans];
        });
        return newCash;
      });

      return updated;
    });
  }, [globalSplit]);

  // --- Transfers ---
  const addTransfer = useCallback((from: CategoryKey, to: CategoryKey, amount: number, reason?: string, remaining?: Partial<CashState>) => {
    if (!cash) return;
    try {
      const cashForValidation = remaining
        ? { ...cash, ...remaining } as CashState
        : cash;
      const transfer = createManualTransfer(from, to, amount, cashForValidation, reason);
      setTransfers(prev => [...prev, transfer]);
      setCash(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [from]: prev[from] - amount,
          [to]: prev[to] + amount,
        };
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, [cash]);

  const removeTransfer = useCallback((id: string) => {
    setTransfers(prev => {
      const transfer = prev.find(t => t.id === id);
      if (transfer) {
        // Reverse cash changes for both auto and manual transfers
        setCash(c => {
          if (!c) return c;
          return {
            ...c,
            [transfer.from]: c[transfer.from] + transfer.amount,
            [transfer.to]: c[transfer.to] - transfer.amount,
          };
        });
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const removeTransferAndExpense = useCallback((transferId: string) => {
    setTransfers(prev => {
      const transfer = prev.find(t => t.id === transferId);
      if (transfer) {
        // Reverse cash changes
        setCash(c => {
          if (!c) return c;
          return {
            ...c,
            [transfer.from]: c[transfer.from] + transfer.amount,
            [transfer.to]: c[transfer.to] - transfer.amount,
          };
        });

        // Remove associated transfer expense from destination category
        const removeExpense = (exps: Expense[]) => exps.filter(e => e.transferId !== transferId);
        setNeeds(prev => removeExpense(prev));
        setWants(prev => removeExpense(prev));
        setSavings(prev => removeExpense(prev));
      }
      return prev.filter(t => t.id !== transferId);
    });
  }, []);

  const updateTransferAmount = useCallback((transferId: string, newAmount: number) => {
    setTransfers(prev => {
      const transfer = prev.find(t => t.id === transferId);
      if (!transfer) return prev;

      const diff = newAmount - transfer.amount;
      if (diff === 0) return prev;

      // Adjust cash: the difference flows the same direction as the original
      setCash(c => {
        if (!c) return c;
        return {
          ...c,
          [transfer.from]: c[transfer.from] - diff,
          [transfer.to]: c[transfer.to] + diff,
        };
      });

      return prev.map(t =>
        t.id === transferId ? { ...t, amount: newAmount } : t
      );
    });
  }, []);

  // --- Recalculate budgets from scratch (no transferDiff drift) ---
  const recalculateBudgets = useCallback(() => {
    setIncomes(currentIncomes => {
      setGlobalSplitState(currentSplit => {
        setCash(prev => {
          if (!prev) return prev;
          const { needs, wants, savings, transfers } = latestStateRef.current;
          const { cash: newCash } = recalculateCashFromScratch(
            currentIncomes,
            transfers,
            { needs, wants, savings },
            currentSplit
          );
          return newCash;
        });
        return currentSplit;
      });
      return currentIncomes;
    });
  }, []);

  const setGlobalSplitAndRecalculate = useCallback((split: SplitPercentages) => {
    setGlobalSplitState(split);
    setIncomes(currentIncomes => {
      setCash(prev => {
        if (!prev) return prev;
        const { needs, wants, savings, transfers } = latestStateRef.current;
        const { cash: newCash, autoLoans } = recalculateCashFromScratch(
          currentIncomes,
          transfers,
          { needs, wants, savings },
          split
        );
        // Update auto-loans in transfers (replace existing auto-loans)
        setTransfers(prevTransfers => {
          const manualTransfers = prevTransfers.filter(t => !t.isAutomatic);
          return [...manualTransfers, ...autoLoans];
        });
        return newCash;
      });
      return currentIncomes;
    });
  }, []);

  // --- Save/Load ---
  const saveMonth = async (month?: string) => {
    if (!user) {
      toast('Necesitás iniciar sesión con Google para guardar.', { icon: 'ℹ️' });
      return;
    }
    const targetMonth = month || currentMonth;
    if (!cash) {
      toast.warning('Cargá un monto primero.');
      return;
    }
    try {
      await saveMonthBudget(user.uid, targetMonth, {
        totalAmount: cash.needs + cash.wants + cash.savings,
        cash,
        needs,
        wants,
        savings,
        incomes,
        transfers,
        globalSplit,
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Mes ${targetMonth} guardado correctamente.`);
    } catch (error: any) {
      console.error('Error guardando:', error);
      const isPermissionError = error?.code === 'permission-denied' ||
        error?.message?.includes('permission');
      if (isPermissionError) {
        toast('No tenés permisos para guardar. Activá Google Auth en Firebase Console.', { icon: '🔒' });
      } else {
        toast.error('No se pudo guardar. Intentá de nuevo.');
      }
    }
  };

  const loadMonth = async (month: string) => {
    if (!user) {
      toast('Necesitás iniciar sesión con Google para consultar meses.', { icon: 'ℹ️' });
      return;
    }
    setIsLoading(true);
    try {
      const data = await loadMonthBudget(user.uid, month);
      if (data) {
        setCash(data.cash);
        setNeeds(data.needs);
        setWants(data.wants);
        setSavings(data.savings);
        setCurrentMonth(month);
        // v2 fields — backward compatible with v1 data
        setIncomes(data.incomes || []);
        setTransfers(data.transfers || []);
        setGlobalSplitState(data.globalSplit || DEFAULT_SPLIT);
        // v2+ data: recalculate cash from scratch; v1 data uses cash as-is
        if (!data.schemaVersion || data.schemaVersion >= 2) {
          const expenses = { needs: data.needs, wants: data.wants, savings: data.savings };
          const { cash: newCash, autoLoans } = recalculateCashFromScratch(
            data.incomes || [],
            data.transfers || [],
            expenses,
            data.globalSplit || DEFAULT_SPLIT
          );
          setCash(newCash);
          setTransfers(prev => {
            const manual = prev.filter(t => !t.isAutomatic);
            return [...manual, ...autoLoans];
          });
        }
      } else {
        resetAll();
        setCurrentMonth(month);
      }
    } catch (error: any) {
      console.error('Error cargando:', error);
      const isPermissionError = error?.code === 'permission-denied' ||
        error?.message?.includes('permission');
      if (!isPermissionError) {
        toast.error('No se pudo cargar el mes.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Expose context for Navbar import button
  useEffect(() => {
    (window as any).__expenseContext = { addExpenseToCategory };
    return () => { delete (window as any).__expenseContext; };
  }, [addExpenseToCategory]);

  return (
    <ExpenseContext.Provider
      value={{
        needs,
        wants,
        savings,
        cash,
        currentMonth,
        incomes,
        transfers,
        globalSplit,
        isSaving,
        isLoading,
        isInitialLoading,
        savedMonths,
        updateNeeds,
        updateWants,
        updateSavings,
        updateCash,
        resetAll,
        deleteExpense,
        saveMonth,
        loadMonth,
        setCurrentMonth,
        addIncome,
        updateIncome,
        removeIncome,
        setGlobalSplit: setGlobalSplitAndRecalculate,
        recalculateBudgets,
        addExpenseToCategory,
        addTransfer,
        removeTransfer,
        removeTransferAndExpense,
        updateTransferAmount,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}
