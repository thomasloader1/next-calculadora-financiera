# Exploration: PrimeReact UI Migration

## Current State

### UI Component Inventory (8 components)

| Component | File | Custom API | Tailwind-only? | HeadlessUI? | Usage Count |
|-----------|------|------------|----------------|-------------|-------------|
| Button | Button.tsx | `variant, size, isIconOnly, isDisabled, isLoading, startContent` | Yes | No | 10 files |
| Input | Input.tsx | `label, value, onChange(string), onClear, prefix, description` | Yes | No | 5 files |
| Modal | Modal.tsx | `isOpen, onClose, title` + portal + ESC + backdrop | Yes + FaTimes | No | 2 files |
| Select | Select.tsx | `label, value, onChange(string), options[{key,label}], placeholder` | Partial | **Yes** (Listbox) | 2 files |
| Chip | Chip.tsx | `color, onClose, children` | Yes | No | 4 files |
| Toggle | Toggle.tsx | `label, checked, onChange(boolean)` | Yes | No | 1 file |
| Tooltip | Tooltip.tsx | `content` (ReactNode), `children` + TooltipContent helper | Yes + FaInfoCircle | No | 4 files |
| Textarea | Textarea.tsx | `label, value, onChange(string), placeholder` | Yes | No | 1 file |

### Key API Pattern
- Custom components use **string-based onChange** (e.g., `onChange(value: string)` not `onChange(e: React.ChangeEvent)`)
- `isDisabled` (not `disabled`) — custom prop name
- `startContent` (not `icon`) — custom prop name
- `isIconOnly` — custom prop name
- All use CDS Tailwind utility classes directly

### Consumer Files (12 files affected)

| File | Uses |
|------|------|
| Calculator.tsx | Button, Modal |
| AddExpenseForm.tsx | Button, Input, Select, Textarea, Toggle |
| TransferForm.tsx | Button, Input, Select |
| IncomeForm.tsx | Button, Input |
| SplitEditor.tsx | Button, Input, Tooltip+TooltipContent |
| ExpenseList.tsx | Chip, Tooltip+TooltipContent |
| IncomeList.tsx | Button, Chip, Tooltip+TooltipContent |
| TransferList.tsx | Button, Chip, Tooltip+TooltipContent |
| Navbar.tsx | Button |
| MonthSelector.tsx | Button |
| ExpenseModal.tsx | Modal |
| login/page.tsx | Button |

### Dark Mode Status
- `tailwind.config.ts` has `darkMode: 'class'` — configured but **not implemented**
- `globals.css` defines `.dark` CSS variable overrides — **never triggered**
- No theme toggle, no `next-themes`, no `prefers-color-scheme` JS logic
- Only `prefers-color-scheme: dark` media query exists but doesn't apply the `.dark` class
- Chip.tsx uses `dark:` Tailwind variants but they're never activated

### Other Dependencies
- `@headlessui/react` — **only** used in Select.tsx (Listbox)
- `sonner` — toast notifications (not being replaced)
- `react-icons` — FaTimes, FaPlus, FaSave, etc. (not being replaced)
- `sass` — listed but no `.scss` files found
- No test infrastructure

---

## Affected Areas

- `src/components/ui/*` — 8 files to replace/wrap
- `src/components/ui/index.ts` — barrel exports
- `src/components/Calculator.tsx` — Button, Modal
- `src/components/AddExpenseForm.tsx` — Button, Input, Select, Textarea, Toggle
- `src/components/TransferForm.tsx` — Button, Input, Select
- `src/components/IncomeForm.tsx` — Button, Input
- `src/components/SplitEditor.tsx` — Button, Input, Tooltip
- `src/components/ExpenseList.tsx` — Chip, Tooltip
- `src/components/IncomeList.tsx` — Button, Chip, Tooltip
- `src/components/TransferList.tsx` — Button, Chip, Tooltip
- `src/components/Navbar.tsx` — Button
- `src/components/MonthSelector.tsx` — Button
- `src/components/ExpenseModal.tsx` — Modal
- `src/app/login/page.tsx` — Button
- `src/app/layout.tsx` — add PrimeReact provider
- `src/app/providers.tsx` — wrap with PrimeReactProvider
- `src/app/globals.css` — CSS layer integration
- `tailwind.config.ts` — add primereact to content paths
- `package.json` — new dependencies
- `next.config.js` — possibly transpilePackages
- NEW: `src/lib/prime-theme.ts` — CDS theme configuration
- NEW: `src/components/PrimeSSRProvider.tsx` — SSR-safe provider

---

## Approaches

### Approach A: Unstyled Mode + Tailwind PT (Pass-Through)

PrimeReact runs in `unstyled: true` mode. We define a CDS pass-through theme object that maps CDS tokens to Tailwind classes on every PrimeReact component. No PrimeReact CSS is loaded — only React behavior.

**Pros:**
- Full control over styling — CDS tokens used directly
- No PrimeReact CSS conflicts with Tailwind
- Smallest bundle (no theme CSS)
- Perfect dark mode via Tailwind `dark:` variants
- Existing CDS tokens in tailwind.config work as-is

**Cons:**
- Must write PT config for every PrimeReact component used
- PrimeReact's unstyled mode has less documentation/community support
- Must handle all states (hover, focus, disabled) manually in PT
- More upfront work per component
- Some PrimeReact features (virtual scroll) need manual styling

**Effort: High**

### Approach B: Styled Mode + Custom Theme CSS

PrimeReact runs with its built-in themes. Create a custom PrimeReact theme file that overrides CSS variables with CDS values. Import both Tailwind and PrimeReact theme CSS with correct layer ordering.

**Pros:**
- PrimeReact components look correct out of the box
- Less configuration per component
- Well-documented approach
- PrimeReact's own dark mode support via theme switching

**Cons:**
- CSS conflict risk between Tailwind preflight and PrimeReact theme (known issue with many workarounds)
- Custom theme file must be maintained separately
- Harder to apply CDS-specific border-radius, spacing
- PrimeReact theme CSS adds ~50-80KB to bundle
- Dark mode requires theme CSS file swap (not just Tailwind class)
- Tailwind and PrimeReact CSS variable systems may conflict

**Effort: Medium (but fragile)**

### Approach C: Hybrid — Unstyled Mode for forms + Styled for DataTable/Dialog

Use unstyled mode with Tailwind PT for simple components (Button, Input, Select, Toggle, Textarea, Chip, Tooltip). Use styled mode for complex components (DataTable, Dialog) where built-in styling provides significant value.

**Pros:**
- Best of both worlds — CDS control where it matters
- DataTable styled out of the box (sorting, pagination, etc.)
- Dialog looks good without custom PT
- Reduces PT config work significantly

**Cons:**
- Two styling approaches in one codebase
- More complex mental model
- Potential visual inconsistency between styled/unstyled components
- Still need theme CSS for styled components

**Effort: Medium**

---

## Component Mapping Table

| Current | PrimeReact | API Differences | Migration Notes |
|---------|-----------|-----------------|-----------------|
| Button | Button | `variant` → `severity`/`outlined`/`text`, `size` → `size`, `isIconOnly` → `icon` only, `isLoading` → `loading`, `startContent` → `icon`, `isDisabled` → `disabled` | Need CDS PT for pill shape, CDS colors |
| Input | InputText | `onChange(value)` → `onChange(e)`, `onClear` → no native (need custom), `prefix` → no native (need PT or prefix/suffix slot), `description` → no native (custom below) | Wrapper needed to keep string-based onChange API |
| Modal | Dialog | `isOpen` → `visible`, `onClose` → `onHide`, `title` → `header` prop, children content different | Dialog has built-in header/close/ESC. Need CDS PT for border-radius, colors |
| Select | Dropdown | `options[{key,label}]` → `options[{label,value}]`, `onChange(value)` → `onChange(e.value)` | HeadlessUI removed. Need CDS PT for dropdown styling |
| Chip | Tag | `color` → `severity`/`style`, `onClose` → `onRemove`, `children` → `value` | Need CDS pill radius, custom colors |
| Toggle | InputSwitch | `checked`/`onChange(bool)` → `checked`/`onChange(e)` | Need wrapper for boolean onChange API |
| Tooltip | Tooltip | `content` → `content`, `children` → target element + `pt:tooltip` | Similar API, add `pt` for CDS dark styling |
| Textarea | InputTextarea | `onChange(value)` → `onChange(e)` | Wrapper needed for string-based onChange |

---

## CDS Theme Strategy

### Recommended: Approach A (Unstyled + Tailwind PT)

The existing CDS token infrastructure is entirely Tailwind-based. Fighting that with PrimeReact CSS variables creates unnecessary complexity.

**CDS → PrimeReact PT Mapping:**

```typescript
// src/lib/prime-theme.ts
import { classNames } from 'primereact/utils';

export const CDSDesignSystem = {
  button: {
    root: {
      className: classNames(
        'inline-flex items-center justify-center font-semibold',
        'rounded-full transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cds-primary focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )
    },
    // severity maps: primary, secondary/ghost, danger
    // size maps: sm, md, lg
  },
  inputtext: {
    root: {
      className: classNames(
        'bg-cds-canvas border border-cds-border rounded-cds-sm',
        'px-3 py-2.5 text-sm text-cds-foreground',
        'placeholder:text-cds-muted',
        'focus:border-cds-primary focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)]',
        'focus:outline-none transition-colors duration-150'
      )
    }
  },
  dialog: {
    root: { className: 'bg-cds-canvas border border-cds-border rounded-cds-lg shadow-2xl' },
    header: { className: 'px-5 py-4 border-b border-cds-border' },
    title: { className: 'text-sm font-semibold text-cds-foreground' },
    content: { className: 'p-5' },
  },
  // ... etc
};
```

**Theme Provider Setup:**

```tsx
// src/components/PrimeSSRProvider.tsx
'use client';
import { PrimeReactProvider } from 'primereact/api';
import { CDSDesignSystem } from '@/lib/prime-theme';

export function PrimeSSRProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrimeReactProvider value={{ unstyled: true, pt: CDSDesignSystem }}>
      {children}
    </PrimeReactProvider>
  );
}
```

---

## Dark Mode Strategy

### Current State
- Tailwind `darkMode: 'class'` is configured
- `.dark` CSS variable overrides exist in globals.css
- **No toggle mechanism exists** — dark mode is never activated

### Recommended Implementation

1. **Install `next-themes`** — handles class-based dark mode, persists preference, avoids FOUC
2. **Sync PrimeReact with `next-themes`** — swap PrimeReact theme or rely on Tailwind `dark:` classes
3. **Since we're using unstyled mode** — PrimeReact components inherit Tailwind `dark:` classes automatically through PT config
4. **Add dark mode variants to CDS PT config:**

```typescript
button: {
  root: {
    className: classNames(
      // ... base styles
      'dark:bg-cds-primary dark:text-cds-on-primary dark:hover:bg-cds-primary-hover'
    )
  }
}
```

**For DataTable (if used):**
PrimeReact DataTable in unstyled mode can use Tailwind's `dark:` classes via PT. No theme CSS swap needed.

**Implementation:**
```tsx
// src/components/ThemeProvider.tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

Add to layout.tsx:
```tsx
<html lang="es-AR" className={inter.variable} suppressHydrationWarning>
  <body>
    <ThemeProvider>
      <PrimeSSRProvider>
        <Providers>{children}</Providers>
      </PrimeSSRProvider>
    </ThemeProvider>
  </body>
</html>
```

---

## Excel Strategy

### Recommendation: `xlsx` (SheetJS Community Edition)

**For this project's needs:**
- Export monthly budget data (expenses, transfers, income) to Excel
- Import expenses from a spreadsheet
- Small dataset (< 10k rows)

**xlsx is ideal because:**
- ~300KB gzipped (core), smaller than exceljs
- Simple API for basic data: `utils.json_to_sheet()`, `writeFile()`
- Client-side only — no server component needed
- Well-documented React integration pattern

**Dynamic import to avoid bundle bloat:**
```typescript
// src/lib/excel.ts
export async function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, filename);
}

export async function importFromExcel(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}
```

**Why NOT exceljs:**
- 6.2MB gzipped vs ~300KB for xlsx
- Overkill for simple data export/import
- Streaming API not needed for small datasets

---

## Lazy Loading Strategy

### Approach: Next.js Dynamic Imports + React.lazy

PrimeReact supports tree-shaking with individual component imports:
```typescript
import { Button } from 'primereact/button'; // ✅ tree-shakeable
import { DataTable } from 'primereact/datatable'; // ✅ tree-shakeable
```

**Code Splitting Plan:**

| Component | Loading Strategy | Reason |
|-----------|-----------------|--------|
| Button, Input, Toggle, Chip, Tooltip, Textarea | Eager (in bundle) | Small, used on initial render |
| Dialog (Modal) | `next/dynamic` with `ssr: false` | Heavy, only shown on interaction |
| Dropdown (Select) | Eager or dynamic | Medium weight, used in forms |
| DataTable | `next/dynamic` with `ssr: false` | Heaviest component, ~40KB |
| Tag | Eager | Tiny component |

**Example:**
```typescript
import dynamic from 'next/dynamic';

const DataTable = dynamic(
  () => import('primereact/datatable').then(mod => mod.DataTable),
  { ssr: false, loading: () => <div className="h-32 bg-cds-surface rounded animate-pulse" /> }
);

const Dialog = dynamic(
  () => import('primereact/dialog').then(mod => mod.Dialog),
  { ssr: false }
);
```

**`next.config.js` adjustment:**
```javascript
const nextConfig = {
  transpilePackages: ['primereact', 'primeicons'],
  // ...existing config
};
```

---

## Grid Decision: PrimeReact Grid vs Tailwind Grid

### Recommendation: **Keep Tailwind Grid**

**Current usage:** `grid grid-cols-1 md:grid-cols-3 gap-4` in Calculator.tsx

**Why NOT PrimeReact Grid:**
- PrimeReact Grid is responsive (xs, sm, md, lg, xl) but Tailwind's grid is already native CSS grid
- Adding PrimeReact Grid means PrimeReact CSS variables + classes on top of Tailwind
- Tailwind grid is simpler, more predictable, better documented
- Tailwind grid + CDS spacing tokens = consistent

**If you ever need PrimeReact Grid:**
PrimeReact's grid system is not as mature as Tailwind's. Sticking with Tailwind grid (`grid`, `grid-cols-*`, `gap-*`) is the right call. Only use PrimeReact for components that have real behavior (sorting, filtering, modals, etc.).

---

## Risks

### High Risk
1. **Tailwind + PrimeReact CSS conflict** — The #1 issue reported by the community. Using unstyled mode completely avoids this. If we ever switch to styled mode, expect CSS layer ordering headaches.
2. **Bundle size increase** — PrimeReact core (~30KB gzip) + individual components add up. DataTable alone is ~40KB gzip. Must use tree-shakeable imports and dynamic imports.

### Medium Risk
3. **API mismatch** — Custom components use string-based `onChange(value)` while PrimeReact uses event-based `onChange(e)`. Need wrapper components or refactoring all consumers.
4. **Dark mode complexity** — Currently dark mode doesn't exist. Implementing it via `next-themes` + PrimeReact unstyled + Tailwind `dark:` variants is straightforward, but adds a new feature during migration (dual risk).
5. **PrimeReact v11 alpha** — Latest version is alpha. Should we use v10 (stable) or v11? v11 has better Next.js support but alpha risk.

### Low Risk
6. **@headlessui/react removal** — Only used in Select.tsx. Clean removal.
7. **TooltipContent helper** — Custom helper component needs to be preserved or reimplemented within PrimeReact Tooltip PT.

---

## Recommended Approach

### Phase 1: Foundation (Day 1)
1. Install PrimeReact v10 (stable) + primeicons + next-themes
2. Add `transpilePackages: ['primereact', 'primeicons']` to next.config.js
3. Create `PrimeSSRProvider` with unstyled mode + CDS PT config
4. Create `ThemeProvider` with next-themes
5. Update `layout.tsx` with providers
6. Update `tailwind.config.ts` content paths to include primereact
7. Update `globals.css` — no CSS layer needed for unstyled mode

### Phase 2: Component Wrappers (Day 1-2)
Create adapter wrappers that preserve the existing API while using PrimeReact underneath:
- `src/components/ui/Button.tsx` → PrimeReact Button wrapper
- `src/components/ui/Input.tsx` → PrimeReact InputText wrapper
- `src/components/ui/Select.tsx` → PrimeReact Dropdown wrapper (removes @headlessui)
- `src/components/ui/Modal.tsx` → PrimeReact Dialog wrapper
- `src/components/ui/Chip.tsx` → PrimeReact Tag wrapper
- `src/components/ui/Toggle.tsx` → PrimeReact InputSwitch wrapper
- `src/components/ui/Tooltip.tsx` → PrimeReact Tooltip wrapper
- `src/components/ui/Textarea.tsx` → PrimeReact InputTextarea wrapper

**Key: Keep existing API signatures** (onChange(value), isDisabled, startContent) so consumer files need ZERO changes.

### Phase 3: Dark Mode (Day 2)
1. Create ThemeProvider with next-themes
2. Add dark mode variants to CDS PT config
3. Add theme toggle to Navbar
4. Update globals.css .dark variables if needed

### Phase 4: New Features (Day 3-4)
1. DataTable for ExpenseList/IncomeList (optional upgrade from card layout)
2. Card component for expense category cards (optional)
3. xlsx integration for Excel export/import (dynamic import)
4. Lazy loading setup for Dialog, DataTable

### Phase 5: Cleanup (Day 4)
1. Remove `@headlessui/react` from package.json
2. Remove `sass` if unused
3. Remove old CSS utility classes in globals.css (cds-btn-primary, cds-card, cds-input)
4. Test dark mode across all pages

### Estimated Effort
- **Total: 4-5 days**
- Phase 1-2 (wrappers): 2 days — highest value, zero consumer changes
- Phase 3 (dark mode): 0.5 day — new feature, clean
- Phase 4 (new features): 1.5 days — DataTable, Excel, lazy loading
- Phase 5 (cleanup): 0.5 day

---

## Ready for Proposal
**Yes** — All research is complete. The approach is clear: unstyled mode with Tailwind PT is the safest path that preserves the existing CDS token system and minimizes migration risk. The wrapper strategy means consumer files don't change at all.
