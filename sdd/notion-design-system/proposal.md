# Proposal: Notion Design System for Dashboard

## Intent

Replace the planned CDS token approach (tailwind.config.ts `cds-*` tokens) with the Notion design system for the entire dashboard UI. The wireframe exploration (v0.2) validated warm neutrals + Notion Blue as a coherent direction. This proposal locks it in before UI primitive implementation (Phase 4).

## Scope

### In Scope
- Replace CDS tokens with Notion tokens in `tailwind.config.ts`
- All 5 UI primitives (Button, Input, Select, Textarea, Chip) use Notion tokens
- Dashboard layout (Calculator, IncomeForm, IncomeList, SplitEditor, ExpenseList, TransferForm, TransferList, MonthSelector) uses Notion component stylings
- Notion Blue (`#0075de`) as singular accent for primary CTAs, links, focus rings
- Warm white (`#f6f5f4`) as alt background for section alternation
- Near-black (`rgba(0,0,0,0.95)`) for all primary text
- Whisper borders (`1px solid rgba(0,0,0,0.1)`) throughout
- Notion pill badges (9999px radius) for status/tags
- NotionInter font stack (Inter with negative letter-spacing at display sizes)

### Out of Scope
- Multi-income logic, auto-loan, transfers, USD, Firestore migration (unchanged)
- Auth pages beyond button/primitive migration
- Animation/motion system (Notion has none; keep transitions minimal)

## Capabilities

### New Capabilities
- `notion-design-system`: Token set, component recipes, and layout primitives derived from Notion design system

### Modified Capabilities
- `ui-migration` (from multi-income spec §6): Token source changes from CDS to Notion; component recipes updated to Notion stylings

## Approach

1. **Tokens**: Replace `tailwind.config.ts` CDS tokens with Notion token mappings (see tokens.css contract). Keep Tailwind utility classes; only the design token values change.
2. **Primitives** (Phase 4): Build Button, Input, Select, Textarea, Chip using Notion tokens. Button variants: Primary (Notion Blue), Secondary (warm gray), Ghost (transparent + underline), Pill Badge.
3. **Migration** (Phase 5): Swap NextUI → custom primitives per existing plan; visual output now matches Notion.
4. **Dashboard components** (Phases 6-7): IncomeForm, SplitEditor, ExpenseList, TransferForm, TransferList use Notion card/layout patterns (whisper borders, soft shadows, warm-white alternation).
5. **Font**: Add NotionInter (Inter with `font-feature-settings: "lnum" "locl"`). Display sizes get negative letter-spacing via utility.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tailwind.config.ts` | Modified | Replace `cds-*` token values with Notion token mappings |
| `src/components/ui/*.tsx` | Modified | 5 primitives rebuilt on Notion tokens |
| `src/components/Calculator.tsx` | Modified | Uses Notion-styled primitives; income strip + 3-column pools |
| `src/components/AddExpenseForm.tsx` | Modified | Notion form stylings, USD toggle as pill badge |
| `src/components/ExpenseList.tsx` | Modified | Notion card + whisper border; transfer entries with pill badges |
| `src/components/IncomeForm.tsx` | New | Notion form + split override as pill badges |
| `src/components/IncomeList.tsx` | New | Notion card list with Chip status badges |
| `src/components/SplitEditor.tsx` | New | Notion input group with validation |
| `src/components/TransferForm.tsx` | New | Notion modal/form (Headless UI Dialog) |
| `src/components/TransferList.tsx` | New | Notion card list with auto/manual pill badges |
| `src/components/MonthSelector.tsx` | Modified | Notion Select primitive |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Token migration breaks existing CDS usages | Medium | Grep for `cds-*` classes; only UI primitives use them; replace in single commit |
| NotionInter font not available on all platforms | Low | Fallback stack: Inter, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif |
| Warm neutrals reduce contrast on some monitors | Low | Near-black on white = ~18:1; warm gray on white = ~5.5:1 (WCAG AA); verify with tooling |
| Headless UI Select styling differs from Notion dropdown | Low | Custom Listbox option template matches Notion pill/menu style |

## Rollback Plan

1. Revert `tailwind.config.ts` to CDS tokens
2. Revert 5 primitive components to CDS-styled versions
3. Dashboard components automatically inherit CDS via primitives
4. Single commit rollback; no data/model changes

## Dependencies

- `@headlessui/react` (already planned for Select/Modal)
- NotionInter font (self-hosted or Google Fonts Inter with feature settings)

## Success Criteria

- [ ] `tailwind.config.ts` contains only Notion token mappings (no `cds-*`)
- [ ] All 5 primitives render with Notion stylings (verified in Storybook/manual)
- [ ] Dashboard screens match wireframe v0.2 information architecture
- [ ] Contrast ratios meet WCAG AA for all text/interactive elements
- [ ] Build passes with zero `@nextui-org/react` imports
- [ ] Phase 4-7 tasks updated to reference Notion component recipes