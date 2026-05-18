# OldMoney Design System

## Philosophy

**"Old Money Luxury + Elite Fintech"** — refined, high information density, timeless.

We take inspiration from four sources:

| Inspiration | What We Borrow |
|-------------|---------------|
| **Addepar** | Dense data tables, muted palette, serious typography |
| **Bloomberg Terminal** | Information hierarchy, monospace numbers, command palette |
| **Linear** | Motion quality, keyboard-first UX, clean component geometry |
| **Ramp** | Card-based layout, progressive disclosure, status clarity |

**Core principles:**
1. **Density over whitespace.** Financial professionals want to see more data, not more breathing room.
2. **Numbers first.** Every layout decision serves the readability of numeric data.
3. **Earn animation.** Motion should carry meaning — never decorative.
4. **Dark by default.** The palette was designed dark-first; light mode is the inversion, not the origin.
5. **Keyboard-native.** Every action reachable via `⌘K` command palette.

---

## Color Palette

### Semantic Design Tokens

These are the tokens you use in components. They reference brand primitives below.

| Token | Light Mode Hex | Dark Mode Hex | Usage |
|-------|---------------|--------------|-------|
| `--color-background` | `#FAF6F1` | `#0F0A09` | Page background |
| `--color-surface` | `#FFFFFF` | `#1A1210` | Cards, panels, modals |
| `--color-surface-raised` | `#F5EDE3` | `#231714` | Dropdowns, tooltips, popovers |
| `--color-surface-overlay` | `rgba(255,255,255,0.85)` | `rgba(26,18,16,0.92)` | Frosted glass overlays |
| `--color-border` | `#E2D5C8` | `#2E1E1A` | Dividers, card outlines |
| `--color-border-strong` | `#C4A98A` | `#4A2E28` | Focus rings, active borders |
| `--color-text-primary` | `#1A0F0D` | `#F1DEA8` | Body text, headings |
| `--color-text-secondary` | `#6C5141` | `#A28C75` | Labels, captions, metadata |
| `--color-text-muted` | `#A28C75` | `#6C5141` | Disabled text, placeholder |
| `--color-text-inverse` | `#FAF6F1` | `#0F0A09` | Text on colored backgrounds |
| `--color-primary` | `#7C2220` | `#9F3533` | Primary CTAs, key accents |
| `--color-primary-hover` | `#621A18` | `#B54442` | Hover state for primary |
| `--color-primary-subtle` | `#F5E8E8` | `#2A1010` | Tinted background for primary |
| `--color-accent-gold` | `#9F6920` | `#DAA755` | Financial highlights, gains |
| `--color-accent-warm` | `#854023` | `#CD7A3E` | Secondary accent, charts |
| `--color-positive` | `#2D6A4F` | `#52B788` | Gains, positive returns |
| `--color-positive-subtle` | `#EAF5EE` | `#0D2B1E` | Positive tinted background |
| `--color-negative` | `#9D2121` | `#E57373` | Losses, negative returns |
| `--color-negative-subtle` | `#FAEAEA` | `#2B0D0D` | Negative tinted background |
| `--color-neutral` | `#5C5C5C` | `#9E9E9E` | Flat / unchanged values |
| `--color-warning` | `#92600A` | `#FFB74D` | Alerts, threshold warnings |
| `--color-info` | `#1565C0` | `#64B5F6` | Informational states |

### Brand Color Primitives

The full "Old Money" brand palette — reference these only in token definitions, not directly in components.

| Name | Hex | Inspiration | Typical Usage |
|------|-----|-------------|--------------|
| **Seal Brown** | `#49120F` | Aged leather binding | Darkest dark mode surface |
| **Falu Red** | `#7C2220` | Traditional merchant red | Primary CTA, brand accent |
| **Fire** | `#854023` | Warm hearth ember | Secondary CTA, chart series 2 |
| **Quincy** | `#6C5141` | Aged dark mahogany | Muted text, secondary labels |
| **Golden Brown** | `#9F6920` | Aged gilt lettering | Financial gain highlights |
| **Rob Roy** | `#DAA755` | Polished brass fixture | Chart accents, gold star ratings |
| **Raw Sienna** | `#CD7A3E` | Warm terracotta pigment | Hover states, chart series 3 |
| **Beaver** | `#A28C75` | Aged parchment | Muted / disabled text |
| **Dark Vanilla** | `#D7C1A8` | Cream writing paper | Light mode accents |
| **New Tan** | `#EDBE97` | Vellum manuscript | Warm neutral midtone |
| **Buttermilk** | `#F1DEA8` | Ivory keepsake letter | Dark mode primary text |
| **Antique White** | `#FAF6F1` | Estate auction catalogue | Light mode page background |
| **Night** | `#0F0A09` | Leather-lined study at night | Dark mode page background |

### Chart Color Sequence

For multi-series financial charts (portfolio comparison, asset allocation breakdown):

```
Series 1: #7C2220  (Falu Red — primary)
Series 2: #9F6920  (Golden Brown)
Series 3: #854023  (Fire)
Series 4: #DAA755  (Rob Roy)
Series 5: #CD7A3E  (Raw Sienna)
Series 6: #6C5141  (Quincy)
Series 7: #49120F  (Seal Brown)
Series 8: #D7C1A8  (Dark Vanilla — light backgrounds only)
```

Always reserve green (`#52B788`) for positive returns and red (`#E57373`) for negative — do not use them in multi-series palettes.

---

## Typography

### Typefaces

| Role | Family | Fallback | Notes |
|------|--------|----------|-------|
| **Display / Headings** | `"Playfair Display"` | Georgia, serif | H1–H3 only; heavy optical weight |
| **Body / UI** | `"Inter"` | system-ui, sans-serif | All body text, labels, navigation |
| **Monospace / Numbers** | `"JetBrains Mono"` | `"Fira Code"`, monospace | All financial figures, code, IDs |

Playfair Display conveys the "old money" editorial quality for hero numbers and page titles. Inter is the workhorse — legible at 11px, excellent tabular numerals. JetBrains Mono ensures every financial figure aligns perfectly in tables (use `font-variant-numeric: tabular-nums` even in Inter for table columns).

### Type Scale

```
--text-2xs:  0.625rem  /  10px   — badge labels, watermarks
--text-xs:   0.75rem   /  12px   — captions, footnotes, table secondary
--text-sm:   0.875rem  /  14px   — table body, form labels, navigation
--text-base: 1rem       /  16px   — body paragraph text
--text-lg:   1.125rem  /  18px   — card headings, section labels
--text-xl:   1.25rem   /  20px   — sub-page headings
--text-2xl:  1.5rem    /  24px   — page headings (H3)
--text-3xl:  1.875rem  /  30px   — section headings (H2)
--text-4xl:  2.25rem   /  36px   — hero numbers, KPI values
--text-5xl:  3rem       /  48px   — display numbers (portfolio total AUM)
--text-6xl:  3.75rem   /  60px   — full-page hero display
```

### Font Weights

```
--font-light:    300  — display text on dark backgrounds
--font-normal:   400  — body text
--font-medium:   500  — labels, nav items
--font-semibold: 600  — table headings, card titles
--font-bold:     700  — KPI values, badge text
--font-black:    900  — hero display numbers only
```

### Line Heights

```
--leading-none:    1      — display numbers (no extra space)
--leading-tight:   1.25   — headings
--leading-snug:    1.375  — subheadings
--leading-normal:  1.5    — body text
--leading-relaxed: 1.625  — long-form reading (reports)
```

### Number Formatting Rules

1. **Always use tabular numerals** in any column or aligned context: `font-variant-numeric: tabular-nums`
2. **Currency**: `$1,234,567.89` — comma thousands separator, 2 decimal places
3. **Percentage**: `+12.34%` — always show sign for returns; color code positive/negative
4. **Large values**: abbreviate at `$1M+` threshold in compact contexts (`$4.2M`, `$1.3B`)
5. **Negative values**: `(−$12,345)` in accounting notation for loss columns; red (`--color-negative`)
6. **Zero**: Show as `—` (em dash) in performance columns when no data, `$0.00` when actual zero

---

## Components

### KPI Card

Displays a single key performance indicator. The most frequently used component.

**Anatomy:**
```
┌─────────────────────────────────┐
│ Label              [sparkline]  │
│ $4,231,580                      │
│ ▲ +12.4%  vs last month         │
└─────────────────────────────────┘
```

**Props:**
```typescript
interface KpiCardProps {
  label: string;
  value: string;             // pre-formatted ("$4.2M")
  change?: number;           // decimal (0.124 = +12.4%)
  changeLabel?: string;      // "vs last month"
  sparklineData?: number[];  // last 30 data points
  loading?: boolean;
  trend?: "up" | "down" | "flat";
}
```

**Usage:** Dashboard summary row (4–6 cards), portfolio header, account summary.

**Size variants:** `sm` (compact sidebar), `md` (default), `lg` (hero KPI)

### Data Table

High-density sortable table for holdings, transactions, and search results.

**Key behaviors:**
- Virtual scrolling via `@tanstack/react-virtual` for > 200 rows
- Sticky header + sticky first column
- Column resizing (drag handle on header)
- Multi-column sort (Shift+Click adds sort level)
- Row selection with checkbox (bulk actions appear in floating toolbar)
- Inline expand for transaction details
- Column visibility toggle via gear icon

**Column types and their renderers:**
| Type | Renderer | Example |
|------|---------|---------|
| `currency` | Right-aligned, tabular, 2dp | `$12,345.67` |
| `percent` | Right-aligned, colored, signed | `+3.45%` |
| `date` | `MMM D, YYYY` | `Jan 15, 2025` |
| `badge` | Pill with color map | `BUY` (green) / `SELL` (red) |
| `text` | Left-aligned, truncate | `Apple Inc.` |
| `number` | Right-aligned, tabular | `1,234.5678` |

### Command Palette (⌘K)

Global command palette. Accessible at all times via `⌘K` (Mac) / `Ctrl+K` (Windows).

**Sections:**
1. **Navigation** — go to Portfolio, Account, Search
2. **Actions** — Import CSV, Add Transaction, Create Report
3. **Recent** — last 5 visited entities
4. **Search results** — live FTS5 results as user types (> 2 characters)

**Implementation:** `cmdk` library, server search via `/api/search?q=` debounced 200ms.

### Sidebar Navigation

Collapsible left sidebar. Full (240px) ↔ Icon-only (56px) via `⌘B`.

**Structure:**
```
[OldMoney logo / org selector]
──────────────────────────────
Dashboard         (⌘1)
Portfolios        (⌘2)
  └ [portfolio list, expandable]
Accounts          (⌘3)
Transactions      (⌘4)
Assets            (⌘5)
Reports           (⌘6)
AI Copilot        (⌘7)
──────────────────────────────
Settings
```

### Chart Components

All charts use Recharts as the base with custom theming applied via `recharts`'s `customized` prop pattern.

**Portfolio Performance Line Chart**
- Multi-series: portfolio vs benchmark vs custom comparison
- Brush component for date range zoom
- Crosshair tooltip showing all series values at a date
- Time range toggle: `1W | 1M | 3M | 6M | YTD | 1Y | 3Y | All`

**Asset Allocation Donut**
- Inner label: total AUM
- Legend right-aligned with percentage and absolute value
- Click slice → drill down to holding list
- Animate on first render (500ms ease-out)

**Returns Histogram**
- Monthly return distribution
- Color coded: bars above 0 in `--color-positive`, below in `--color-negative`
- Normal distribution curve overlay

**Waterfall Chart (Attribution)**
- Decomposes portfolio return into: allocation effect, selection effect, interaction
- Positive bars warm-gold, negative bars Falu Red

### Toast Notifications

```typescript
toast.success("Import complete — 234 transactions added");
toast.error("Import failed: duplicate transaction IDs on rows 45, 67");
toast.info("Price data refreshing in background");
toast.warning("3 holdings have stale prices (> 24h)");
```

Position: bottom-right. Auto-dismiss: 4s (error: 8s, must dismiss). Max 3 visible.

### Form Fields

All form fields use `react-hook-form` + `zod` validation.

**Standard field anatomy:**
```
[Label]  [Optional badge]
[Input field]
[Helper text / Error message]
```

Error state: red border (`--color-negative`), error message below.
Success state: subtle green checkmark icon inside field.

---

## Spacing & Layout

### Spacing Scale (4px base unit)

```
--space-0:   0px
--space-1:   4px   — tight internal padding (badge)
--space-2:   8px   — component internal padding
--space-3:   12px  — compact list item padding
--space-4:   16px  — standard element gap
--space-5:   20px  — section sub-element gap
--space-6:   24px  — card padding
--space-8:   32px  — section heading margin
--space-10:  40px  — card margin
--space-12:  48px  — section gap
--space-16:  64px  — page section gap
--space-20:  80px  — hero section padding
--space-24:  96px  — large section gap
```

### Grid System

**App shell:**
```
[Sidebar 240px] [Main content flex-1]
```

**Dashboard layout:**
```
KPI row:        4-column grid (gap-4)
Charts row:     2/3 left (performance) + 1/3 right (allocation)
Tables section: full-width
```

**Breakpoints:**
```
sm:   640px  — sidebar collapses to icon mode
md:   768px  — tablet: stacked cards
lg:   1024px — standard laptop: default layout
xl:   1280px — wide: expanded table columns
2xl:  1536px — ultrawide: side-by-side chart + table
```

### Border Radius

```
--radius-sm:   2px   — data table cells, compact badges
--radius-md:   6px   — buttons, inputs
--radius-lg:   10px  — cards, panels
--radius-xl:   16px  — modals, command palette
--radius-full: 9999px — pill badges, avatars
```

### Shadows

Light mode shadows use warm-tinted box-shadow:
```
--shadow-sm:  0 1px 2px rgba(73, 18, 15, 0.06)
--shadow-md:  0 4px 6px rgba(73, 18, 15, 0.08), 0 1px 3px rgba(73, 18, 15, 0.06)
--shadow-lg:  0 10px 15px rgba(73, 18, 15, 0.08), 0 4px 6px rgba(73, 18, 15, 0.04)
--shadow-xl:  0 20px 25px rgba(73, 18, 15, 0.10), 0 8px 10px rgba(73, 18, 15, 0.04)
```

Dark mode: replace with `rgba(0, 0, 0, 0.3)` base.

---

## Motion

### Principles

1. **Fast and purposeful.** UI transitions complete in 100–200ms. Data transitions in 300–500ms.
2. **Easing matters.** Use `ease-out` for elements entering the screen. `ease-in` for exiting.
3. **No gratuitous animation.** If removing an animation doesn't hurt comprehension, remove it.
4. **Respect `prefers-reduced-motion`.** All animations wrap in the Tailwind `motion-safe:` modifier.

### Duration Scale

```
--duration-instant: 50ms   — tooltips appearing
--duration-fast:    100ms  — button press, hover state
--duration-normal:  200ms  — panel reveal, dropdown open
--duration-slow:    300ms  — modal enter, page transition
--duration-chart:   500ms  — chart initial render animation
--duration-loader:  800ms  — skeleton shimmer cycle
```

### Easing Functions

```css
--ease-in:      cubic-bezier(0.4, 0, 1, 1)
--ease-out:     cubic-bezier(0, 0, 0.2, 1)
--ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1)
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1)  /* subtle overshoot for modals */
```

### Standard Animations

**Skeleton loader:** Shimmer from `--color-surface` to `--color-surface-raised`.

**Page transition:** Fade + 8px upward translate (200ms ease-out) on route change.

**Modal:** Scale from 0.95 → 1.0 + fade in (150ms ease-out).

**Dropdown:** Slide down 4px + fade in (100ms ease-out).

**Toast:** Slide up from bottom-right + fade in (200ms ease-spring).

**Number change:** CountUp animation for KPI values on first load (600ms).

**Chart data update:** Animate data lines via `isAnimationActive={true}` on Recharts.

---

## Dark Mode

### Strategy

Dark mode is **the primary design target**. The dark palette was designed first; light mode tokens are derived by inverting the luminance relationships.

Implementation uses the `class` strategy in Tailwind:
```js
// tailwind.config.js
darkMode: 'class'
```

The `dark` class is toggled on `<html>` by the theme store (Zustand). System preference is read on first load; user override is persisted to `localStorage`.

### Token Inversion Pattern

Do not hardcode hex values in components. Always use semantic tokens:
```tsx
// Wrong
<div className="bg-[#FAF6F1] dark:bg-[#0F0A09]">

// Right
<div className="bg-background">
```

The semantic tokens automatically resolve to light/dark values via CSS custom properties.

### Dark Mode Specific Rules

1. **Surfaces stack upward in lightness** — not downward. In dark mode: background is darkest (`#0F0A09`), cards are lighter (`#1A1210`), raised surfaces lighter still (`#231714`). This mirrors how physical materials catch light.

2. **Gold replaces white for primary text.** `--color-text-primary` in dark mode is Buttermilk (`#F1DEA8`), not white. Pure white (`#FFFFFF`) on dark backgrounds looks harsh and cheap.

3. **Reduce shadow opacity.** Dark mode shadows use black base with 30% opacity max. Light mode warm-tinted shadows don't translate to dark mode.

4. **Soften chart colors.** Dark mode chart series are 15% lighter than their light-mode equivalents to maintain contrast against dark surfaces.

5. **Borders are visible without being loud.** `--color-border` in dark mode is `#2E1E1A` — just enough to separate surfaces from backgrounds.

### Theme Toggle

```tsx
// Placement: top-right of app header
// Icon: sun (light) / moon (dark) / monitor (system)
// Three states: light | dark | system
```

---

## Accessibility

1. **Color contrast.** All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text). Financial data tables meet AAA (7:1) given the density of critical information.

2. **Focus indicators.** All interactive elements have a 2px `--color-border-strong` focus ring, offset 2px. Never remove `:focus-visible` outlines.

3. **ARIA.** Data tables use `role="grid"` with proper `aria-sort` on sortable columns. KPI cards use `aria-label` with full number (not abbreviated).

4. **Keyboard navigation.** Every action accessible without a mouse. Tab order follows visual reading order. Data tables support arrow-key navigation between cells.

5. **Screen reader numbers.** Abbreviations (`$4.2M`) have `aria-label="$4,200,000"` on the containing element.
