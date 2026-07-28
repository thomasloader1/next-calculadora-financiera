# Technical Design — Multi-Income Refactor

**Stack**: Next.js 16 · TypeScript · React 18 · Tailwind CSS 3 · Firebase 10 · Headless UI

---

## 1. Architecture Overview

### Data Flow

```
User Action (add income / add expense / transfer)
        │
        ▼
  React State (ExpenseProvider)
        │
        ├──► calculatePoolAmounts(incomes, globalSplit)
        │       │
        │       ▼
        │    CashState { needs, wants, savings, totalIncome }
        │
        ├──► addExpense(amount, category)
        │       │
        │       ▼
        │    checkAndCreateLoans(cash, expenses, transfers)
        │       │
        │       ├──► Transfer[] (auto)
        │       └──► CashState (rebalanced)
        │
        └──► saveMonth() ──► Firebase (schemaVersion: 2)
```

### State Management

Single `ExpenseContext` with `useState` hooks. Pure calculation functions extracted to `src/lib/` — no side effects in state updates. Context shape grows but remains flat (no nesting).

### File Structure (new/modified)

```
src/
├── interfaces/
│   ├── Cash.ts              ← MODIFY
│   ├── Expense.ts           ← MODIFY
│   ├── Income.ts            ← CREATE
│   └── Transfer.ts          ← CREATE
├── lib/
│   ├── budgetCalculator.ts  ← CREATE
│   ├── exchangeRate.ts      ← CREATE
│   └── formatAmount.ts      ← MODIFY (multi-currency)
├── context/Expense/
│   └── ExpenseContext.tsx    ← MODIFY
├── Services/
│   └── firebase.ts          ← MODIFY (schemaVersion)
└── components/ui/           ← CREATE (6 primitives)
    ├── Button.tsx
    ├── Input.tsx
    ├── Select.tsx
    ├── Textarea.tsx
    └── Chip.tsx
```

---

## 2. Data Model

### src/interfaces/Income.ts (NEW)

```ts
export interface SplitPercentages {
  needs: number;  // 0-100, 1 decimal max
  wants: number;
  savings: number;
  // must sum to exactly 100
}

export interface Income {
  id: string;
  description: string;
  amount: number;           // in ARS (converted if USD)
  currency: 'ARS' | 'USD';
  originalAmount?: number;  // original amount entered (before conversion)
  exchangeRate?: number;    // rate at time of entry
  splitOverride?: SplitPercentages | null;
}
```

### src/interfaces/Transfer.ts (NEW)

```ts
export type CategoryKey = 'needs' | 'wants' | 'savings';

export interface Transfer {
  id: string;
  from: CategoryKey;
  to: CategoryKey;
  amount: number;
  reason?: string;
  isAutomatic: boolean;
  createdAt: string;        // ISO 8601
}
```

### src/interfaces/Expense.ts (MODIFY)

```ts
import { CashState } from "./Cash";

export interface Expense {
  id: string;
  description: string;
  amount: number;           // always in ARS (converted if USD)
  currency: 'ARS' | 'USD';
  originalAmount?: number;
  exchangeRate?: number;
  isTransfer?: boolean;     // true for auto-loan / manual-transfer entries
  transferId?: string;      // links to Transfer.id
}

export interface MonthBudget {
  totalAmount: number;
  cash: CashState;
  needs: Expense[];
  wants: Expense[];
  savings: Expense[];
  incomes: Income[];        // NEW
  transfers: Transfer[];    // NEW
  globalSplit: SplitPercentages; // NEW
  schemaVersion: 2;         // NEW
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
  incomes: Income[];          // NEW
  transfers: Transfer[];      // NEW
  globalSplit: SplitPercentages; // NEW

  updateNeeds: (newNeeds: Expense[]) => void;
  updateWants: (newWants: Expense[]) => void;
  updateSavings: (newSavings: Expense[]) => void;
  updateCash: (newState: CashState | null) => void;
  resetAll: () => void;
  deleteExpense: (category: string, id: string) => void;
  saveMonth: (month?: string) => Promise<void>;
  loadMonth: (month: string) => Promise<void>;
  setCurrentMonth: (month: string) => void;

  // NEW methods
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, updates: Partial<Income>) => void;
  removeIncome: (id: string) => void;
  setGlobalSplit: (split: SplitPercentages) => void;
  recalculateBudgets: () => void;
  addTransfer: (from: CategoryKey, to: CategoryKey, amount: number, reason?: string) => void;
  removeTransfer: (id: string) => void;
}
```

### src/interfaces/Cash.ts (MODIFY)

```ts
import { SplitPercentages } from './Income';

export interface CashState {
  needs: number;
  wants: number;
  savings: number;
  totalIncome: number;           // NEW
  split: SplitPercentages;       // NEW
}
```

---

## 3. Budget Calculator (Pure Functions)

### src/lib/budgetCalculator.ts (NEW)

```ts
import { Income, SplitPercentages } from '@/interfaces/Income';
import { CashState } from '@/interfaces/Cash';
import { Transfer, CategoryKey } from '@/interfaces/Transfer';
import { Expense } from '@/interfaces/Expense';
import { nanoid } from 'nanoid';

type PoolResult = { needs: number; wants: number; savings: number };

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
    const split = income.splitOverride || globalSplit;
    totals.needs += income.amount * (split.needs / 100);
    totals.wants += income.amount * (split.wants / 100);
    totals.savings += income.amount * (split.savings / 100);
  }

  return totals;
}

/**
 * Check all categories. If any goes negative, auto-borrow from highest-surplus.
 * Single-hop only. Returns new Transfers created.
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

  // Subtract expenses from each category
  for (const [cat, exps] of Object.entries(expenses) as [CategoryKey, Expense[]][]) {
    for (const e of exps) {
      if (!e.isTransfer) {
        categoryTotals[cat] -= e.amount;
      }
    }
  }

  const categories: CategoryKey[] = ['needs', 'wants', 'savings'];
  const deficit = categories.filter(c => categoryTotals[c] < 0);

  for (const fromCat of deficit) {
    const debtAmount = Math.abs(categoryTotals[fromCat]);
    const surpluses = categories
      .filter(c => c !== fromCat && categoryTotals[c] > 0)
      .sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    if (surpluses.length === 0) {
      // No surplus anywhere — warn, no transfer
      continue;
    }

    let remaining = debtAmount;
    for (const toCat of surpluses) {
      if (remaining <= 0) break;
      const available = categoryTotals[toCat];
      const transferAmount = Math.min(remaining, available);

      if (transferAmount > 0) {
        newTransfers.push({
          id: nanoid(),
          from: toCat,  // source of funds
          to: fromCat,  // destination (deficit category)
          amount: transferAmount,
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
 * Create a manual transfer between two categories.
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
    id: nanoid(),
    from,
    to,
    amount,
    reason,
    isAutomatic: false,
    createdAt: new Date().toISOString(),
  };
}
```

**Design decisions**:
- Pure functions, no side effects — testable without React
- `checkAndCreateLoans` mutates a local copy of `categoryTotals`, not the real state
- `createManualTransfer` validates but doesn't apply — caller updates state

---

## 4. Exchange Rate Service

### src/lib/exchangeRate.ts (NEW)

```ts
interface DolarApiResponse {
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface CacheEntry {
  rate: number;
  fetchedAt: number;
  fechaActualizacion: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const API_URL = 'https://dolarapi.com/v1/dolares/oficial';

let cache: CacheEntry | null = null;

export async function getOfficialRate(): Promise<{
  rate: number;
  fechaActualizacion: string;
}> {
  // Return cached if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { rate: cache.rate, fechaActualizacion: cache.fechaActualizacion };
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    // Return stale cache if available
    if (cache) {
      return {
        rate: cache.rate,
        fechaActualizacion: cache.fechaActualizacion + ' (desactualizado)',
      };
    }
    throw new Error(`Exchange rate API unavailable: ${response.status}`);
  }

  const data: DolarApiResponse = await response.json();
  cache = {
    rate: data.venta,
    fetchedAt: Date.now(),
    fechaActualizacion: data.fechaActualizacion,
  };

  return { rate: cache.rate, fechaActualizacion: cache.fechaActualizacion };
}

export function convertToARS(amountUSD: number, rate: number): number {
  return Math.round(amountUSD * rate * 100) / 100;
}

/**
 * Sync helper: return current rate without await (for display).
 * Returns null if cache is cold — component should show loading.
 */
export function getCachedRateOrNull(): number | null {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }
  return null;
}
```

**Design decisions**:
- In-memory cache (module-level singleton) — no localStorage needed
- Stale-while-revalidate: if API fails but cache exists, return stale with warning suffix
- `convertToARS` uses `Math.round` to avoid floating-point display artifacts

---

## 5. UI Component Architecture

All components live in `src/components/ui/`. Each uses existing CDS tokens from `tailwind.config.ts`. No external UI libraries.

### Component Specs

| Component | Props | Variants | Notes |
|-----------|-------|----------|-------|
| `Button` | `variant`, `size`, `disabled`, `onClick`, `children`, `className` | `primary`, `ghost`, `icon`, `danger` | `primary` = bg-cds-primary, `ghost` = transparent, `danger` = bg-cds-negative |
| `Input` | `label`, `value`, `onChange`, `placeholder`, `prefix?`, `onClear?`, `error?`, `type` | — | Clear button when `onClear` provided. Prefix slot for icon/text |
| `Select` | `label`, `value`, `onChange`, `options: {value, label}[]` | — | Headless UI `Listbox`, CDS-styled dropdown |
| `Textarea` | `label`, `value`, `onChange`, `placeholder`, `rows?` | — | Standard, auto-resize optional |
| `Chip` | `variant`, `onRemove?`, `children` | `static`, `deletable` | `static` = no interaction, `deletable` = X button |

### Migration Order

1. Primitives (Button, Input, Select, Textarea, Chip) — no deps on existing code
2. Calculator.tsx — swap NextUI Button/Input
3. AddExpenseForm.tsx — swap NextUI components, add currency toggle
4. ExpenseList.tsx — swap list items, add transfer styling
5. MonthSelector.tsx — swap select/button
6. Auth components — swap buttons
7. Remove `@nextui-org/react` + `framer-motion` from package.json

---

## 6. Firestore Migration Strategy

### Version Detection

```ts
// In loadMonthBudget:
function migrateV1(doc: any): MonthBudget {
  return {
    schemaVersion: 2,
    totalAmount: doc.totalAmount || 0,
    cash: doc.cash || { needs: 0, wants: 0, savings: 0, totalIncome: 0, split: { needs: 50, wants: 30, savings: 20 } },
    needs: doc.needs || [],
    wants: doc.wants || [],
    savings: doc.savings || [],
    incomes: doc.incomes || [{
      id: 'migrated-income',
      description: 'Ingreso principal',
      amount: doc.totalAmount || 0,
      currency: 'ARS',
    }],
    transfers: doc.transfers || [],
    globalSplit: doc.globalSplit || { needs: 50, wants: 30, savings: 20 },
    schemaVersion: 2,
    updatedAt: doc.updatedAt,
  };
}
```

### Save Path

```ts
// saveMonthBudget always writes v2:
export const saveMonthBudget = async (uid: string, month: string, data: MonthBudget) => {
  await setDoc(doc(db, 'users', uid, 'months', month), {
    ...data,
    schemaVersion: 2,
    updatedAt: serverTimestamp(),
  });
};
```

### CashState Backfill

```ts
// Old CashState: { needs, wants, savings }
// New CashState: { needs, wants, savings, totalIncome, split }
function migrateCash(cash: any): CashState {
  return {
    needs: cash.needs || 0,
    wants: cash.wants || 0,
    savings: cash.savings || 0,
    totalIncome: cash.totalIncome || (cash.needs + cash.wants + cash.savings) || 0,
    split: cash.split || { needs: 50, wants: 30, savings: 20 },
  };
}
```

**Migration is lossless and transparent** — user never sees migration happening. v2 saves overwrite any migrated data permanently.

---

## 7. File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `src/interfaces/Income.ts` | Income + SplitPercentages interfaces |
| `src/interfaces/Transfer.ts` | Transfer interface + CategoryKey type |
| `src/lib/budgetCalculator.ts` | Pure budget calculation functions |
| `src/lib/exchangeRate.ts` | DolarAPI fetch + cache |
| `src/components/ui/Button.tsx` | Button primitive |
| `src/components/ui/Input.tsx` | Input primitive |
| `src/components/ui/Select.tsx` | Select primitive (Headless UI) |
| `src/components/ui/Textarea.tsx` | Textarea primitive |
| `src/components/ui/Chip.tsx` | Chip primitive |

### Modified Files

| File | Changes |
|------|---------|
| `src/interfaces/Cash.ts` | Add `totalIncome`, `split` fields |
| `src/interfaces/Expense.ts` | Add currency/transfer fields to Expense, add incomes/transfers/globalSplit/schemaVersion to MonthBudget, extend ExpenseContextType |
| `src/context/Expense/ExpenseContext.tsx` | Add income/transfer/split state + handlers, add v1 migration on load, recalculate on income changes |
| `src/Services/firebase.ts` | Write schemaVersion=2, v1→v2 migration on load |
| `src/lib/formatAmount.ts` | Accept optional currency param, format USD differently |
| `src/components/Calculator.tsx` | Replace NextUI with custom Button/Input |
| `src/components/AddExpenseForm.tsx` | Replace NextUI, add currency toggle, link to incomes |
| `src/components/ExpenseList.tsx` | Replace NextUI, style transfer entries differently |
| `src/components/MonthSelector.tsx` | Replace NextUI Select |
| `tailwind.config.ts` | Remove `@nextui-org` from plugins |

### Removed Dependencies

- `@nextui-org/react`
- `framer-motion` (if only used by NextUI)

---

## 8. Edge Cases & Constraints

| Case | Handling |
|------|----------|
| No incomes → add expense | Block, prompt to add income first |
| splitOverride sums ≠ 100 | Reject at save-time, inline validation |
| Auto-loan, all surpluses = 0 | Warn user, no transfer created |
| Manual transfer to same category | Reject with error |
| USD API unreachable, no cache | Block USD expense creation, show error |
| v1 document loaded | Backfill silently, save writes v2 |
| Income removed that had expenses | Expenses stay, pools recalculate (may trigger auto-loan) |
| Transfer amount > source remaining | `createManualTransfer` throws, caller catches |

---

## 9. Testing Strategy

- `budgetCalculator.ts`: 100% unit testable (pure functions)
- `exchangeRate.ts`: Mock fetch, test cache TTL, test stale fallback
- `ExpenseContext`: Integration test with renderHook
- Migration: test v1→v2 with fixture documents
