# Design System — Coinbase-Inspired

## Color Palette

### Primary
| Token | Hex | Uso |
|-------|-----|-----|
| `cds-primary` | `#0052ff` | CTAs, links, acentos |
| `cds-primary-hover` | `#578bfa` | Hover de CTAs |
| `cds-on-primary` | `#ffffff` | Texto sobre botones azules |

### Neutrals
| Token | Hex | Uso |
|-------|-----|-----|
| `cds-canvas` | `#ffffff` | Fondo principal |
| `cds-dark` | `#0a0b0d` | Secciones oscuras, texto |
| `cds-foreground` | `#0a0b0d` | Texto principal |
| `cds-muted` | `#5b616e` | Texto secundario |
| `cds-surface` | `#eef0f3` | Fondos de cards/inputs |
| `cds-surface-dark` | `#282b31` | Superficies oscuras |
| `cds-border` | `rgba(91,97,110,0.2)` | Bordes sutiles |

### Semantic
| Token | Hex | Uso |
|-------|-----|-----|
| `cds-positive` | `#05b169` | Valores positivos, ahorro |
| `cds-negative` | `#cf202f` | Valores negativos, gastos |

## Typography

**Font:** Inter (substitute for CoinbaseSans)
- **Display:** weight 400, letter-spacing -0.02em
- **Body:** weight 400, line-height 1.5
- **Emphasis:** weight 600
- **Numbers:** `tabular-nums` for financial alignment

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `cds-radius-sm` | `8px` | Inputs, badges |
| `cds-radius-md` | `16px` | Profile bars |
| `cds-radius-lg` | `24px` | Cards |
| `cds-radius-pill` | `100px` | Botones CTA |
| `cds-radius-full` | `9999px` | Avatares, iconos |

## Components

### Primary CTA
- Background: `#0052ff`
- Text: `#ffffff`
- Radius: pill (100px)
- Height: 44px (default), 36px (sm)
- Font: 16px / 600
- Hover: `#578bfa`
- Transition: 150ms ease

### Cards
- Background: `#ffffff`
- Border: 1px solid `rgba(91,97,110,0.2)`
- Radius: 24px
- Shadow: none (flat design)

### Inputs
- Background: `#ffffff`
- Border: 1px solid `rgba(91,97,110,0.2)`
- Radius: 8px
- Focus: border `#0052ff` + shadow 2px
- Placeholder: `#5b616e`

### Expense Chips
- Radius: pill (100px)
- Colors: primary (necesidad), positive (ahorro), negative/warning (imprevistos)
- Font: tabular-nums for amounts

## Do's and Don'ts

### Do
- Use `#0052ff` sparingly — one or two blue moments per section
- Set every CTA as pill radius (100px)
- Use `tabular-nums` on every financial number
- Keep display text at weight 400
- Use semantic colors (green/red) only for text, never backgrounds

### Don't
- Don't introduce a secondary brand color
- Don't bold display copy — display sits at weight 400
- Don't use sharp corners on CTAs
- Don't use blue decoratively — it's functional only

## Accessibility
- Text contrast: 4.5:1 minimum
- Non-text contrast: 3:1 minimum
- Focus states visible on all interactive elements
