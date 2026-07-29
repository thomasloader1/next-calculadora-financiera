import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculatePoolAmounts,
  checkAndCreateLoans,
  createManualTransfer,
  recalculateCashFromScratch,
  autoBorrow,
  resetIdCounter,
} from '../budgetCalculator';
import { Income, SplitPercentages } from '@/interfaces/Income';
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

describe('recalculateCashFromScratch', () => {
  // Scenario 1: Expense within pool reflects remaining cash
  it('expense within pool reflects remaining cash', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const expenses = {
      needs: [makeExpense({ amount: 10 })],
      wants: [],
      savings: [],
    };
    const { cash, autoLoans } = recalculateCashFromScratch(incomes, [], expenses, DEFAULT_SPLIT);
    expect(cash.needs).toBe(40);   // 50 - 10 = 40
    expect(cash.wants).toBe(30);   // unchanged
    expect(cash.savings).toBe(20); // unchanged
    expect(autoLoans).toEqual([]);
  });

  // Scenario 2: Expense exceeding needs pool auto-borrows from highest surplus
  it('auto-borrows from highest surplus when expense exceeds pool', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const expenses = {
      needs: [makeExpense({ amount: 60 })], // exceeds pool by 10
      wants: [],
      savings: [],
    };
    const { cash, autoLoans } = recalculateCashFromScratch(incomes, [], expenses, DEFAULT_SPLIT);
    expect(cash.needs).toBe(0);     // fully covered by auto-loan
    expect(cash.wants).toBe(30);    // unchanged (savings has 20, wants has 30 — wants is highest)
    expect(cash.savings).toBe(10);  // 20 - 10 borrowed = 10
    expect(autoLoans).toHaveLength(1);
    expect(autoLoans[0].from).toBe('wants'); // highest surplus (30 > 20)
    expect(autoLoans[0].to).toBe('needs');
    expect(autoLoans[0].amount).toBe(10);
    expect(autoLoans[0].isAutomatic).toBe(true);
  });

  // Scenario 3: Individual split override respected in pool
  it('respects splitOverride on individual income', () => {
    const incomes = [
      makeIncome({ amount: 100, splitOverride: { needs: 70, wants: 20, savings: 10 } }),
    ];
    const expenses = { needs: [], wants: [], savings: [] };
    const { cash, autoLoans } = recalculateCashFromScratch(incomes, [], expenses, DEFAULT_SPLIT);
    expect(cash.needs).toBe(70);
    expect(cash.wants).toBe(20);
    expect(cash.savings).toBe(10);
    expect(autoLoans).toEqual([]);
  });

  // Scenario 4: Income change recalculates cash from scratch (no drift)
  it('income change recalculates from scratch without transferDiff drift', () => {
    const expenses = {
      needs: [makeExpense({ amount: 40 })],
      wants: [],
      savings: [],
    };
    // Initial: $100 income, $40 expense in needs → cash.needs = 10
    const { cash: initialCash } = recalculateCashFromScratch(
      [makeIncome({ amount: 100 })], [], expenses, DEFAULT_SPLIT
    );
    expect(initialCash.needs).toBe(10);

    // Income changes to $200 → pool doubles, no residual drift
    const { cash: newCash } = recalculateCashFromScratch(
      [makeIncome({ amount: 200 })], [], expenses, DEFAULT_SPLIT
    );
    expect(newCash.needs).toBe(60); // 100 - 40 = 60 (not 10 + 50 = 60 by coincidence, but no drift)
    expect(newCash.wants).toBe(60); // 60 - 0 = 60
    expect(newCash.savings).toBe(40); // 40 - 0 = 40
  });

  // Scenario 5: Manual transfer between categories reflected in cash
  it('applies manual transfers before expenses', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const manualTransfer: Transfer = {
      id: 'tr_manual_1',
      from: 'savings',
      to: 'needs',
      amount: 10,
      isAutomatic: false,
      createdAt: new Date().toISOString(),
    };
    const expenses = { needs: [], wants: [], savings: [] };
    const { cash, autoLoans } = recalculateCashFromScratch(
      incomes, [manualTransfer], expenses, DEFAULT_SPLIT
    );
    expect(cash.needs).toBe(60);  // 50 + 10 = 60
    expect(cash.savings).toBe(10); // 20 - 10 = 10
    expect(autoLoans).toEqual([]);
  });

  // Scenario 6: Idempotency — same inputs produce same output
  it('is idempotent — same inputs produce identical output', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const expenses = {
      needs: [makeExpense({ amount: 60 })],
      wants: [],
      savings: [],
    };
    const result1 = recalculateCashFromScratch(incomes, [], expenses, DEFAULT_SPLIT);
    const result2 = recalculateCashFromScratch(incomes, [], expenses, DEFAULT_SPLIT);
    expect(result1.cash.needs).toBe(result2.cash.needs);
    expect(result1.cash.wants).toBe(result2.cash.wants);
    expect(result1.cash.savings).toBe(result2.cash.savings);
    expect(result1.autoLoans.length).toBe(result2.autoLoans.length);
  });

  it('returns pool in cash state for effectivePercent calculation', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const { cash } = recalculateCashFromScratch(incomes, [], { needs: [], wants: [], savings: [] }, DEFAULT_SPLIT);
    expect(cash.pool).toBeDefined();
    expect(cash.pool?.needs).toBe(50);
    expect(cash.pool?.wants).toBe(30);
    expect(cash.pool?.savings).toBe(20);
  });

  it('filters out automatic transfers (only applies manual)', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const autoTransfer: Transfer = {
      id: 'tr_auto_1',
      from: 'savings',
      to: 'needs',
      amount: 10,
      isAutomatic: true,
      createdAt: new Date().toISOString(),
    };
    const expenses = { needs: [], wants: [], savings: [] };
    const { cash } = recalculateCashFromScratch(incomes, [autoTransfer], expenses, DEFAULT_SPLIT);
    // Automatic transfer should NOT be applied
    expect(cash.needs).toBe(50);
    expect(cash.savings).toBe(20);
  });

  it('evaluates expenses in order: needs → wants → savings', () => {
    const incomes = [makeIncome({ amount: 100 })];
    const expenses = {
      needs: [makeExpense({ amount: 60 })], // deficit → borrow from wants (30)
      wants: [makeExpense({ amount: 5 })],   // 30 - 5 = 25 (after loan from savings)
      savings: [],
    };
    const { cash, autoLoans } = recalculateCashFromScratch(incomes, [], expenses, DEFAULT_SPLIT);
    // needs: 50 - 60 = -10 → borrow 10 from wants (highest surplus: 30 > 20)
    expect(cash.needs).toBe(0);
    // wants: 30 - 10 (loan) - 5 = 15
    expect(cash.wants).toBe(15);
    // savings: 20 (unchanged)
    expect(cash.savings).toBe(20);
    expect(autoLoans).toHaveLength(1);
    expect(autoLoans[0].from).toBe('wants');
    expect(autoLoans[0].to).toBe('needs');
    expect(autoLoans[0].amount).toBe(10);
  });
});

describe('autoBorrow', () => {
  const categoryOrder: CategoryKey[] = ['needs', 'wants', 'savings'];

  // Edge case 1: Single-hop only — highest surplus
  it('borrows single-hop from highest surplus only', () => {
    const cash: Record<CategoryKey, number> = { needs: -10, wants: 30, savings: 20 };
    const loan = autoBorrow(cash, 'needs', categoryOrder);
    expect(loan).not.toBeNull();
    expect(loan!.from).toBe('wants'); // 30 > 20
    expect(loan!.to).toBe('needs');
    expect(loan!.amount).toBe(10);
    // Only wants should be reduced, savings unchanged
    expect(cash.wants).toBe(20);
    expect(cash.savings).toBe(20);
    expect(cash.needs).toBe(0);
  });

  // Edge case 2: Highest surplus selection
  it('selects highest surplus when multiple categories have surplus', () => {
    const cash: Record<CategoryKey, number> = { needs: -5, wants: 15, savings: 50 };
    const loan = autoBorrow(cash, 'needs', categoryOrder);
    expect(loan!.from).toBe('savings'); // 50 > 15
    expect(loan!.amount).toBe(5);
    expect(cash.savings).toBe(45);
    expect(cash.needs).toBe(0);
  });

  // Edge case 3: Partial coverage — deficit exceeds surplus
  it('borrows only available amount when deficit exceeds surplus', () => {
    const cash: Record<CategoryKey, number> = { needs: -100, wants: 30, savings: 20 };
    const loan = autoBorrow(cash, 'needs', categoryOrder);
    expect(loan).not.toBeNull();
    expect(loan!.from).toBe('wants'); // highest surplus (30 > 20)
    expect(loan!.amount).toBe(30); // only 30 available
    expect(cash.needs).toBe(-70); // still negative
    expect(cash.wants).toBe(0);
  });

  // Edge case 4: No surplus available
  it('returns null when no surplus is available', () => {
    const cash: Record<CategoryKey, number> = { needs: -10, wants: 0, savings: 0 };
    const loan = autoBorrow(cash, 'needs', categoryOrder);
    expect(loan).toBeNull();
    // cash should be unchanged
    expect(cash.needs).toBe(-10);
    expect(cash.wants).toBe(0);
    expect(cash.savings).toBe(0);
  });

  // Edge case 5: No circular — source is never the deficit category
  it('never borrows from the deficit category itself', () => {
    const cash: Record<CategoryKey, number> = { needs: -10, wants: 0, savings: 5 };
    const loan = autoBorrow(cash, 'needs', categoryOrder);
    expect(loan).not.toBeNull();
    expect(loan!.from).toBe('savings'); // only non-zero surplus
    expect(loan!.to).toBe('needs');
    expect(loan!.from).not.toBe('needs');
  });

  it('rounds amounts to 2 decimals', () => {
    const cash: Record<CategoryKey, number> = { needs: -33.333, wants: 100, savings: 0 };
    const loan = autoBorrow(cash, 'needs', categoryOrder);
    expect(loan).not.toBeNull();
    const decimals = loan!.amount.toString().split('.')[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});
