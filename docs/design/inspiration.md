# OldMoney Design Inspiration Research Notes

These are concrete, extractable observations — not mood board vibes.
Each item is actionable: it maps directly to a token, component decision, or layout rule.

---

## 1. Enterprise UX — Linear

### Observations

**1. Information Architecture via progressive disclosure.**
Linear keeps the left nav at exactly 240px collapsed to icon-only at ~48px. Secondary items appear only as hover-revealed sub-items or in a context panel — never dumped into the nav at once. The chrome is invisible when you're working; it expands only when you intend to navigate. *→ Our sidebar: 240px / 56px. No nested menus in the nav itself — use a context panel or command palette.*

**2. Command palette as primary nav.**
Linear's Cmd+K palette does 90% of navigation, creation, and filtering. It's not a "power user bonus" — it's the default path. The input field has no border on focus, just a subtle shadow lift. Results group by recency then by type, with keyboard shortcut hints right-aligned on each item. *→ Our palette must group: Portfolios, Assets, Transactions, Actions, Recent. Show ⌘P, ⌘T, etc. hints inline.*

**3. Focus states are first-class, not afterthoughts.**
Every interactive element in Linear has a 2px focus ring at 60% opacity of the accent, offset 2px, never hidden. Keyboard users can navigate the entire app without touching a mouse. Tab order matches visual order. *→ All our interactive elements need `focus-visible:ring-2 ring-offset-2 ring-accent/60`. Remove `outline: none` globally.*

**4. Transitions are spatial, not decorative.**
Panels slide in from the correct edge (right panel from right, left panel from left). Duration is exactly 180ms with ease-out. No bounce. Opening a dialog doesn't zoom — it fades at 8px translate-y. *→ Our motion system: 180ms ease-out for panels, 140ms for hover states, 0ms for skeleton → content swap (content should just appear).*

**5. Empty states have personality and a single action.**
Linear's empty issue list shows a calm illustration (not clipart), a serif-ish heading in 18px, a one-sentence helper in 14px text-muted, and one primary button. No secondary links, no multiple options. *→ Empty states: display heading (Fraunces), one helper line, one button. Never two actions.*

---

## 2. Fintech Layouts — Stripe Dashboard

### Observations

**1. KPI strip is always visible, never scrolls away.**
Stripe pins the revenue/volume KPI row to the top of the content area, below the page header. It's 4 cards max, each with a large tabular-nums number, a small delta badge (green/red), and a faint sparkline. The cards have no border-radius beyond 6px and no drop shadow — just a 1px hairline border. *→ Dashboard KPI row: 4 cards, hairline border, 6px radius, tabular-nums, delta badge.*

**2. Sidebar + content rhythm is 1:3, not 1:2.**
Stripe's nav is narrow (220px). Content gets the remaining ~80% of the viewport. This means tables breathe without horizontal scroll at 1440px. *→ Our sidebar: 240px. Never wider. Content grid: max-w-[1400px] mx-auto.*

**3. Tables never show more than 8 columns without column chooser.**
Stripe's payment table defaults to: Date, Description, Amount, Status — 4 columns. Clicking "Columns" reveals a dropdown to add: Fee, Net, Customer, etc. Dense but never overwhelming. *→ Our DataTable: default 5–6 columns, "Columns" button to add more. Store per-user column preference in localStorage.*

**4. Whitespace is used asymmetrically.**
The Stripe page header has 32px padding-top, 24px below the title, 16px below the subtitle, then the filter bar. This asymmetry (larger gap above, smaller below) creates a clear reading rhythm. It doesn't feel like padding applied uniformly. *→ Page header: pt-8, after title mb-1, after subtitle mb-6, then filters.*

**5. Status badges are desaturated chips.**
Stripe's "Succeeded" is not bright green — it's a muted sage-on-pale-mint chip at about 40% saturation. "Failed" is muted rose on pale rose. Never saturated red/green. *→ Our badges: success = oklch(40% 0.08 150) on oklch(95% 0.02 150). Never full-saturation traffic-light colors.*

---

## 3. Luxury Feel — Editorial / Kinfolk / Financial Times

### Observations

**1. Serif + sans pairing at exactly two weights each.**
The FT uses a custom serif (Financier Display) at two weights for headlines and a geometric sans (Metric) at two weights for body. No weight proliferation — not 300/400/500/600/700, just Regular + Semibold for sans, Regular + Bold for serif. The contrast between the two families does the visual work. *→ Fraunces (display serif, 2 weights: 400, 700) + Inter (UI sans, 2 weights: 400, 600). Never use 500 or 300.*

**2. Line-height is 1.5× for body, 1.15× for display.**
Editorial type: body paragraphs at 1.5–1.6 leading, captions at 1.4. Display numbers (KPIs) at 1.1 — tight, intentional. Headings at 1.2. This ratio shifts the feel from "form" to "document." *→ `--lh-body: 1.5; --lh-ui: 1.4; --lh-display: 1.1; --lh-heading: 1.2`.*

**3. Letter-spacing is negative on large type, zero on small type.**
Luxury typography pulls display type tighter: -0.03em at 36px, -0.02em at 24px, 0em at 16px, +0.01em at 12px (captions need a tiny open). Never positive tracking on large display type. *→ Token map: size-3xl: -0.03em, size-2xl: -0.02em, size-xl: -0.01em, size-base: 0, size-sm: 0, size-xs: 0.01em.*

**4. Hairline dividers, not thick rules.**
FT/Kinfolk separate sections with 1px lines at 15% opacity — almost invisible. They suggest hierarchy without competing with content. No 2px borders anywhere in the reading flow. *→ `border-border` = 1px, `border-border-strong` = 1px darker. Never 2px dividers in content areas.*

**5. Color is deployed as surface temperature, not paint.**
FT's cream background (#FFF1E5) isn't a color choice — it's a temperature choice. The page feels warm and aged, like newsprint. The only saturated color is the FT salmon logo. Our brand red (Falu #7C2220) should appear in approximately the same proportion. *→ Brand primary (Falu Red) on buttons, active nav states, KPI values. Nowhere else at full saturation.*

---

## 4. Tables — Bloomberg Terminal / Retool

### Observations

**1. Numeric columns are always right-aligned, always tabular-nums.**
Bloomberg's data tables: every number column is right-aligned. Every price, quantity, percentage uses `font-variant-numeric: tabular-nums` so decimal points align vertically. This is non-negotiable for financial data. *→ `.tabular` class: `font-variant-numeric: tabular-nums; text-align: right`.*

**2. Two density modes: compact (28px rows) and comfortable (40px rows).**
Bloomberg is 28px rows by default. Retool defaults to 40px with a toggle for compact. The toggle is a small icon in the table toolbar. *→ Table density toggle: `data-density="compact"` = h-7 rows, `data-density="comfortable"` = h-10 rows. Default to comfortable. Store in localStorage.*

**3. Sticky header + sticky first column at all times.**
The header row never scrolls. Column 1 (instrument name or date) never scrolls horizontally. This is structural, not optional — financial tables are always wider than the viewport. *→ `thead th: sticky top-0 z-10`. Column 1: `sticky left-0 z-10 bg-surface`.*

**4. Negative values in deep-muted red, positives in deep-muted green. Neutral is default text.**
Bloomberg: negative P&L is roughly `#C0392B` at 70% saturation (never pure red). Positive is `#27AE60` at 60% saturation. Zero/flat is the default text color. The saturation drop makes it data-forward, not alarm-forward. *→ `text-negative: oklch(42% 0.12 25)`, `text-positive: oklch(40% 0.10 150)`. Not pure red/green.*

**5. Column headers have sort indicators and filter accessibility.**
Clicking a header sorts; a second click reverses; a third click clears. The sort icon (chevron) appears only on hover for unsorted columns, always for sorted columns. Filter count badge appears on the filter button in the toolbar, not inline in headers. *→ Header click = sort cycle. Show `ChevronUp`/`ChevronDown` 16px. Filter button with count badge.*

---

## 5. Motion — Vercel Dashboard

### Observations

**1. Page-level transitions are a 4px vertical translate + opacity, 150ms.**
Vercel's route changes: content fades in from `translateY(4px)` over 150ms ease-out. No slide, no zoom, no rotation. The 4px offset is barely perceptible — it signals "new content arrived" without drama. *→ `page-enter: opacity-0 translate-y-1 → opacity-100 translate-y-0, 150ms ease-out`.*

**2. Skeleton screens swap to content instantly — no cross-fade.**
Vercel loads skeletons, then when data arrives, the skeleton is replaced with content immediately — no fade between them. The skeleton's purpose was to reserve layout space, not to transition. *→ `isLoading ? <Skeleton/> : <Content/>` with no animation between them.*

**3. Every hover state is exactly 120ms.**
Vercel's card hover (subtle bg shift + shadow lift) completes in 120ms. No hover state is slower than 150ms. Slower hover feels sluggish on repeated interactions. *→ `transition-colors duration-[120ms]`, `transition-shadow duration-[120ms]`.*

**4. Modals enter in 180ms, exit in 140ms.**
Enter is slightly slower (the user needs to register what opened). Exit is slightly faster (they've already decided to close). Both are ease-out. *→ Dialog: `data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-[0.98] zoom-out-[0.98] duration-180`.*

**5. `prefers-reduced-motion` removes all transforms, keeps opacity.**
For users who opt out of motion: Vercel removes translate/scale transforms but keeps opacity transitions at 50% of the normal duration. This preserves feedback without vestibular triggers. *→ `@media (prefers-reduced-motion: reduce) { * { transition-duration: 50ms !important; transform: none !important; } }`.*

---

## 6. Dashboards — Ramp

### Observations

**1. "As of" timestamp is always visible next to the dashboard title.**
Ramp shows "As of Nov 12, 2024 · Updated 4h ago" in 12px text-muted directly inline with or below the page title. This immediately answers "is this data fresh?" without a separate status page. *→ PageHeader: subtitle slot for "As of {date} · Last synced {relative}". Always show it.*

**2. KPI hero strip uses 3 sizes of number: hero, support, delta.**
Each KPI card has: a 36px tabular-nums total (Fraunces or similar), a 14px label below, and a 12px delta badge to the right of the number. Three distinct scales signal three distinct information priorities. *→ MetricCard: value in `text-3xl font-display tabular-nums`, label in `text-sm text-muted`, delta in `text-xs badge`.*

**3. Inline filters don't open dropdowns — they use pill toggles.**
Ramp's "Filters" bar: common filters (date range, category, amount range) appear as pill buttons that are "off" by default and become active (filled, brand color) when selected. Less interaction cost than a dropdown for frequently used filters. *→ For 3–5 filter options: use pill toggle row. For 6+: use dropdown. Date range: always a range picker, never a single date.*

**4. Drill-in is a right panel, not a new page.**
Clicking a transaction in Ramp opens a 400px detail panel from the right, while the list remains visible behind. The panel has its own URL segment (so you can link to a specific transaction) but you never leave the list context. *→ Detail view: `Sheet` component from the right, not navigation. URL: `/transactions?id=xyz`.*

**5. Trend sparklines appear in context, not as separate charts.**
Ramp's KPI cards have a tiny sparkline (40px tall, no axes, no labels) showing the last 7/14/30 days of the metric. It's purely directional — up or down, smooth or volatile. *→ MetricCard optional sparkline slot: 40px ECharts line chart, no axes, no tooltip, just the line.*

---

## 7. Component System — shadcn/ui Approach

### Observations

**1. Radix primitives handle behavior; tokens handle appearance. Never fight Radix.**
shadcn/ui's design: Radix handles focus trapping, ARIA, keyboard nav — all correct by default. The CSS layer only handles visuals. Never disable Radix behavior to achieve a visual effect. *→ Keep all Radix primitives intact. Override only: colors, spacing, radius, shadow via CSS.*

**2. Variant props beat conditional classNames.**
The shadcn Button has `variant` and `size` props. This is the right model: variants are exhaustive and documented, not ad-hoc `className` overrides per usage. *→ Every component must have 3 variants max. Any more = the design needs simplification.*

**3. The default shadcn look uses pure white and blue. Override both.**
Default shadcn: `hsl(0 0% 100%)` backgrounds, `hsl(222.2 47.4% 11.2%)` dark text, blue ring. These are wrong for OldMoney. *→ Completely replace shadcn's CSS variables in `components.json` and `globals.css`. Keep class names, kill default values.*

**4. `asChild` pattern is the correct way to compose.**
`<Button asChild><a href="...">Link</a></Button>` — this renders the `<a>` with button styles, not a `<button>` wrapping an `<a>`. *→ Use `asChild` for all link-buttons and nav items. Never `<a>` inside `<button>`.*

**5. Compound components over monolithic props.**
`<Card><CardHeader><CardTitle>` beats `<Card title="..." subtitle="...">`. Compound components compose; monolithic props explode with edge cases. *→ Keep the compound card pattern. Same for dialogs, tabs, tables.*

---

## 8. Analytics — Apache Superset / Metabase

### Observations

**1. Chart taxonomy: time-series → area, composition → donut, ranking → horizontal bar.**
Superset's chart picker uses this exact taxonomy. For financial data: portfolio value over time = area chart, allocation = donut, top performers = horizontal bar. Never use a vertical bar for time series above 20 data points. *→ PerformanceChart: area. AllocationChart: donut. TopHoldings: horizontal bar. Never pie charts (donut only).*

**2. Time grain selector sits directly above the chart, not in a side panel.**
Superset: "1D / 1W / 1M / 3M / YTD / 1Y / ALL" is a pill toggle row above the chart. It's the most common interaction on a time-series chart, so it gets prime real estate. *→ Every time-series chart has a grain picker row above it. Default: 1M.*

**3. Cross-filtering: clicking a chart segment filters related charts on the page.**
Superset's explore mode: clicking "Technology" in the allocation donut filters the holdings table to show only tech holdings. This requires a client-side filter context. *→ Dashboard filter context (Zustand): `activeAssetType`, `activeDateRange`. Charts write to it; tables read from it.*

**4. Saved views are first-class objects, not just URL bookmarks.**
Superset's "Saved views" appear in a dropdown on the dashboard — named slices of filters. Users save their "month-end review" view and come back to it. *→ `saved_views` table already in schema. Wire a "Save view" button on the dashboard filter bar.*

**5. Empty / loading chart states don't reflow — the chart container has a fixed min-height.**
Superset fixes chart container heights during loading so the page doesn't jump when data arrives. This is critical for dashboards. *→ Every chart container: `min-h-[260px]`. Skeleton fills this space. Data replaces it without layout shift.*

---

## 9. Density — Palantir Gotham / Foundry

### Observations

**1. The workspace is resizable panels, not fixed layout.**
Palantir's Gotham: left panel (navigation/filters), center panel (main view), right panel (detail/context). All three are resizable by dragging the divider. This is non-negotiable for power users analyzing large datasets. *→ Analytics workspace: use `react-resizable-panels`. Default: 0 / 100% / 0. Right panel opens when row is selected.*

**2. Breadcrumbs are always present, always interactive.**
Palantir never lets you get lost. Every screen has: Home > Org > Portfolio > Account. Every segment is a link. The current item is bold, not a link. *→ TopBar breadcrumb: always rendered, links for all but last segment. Use Next.js `usePathname`.*

**3. Metadata panels expose 15+ fields without overwhelming.**
Palantir's detail panel for an asset shows: symbol, name, type, exchange, currency, ISIN, sector, last price, price date, 52w high/low, market cap — in a 2-column grid of label:value pairs. Each pair is 32px high. *→ Detail sheet: 2-column `dl` grid, `dt` in text-muted 12px, `dd` in text-primary 14px tabular-nums. Max 3 sections separated by hairlines.*

**4. The toolbar is contextual — it changes based on what's selected.**
When 0 rows are selected: toolbar shows "Add", "Import", "Export". When 1 row is selected: "Edit", "Delete", "Duplicate". When 3+ rows: "Bulk delete", "Export selected", "Change status". *→ DataTable contextual toolbar: track `selectedRows.length`, render different action sets.*

**5. No wasted pixels in headers — the page title and primary action are on the same line.**
Palantir's page header: title (left) + primary action button (right) on one 48px row. No subtitle, no description, no visual padding. The table follows 16px below. *→ PageHeader: title + action on one row (flex justify-between). Description is optional and collapsed by default. Page-level padding: 24px top.*

---

## Key Decisions Derived from Research

| Decision | Chosen | Alternative rejected | Reason |
|---|---|---|---|
| Accent color | Muted gold `oklch(49% 0.116 60)` — Golden Brown | Deep green | Gold is unique to "Old Money" brand; green reads as "finance generic" (Robinhood, Fidelity) |
| Display font | Fraunces (Google, free, variable) | Financier Display (licensed), Domaine | Free, variable axes, excellent at display sizes, optical size support |
| UI font | Inter (preloaded in Next.js) | Geist, Neue Haas | Inter has superior financial/tabular rendering, widely pre-cached |
| Mono font | JetBrains Mono | Geist Mono, Fira Code | Best tabular-num rendering, excellent at 12-13px in data cells |
| Default table density | Comfortable (40px) | Compact (28px) | First impression matters; compact available via toggle |
| Color space | OKLCH | HSL | Perceptually uniform, better dark mode interpolation, future-proof |
| Sidebar default | Expanded 240px | Collapsed | Users need context on first use; they can collapse it |
| Chart library | ECharts (already chosen) | Recharts, Victory | ECharts handles 100k+ data points, full theme support |
