import { describe, it, expect, beforeEach } from 'vitest';
import { recalculateCashFromScratch } from '@/lib/budgetCalculator';
import { Income, SplitPercentages } from '@/interfaces/Income';
import { Transfer } from '@/interfaces/Transfer';
import { Expense } from '@/interfaces/Expense';

const DEFAULT_SPLIT: SplitPercentages = { needs: 50, wants: 30, savings: 20 };

function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 'inc_1',
    description: 'Salario',
    amount: 100000,
    currency: 'ARS',
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp_1',
    description: 'Alquiler',
    amount: 40000,
    ...overrides,
  };
}

function makeTransfer(overrides: Partial<Transfer> = {}): Transfer {
  return {
    id: 'tr_1',
    from: 'savings',
    to: 'needs',
    amount: 10000,
    isAutomatic: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Integration tests for ExpenseContext recalculation functions.
 *
 * These tests verify the recalculation logic that updateIncome, removeIncome,
 * recalculateBudgets, and setGlobalSplitAndRecalculate rely on. Each test
 * simulates the state transition that the context function would perform,
 * then calls recalculateCashFromScratch with the resulting inputs.
 *
 * The context functions themselves use latestStateRef to read needs/wants/savings/transfers
 * and functional state updates for incomes/globalSplit. These tests verify that
 * recalculateCashFromScratch produces correct results for each scenario.
 */
describe('ExpenseContext recalculation integration', () => {
  // --- updateIncome ---
  describe('updateIncome', () => {
    it('recalculates cash from scratch when income amount changes (no drift)', () => {
      const expenses = {
        needs: [makeExpense({ amount: 40000 })],
        wants: [],
        savings: [],
      };

      // Initial: $100k income, $40k expense in needs → cash.needs = 10k
      const initial = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, DEFAULT_SPLIT
      );
      expect(initial.cash.needs).toBe(10000);

      // updateIncome changes amount to $200k
      const updated = recalculateCashFromScratch(
        [makeIncome({ amount: 200000 })], [], expenses, DEFAULT_SPLIT
      );
      // pool doubles to 100k needs, expense still 40k → cash.needs = 60k
      expect(updated.cash.needs).toBe(60000);
      expect(updated.cash.wants).toBe(60000);
      expect(updated.cash.savings).toBe(40000);
      // No drift: cash reflects new pool exactly
      expect(updated.cash.pool?.needs).toBe(100000);
    });

    it('recalculates cash when income splitOverride changes', () => {
      const expenses = { needs: [], wants: [], savings: [] };

      // Initial: 50/30/20
      const initial = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, DEFAULT_SPLIT
      );
      expect(initial.cash.needs).toBe(50000);

      // updateIncome changes splitOverride to 70/20/10
      const updated = recalculateCashFromScratch(
        [makeIncome({ amount: 100000, splitOverride: { needs: 70, wants: 20, savings: 10 } })],
        [], expenses, DEFAULT_SPLIT
      );
      expect(updated.cash.needs).toBe(70000);
      expect(updated.cash.wants).toBe(20000);
      expect(updated.cash.savings).toBe(10000);
    });

    it('preserves manual transfers when income changes', () => {
      const expenses = { needs: [], wants: [], savings: [] };
      const manualTransfer = makeTransfer({ from: 'savings', to: 'needs', amount: 10000 });

      // Initial: $100k, transfer $10k from savings to needs
      const initial = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [manualTransfer], expenses, DEFAULT_SPLIT
      );
      expect(initial.cash.needs).toBe(60000);  // 50k + 10k
      expect(initial.cash.savings).toBe(10000); // 20k - 10k

      // updateIncome changes amount to $200k — transfer should still apply
      const updated = recalculateCashFromScratch(
        [makeIncome({ amount: 200000 })], [manualTransfer], expenses, DEFAULT_SPLIT
      );
      expect(updated.cash.needs).toBe(110000);  // 100k + 10k
      expect(updated.cash.savings).toBe(30000);  // 40k - 10k
    });
  });

  // --- removeIncome ---
  describe('removeIncome', () => {
    it('recalculates cash from scratch when one of multiple incomes is removed', () => {
      const expenses = {
        needs: [makeExpense({ amount: 60000 })],
        wants: [],
        savings: [],
      };

      // Two incomes: $100k + $50k = $150k
      const initial = recalculateCashFromScratch(
        [makeIncome({ id: 'inc_1', amount: 100000 }), makeIncome({ id: 'inc_2', amount: 50000 })],
        [], expenses, DEFAULT_SPLIT
      );
      expect(initial.cash.needs).toBe(15000); // 75k - 60k = 15k

      // removeIncome removes inc_1 → only $50k remains
      const updated = recalculateCashFromScratch(
        [makeIncome({ id: 'inc_2', amount: 50000 })], [], expenses, DEFAULT_SPLIT
      );
      // pool = 25k needs, expense = 60k → deficit → auto-borrow from savings (10k)
      expect(updated.cash.needs).toBe(0);      // 25k - 60k + 10k (borrowed) = -25k → 0 after borrow
      expect(updated.cash.savings).toBe(0);     // 10k - 10k (borrowed) = 0
      expect(updated.autoLoans).toHaveLength(1);
      expect(updated.autoLoans[0].from).toBe('savings');
      expect(updated.autoLoans[0].to).toBe('needs');
      expect(updated.autoLoans[0].amount).toBe(10000);
    });

    it('returns null cash when all incomes are removed (handled by context)', () => {
      // The context returns null for cash when updated.length === 0
      // recalculateCashFromScratch with empty incomes returns zero pool
      const { cash } = recalculateCashFromScratch([], [], { needs: [], wants: [], savings: [] }, DEFAULT_SPLIT);
      expect(cash.needs).toBe(0);
      expect(cash.wants).toBe(0);
      expect(cash.savings).toBe(0);
    });
  });

  // --- recalculateBudgets ---
  describe('recalculateBudgets', () => {
    it('recalculates cash from scratch when incomes change', () => {
      const expenses = {
        needs: [makeExpense({ amount: 40000 })],
        wants: [],
        savings: [],
      };

      const { cash } = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, DEFAULT_SPLIT
      );
      expect(cash.needs).toBe(10000); // 50k - 40k
      expect(cash.wants).toBe(30000);
      expect(cash.savings).toBe(20000);
    });

    it('recalculates cash when globalSplit changes (via recalculateBudgets)', () => {
      const expenses = {
        needs: [makeExpense({ amount: 40000 })],
        wants: [],
        savings: [],
      };

      // Original split 50/30/20
      const original = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, DEFAULT_SPLIT
      );
      expect(original.cash.needs).toBe(10000);

      // New split 60/25/15
      const newSplit = { needs: 60, wants: 25, savings: 15 };
      const updated = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, newSplit
      );
      expect(updated.cash.needs).toBe(20000); // 60k - 40k
      expect(updated.cash.wants).toBe(25000);
      expect(updated.cash.savings).toBe(15000);
    });
  });

  // --- setGlobalSplitAndRecalculate ---
  describe('setGlobalSplitAndRecalculate', () => {
    it('recalculates cash with new split and updates auto-loans', () => {
      const expenses = {
        needs: [makeExpense({ amount: 60000 })],
        wants: [],
        savings: [],
      };

      // Original split 50/30/20: needs pool = 50k, expense = 60k → deficit
      const original = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, DEFAULT_SPLIT
      );
      expect(original.cash.needs).toBe(0); // auto-borrowed
      expect(original.autoLoans).toHaveLength(1);

      // New split 70/20/10: needs pool = 70k, expense = 60k → no deficit
      const newSplit = { needs: 70, wants: 20, savings: 10 };
      const updated = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses, newSplit
      );
      expect(updated.cash.needs).toBe(10000); // 70k - 60k = 10k
      expect(updated.autoLoans).toEqual([]); // no auto-loan needed
    });

    it('preserves manual transfers when split changes', () => {
      const expenses = { needs: [], wants: [], savings: [] };
      const manualTransfer = makeTransfer({ from: 'savings', to: 'needs', amount: 10000 });

      const newSplit = { needs: 70, wants: 20, savings: 10 };
      const { cash } = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [manualTransfer], expenses, newSplit
      );
      expect(cash.needs).toBe(80000);  // 70k + 10k
      expect(cash.savings).toBe(0);    // 10k - 10k
    });
  });

  // --- addExpenseToCategory ---
  describe('addExpenseToCategory', () => {
    it('recalculates cash synchronously after adding expense (no setTimeout race)', () => {
      const initialExpenses = { needs: [], wants: [], savings: [] };
      const { cash: initialCash } = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], initialExpenses, DEFAULT_SPLIT
      );
      expect(initialCash.needs).toBe(50000);

      // Add $10k expense to needs
      const newExpenses = {
        needs: [makeExpense({ amount: 10000 })],
        wants: [],
        savings: [],
      };
      const { cash: newCash } = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], newExpenses, DEFAULT_SPLIT
      );
      expect(newCash.needs).toBe(40000); // 50k - 10k
    });

    it('creates auto-loans synchronously when expense exceeds pool', () => {
      const newExpenses = {
        needs: [makeExpense({ amount: 60000 })], // exceeds 50k pool
        wants: [],
        savings: [],
      };
      const { cash, autoLoans } = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], newExpenses, DEFAULT_SPLIT
      );
      expect(cash.needs).toBe(0);
      expect(autoLoans).toHaveLength(1);
      expect(autoLoans[0].isAutomatic).toBe(true);
    });

    it('replaces existing auto-loans when new expense is added', () => {
      // Simulate: first expense causes auto-loan, second expense changes the loan
      const expenses1 = {
        needs: [makeExpense({ amount: 60000 })],
        wants: [],
        savings: [],
      };
      const result1 = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses1, DEFAULT_SPLIT
      );
      expect(result1.autoLoans).toHaveLength(1);

      // Add another expense — auto-loans should be recomputed from scratch
      const expenses2 = {
        needs: [makeExpense({ amount: 60000 }), makeExpense({ amount: 10000 })],
        wants: [],
        savings: [],
      };
      const result2 = recalculateCashFromScratch(
        [makeIncome({ amount: 100000 })], [], expenses2, DEFAULT_SPLIT
      );
      // 50k - 70k = -20k → borrow 20k from wants (30k surplus)
      expect(result2.cash.needs).toBe(0);
      expect(result2.cash.wants).toBe(10000); // 30k - 20k = 10k
      expect(result2.autoLoans).toHaveLength(1);
      expect(result2.autoLoans[0].amount).toBe(20000);
    });
  });
});
