import { CashState } from "./Cash";

export interface Expense {
    id: string;
    description: string;
    amount: number;
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
    updateNeeds: (newNeeds: Expense[]) => void;
    updateWants: (newWants: Expense[]) => void;
    updateSavings: (newSavings: Expense[]) => void;
    updateCash: (newState: CashState | null) => void;
  }