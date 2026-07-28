import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculatePoolAmounts,
  checkAndCreateLoans,
  createManualTransfer,
  resetIdCounter,
} from '../budgetCalculator';
import { Income } from '@/interfaces/Income';
import { CashState } from '@/interfaces/Cash';
import { Transfer, CategoryKey } from '@/interfaces/Transfer';
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

function makeCash(overrides: Partial<CashState> = {}): CashState {
  return {
    needs: 50000,
    wants: 30000,
    savings: 20000,
    totalIncome: 100000,
    split: DEFAULT_SPLIT,
    ...overrides,
  };
}

beforeEach(() => {
  resetIdCounter();
});

describe('calculatePoolAmounts', () => {
  it('returns zeros for empty incomes', () => {
    const result = calculatePoolAmounts([], DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 0, wants: 0, savings: 0 });
  });

  it('splits single income using global split', () => {
    const incomes = [makeIncome({ amount: 100000 })];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 50000, wants: 30000, savings: 20000 });
  });

  it('splits multiple incomes using global split', () => {
    const incomes = [
      makeIncome({ id: 'inc_1', amount: 100000 }),
      makeIncome({ id: 'inc_2', amount: 50000 }),
    ];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 75000, wants: 45000, savings: 30000 });
  });

  it('rounds to 2 decimals', () => {
    const incomes = [makeIncome({ amount: 33333 })];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result.needs).toBe(16666.5);
    expect(result.wants).toBe(9999.9);
    expect(result.savings).toBe(6666.6);
  });

  it('uses splitOverride when present on single income', () => {
    const incomes = [makeIncome({ amount: 100000, splitOverride: { needs: 100, wants: 0, savings: 0 } })];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 100000, wants: 0, savings: 0 });
  });

  it('uses global split when splitOverride is absent', () => {
    const incomes = [makeIncome({ amount: 100000 })];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 50000, wants: 30000, savings: 20000 });
  });

  it('mixes override and global across multiple incomes', () => {
    const incomes = [
      makeIncome({ id: 'inc_1', amount: 100000, splitOverride: { needs: 100, wants: 0, savings: 0 } }),
      makeIncome({ id: 'inc_2', amount: 100000 }), // uses global 50/30/20
    ];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 150000, wants: 30000, savings: 20000 });
  });

  it('respects splitOverride when all incomes have one', () => {
    const incomes = [
      makeIncome({ id: 'inc_1', amount: 50000, splitOverride: { needs: 60, wants: 20, savings: 20 } }),
      makeIncome({ id: 'inc_2', amount: 50000, splitOverride: { needs: 40, wants: 40, savings: 20 } }),
    ];
    const result = calculatePoolAmounts(incomes, DEFAULT_SPLIT);
    expect(result).toEqual({ needs: 50000, wants: 30000, savings: 20000 });
  });
});

describe('checkAndCreateLoans', () => {
  it('returns empty when no category is negative', () => {
    const cash = makeCash();
    const expenses = {
      needs: [makeExpense({ amount: 10000 })],
      wants: [makeExpense({ amount: 5000 })],
      savings: [makeExpense({ amount: 2000 })],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    expect(result).toEqual([]);
  });

  it('creates transfer from highest surplus to deficit category', () => {
    const cash = makeCash({ needs: 50000, wants: 30000, savings: 20000 });
    const expenses = {
      needs: [makeExpense({ amount: 60000 })], // deficit of 10000
      wants: [],
      savings: [],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('wants'); // highest surplus (30000)
    expect(result[0].to).toBe('needs');
    expect(result[0].amount).toBe(10000);
    expect(result[0].isAutomatic).toBe(true);
  });

  it('distributes deficit across multiple surpluses', () => {
    const cash = makeCash({ needs: 50000, wants: 5000, savings: 5000 });
    const expenses = {
      needs: [makeExpense({ amount: 60000 })], // deficit of 10000
      wants: [],
      savings: [],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    expect(result).toHaveLength(2);
    const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBe(10000);
  });

  it('returns empty when all surpluses are zero', () => {
    const cash = makeCash({ needs: 0, wants: 0, savings: 0 });
    const expenses = {
      needs: [makeExpense({ amount: 10000 })],
      wants: [],
      savings: [],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    expect(result).toEqual([]);
  });

  it('does not count transfer expenses in deficit calculation', () => {
    const cash = makeCash({ needs: 50000, wants: 30000, savings: 20000 });
    const expenses = {
      needs: [makeExpense({ amount: 60000, isTransfer: true, transferId: 'tr_1' })],
      wants: [],
      savings: [],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    expect(result).toEqual([]);
  });

  it('partial transfer when deficit exceeds all surpluses', () => {
    const cash = makeCash({ needs: 50000, wants: 5000, savings: 2000 });
    const expenses = {
      needs: [makeExpense({ amount: 60000 })], // deficit of 10000
      wants: [],
      savings: [],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBe(7000); // only 7000 available
  });

  it('rounds transfer amounts to 2 decimals', () => {
    const cash = makeCash({ needs: 50000, wants: 33333, savings: 16667 });
    const expenses = {
      needs: [makeExpense({ amount: 55000 })], // deficit of 5000
      wants: [],
      savings: [],
    };
    const result = checkAndCreateLoans(cash, expenses, []);
    for (const t of result) {
      const decimals = t.amount.toString().split('.')[1];
      expect(!decimals || decimals.length <= 2).toBe(true);
    }
  });
});

describe('createManualTransfer', () => {
  it('creates a valid manual transfer', () => {
    const cash = makeCash();
    const result = createManualTransfer('needs', 'wants', 5000, cash, 'Emergency');
    expect(result.from).toBe('needs');
    expect(result.to).toBe('wants');
    expect(result.amount).toBe(5000);
    expect(result.isAutomatic).toBe(false);
    expect(result.reason).toBe('Emergency');
    expect(result.id).toMatch(/^tr_/);
    expect(result.createdAt).toBeTruthy();
  });

  it('throws when transferring to same category', () => {
    const cash = makeCash();
    expect(() => createManualTransfer('needs', 'needs', 5000, cash)).toThrow(
      'Cannot transfer to same category'
    );
  });

  it('throws when amount is zero', () => {
    const cash = makeCash();
    expect(() => createManualTransfer('needs', 'wants', 0, cash)).toThrow(
      'Transfer amount must be positive'
    );
  });

  it('throws when amount is negative', () => {
    const cash = makeCash();
    expect(() => createManualTransfer('needs', 'wants', -100, cash)).toThrow(
      'Transfer amount must be positive'
    );
  });

  it('throws when insufficient funds', () => {
    const cash = makeCash({ needs: 1000 });
    expect(() => createManualTransfer('needs', 'wants', 5000, cash)).toThrow(
      'Insufficient funds in source category'
    );
  });

  it('rounds amount to 2 decimals', () => {
    const cash = makeCash();
    const result = createManualTransfer('needs', 'wants', 1234.567, cash);
    expect(result.amount).toBe(1234.57);
  });

  it('works without reason', () => {
    const cash = makeCash();
    const result = createManualTransfer('savings', 'needs', 1000, cash);
    expect(result.reason).toBeUndefined();
    expect(result.isAutomatic).toBe(false);
  });
});
