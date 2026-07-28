import { CashState } from "./Cash";
import { Income, SplitPercentages } from "./Income";
import { Transfer, CategoryKey } from "./Transfer";

export interface Expense {
    id: string;
    description: string;
    amount: number;
    currency?: 'ARS' | 'USD';
    originalAmount?: number;
    exchangeRate?: number;
    isTransfer?: boolean;
    transferId?: string;
}

export type ExpenseCategory = 'needs' | 'wants' | 'savings';

export interface MonthBudget {
    totalAmount: number;
    cash: CashState;
    needs: Expense[];
    wants: Expense[];
    savings: Expense[];
    incomes?: Income[];
    transfers?: Transfer[];
    globalSplit?: SplitPercentages;
    schemaVersion?: 2;
    updatedAt?: string;
}

export interface ExpenseListProps {
    category: string;
    expenses: Expense[];
    cash: number | undefined;
}

export interface ExpenseContextType {
    needs: Expense[];
    wants: Expense[];
    savings: Expense[];
    cash: CashState | null;
    currentMonth: string;
    incomes: Income[];
    transfers: Transfer[];
    globalSplit: SplitPercentages;
    isSaving: boolean;
    isLoading: boolean;
    savedMonths: string[];
    updateNeeds: (newNeeds: Expense[]) => void;
    updateWants: (newWants: Expense[]) => void;
    updateSavings: (newSavings: Expense[]) => void;
    updateCash: (newState: CashState | null) => void;
    resetAll: () => void;
    deleteExpense: (category: string, id: string) => void;
    saveMonth: (month?: string) => Promise<void>;
    loadMonth: (month: string) => Promise<void>;
    setCurrentMonth: (month: string) => void;
    addIncome: (income: Omit<Income, 'id'>) => void;
    updateIncome: (id: string, updates: Partial<Income>) => void;
    removeIncome: (id: string) => void;
    setGlobalSplit: (split: SplitPercentages) => void;
    recalculateBudgets: () => void;
    addExpenseToCategory: (category: ExpenseCategory, expense: Expense) => void;
    addTransfer: (from: CategoryKey, to: CategoryKey, amount: number, reason?: string, remaining?: Partial<CashState>) => void;
    removeTransfer: (id: string) => void;
    removeTransferAndExpense: (transferId: string) => void;
}