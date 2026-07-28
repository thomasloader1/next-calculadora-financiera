import { CashState } from '@/interfaces/Cash';
import { Expense, ExpenseContextType, ExpenseCategory } from '@/interfaces/Expense';
import { Income, SplitPercentages } from '@/interfaces/Income';
import { Transfer, CategoryKey } from '@/interfaces/Transfer';
import { calculatePoolAmounts, createManualTransfer, checkAndCreateLoans } from '@/lib/budgetCalculator';
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
  const [savedMonths, setSavedMonths] = useState<string[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch saved months on mount and when user changes
  useEffect(() => {
    if (user) {
      getUserMonths(user.uid).then(setSavedMonths).catch(() => {});
    } else {
      setSavedMonths([]);
    }
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

  // --- Add expense with auto-loan ---
  const addExpenseToCategory = useCallback((category: ExpenseCategory, expense: Expense) => {
    const updaterMap: Record<ExpenseCategory, React.Dispatch<React.SetStateAction<Expense[]>>> = {
      needs: setNeeds,
      wants: setWants,
      savings: setSavings,
    };

    updaterMap[category](prev => {
      const newExpenses = [...prev, expense];

      // Auto-loan check after adding expense
      setTimeout(() => {
        setNeeds(needsState => {
          setWants(wantsState => {
            setSavings(savingsState => {
              setCash(cashState => {
                if (!cashState) return cashState;

                const allExpenses = { needs: needsState, wants: wantsState, savings: savingsState };
                const remaining: Record<CategoryKey, number> = {
                  needs: cashState.needs - needsState.reduce((s, e) => s + e.amount, 0),
                  wants: cashState.wants - wantsState.reduce((s, e) => s + e.amount, 0),
                  savings: cashState.savings - savingsState.reduce((s, e) => s + e.amount, 0),
                };

                const newLoans = checkAndCreateLoans(cashState, allExpenses, []);

                if (newLoans.length === 0) return cashState;

                // Add transfer expenses to their destination categories
                for (const loan of newLoans) {
                  const transferExpense: Expense = {
                    id: `te_${loan.id}`,
                    description: `Préstamo de ${loan.from === 'needs' ? 'Necesidad' : loan.from === 'wants' ? 'Imprevistos' : 'Ahorro'} → ${loan.to === 'needs' ? 'Necesidad' : loan.to === 'wants' ? 'Imprevistos' : 'Ahorro'}`,
                    amount: loan.amount,
                    isTransfer: true,
                    transferId: loan.id,
                  };

                  const destUpdaterMap: Record<CategoryKey, React.Dispatch<React.SetStateAction<Expense[]>>> = {
                    needs: setNeeds,
                    wants: setWants,
                    savings: setSavings,
                  };
                  destUpdaterMap[loan.to](prev => [...prev, transferExpense]);
                }

                // Apply all loans to cash
                const newCash = { ...cashState };
                for (const loan of newLoans) {
                  newCash[loan.from] = Math.round((newCash[loan.from] - loan.amount) * 100) / 100;
                  newCash[loan.to] = Math.round((newCash[loan.to] + loan.amount) * 100) / 100;
                }

                // Add new loans to transfers state
                setTransfers(prev => [...prev, ...newLoans]);

                // Show warning if partial coverage
                const hasPartial = newLoans.some(loan => {
                  const totalSurplus = Object.values(remaining).filter(v => v > 0).reduce((s, v) => s + v, 0);
                  const totalDeficit = Object.values(remaining).filter(v => v < 0).reduce((s, v) => s + Math.abs(v), 0);
                  return totalSurplus < totalDeficit;
                });
                if (hasPartial) {
                  toast('No hay suficiente en otras categorías para cubrir el déficit completo.', { icon: '⚠️' });
                }

                return newCash;
              });
              return savingsState;
            });
            return wantsState;
          });
          return needsState;
        });
      }, 0);

      return newExpenses;
    });
  }, []);

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
      // Recalculate pools with updated incomes (preserves transfer effects)
      setGlobalSplitState(currentSplit => {
        setCash(cashPrev => {
          if (!cashPrev) return cashPrev;
          const pool = calculatePoolAmounts(updated, currentSplit);
          const totalIncome = updated.reduce((sum, inc) => sum + inc.amount, 0);
          const transferDiff = {
            needs: cashPrev.needs - (cashPrev.split ? cashPrev.split.needs / 100 * (cashPrev.totalIncome || 0) : pool.needs),
            wants: cashPrev.wants - (cashPrev.split ? cashPrev.split.wants / 100 * (cashPrev.totalIncome || 0) : pool.wants),
            savings: cashPrev.savings - (cashPrev.split ? cashPrev.split.savings / 100 * (cashPrev.totalIncome || 0) : pool.savings),
          };
          return {
            needs: Math.round((pool.needs + transferDiff.needs) * 100) / 100,
            wants: Math.round((pool.wants + transferDiff.wants) * 100) / 100,
            savings: Math.round((pool.savings + transferDiff.savings) * 100) / 100,
            totalIncome,
            split: currentSplit,
          };
        });
        return currentSplit;
      });
      return updated;
    });
  }, []);

  const removeIncome = useCallback((id: string) => {
    setIncomes(prev => prev.filter(inc => inc.id !== id));
  }, []);

  // --- Split ---
  const setGlobalSplit = useCallback((split: SplitPercentages) => {
    setGlobalSplitState(split);
  }, []);

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

  // --- Recalculate budgets from incomes (preserves transfer effects) ---
  const recalculateBudgets = useCallback(() => {
    setIncomes(currentIncomes => {
      setGlobalSplitState(currentSplit => {
        setCash(prev => {
          const pool = calculatePoolAmounts(currentIncomes, currentSplit);
          const totalIncome = currentIncomes.reduce((sum, inc) => sum + inc.amount, 0);

          if (!prev) {
            // First time: create cash from scratch
            return {
              needs: pool.needs,
              wants: pool.wants,
              savings: pool.savings,
              totalIncome,
              split: currentSplit,
            };
          }

          // Preserve transfer effects
          const prevBase = {
            needs: prev.split ? prev.split.needs / 100 * (prev.totalIncome || 0) : pool.needs,
            wants: prev.split ? prev.split.wants / 100 * (prev.totalIncome || 0) : pool.wants,
            savings: prev.split ? prev.split.savings / 100 * (prev.totalIncome || 0) : pool.savings,
          };
          return {
            needs: Math.round((pool.needs + (prev.needs - prevBase.needs)) * 100) / 100,
            wants: Math.round((pool.wants + (prev.wants - prevBase.wants)) * 100) / 100,
            savings: Math.round((pool.savings + (prev.savings - prevBase.savings)) * 100) / 100,
            totalIncome,
            split: currentSplit,
          };
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
        const pool = calculatePoolAmounts(currentIncomes, split);
        const totalIncome = currentIncomes.reduce((sum, inc) => sum + inc.amount, 0);
        const transferDiff = {
          needs: prev.needs - (prev.split ? prev.split.needs / 100 * (prev.totalIncome || 0) : pool.needs),
          wants: prev.wants - (prev.split ? prev.split.wants / 100 * (prev.totalIncome || 0) : pool.wants),
          savings: prev.savings - (prev.split ? prev.split.savings / 100 * (prev.totalIncome || 0) : pool.savings),
        };
        return {
          needs: Math.round((pool.needs + transferDiff.needs) * 100) / 100,
          wants: Math.round((pool.wants + transferDiff.wants) * 100) / 100,
          savings: Math.round((pool.savings + transferDiff.savings) * 100) / 100,
          totalIncome,
          split,
        };
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
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}
