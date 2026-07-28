# Implementation Tasks — Multi-Income Refactor

**Spec**: sdd/multi-income/spec (#326)
**Design**: sdd/multi-income/design (#327)

---

## Phase 1: Data Model + Interfaces

> No UI changes. Foundation for everything downstream.

### T1 — Create `src/interfaces/Income.ts`
- **Description**: Define `SplitPercentages` and `Income` interfaces per design §2
- **Files**: `src/interfaces/Income.ts` (CREATE)
- **Dependencies**: None
- **Effort**: Small

### T2 — Create `src/interfaces/Transfer.ts`
- **Description**: Define `CategoryKey` type and `Transfer` interface per design §2
- **Files**: `src/interfaces/Transfer.ts` (CREATE)
- **Dependencies**: None
- **Effort**: Small

### T3 — Modify `src/interfaces/Cash.ts`
- **Description**: Add `totalIncome: number` and `split: SplitPercentages` to `CashState`. Import `SplitPercentages` from `./Income`
- **Files**: `src/interfaces/Cash.ts` (MODIFY)
- **Dependencies**: T1
- **Effort**: Small

### T4 — Modify `src/interfaces/Expense.ts`
- **Description**: Add `currency`, `originalAmount`, `exchangeRate`, `isTransfer`, `transferId` to `Expense`. Add `incomes`, `transfers`, `globalSplit`, `schemaVersion` to `MonthBudget`. Extend `ExpenseContextType` with income/transfer/split methods. Import from `Income.ts` and `Transfer.ts`
- **Files**: `src/interfaces/Expense.ts` (MODIFY)
- **Dependencies**: T1, T2, T3
- **Effort**: Medium

**Phase 1 estimated changed lines**: ~150 (all new/modified interfaces)

---

## Phase 2: Budget Calculator (Pure Functions)

> Pure functions, no React deps. Fully unit-testable.

### T5 — Create `src/lib/budgetCalculator.ts`
- **Description**: Implement `calculatePoolAmounts(incomes, globalSplit)`, `checkAndCreateLoans(cash, expenses, existingTransfers)`, `createManualTransfer(from, to, amount, cash, reason?)`. All pure functions. Use `nanoid` for IDs. Follow design §3 exactly
- **Files**: `src/lib/budgetCalculator.ts` (CREATE)
- **Dependencies**: T1, T2, T3, T4
- **Effort**: Medium

### T6 — Unit tests for budgetCalculator
- **Description**: Test `calculatePoolAmounts` with single/multiple incomes, split overrides, edge cases. Test `checkAndCreateLoans` with deficits, zero surpluses, partial transfers. Test `createManualTransfer` validation (same category, insufficient funds, negative amount)
- **Files**: `src/lib/__tests__/budgetCalculator.test.ts` (CREATE)
- **Dependencies**: T5
- **Effort**: Medium

**Phase 2 estimated changed lines**: ~250 (calculator + tests)

---

## Phase 3: Exchange Rate Service

> Standalone service, no UI deps.

### T7 — Create `src/lib/exchangeRate.ts`
- **Description**: Implement `getOfficialRate()`, `convertToARS(amountUSD, rate)`, `getCachedRateOrNull()`. In-memory cache with 5-min TTL. Stale-while-revalidate pattern. Follow design §4 exactly
- **Files**: `src/lib/exchangeRate.ts` (CREATE)
- **Dependencies**: None
- **Effort**: Small

### T8 — Unit tests for exchangeRate
- **Description**: Mock fetch, test cache hit/miss, test stale fallback on API failure, test `convertToARS` precision
- **Files**: `src/lib/__tests__/exchangeRate.test.ts` (CREATE)
- **Dependencies**: T7
- **Effort**: Small

### T9 — Modify `src/lib/formatAmount.ts`
- **Description**: Accept optional `currency` param. Format USD as `"$15.300 (USD 10 × $1.530)"` pattern. Default ARS behavior unchanged
- **Files**: `src/lib/formatAmount.ts` (MODIFY)
- **Dependencies**: None
- **Effort**: Small

**Phase 3 estimated changed lines**: ~150

---

## Phase 4: UI Primitives

> Custom components, zero deps on existing code. All use CDS tokens.

### T10 — Create `src/components/ui/Button.tsx`
- **Description**: Custom Button with variants: `primary`, `ghost`, `icon`, `danger`. Props: `variant`, `size`, `disabled`, `onClick`, `children`, `className`. Use CDS tokens (cds-primary, cds-negative, cds-surface, cds-canvas)
- **Files**: `src/components/ui/Button.tsx` (CREATE)
- **Dependencies**: None
- **Effort**: Small

### T11 — Create `src/components/ui/Input.tsx`
- **Description**: Custom Input with `label`, `value`, `onChange`, `placeholder`, `prefix?`, `onClear?`, `error?`, `type`. Clear button rendered when `onClear` provided
- **Files**: `src/components/ui/Input.tsx` (CREATE)
- **Dependencies**: T10 (uses Button for clear)
- **Effort**: Small

### T12 — Create `src/components/ui/Select.tsx`
- **Description**: Custom Select using Headless UI `Listbox`. Props: `label`, `value`, `onChange`, `options: {value, label}[]`. CDS-styled dropdown. Install `@headlessui/react` if not present
- **Files**: `src/components/ui/Select.tsx` (CREATE)
- **Dependencies**: T10
- **Effort**: Medium

### T13 — Create `src/components/ui/Textarea.tsx`
- **Description**: Custom Textarea with `label`, `value`, `onChange`, `placeholder`, `rows?`. Standard textarea, CDS-styled
- **Files**: `src/components/ui/Textarea.tsx` (CREATE)
- **Dependencies**: None
- **Effort**: Small

### T14 — Create `src/components/ui/Chip.tsx`
- **Description**: Chip component with `static` and `deletable` variants. Deletable shows X button. Props: `variant`, `onRemove?`, `children`
- **Files**: `src/components/ui/Chip.tsx` (CREATE)
- **Dependencies**: T10
- **Effort**: Small

**Phase 4 estimated changed lines**: ~350 (5 primitives)

---

## Phase 5: Component Migration (Replace NextUI)

> Swap NextUI components in existing UI one-by-one. Each migration is independently deployable.

### T15 — Migrate `src/components/Calculator.tsx`
- **Description**: Replace `@nextui-org/react` Button/Input with custom `ui/Button` and `ui/Input`. Preserve all existing logic and styling
- **Files**: `src/components/Calculator.tsx` (MODIFY)
- **Dependencies**: T10, T11
- **Effort**: Medium

### T16 — Migrate `src/components/AddExpenseForm.tsx`
- **Description**: Replace NextUI components with custom primitives. Add currency toggle (ARS/USD) wired to exchange rate service. Link to incomes
- **Files**: `src/components/AddExpenseForm.tsx` (MODIFY)
- **Dependencies**: T10, T11, T7
- **Effort**: Large

### T17 — Migrate `src/components/ExpenseList.tsx`
- **Description**: Replace NextUI components. Add distinct styling for transfer expenses (isTransfer entries)
- **Files**: `src/components/ExpenseList.tsx` (MODIFY)
- **Dependencies**: T10, T14
- **Effort**: Medium

### T18 — Migrate `src/components/MonthSelector.tsx`
- **Description**: Replace NextUI Select with custom `ui/Select`. Replace any NextUI buttons
- **Files**: `src/components/MonthSelector.tsx` (MODIFY)
- **Dependencies**: T10, T12
- **Effort**: Small

### T19 — Migrate Auth components
- **Description**: Replace NextUI buttons in auth-related components with custom `ui/Button`
- **Files**: Auth components (MODIFY — identify during implementation)
- **Dependencies**: T10
- **Effort**: Small

**Phase 5 estimated changed lines**: ~400 (across 5 components)

---

## Phase 6: Multi-Income UI

> New income management UI. Depends on Phase 1 interfaces + Phase 2 calculator + Phase 4 primitives.

### T20 — Create `src/components/IncomeForm.tsx`
- **Description**: Form to add/edit incomes: description, amount, currency (ARS/USD), optional split override toggle. Uses Input, Select, Button primitives. Validates splitOverride sums to 100 before saving
- **Files**: `src/components/IncomeForm.tsx` (CREATE)
- **Dependencies**: T10, T11, T12, T1, T9
- **Effort**: Large

### T21 — Create `src/components/IncomeList.tsx`
- **Description**: Display list of incomes with amount, currency badge (Chip), edit/delete actions. Show per-income split if overridden
- **Files**: `src/components/IncomeList.tsx` (CREATE)
- **Dependencies**: T10, T14, T1
- **Effort**: Medium

### T22 — Create `src/components/SplitEditor.tsx`
- **Description**: Global split editor (50/30/20 defaults). Three number inputs for needs/wants/savings. Inline validation: reject negative, >100, sum≠100, 1 decimal max. Save button to update globalSplit
- **Files**: `src/components/SplitEditor.tsx` (CREATE)
- **Dependencies**: T10, T11, T1
- **Effort**: Medium

### T23 — Wire income/split into `ExpenseContext.tsx`
- **Description**: Add `incomes`, `transfers`, `globalSplit` state. Implement `addIncome`, `updateIncome`, `removeIncome`, `setGlobalSplit`, `recalculateBudgets`, `addTransfer`, `removeTransfer`. Call `calculatePoolAmounts` on income/split changes. Call `checkAndCreateLoans` after expense operations
- **Files**: `src/context/Expense/ExpenseContext.tsx` (MODIFY)
- **Dependencies**: T4, T5, T1
- **Effort**: Large

**Phase 6 estimated changed lines**: ~600

---

## Phase 7: Auto-Loan + Transfer UI

> Depends on Phase 6 (context wiring) and Phase 5 (ExpenseList migration).

### T24 — Create `src/components/TransferForm.tsx`
- **Description**: Manual transfer form: source category dropdown, target category dropdown, amount input. Reject same-category. Show available balance per category
- **Files**: `src/components/TransferForm.tsx` (CREATE)
- **Dependencies**: T12, T11, T23
- **Effort**: Medium

### T25 — Create `src/components/TransferList.tsx`
- **Description**: Display transfers (auto + manual) with from→to, amount, timestamp. Distinguish auto vs manual with Chip variant
- **Files**: `src/components/TransferList.tsx` (CREATE)
- **Dependencies**: T14, T23
- **Effort**: Medium

### T26 — Integrate auto-loan feedback in UI
- **Description**: When `checkAndCreateLoans` creates transfers, show toast/notification in ExpenseList. Style transfer entries distinctly. Handle zero-surplus warning
- **Files**: `src/components/ExpenseList.tsx` (MODIFY), possibly toast utility
- **Dependencies**: T17, T23
- **Effort**: Medium

**Phase 7 estimated changed lines**: ~350

---

## Phase 8: USD Expense Support

> Depends on Phase 3 (exchange rate) and Phase 5 (AddExpenseForm migration).

### T27 — Wire USD toggle in `AddExpenseForm.tsx`
- **Description**: Add ARS/USD toggle. On USD selection: fetch rate via `getOfficialRate()`, show rate + converted amount preview. Block save if rate unavailable. Store `originalAmount`, `currency`, `exchangeRate` on expense
- **Files**: `src/components/AddExpenseForm.tsx` (MODIFY)
- **Dependencies**: T16, T7, T9
- **Effort**: Medium

### T28 — Update display formatting
- **Description**: Update ExpenseList to show USD expenses as `"$15.300 (USD 10 × $1.530)"`. Use updated `formatAmount` with currency param
- **Files**: `src/components/ExpenseList.tsx` (MODIFY), `src/lib/formatAmount.ts` (VERIFY)
- **Dependencies**: T17, T9
- **Effort**: Small

**Phase 8 estimated changed lines**: ~150

---

## Phase 9: Firestore Migration + Persistence

> Must be last functional phase. All data model changes must be stable.

### T29 — Add v1→v2 migration in `firebase.ts`
- **Description**: In `loadMonthBudget`: detect v1 (missing `schemaVersion`), backfill defaults via `migrateV1()`. Create single Income from `totalAmount`. Backfill CashState with `totalIncome` and default split. Write helper functions: `migrateV1()`, `migrateCash()`
- **Files**: `src/Services/firebase.ts` (MODIFY)
- **Dependencies**: T4, T3
- **Effort**: Medium

### T30 — Update save path
- **Description**: `saveMonthBudget` always writes `schemaVersion: 2`. Ensure all new fields (incomes, transfers, globalSplit) are persisted. Use `serverTimestamp()` for updatedAt
- **Files**: `src/Services/firebase.ts` (MODIFY)
- **Dependencies**: T29
- **Effort**: Small

### T31 — Integration tests for migration
- **Description**: Test v1 document → v2 migration: verify income created from totalAmount, CashState backfilled, no data loss. Test v2 → v2 no-op
- **Files**: `src/Services/__tests__/firebase.test.ts` (CREATE or MODIFY)
- **Dependencies**: T29, T30
- **Effort**: Medium

**Phase 9 estimated changed lines**: ~200

---

## Phase 10: Cleanup

> Remove old dependencies. Final cleanup.

### T32 — Remove `@nextui-org/react`
- **Description**: `npm uninstall @nextui-org/react`. Remove from `tailwind.config.ts` plugins. Grep for any remaining imports and fix
- **Files**: `package.json`, `tailwind.config.ts`, any remaining imports
- **Dependencies**: T15, T16, T17, T18, T19
- **Effort**: Small

### T33 — Remove `framer-motion`
- **Description**: `npm uninstall framer-motion`. Verify no remaining imports (should only be NextUI transitive dep)
- **Files**: `package.json`, any remaining imports
- **Dependencies**: T32
- **Effort**: Small

### T34 — Install `@headlessui/react` (if not present)
- **Description**: Verify Headless UI is installed for Select (Listbox) and future Modal (Dialog). Add to dependencies if missing
- **Files**: `package.json`
- **Dependencies**: None (can be done anytime)
- **Effort**: Small

**Phase 10 estimated changed lines**: ~50

---

## Workload Forecast

| Phase | Changed Lines (est.) | Files Touched | Risk |
|-------|---------------------|---------------|------|
| 1 — Interfaces | ~150 | 4 | Low |
| 2 — Calculator | ~250 | 2 | Low |
| 3 — Exchange Rate | ~150 | 3 | Low |
| 4 — UI Primitives | ~350 | 5 | Low |
| 5 — Component Migration | ~400 | 5+ | **Medium** |
| 6 — Multi-Income UI | ~600 | 4 | **High** |
| 7 — Auto-Loan UI | ~350 | 3 | Medium |
| 8 — USD Expenses | ~150 | 2 | Medium |
| 9 — Firestore Migration | ~200 | 2 | **High** |
| 10 — Cleanup | ~50 | 2 | Low |
| **TOTAL** | **~2,650** | **~25** | — |

---

## Risk Assessment

### High Risk
- **Phase 6 (Multi-Income UI)**: Largest change, touches ExpenseContext heavily. Income + split + pool recalculation are interconnected. Mitigation: strict TDD on budgetCalculator before wiring.
- **Phase 9 (Firestore Migration)**: Data loss potential if migration logic is wrong. Mitigation: test with real v1 fixture documents, migration is no-op for v2.

### Medium Risk
- **Phase 5 (Component Migration)**: NextUI may have hidden dependencies (animations, portals). Mitigation: migrate one component at a time, verify visually after each.
- **Phase 7 (Auto-Loan UI)**: Transfer logic interacts with expense state. Mitigation: auto-loan already spec'd as single-hop only.

### Low Risk
- Phases 1-4 are additive (no existing code broken).
- Phase 10 is mechanical removal.

---

## Recommended Commit Strategy

1. **One commit per phase** (10 commits total)
2. **Commit message format**: `feat(scope): phase N — description`
3. **Each phase must pass lint + typecheck** before committing
4. **Phases 1-4 can be committed independently** (no UI breakage)
5. **Phase 5 should be split** if any single migration is large (e.g., AddExpenseForm = own commit)
6. **Phase 9 gets its own commit** — migration code should be isolated for easy rollback
7. **Phase 10 is final** — only after all components verified working

### Suggested commit sequence:
```
feat(interfaces): phase 1 — Income, Transfer, Cash, Expense interfaces
feat(calculator): phase 2 — pure budget calculation functions + tests
feat(exchange-rate): phase 3 — DolarAPI service with cache + formatAmount
feat(ui): phase 4 — custom Button, Input, Select, Textarea, Chip primitives
feat(migration): phase 5 — replace NextUI in Calculator, AddExpenseForm, ExpenseList, MonthSelector, Auth
feat(income): phase 6 — IncomeForm, IncomeList, SplitEditor, ExpenseContext wiring
feat(transfers): phase 7 — TransferForm, TransferList, auto-loan UI feedback
feat(usd): phase 8 — USD expense support with exchange rate integration
feat(firestore): phase 9 — v1→v2 migration + schemaVersion persistence
chore(cleanup): phase 10 — remove NextUI + framer-motion, verify Headless UI
```
