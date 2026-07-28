import { Income, SplitPercentages } from '@/interfaces/Income';
import { CashState } from '@/interfaces/Cash';
import { Transfer, CategoryKey } from '@/interfaces/Transfer';
import { Expense } from '@/interfaces/Expense';

type PoolResult = { needs: number; wants: number; savings: number };

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `tr_${Date.now()}_${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Sum each income's contribution using its split (or global fallback).
 * Returns total pool amounts per category.
 */
export function calculatePoolAmounts(
  incomes: Income[],
  globalSplit: SplitPercentages
): PoolResult {
  const totals: PoolResult = { needs: 0, wants: 0, savings: 0 };

  for (const income of incomes) {
    const split = income.splitOverride ?? globalSplit;
    totals.needs += income.amount * (split.needs / 100);
    totals.wants += income.amount * (split.wants / 100);
    totals.savings += income.amount * (split.savings / 100);
  }

  return {
    needs: Math.round(totals.needs * 100) / 100,
    wants: Math.round(totals.wants * 100) / 100,
    savings: Math.round(totals.savings * 100) / 100,
  };
}

/**
 * Check all categories. If any goes negative after expenses, auto-borrow
 * from the category with the highest surplus. Single-hop only (no circular).
 * Returns new Transfers created.
 */
export function checkAndCreateLoans(
  cash: CashState,
  expenses: { needs: Expense[]; wants: Expense[]; savings: Expense[] },
  existingTransfers: Transfer[]
): Transfer[] {
  const newTransfers: Transfer[] = [];
  const categoryTotals: Record<CategoryKey, number> = {
    needs: cash.needs,
    wants: cash.wants,
    savings: cash.savings,
  };

  // Subtract non-transfer expenses from each category
  for (const [cat, exps] of Object.entries(expenses) as [CategoryKey, Expense[]][]) {
    for (const e of exps) {
      if (!e.isTransfer) {
        categoryTotals[cat] -= e.amount;
      }
    }
  }

  // Also subtract amounts from existing auto-transfers (already applied to cash)
  // No need — cash already reflects previous transfers

  const categories: CategoryKey[] = ['needs', 'wants', 'savings'];
  const deficit = categories.filter(c => categoryTotals[c] < 0);

  for (const fromCat of deficit) {
    const debtAmount = Math.abs(categoryTotals[fromCat]);
    const surpluses = categories
      .filter(c => c !== fromCat && categoryTotals[c] > 0)
      .sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    if (surpluses.length === 0) {
      continue;
    }

    let remaining = debtAmount;
    for (const toCat of surpluses) {
      if (remaining <= 0) break;
      const available = categoryTotals[toCat];
      const transferAmount = Math.min(remaining, available);

      if (transferAmount > 0) {
        newTransfers.push({
          id: generateId(),
          from: toCat,
          to: fromCat,
          amount: Math.round(transferAmount * 100) / 100,
          isAutomatic: true,
          createdAt: new Date().toISOString(),
        });
        categoryTotals[toCat] -= transferAmount;
        categoryTotals[fromCat] += transferAmount;
        remaining -= transferAmount;
      }
    }
  }

  return newTransfers;
}

/**
 * Calculate effective pool percentages from pool amounts and total income.
 * Used when incomes have individual splits — the "effective" % per category
 * is the weighted average across all incomes.
 */
export function calculateEffectivePercentages(
  cash: { needs: number; wants: number; savings: number },
  totalIncome: number
): PoolResult {
  if (totalIncome <= 0) return { needs: 0, wants: 0, savings: 0 };
  return {
    needs: Math.round((cash.needs / totalIncome) * 1000) / 10,
    wants: Math.round((cash.wants / totalIncome) * 1000) / 10,
    savings: Math.round((cash.savings / totalIncome) * 1000) / 10,
  };
}

/**
 * Create a manual transfer between two categories.
 * Validates: different categories, positive amount, sufficient funds.
 * Does NOT apply the transfer — caller must update state.
 */
export function createManualTransfer(
  from: CategoryKey,
  to: CategoryKey,
  amount: number,
  cash: CashState,
  reason?: string
): Transfer {
  if (from === to) throw new Error('Cannot transfer to same category');
  if (amount <= 0) throw new Error('Transfer amount must be positive');
  if (cash[from] < amount) throw new Error('Insufficient funds in source category');

  return {
    id: generateId(),
    from,
    to,
    amount: Math.round(amount * 100) / 100,
    reason,
    isAutomatic: false,
    createdAt: new Date().toISOString(),
  };
}
