# SDD Delta Spec — Multi-Income, Custom Split, Auto-Loan, Transfers, USD, UI Migration, Firestore v2

> **Project**: next-calculadora-financiera
> **Stack**: Next.js 16 + TypeScript + React 18 + Tailwind CSS 3 + Firebase 10
> **Status**: NEW — All features are additive or replace existing behavior
> **Generated**: 2026-07-27

---

## Current State Summary

- Single income entry → `Calculator.tsx` captures "Monto en mano" → hardcoded 50/30/20 split
- `ExpenseContext` manages `needs[]`, `wants[]`, `savings[]` + `CashState { needs, wants, savings }`
- `MonthBudget` stored in Firestore: `{ totalAmount, cash, needs, wants, savings }`
- `Expense`: `{ id, description, amount }` — no currency, no transfer metadata
- NextUI components (`@nextui-org/react` v2.1.7)

---

## 1. Multi-Income

### Requirement

Users add 1+ income entries. Each income has a description, amount, and optional currency (ARS/USD). All incomes feed into 3 shared category pools (needs/wants/savings). Pool amounts are the sum of each income's contribution per category.

### Data Model Changes

```ts
// NEW
interface Income {
  id: string;
  description: string;
  amount: number;          // always stored in ARS after conversion
  originalAmount?: number; // original if USD
  currency: 'ARS' | 'USD';
  exchangeRate?: number;   // ARS per USD at time of entry
  splitOverride?: SplitPercentages; // null = use global
}

interface SplitPercentages {
  needs: number;   // 0-100
  wants: number;   // 0-100
  savings: number; // 0-100
}
```

### Pool Calculation

```
For each income i:
  split = i.splitOverride ?? globalSplit
  pool.needs   += i.amount * (split.needs / 100)
  pool.wants   += i.amount * (split.wants / 100)
  pool.savings += i.amount * (split.savings / 100)
```

### Scenarios

**Given** user has no incomes
**When** they view the calculator
**Then** total = 0, all pools = 0, add-expense button is disabled

**Given** user adds income "Salario" 100000 ARS
**When** pools are calculated with global split 50/30/20
**Then** needs = 50000, wants = 30000, savings = 20000

**Given** user adds income "Freelance" 100000 ARS with split override 60/20/20
**When** pools are calculated
**Then** Freelance contributes needs=60000, wants=20000, savings=20000

**Given** user adds income "Alquiler" 200 USD at rate 1500
**When** income is saved
**Then** stored amount = 300000 ARS, originalAmount = 200, currency = 'USD', exchangeRate = 1500

**Given** user deletes an income
**When** pools are recalculated
**Then** that income's contribution is removed from all pools

### Edge Cases

- Income with splitOverride that doesn't sum to 100: **reject at save**, show validation error
- Income amount = 0 or negative: **reject** at form validation
- Editing income amount: recalculate pools in real-time
- At least one income required to add expenses

---

## 2. Custom Split

### Requirement

Global split editor defaults to 50/30/20. User can override split per-income. All splits must sum to exactly 100%.

### Scenarios

**Given** global split is 50/30/20
**When** user changes global split to 60/20/20
**Then** all incomes without override use new split, pools recalculated immediately

**Given** global split sums to 99
**When** user tries to save
**Then** save is blocked, error message shown: "Las porcentajes deben sumar 100%"

**Given** global split sums to 101
**When** user tries to save
**Then** save is blocked, same error

**Given** user sets per-income override on income A (60/20/20)
**When** user changes global split
**Then** income A keeps its override, income B (no override) uses new global

**Given** user clears per-income override
**When** pools recalculate
**Then** that income falls back to global split

### Edge Cases

- Negative percentages: **reject** (min 0 per field)
- Individual percentage > 100: **reject**
- All three fields empty treated as 0/0/0 → sum = 0 → invalid
- Floating point precision: parse to 1 decimal max, reject if more

---

## 3. Auto-Loan

### Requirement

After adding an expense: if the target category's remaining balance < 0, automatically borrow from the category with the highest surplus. Create a Transfer record and a corresponding Expense in the source category.

### Data Model Changes

```ts
// NEW
interface Transfer {
  id: string;
  from: CategoryKey;  // 'needs' | 'wants' | 'savings'
  to: CategoryKey;
  amount: number;
  isAutomatic: boolean;
  createdAt: string;  // ISO timestamp
}

// EXTEND Expense
interface Expense {
  id: string;
  description: string;
  amount: number;
  currency?: 'ARS' | 'USD';    // default 'ARS'
  originalAmount?: number;
  exchangeRate?: number;
  isTransfer?: boolean;          // true if created by auto-loan
  transferId?: string;           // links to Transfer.id
}
```

### Algorithm

```
function afterAddExpense(category, expense):
  remaining = pool[category] - totalExpenses[category]
  if remaining >= 0: return  // no problem

  deficit = abs(remaining)
  sources = categories.filter(c => c !== category)
                    .sort(by: remaining DESC)
  // single-hop only

  for source in sources:
    available = pool[source] - totalExpenses[source]
    if available <= 0: continue

    transferAmount = min(deficit, available)
    if transferAmount <= 0: continue

    create Transfer { from: source, to: category, amount: transferAmount, isAutomatic: true }
    create Expense { description: "Préstamo automático", amount: transferAmount, isTransfer: true, transferId: transfer.id }
    add Expense to source's expense list

    deficit -= transferAmount
    if deficit <= 0: break

  // after loop: if deficit > 0, partial transfer happened, warn user
  if deficit > 0:
    show warning: "Se trasladó $X de [source]. Queda un déficit de $Y sin cubrir."
```

### Scenarios

**Given** needs=50000, wants=30000, savings=20000
**When** user adds expense "Alquiler" 55000 in needs (remaining becomes -5000)
**Then** auto-loan triggers, borrows 5000 from highest surplus (wants has 30000, savings has 20000 → wants)
**And** Transfer record created: from=wants, to=needs, amount=5000, isAutomatic=true
**And** Expense "Préstamo automático" added to wants with isTransfer=true

**Given** needs=50000, wants=2000, savings=1000
**When** user adds expense 52000 in needs (remaining = -2000)
**Then** auto-loan takes 2000 from wants (highest surplus at 2000)
**And** needs remaining = 0, wants remaining = 0

**Given** all categories have 0 remaining
**When** user adds expense exceeding category
**Then** no transfer possible, show warning "No hay fondos disponibles en otras categorías"

### Edge Cases

- Deficit larger than all surpluses combined: transfer what's available, warn user
- Multiple auto-loans in sequence: each expense triggers independent evaluation
- Circular transfers: **prohibited** — single-hop only, no source can be the same as the target
- User deletes the auto-loan expense: the corresponding Transfer is NOT deleted (audit trail), but the pool recalculates
- User deletes the source expense that contains the auto-loan: same as above

---

## 4. Manual Transfer

### Requirement

User can manually move funds between categories. Creates same Transfer + Expense pair, but with `isAutomatic: false`.

### UI

- Button per category "Transferir" → opens modal/form
- Fields: target category (dropdown), amount
- Validation: amount <= remaining in source category

### Scenarios

**Given** needs has 10000 remaining
**When** user transfers 3000 from needs to savings
**Then** Transfer { from: needs, to: savings, amount: 3000, isAutomatic: false }
**And** Expense "Transferencia manual" added to savings

**Given** user tries to transfer 15000 from needs (remaining 10000)
**When** amount > remaining
**Then** blocked with error "Fondos insuficientes en necesidad"

### Edge Cases

- Transfer to same category: **reject** (pointless, confusing)
- Transfers are not auto-reversed when source expense is deleted (audit trail)
- Show transfers in ExpenseList with distinct visual (see below)

---

## 5. USD Expenses

### Requirement

User can add expenses in USD. Fetch official rate from DolarAPI, convert to ARS, store both original and converted values.

### API Integration

```
GET https://dolarapi.com/v1/dolares/oficial
Response: { compra, venta, ... }
Use `venta` (sell price = what user pays to buy USD)
Cache for 5 minutes in-memory (module-level variable)
```

### Data Model (same as Expense extension above)

```ts
// On USD expense:
{
  amount: 15300,        // ARS converted (10 * 1530)
  originalAmount: 10,   // USD
  currency: 'USD',
  exchangeRate: 1530    // venta rate at time of creation
}
```

### Display Format

```
$15.300 (USD 10 × $1.530)
```

### Scenarios

**Given** DolarAPI venta = 1530
**When** user adds expense 10 USD
**Then** stored amount = 15300 ARS, displayed as "$15.300 (USD 10 × $1.530)"

**Given** API is unreachable
**When** user tries to add USD expense
**Then** show error "No se pudo obtener la cotización. Intentá de nuevo." and block save

**Given** rate was fetched 3 minutes ago (cache valid)
**When** user adds second USD expense
**Then** uses cached rate, no API call

**Given** rate was fetched 6 minutes ago (cache expired)
**When** user adds USD expense
**Then** fresh API call, cache updated

**Given** user adds USD expense with rate 1530
**When** rate later changes to 1600
**Then** stored expense keeps original rate (historical accuracy)

### Edge Cases

- Rate = 0 or negative from API: **reject**, treat as API failure
- Amount = 0 or negative USD: **reject** at form validation
- `currency` defaults to 'ARS' if not specified (backward compat)
- `originalAmount` and `exchangeRate` only stored when `currency === 'USD'`

---

## 6. UI Migration

### Requirement

Remove `@nextui-org/react` dependency. Replace with custom components built on Tailwind CSS + CDS (Component Design System) tokens. Headless UI (`@headlessui/react`) for accessible Select/Dialog.

### Components to Build

| Component    | NextUI Replacement           | Notes                                    |
|-------------|------------------------------|------------------------------------------|
| `Button`    | `Button` from NextUI        | Keep CDS token classes already in use    |
| `Input`     | `Input` from NextUI         | Label, startContent, clearable           |
| `Select`    | `Select` + `SelectItem`     | Use `@headlessui/react` Listbox          |
| `Textarea`  | `Textarea` from NextUI      | Simple textarea with CDS classes         |
| `Chip`      | `Chip` from NextUI          | Badge/chip with close button             |
| `Card`      | `Card/CardHeader/CardBody`  | Plain divs with CDS border/surface tokens|
| `Divider`   | `Divider` from NextUI       | Simple `<hr>` with CDS border class      |
| `Modal`     | (new)                        | `@headlessui/react` Dialog               |

### CDS Tokens (already in tailwind.config.ts)

All components must use existing `cds-*` tokens: `cds-surface`, `cds-canvas`, `cds-border`, `cds-primary`, `cds-foreground`, `cds-muted`, `cds-positive`, `cds-negative`, `rounded-cds-*`.

### Migration Order

1. Create `src/components/ui/` directory
2. Build primitives: Button, Input, Textarea, Select, Chip
3. Migrate Calculator.tsx (highest surface area)
4. Migrate AddExpenseForm.tsx
5. Migrate ExpenseList.tsx
6. Migrate remaining: MonthSelector, Auth pages
7. Remove `@nextui-org/react` + `framer-motion` from package.json

### Scenarios

**Given** NextUI is fully replaced
**When** user runs build
**Then** no import from `@nextui-org/react` or `@nextui-org/button` exists

**Given** Headless UI Select is used
**When** user navigates with keyboard
**Then** full ARIA compliance, screen reader announces options

### Edge Cases

- Headless UI Select has different API shape than NextUI Select: adapter needed
- NextUI Chip `onClose` maps to custom Chip with dismiss button
- `framer-motion` may be used by Headless UI transitions — verify before removing
- Keep `react-icons` (independent of NextUI)

---

## 7. Firestore Migration

### Requirement

New saves include `schemaVersion: 2` with new fields. On load, detect v1 documents (missing fields) and backfill defaults.

### Schema v2 Document Shape

```ts
// Firestore doc at users/{uid}/months/{month}
interface MonthBudgetV2 {
  schemaVersion: 2;
  totalAmount: number;
  cash: CashState;           // kept for backward compat (pool totals)
  needs: Expense[];
  wants: Expense[];
  savings: Expense[];
  incomes: Income[];         // NEW
  transfers: Transfer[];     // NEW
  globalSplit: SplitPercentages; // NEW, default { needs: 50, wants: 30, savings: 20 }
  updatedAt: Timestamp;
}
```

### Migration Logic

```ts
function migrateToV2(data: any): MonthBudgetV2 {
  if (data.schemaVersion === 2) return data as MonthBudgetV2;

  // v1 → v2: backfill missing fields
  return {
    schemaVersion: 2,
    totalAmount: data.totalAmount ?? (data.cash?.needs + data.cash?.wants + data.cash?.savings) ?? 0,
    cash: data.cash ?? { needs: 0, wants: 0, savings: 0 },
    needs: data.needs ?? [],
    wants: data.wants ?? [],
    savings: data.savings ?? [],
    incomes: data.incomes ?? [{
      id: 'income-migrated',
      description: 'Ingreso inicial',
      amount: data.totalAmount ?? 0,
      currency: 'ARS',
      splitOverride: null,
    }],
    transfers: data.transfers ?? [],
    globalSplit: data.globalSplit ?? { needs: 50, wants: 30, savings: 20 },
    updatedAt: data.updatedAt,
  };
}
```

### Scenarios

**Given** user has a v1 document in Firestore
**When** they load the month
**Then** migration runs transparently, document NOT overwritten until next save
**And** migrated data shown in UI with correct defaults

**Given** user saves a month that was loaded as v1
**When** save completes
**Then** document now has `schemaVersion: 2` with all new fields

**Given** a new month (no document exists)
**When** user creates budget
**Then** saved directly as v2 with `schemaVersion: 2`

**Given** user is on v2 document
**When** they load the month
**Then** migration function is a no-op (schemaVersion check)

### Edge Cases

- v1 document with `cash` = null (never set): backfill all zeros
- v1 document with `needs`/`wants`/`savings` as undefined: backfill empty arrays
- Migration is **lossless** — no data deleted, only fields added
- `saveMonth` always writes v2 (no backward-compatible saves)
- If migration fails (corrupt data): show error, offer to reset month
- `totalAmount` in v2 = sum of all income amounts in ARS (recomputed on save)
