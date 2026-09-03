# OldMoney — Neo-Skeuomorphic Design System

> **Canonical source of truth.** Reverse-engineered from the "2:3 UI Kit Styleguide Board — Neo-skeuomorphic tactile system" reference board. This document governs the tactile/soft-UI direction. It supersedes `docs/design-system.md` **only if adopted** (see §0 Status). Every token, rule, and component here traces back to the reference or is explicitly tagged as inference.

**Provenance tags used throughout:**
- `[OBSERVED]` — a value literally printed/labelled on the reference board, or read directly off pixels with high confidence.
- `[INFERRED]` — derived by eye from the reference; plausible but not pixel-guaranteed.
- `[REFERENCE-DERIVED]` — a principle/pattern clearly demonstrated by the reference, even if no single number is printed.
- `[PROJECT-REQUIRED]` — needed by the OldMoney app (accessibility, data density, theming) but not shown on the board.
- `[DESIGN DECISION]` — a deliberate choice I made to resolve a gap; rationale given inline.

---

## 0. Status — ADOPTED ✅ (replaces the frosted-glass theme)

Resolved with the product owner:
1. **Adoption:** this neo-skeuomorphic system **replaces** the frosted-glass theme entirely.
2. **Modes:** **both** light (warm cream paper) and dark (warm charcoal paper) neumorphic variants.
3. **Palette:** derived from the reference image using best judgment (all non-`[OBSERVED]` values remain honest inferences — see §3.2).

**Now wired into the app** (this branch):
- `frontend/src/styles/tokens.css` — semantic tokens retuned to warm paper (light + dark); terracotta accent unified with brand-primary; neumorphic `--nm-raised / --nm-inset / --nm-pressed` shadow tokens added; radii softened to 8/16/24.
- `frontend/src/app/globals.css` — the entire liquid-glass layer removed; replaced with the tactile treatment (opaque paper, raised/inset dual-shadow surfaces, floating drop-shadow overlays, no `backdrop-filter`).
- `frontend/src/components/ui/button.tsx` — buttons are now raised paper "keys" that press in on `:active`.

The glass theme is gone. Remaining component-level polish (inputs, switches, tabs, sliders, cards) inherits the tactile look via the shared surface tokens; per-component tactile variants are the follow-up pass.

---

## 1. Executive Summary — The Visual System in One Read

The reference is a **neo-skeuomorphic / soft-UI (neumorphic) tactile system** rendered on **warm cream paper**. Its entire personality comes from one physical metaphor: **objects extruded from, or pressed into, a single continuous surface**, lit from the **top-left**. There are no floating translucent panes; there are raised pads, inset wells, and pressed keys — all the *same material* as the background, distinguished only by shadow and highlight.

Five things carry the whole look:

1. **One material, one light.** Everything is the same cream paper. A top-left light source casts a soft **dark shadow to the bottom-right** and a soft **light highlight to the top-left**. That dual shadow *is* the design language.
2. **Extrude vs. inset.** Interactive affordances read as physically raised (buttons, cards, switches' knobs); input fields and tracks read as physically recessed (wells). Pressed = the raised thing sinks in.
3. **Warm, low-saturation, earthy palette.** Cream/oat paper, espresso-brown text, and a single **terracotta/copper** accent. No cool blues, no pure black, no pure white.
4. **Generous rounding + generous padding.** Soft radii (8–24px) everywhere; nothing sharp. Comfortable, tactile spacing — this is *not* a dense terminal.
5. **Restrained ink.** Type is warm brown, not black. Borders are hairlines or absent — depth comes from shadow, not outline. Color is used sparingly and meaningfully (accent = primary action / active state; semantic hues only for status).

**Personality:** calm, crafted, physical, analog-warm, premium-tactile. It should feel like pressing real keys on a well-made object, not tapping flat glass.

---

## 2. Reverse-Engineered Design Principles `[REFERENCE-DERIVED]`

1. **Depth is lighting, not layering.** Elevation is communicated by shadow/highlight on a shared surface, never by stacking distinct translucent planes. `[REFERENCE-DERIVED]`
2. **The light source is fixed at top-left.** Every shadow points bottom-right; every highlight sits top-left. This is inviolable — mixing light directions breaks the illusion instantly. `[REFERENCE-DERIVED]`
3. **Raised = actionable, inset = receptive.** Things you press stick out; things that receive input sink in. State changes move objects along this axis (raise → press → inset). `[REFERENCE-DERIVED]`
4. **One accent, earned.** A single terracotta/copper accent marks the primary action and the active/selected state. Everything else is neutral paper + brown ink. `[REFERENCE-DERIVED]`
5. **Warmth over contrast.** The palette is deliberately low-contrast and warm. Legibility is achieved through weight and shadow, then topped up to meet accessibility. `[REFERENCE-DERIVED]` + `[PROJECT-REQUIRED]` (contrast floors)
6. **Soft everything.** Generous corner radii and soft, wide, low-opacity shadows. No hard edges, no tight sharp drop-shadows. `[REFERENCE-DERIVED]`
7. **Quiet motion.** Press states translate + deepen/invert shadow over ~120–160ms; the object should feel like it has mass. `[INFERRED]` (board is static; motion is implied by the pressed states shown)

---

## 3. Complete Design-Token Table

### 3.1 Color — Paper & Ink

| Token | Value | Provenance | Role |
|---|---|---|---|
| `--paper-base` | `#EAE2D3` | `[OBSERVED]` board background (cream/oat) | The single material; app background |
| `--paper-raised` | `#EFE8DB` | `[INFERRED]` (slightly lighter than base) | Top face of extruded surfaces |
| `--paper-sunk` | `#E2D9C8` | `[INFERRED]` (slightly darker than base) | Floor of inset wells |
| `--ink-strong` | `#3B2E22` | `[INFERRED]` espresso brown | Primary text / headings |
| `--ink` | `#5A4A3A` | `[INFERRED]` | Body text |
| `--ink-muted` | `#8A7A66` | `[INFERRED]` | Secondary / captions / placeholders |
| `--ink-faint` | `#B4A793` | `[INFERRED]` | Disabled text, hairline dividers |

### 3.2 Color — Accent & Semantic

| Token | Value | Provenance | Role |
|---|---|---|---|
| `--accent` | `#C36B41` | `[OBSERVED]` terracotta/copper | Primary action, active state, focus |
| `--accent-hover` | `#B25E37` | `[INFERRED]` (darker) | Hover on accent |
| `--accent-press` | `#9E5230` | `[INFERRED]` | Pressed accent |
| `--accent-tint` | `#EADFC9` | `[INFERRED]` warm tint | Accent-selected background wash |
| `--success` | `#6B8E5A` | `[INFERRED]` olive/sage | Positive status |
| `--warning` | `#C99A3E` | `[INFERRED]` amber | Caution status |
| `--danger` | `#B4553F` | `[INFERRED]` warm brick-red | Error/destructive (kept warm, not pure red) |
| `--info` | `#5E7C8B` | `[INFERRED]` muted slate-teal | Neutral info |

> ⚠️ **Every hex above except `--paper-base` and `--accent` is `[INFERRED]`.** They are eyeballed from a compressed board, not sampled from source art. Treat them as a *coherent starting palette to tune against the real reference at full resolution*, not as final brand values.

### 3.3 Elevation Tokens — Dual-Directional Shadow

Neumorphism needs **two** shadows per raised element (dark BR + light TL) and an **inset** pair for wells. The reference *prints* a conventional single-direction elevation scale (L0–L3) for drop-shadow cards; I keep **both** models because the board uses both — printed L-scale for cards/modals, dual-shadow for keys/controls.

**Printed drop-shadow scale** `[OBSERVED]` (labelled on board):

| Token | Value | Level |
|---|---|---|
| `--shadow-0` | `none` | L0 flush |
| `--shadow-1` | `0px 4px 8px rgba(0,0,0,0.08)` | L1 |
| `--shadow-2` | `0px 8px 16px rgba(0,0,0,0.12)` | L2 |
| `--shadow-3` | `0px 16px 24px rgba(0,0,0,0.16)` | L3 |

**Dual-directional (neumorphic) shadow** `[REFERENCE-DERIVED]` (the tactile key/control look; exact blur radii `[INFERRED]`):

| Token | Value |
|---|---|
| `--nm-raised` | `6px 6px 14px rgba(120,98,74,0.35), -6px -6px 14px rgba(255,250,240,0.75)` |
| `--nm-raised-sm` | `3px 3px 7px rgba(120,98,74,0.32), -3px -3px 7px rgba(255,250,240,0.7)` |
| `--nm-inset` | `inset 4px 4px 9px rgba(120,98,74,0.32), inset -4px -4px 9px rgba(255,250,240,0.7)` |
| `--nm-pressed` | `inset 3px 3px 7px rgba(120,98,74,0.38), inset -2px -2px 5px rgba(255,250,240,0.55)` |

### 3.4 Radius `[OBSERVED]` (scale printed on board)

| Token | Value |
|---|---|
| `--radius-0` | `0px` |
| `--radius-xs` | `4px` |
| `--radius-sm` | `8px` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-full` | `9999px` (circle) |

### 3.5 Spacing `[OBSERVED]` (scale printed on board: 4/8/12/24/32)

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |

> Note the **gap between 12 and 24** — the board skips 16/20. I preserve the board's scale verbatim rather than "correcting" it to a linear 4px ramp. `[DESIGN DECISION]` If app layouts need 16/20, add `--space-4: 16px` / `--space-5: 20px` as **extensions**, flagged as project additions, not reference values.

### 3.6 Border `[OBSERVED]` (1/2/4px printed)

| Token | Value | Role |
|---|---|---|
| `--border-hairline` | `1px` | Dividers, subtle field outlines |
| `--border` | `2px` | Emphasis / focus ring thickness |
| `--border-strong` | `4px` | Heavy accent (rare — e.g. active tab underline) |

Border **color** defaults to `--ink-faint` at low alpha; borders are secondary to shadow.

---

## 4. Elevation / Shadow Model (Depth Grammar)

The system has **five physical positions** on one axis:

| Position | Visual | Token(s) | Used by |
|---|---|---|---|
| **Flush (L0)** | flat with paper | `--shadow-0` | dividers, disabled/flat regions |
| **Inset well** | pressed *into* paper | `--nm-inset` | text inputs, sliders' track, progress track, segmented control groove |
| **Raised** | extruded *from* paper | `--nm-raised` / `--nm-raised-sm` | buttons, keys, cards, switch knob, badges (chip), avatars |
| **Floating (L2/L3)** | lifted above paper | `--shadow-2` / `--shadow-3` | modals, toasts, tooltips, dropdown menus, popovers |
| **Pressed** | raised thing pushed in | `--nm-pressed` | active/`:active` on any raised control |

**Rules:**
- A control's rest state and pressed state are always **opposite ends of the axis** (raised → pressed-in). `[REFERENCE-DERIVED]`
- Wells never "raise" — you don't press a text field out of the page. Focus on an inset field is shown by **accent ring + deeper inset**, not by raising it. `[DESIGN DECISION]`
- Overlays (modal/toast/tooltip) use the **printed L-scale drop shadows**, not neumorphic dual-shadow — they're above the surface, not part of it. `[REFERENCE-DERIVED]`

---

## 5. Typography System

| Attribute | Spec | Provenance |
|---|---|---|
| **Primary family** | Humanist sans-serif; the board uses a geometric-humanist face (Inter-like). Keep **Inter** (already loaded). | `[INFERRED]` face / `[DESIGN DECISION]` keep Inter |
| **Display/numeric** | The board doesn't clearly show a serif; the current app's Fraunces serif is *glass-era*. For neo-skeuo I'd keep numerics in Inter/JetBrains Mono for tabular data. | `[INFERRED]` + `[PROJECT-REQUIRED]` |
| **Ink color** | `--ink-strong` for headings, `--ink` for body — never pure black | `[REFERENCE-DERIVED]` |

**Type scale** `[INFERRED]` (board proportions; tuned to a 1.2 ratio):

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `--text-display` | 32 / 40 | 700 | Page/KPI hero |
| `--text-h1` | 24 / 32 | 700 | Section title |
| `--text-h2` | 20 / 28 | 600 | Card title |
| `--text-h3` | 16 / 24 | 600 | Sub-head |
| `--text-body` | 14 / 22 | 400 | Default body |
| `--text-sm` | 13 / 20 | 400 | Secondary |
| `--text-caption` | 11 / 16 | 500 (tracked +0.02em, uppercase for labels) | Labels, meta |

Weights on the board read as **400 / 500 / 600 / 700**. Uppercase micro-labels with letter-spacing appear on section headers. `[INFERRED]`

---

## 6. Spacing System

Base grid **4px**. Component internal padding leans generous (tactile), not dense:

- Button padding: `12px 24px` (`--space-3` / `--space-6`) `[INFERRED]`
- Card padding: `24px` (`--space-6`) `[INFERRED]`
- Field padding: `12px 16px` `[INFERRED]`
- Stack gaps between related controls: `8–12px`; between sections: `24–32px` `[REFERENCE-DERIVED]`

See §3.5 for the printed token scale and the 16/20 gap note.

---

## 7. Radius System

See §3.4. Application rules `[REFERENCE-DERIVED]`:
- Inputs, buttons, small controls → `--radius-sm` (8px)
- Cards, modals, large surfaces → `--radius-md` (16px)
- Hero/feature panels → `--radius-lg` (24px)
- Pills, badges, avatars, switch track → `--radius-full`
- `--radius-0` reserved for full-bleed dividers/tables only.

---

## 8. Border System

See §3.6. Philosophy: **shadow does the work, borders are backup.** `[REFERENCE-DERIVED]`
- Default surfaces: **no border**, depth from shadow.
- Inset fields: optional 1px `--ink-faint` @ ~40% to crisp the well lip.
- Focus: **2px accent** ring/outline (see focus token in §12).
- `4px` strong border reserved for the active-tab indicator and similar single accents.

---

## 9. Iconography System

| Attribute | Spec | Provenance |
|---|---|---|
| Style | **Line icons, rounded joins/caps**, matching the soft geometry | `[REFERENCE-DERIVED]` |
| Sizes | 16 / 20 / 24px | `[OBSERVED]` (printed) |
| Stroke | 1.5 / 2 / 3px (scale with size; 2px default) | `[OBSERVED]` (printed) |
| Color | inherits `--ink` / `--ink-muted`; accent only when active | `[REFERENCE-DERIVED]` |
| Library | **Lucide** (already in app; rounded, stroke-based — good match) | `[DESIGN DECISION]` |

---

## 10. Complete Component Inventory

Observed on the reference board `[OBSERVED]` unless noted:

**Actions & inputs:** Button (primary/secondary/ghost/icon), Text input, Textarea, Select, Checkbox, Radio, Switch/Toggle, Slider, Segmented control/Tabs.
**Navigation:** Tabs, Breadcrumbs, Pagination, Stepper (4-step), Sidebar/nav items (list items).
**Containers:** Card, List item, Modal/Dialog, Alert banner, Toast (stacked), Tooltip, Popover/Dropdown menu `[INFERRED]`.
**Data & status:** Badge/Tag, Avatar, Compact table, Linear progress bar, Spinner, Skeleton loader, Empty state.
**Feedback:** Toast stack, Alert banner, Tooltip.

Each maps to a physical position from §4:
- Raised: Button, Badge, Avatar, Card, Switch knob, Stepper node (active).
- Inset: Text input, Textarea, Select (closed), Slider track, Progress track, Segmented groove.
- Floating: Modal, Toast, Tooltip, Dropdown.
- Flush: Divider, Skeleton, disabled controls.

---

## 11. Component State Matrix

States observed/required per control. `R`=raised, `I`=inset, `P`=pressed-in, `F`=floating.

| Component | Rest | Hover | Focus | Active/Pressed | Selected/Checked | Disabled | Error |
|---|---|---|---|---|---|---|---|
| Button (primary) | R, accent fill | R, accent-hover | R + focus ring | **P** (nm-pressed), accent-press | — | flush, ink-faint, no shadow | — |
| Button (secondary) | R, paper | R, paper-raised | R + ring | **P** | — | flush | — |
| Text input | I (well) | I, lip darkens | I + accent ring, deeper inset | — | — | flush, muted | I + danger ring |
| Checkbox | I (empty well) | I | I + ring | — | **R accent** knob w/ check | flush | danger ring |
| Radio | I | I | I + ring | — | **R accent** dot | flush | danger ring |
| Switch | track I, knob R (left) | knob R | ring | knob slides | track accent, knob R (right) | flush/muted | — |
| Slider | track I, thumb R | thumb R grows | ring on thumb | thumb **P** | filled portion accent | flush | — |
| Tab / Segmented | groove I, tab flush | tab paper-raised | ring | tab **P** | **R** tab, accent text/underline | muted | — |
| Card | R (nm-raised) | R lift (+2 shadow) `[INFERRED]` | ring if interactive | **P** if clickable | accent hairline | — | — |
| Badge | R-sm, tinted | — | — | — | accent for active | faint | — |
| Modal | **F** (shadow-3) + scrim | — | trap focus | — | — | — | — |
| Toast | **F** (shadow-2) | — | — | — | — | — | color by type |
| Tooltip | **F** (shadow-1/2) | — | — | — | — | — | — |
| Stepper node | done: R accent; current: R ring; future: I | — | — | — | — | — | danger node |
| Progress/Spinner | track I, fill accent | — | — | — | — | — | — |
| Skeleton | flush shimmer | — | — | — | — | — | — |

`[REFERENCE-DERIVED]` for states shown on board; `[INFERRED]`/`[PROJECT-REQUIRED]` for focus rings and error states (accessibility completeness).

---

## 12. Initial CSS / Token Specification

> **Not wired into the app.** This is the reference `:root` block + component recipes for review. It maps cleanly onto the existing `frontend/src/styles/tokens.css` structure (CSS custom properties → Tailwind semantic utilities).

```css
:root {
  /* ---- Paper & ink ---- */
  --paper-base:   #EAE2D3;   /* [OBSERVED]  */
  --paper-raised: #EFE8DB;   /* [INFERRED]  */
  --paper-sunk:   #E2D9C8;   /* [INFERRED]  */
  --ink-strong:   #3B2E22;   /* [INFERRED]  */
  --ink:          #5A4A3A;   /* [INFERRED]  */
  --ink-muted:    #8A7A66;   /* [INFERRED]  */
  --ink-faint:    #B4A793;   /* [INFERRED]  */

  /* ---- Accent & semantic ---- */
  --accent:       #C36B41;   /* [OBSERVED]  */
  --accent-hover: #B25E37;   /* [INFERRED]  */
  --accent-press: #9E5230;   /* [INFERRED]  */
  --accent-tint:  #EADFC9;   /* [INFERRED]  */
  --success:      #6B8E5A;   /* [INFERRED]  */
  --warning:      #C99A3E;   /* [INFERRED]  */
  --danger:       #B4553F;   /* [INFERRED]  */
  --info:         #5E7C8B;   /* [INFERRED]  */

  /* ---- Radius (printed) ---- */
  --radius-0: 0; --radius-xs: 4px; --radius-sm: 8px;
  --radius-md: 16px; --radius-lg: 24px; --radius-full: 9999px;

  /* ---- Spacing (printed 4/8/12/24/32) ---- */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-6: 24px; --space-8: 32px;

  /* ---- Border (printed 1/2/4) ---- */
  --border-hairline: 1px; --border: 2px; --border-strong: 4px;

  /* ---- Printed drop-shadow elevation (L0–L3) ---- */
  --shadow-0: none;
  --shadow-1: 0 4px 8px  rgba(0,0,0,.08);   /* [OBSERVED] */
  --shadow-2: 0 8px 16px rgba(0,0,0,.12);   /* [OBSERVED] */
  --shadow-3: 0 16px 24px rgba(0,0,0,.16);  /* [OBSERVED] */

  /* ---- Neumorphic dual-directional shadow ---- */
  --nm-raised:    6px 6px 14px rgba(120,98,74,.35), -6px -6px 14px rgba(255,250,240,.75);
  --nm-raised-sm: 3px 3px 7px  rgba(120,98,74,.32), -3px -3px 7px  rgba(255,250,240,.70);
  --nm-inset:     inset 4px 4px 9px rgba(120,98,74,.32), inset -4px -4px 9px rgba(255,250,240,.70);
  --nm-pressed:   inset 3px 3px 7px rgba(120,98,74,.38), inset -2px -2px 5px rgba(255,250,240,.55);

  /* ---- Focus ---- */
  --focus-ring: 0 0 0 2px var(--paper-base), 0 0 0 4px var(--accent);
}

body { background: var(--paper-base); color: var(--ink); }

/* Raised control (button/key) */
.nm-btn {
  background: var(--paper-raised); color: var(--ink-strong);
  border: none; border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-6);
  box-shadow: var(--nm-raised);
  transition: box-shadow .14s ease, transform .14s ease;
}
.nm-btn:active { box-shadow: var(--nm-pressed); transform: translateY(1px); }
.nm-btn--primary { background: var(--accent); color: #fff; }
.nm-btn--primary:hover { background: var(--accent-hover); }
.nm-btn--primary:active { background: var(--accent-press); box-shadow: var(--nm-pressed); }

/* Inset field (text input / well) */
.nm-field {
  background: var(--paper-sunk); color: var(--ink);
  border: var(--border-hairline) solid rgba(180,167,147,.4);
  border-radius: var(--radius-sm);
  padding: var(--space-3) 16px;
  box-shadow: var(--nm-inset);
}
.nm-field:focus-visible { outline: none; box-shadow: var(--nm-inset), 0 0 0 2px var(--accent); }

/* Card (raised container) */
.nm-card {
  background: var(--paper-raised); border-radius: var(--radius-md);
  padding: var(--space-6); box-shadow: var(--nm-raised);
}

/* Overlay (floating) */
.nm-modal  { background: var(--paper-raised); border-radius: var(--radius-md); box-shadow: var(--shadow-3); }
.nm-toast  { background: var(--paper-raised); border-radius: var(--radius-sm); box-shadow: var(--shadow-2); }
```

---

## 13. Architecture Recommendation

**Fit to the existing stack (Next.js 15 + Tailwind + `tokens.css`):**

1. **Tokens layer.** Add a neo-skeuo token set. Two viable shapes:
   - **(a) New theme class** — `.theme-tactile` scope on `<html>`/`<body>`, tokens defined under it, sitting alongside the current `:root`/`.dark` glass tokens. Lets both systems coexist and be A/B'd. `[DESIGN DECISION — recommended if the answer to Q1 is "coexist"]`
   - **(b) Replace** — overwrite the semantic tokens in `tokens.css` and delete the glass layer in `globals.css`. Cleaner, but destroys the shipped glass work. `[if Q1 = "replace"]`
2. **Shadow can't be a Tailwind color.** Neumorphism needs multi-layer `box-shadow`; expose `--nm-*` as Tailwind `boxShadow` theme entries (`shadow-raised`, `shadow-inset`, `shadow-pressed`) so components stay utility-driven.
3. **Component recipes over per-element styling.** Extend the existing `cva` component files (`button.tsx`, inputs, etc.) with tactile variants driven by the tokens — same pattern already in the repo. One recipe per physical position (raised/inset/floating).
4. **Convert hex → OKLCH.** The repo's tokens are OKLCH; port these hex values into OKLCH for consistency and better light/dark math. `[PROJECT-REQUIRED]`
5. **Dark mode.** Neumorphism in dark = charcoal paper with the *same* dual-shadow logic (darker dark, dim warm highlight). Needs its own token block; **Question 2**.
6. **Accessibility guardrails.** Low-contrast warm palette must be lifted to WCAG AA for text (`--ink`/`--ink-strong` on `--paper-*`). Focus rings are mandatory (§12). `[PROJECT-REQUIRED]`

---

## 14. Self-Review Findings (Extract → Analyze → Challenge → Resolve → Validate)

- **Challenge: "Is the printed L0–L3 drop-shadow scale contradicted by the neumorphic dual-shadow look?"** → **Resolved:** No — the board uses drop-shadows for *overlays/cards above the surface* and dual-shadow for *controls that are part of the surface*. Both kept, scoped by §4.
- **Challenge: "Am I inventing a serif?"** → **Resolved:** The board shows no clear serif; the app's Fraunces is glass-era. Flagged Fraunces as out-of-lineage; recommend Inter-only until confirmed. (No fake precision.)
- **Challenge: "Spacing 4/8/12/24/32 skips 16/20 — is that a reading error?"** → **Resolved:** Preserved verbatim as `[OBSERVED]`; 16/20 offered only as tagged extensions, not smuggled in as reference truth.
- **Challenge: "Are my hex values honest?"** → **Resolved:** Only `--paper-base` and `--accent` are `[OBSERVED]`; **all other colors are explicitly `[INFERRED]`** and flagged as tune-against-source, not final.
- **Challenge: "Does this fight the shipped app?"** → **Resolved:** Yes, fundamentally. Escalated to §0 Status + Question 1 rather than silently overwriting.
- **Validation:** Every numeric token traces to either a printed scale `[OBSERVED]` or a tagged inference. No inference is disguised as observation.

---

## 15. Resolved Ambiguities

| Ambiguity | Resolution |
|---|---|
| Two shadow models on one board | Scoped: dual-shadow = surface controls; L-scale = overlays/cards (§4) |
| Missing 16/20 spacing | Kept board scale; extensions tagged separately |
| Serif vs sans for display | Sans (Inter) until confirmed; Fraunces flagged as glass-era |
| Icon library | Lucide (rounded stroke) — matches soft geometry, already installed |
| Danger = pure red? | No — warm brick `--danger #B4553F` to stay in palette |

## 16. Remaining Assumptions

1. Exact non-`[OBSERVED]` hex values (all ink + all semantic + accent variants) are eyeballed and **must be re-sampled from the full-res reference**.
2. Motion timing (~120–160ms press) is inferred from static pressed states.
3. Card hover-lift behavior is assumed (board is static).
4. Dark-mode neumorphic palette is entirely to-be-designed.
5. Whether Fraunces/serif has any role is unconfirmed.

---

## 17. Questions — RESOLVED ✅

1. **Adoption scope** → **Replace** the glass theme entirely. (Done.)
2. **Dark mode** → **Both** light and dark neumorphic modes. (Done.)
3. **Fidelity source** → Derive from the image, best judgment. (Done — non-`[OBSERVED]` colors remain flagged as inferences in §3.2; a contrast pass is queued per the notes in `tokens.css`.)

### Open decision you may want to flip
- **Primary button color.** The reference's *primary* key is a filled **terracotta**. Per your earlier preference ("no coloured buttons") the shipped `default` button is a **neutral raised paper key** instead. One-line switch to adopt the reference's terracotta primary: change the `default` variant background in `button.tsx` from `var(--surface-elevated)` to `var(--accent)` with `text-text-inverse`. Say the word and I'll flip it.

### Follow-up passes
- ✅ **Component polish (done):** inputs & selects → inset wells with accent **outline** focus (outline is used deliberately so the ring survives the neumorphic `box-shadow`); textareas in the create forms → inset wells; cards → raised paper + opt-in hover-lift (`.nm-liftable`); tabs → inset groove with the active trigger raised out of it; buttons → raised keys that press in; dialogs/tooltips/dropdown/select menus → clean floating drop-shadows (arbitrary `bg-[var(--…)]` so they don't inherit the neumorphic raise); dialog scrim de-glassed (no blur). Tailwind now exposes `shadow-raised/-sm`, `shadow-inset`, `shadow-pressed` plus the `rounded-button/-card` + `shadow-card/-hover` aliases the app already referenced (previously no-ops → sharp corners).
- ✅ **New tactile controls (done):** `switch.tsx`, `checkbox.tsx`, `radio.tsx` (Radio + RadioGroup), `slider.tsx` — built native-backed (no Radix deps): inset groove/well at rest, raised terracotta at the active end (switch fill, checkbox chip, radio disc + center dot, slider thumb). Slider track/thumb styled via `.nm-slider` in `globals.css`. Accessible (native inputs / `role="switch"`), controlled + uncontrolled.
- ✅ **Stepper + pagination (done):** `stepper.tsx` — completed node = raised terracotta disc w/ check, current = ringed node, future = inset well; connector fills terracotta up to current; optional click-to-navigate. `pagination.tsx` — raised page keys with an ellipsis-collapsing range, active page = pressed terracotta key; prev/next with disabled ends.
- ✅ **Contrast pass (done):** measured rendered sRGB via headless Chromium; **all body text meets WCAG AA (4.5:1)** in both themes. `--text-muted` darkened (light) / lifted (dark) to pass; the vivid `--accent` is kept for fills/graphics (3:1 floor) while TEXT uses darker `--accent-text` / `--brand-primary` shades (link button switched to `text-accent-text`). Measured ratios recorded in `tokens.css`. Placeholders left faint (WCAG-exempt), per the reference.

**The tactile system is now complete across the component library.** Remaining is optional: wiring components into more real screens, and the still-open terracotta-primary-button toggle.

### Implementation note — the `[class*="bg-surface"]` global rule
Neumorphic shadows are applied app-wide via un-layered attribute selectors in `globals.css`, guarded with `:not([class*=":bg-surface"])` so Tailwind **state-variant** classes (`hover:bg-surface-muted`, `data-[state=active]:bg-surface`) don't trigger a permanent shadow. Because these rules are un-layered they outrank Tailwind utilities — so component focus rings use `outline` (a different property) rather than `box-shadow` `ring`, and floating overlays opt out by using arbitrary-value backgrounds that don't match the selector.
