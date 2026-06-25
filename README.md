# Sequential Circuit Design Automation System

> A client-side web application that automates the full pipeline of sequential circuit design — from state table input to minimized equations, K-map visualization, logic gate diagrams, and exportable PDF reports.

**Course:** YZU 114-2 Digital Circuit Design Final Project
**Author:** Chen Po-Hao (s1131525)
**Status:** `Active Development`

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Algorithms](#algorithms)
- [Roadmap](#roadmap)
- [Known Issues](#known-issues)
- [Changelog](#changelog)

## Overview

This tool takes a finite state machine (FSM) description as a state table and automatically synthesizes:

1. **Flip-flop excitation equations** via Quine-McCluskey minimization
2. **Karnaugh maps** with color-coded prime implicant groupings
3. **Gate-level circuit diagrams** rendered as SVG
4. **Printable PDF reports** formatted for academic submission

Supports **Mealy** and **Moore** machine models with **JK**, **T**, and **D** flip-flop types.

## Features

| Feature | Description |
|---|---|
| State Table Editor | Editable table with dynamic row management |
| FSM Model Selection | Mealy / Moore |
| Flip-Flop Types | JK, T, D — with correct excitation table logic |
| Quine-McCluskey Engine | Full minimization with don't-care support |
| K-Map Renderer | 1–4 variable maps with prime implicant overlays |
| Circuit Diagram | Zone-based SVG layout with gate/FF rendering |
| Zoom Controls | In / Out / Reset / Fit-to-panel |
| Export | SVG download, PNG (2× quality), full PDF report |
| No-Install | Runs entirely in-browser, zero dependencies |

## Tech Stack

- **Runtime:** Browser (ES6+, no build step)
- **Language:** Vanilla JavaScript
- **Markup/Style:** HTML5, CSS3 (Flexbox)
- **Graphics:** SVG (dynamically generated via DOM API)
- **Export:** `window.print()` with print-optimized CSS

No frameworks. No bundler. No backend.

## Architecture

### 3-Panel UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header (dark navy)                                              │
├──────────────┬──────────────────┬────────────────────────────────┤
│  Left Panel  │  Middle Panel    │  Right Panel                   │
│  (290px)     │  (360px)         │  (flex)                        │
│              │                  │                                │
│  · Controls  │  · Equations     │  · Circuit Diagram (SVG)       │
│  · FF Type   │  · K-maps        │  · Zoom toolbar                │
│  · State     │                  │                                │
│    Table     │                  │                                │
├──────────────┴──────────────────┴────────────────────────────────┤
│  Footer: [GENERATE]                            [Export] [About]  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (State Table + Config)
    │
    ▼
getTableData()          ← encode states, build truth tables
    │
    ▼
generate()              ← run Quine-McCluskey per equation
    │
    ├─▶ renderOutput1() ← K-maps + simplified equations
    │
    └─▶ renderOutput2() ← SVG gate-level circuit diagram
              │
              └─▶ exportReport() ← full PDF (optional)
```

### Circuit Diagram Zone Map

```
Zone 0   Zone 1      Zone 2    Zone 3     Zone 4
──────   ─────────   ───────   ────────   ──────────
AND      AND gate    OR gate   FF inlet   Flip-Flop
drop     inputs      stage     wiring     blocks
lines
```

Each signal occupies a dedicated vertical lane at a fixed 24 px Y-interval to avoid routing collisions.

## Project Structure

```
1142 Digital Circuit Design Final/
│
├── index.html                   # Application shell
├── script.js                    # Legacy monolith (reference only)
│
├── css/
│   └── styles.css               # All styles including print layout
│
└── js/
    ├── app.js                   # Event binding & initialization
    │
    ├── circuit/
    │   └── logicEngine.js       # Quine-McCluskey, excitation tables,
    │                            # Boolean AST parser
    │
    ├── render/
    │   ├── kmapRender.js        # K-map card renderer (SVG overlays)
    │   └── circuitRender.js     # Gate-level SVG circuit generator
    │
    └── ui/
        ├── tableManager.js      # State table CRUD operations
        └── exportManager.js     # PDF report & image export
```

## Getting Started

### Prerequisites

- Any modern browser with ES6+ support (Chrome 80+, Firefox 75+, Edge 80+, Safari 13+)
- No Node.js, npm, or server required

### Running Locally

```bash
# Clone the repository
git clone <repo-url>

# Open in browser — that's it
open index.html        # macOS
start index.html       # Windows
xdg-open index.html   # Linux
```

## Usage Guide

### 1. Configure FSM Parameters

Select **FSM Model** (Mealy / Moore) and **Flip-Flop Type** (JK / T / D) in the left panel.

### 2. Define State Table

| Column | Description |
|---|---|
| Present State | Current FSM state label (e.g., S0, S1) |
| Input | Input variable value (binary) |
| Next State | Resulting state after transition |
| Output | Output value (Mealy: per transition; Moore: per state) |

Click **+ Add Row** to extend the table. Use **Load Example** to populate a demo circuit.

### 3. Generate

Click **GENERATE** to run the full synthesis pipeline. Results appear in the middle and right panels.

### 4. Inspect Results

- **Middle panel**: Simplified boolean equations + K-maps with prime implicant groups highlighted
- **Right panel**: Gate-level circuit diagram with AND/OR/NOT gates and flip-flop blocks

### 5. Export

| Action | Output |
|---|---|
| Export Report | Full HTML/PDF with student header, state table, equations, K-maps, circuit |
| Download SVG | Vector circuit diagram (scalable) |
| Download PNG | Rasterized circuit at 2× resolution |

## Algorithms

### Quine-McCluskey Minimization

```
Input:  minterms[], dontcares[], nVars, varNames
Output: minimal SOP expression string

1. Group minterms by popcount (number of 1-bits)
2. Iteratively merge groups where Hamming distance = 1
   → replaced bits become don't-care (X)
3. Terms not merged in any round = prime implicants
4. Build prime implicant chart
   a. Identify essential PIs (sole coverage of a minterm)
   b. Greedily select remaining PIs to cover uncovered minterms
5. Render result as SOP string
```

### Flip-Flop Excitation

| FF | Transition 0→0 | 0→1 | 1→0 | 1→1 |
|---|---|---|---|---|
| JK | J=0, K=X | J=1, K=X | J=X, K=1 | J=X, K=0 |
| T  | T=0 | T=1 | T=1 | T=0 |
| D  | D=0 | D=1 | D=0 | D=1 |

### Boolean AST Parser

Parses SOP/POS expressions into an abstract syntax tree for gate-level synthesis:

```
Precedence: NOT (') > AND (·/*) > OR (+)

"A·B + C'" → OR
              ├── AND
              │    ├── A
              │    └── B
              └── NOT
                   └── C
```

## Roadmap

- [ ] **Multi-output support** — independent minimization for each output variable
- [ ] **POS (Product of Sums)** synthesis option
- [ ] **Petrick's method** for exact minimal cover (vs. greedy)
- [ ] **State minimization** — merge equivalent states before encoding
- [ ] **Custom state encoding** — user-defined binary assignments
- [ ] **Timing diagram** — waveform visualization for verification
- [ ] **Settings panel** — currently stubbed, activate with saved preferences
- [ ] **Mobile layout** — responsive breakpoints for tablet/phone

## Known Issues

| ID | Severity | Description |
|---|---|---|
| KI-001 | Medium | Output variable synthesis uses only the first defined output variable; multi-output circuits require manual workaround |
| KI-002 | Low | `script.js` (legacy monolith) and the modular `js/` tree are not kept in sync; `script.js` is for reference only |
| KI-003 | Low | Settings panel button is wired but shows a placeholder stub |
| KI-004 | Low | Very large state machines (5+ flip-flops) may produce cluttered SVG diagrams with overlapping routes |

## Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

### [Unreleased]

> Track planned work here before it is merged.

---

### [1.4.0] — 2026-06-25

#### Fixed — `js/circuit/logicEngine.js`

- **Moore model output equation** (KI-001 partial fix): Added separate `outTT_moore` truth table that computes output Z based on present state only, independent of the input variable; Mealy still uses full state+input truth table; correct data set is routed via `finalOutTT / finalOutVars / finalOutNVars` based on the user's model selection
- **Variable name tokenizer**: Parser regex changed from `/[A-Z0-9]/` to `/[A-Za-z0-9_]/` — lowercase variable names (e.g. `x`, `clk`) and underscored names now parse correctly instead of being silently dropped
- **Hardcoded input variable**: `varNames` now reads the actual input variable name from the form field (`inVar`) instead of always inserting the literal string `'X'`

#### Added — `js/app.js`

- **Live table header sync**: `input` event listeners on the Input/Output variable fields immediately update `<th>` text as the user types, without triggering equation recalculation — header always reflects current variable names before GENERATE is clicked

#### Changed — `js/circuit/logicEngine.js`

- **File structure**: Reorganized into four numbered sections with block-comment headers — `1. BOOLEAN EXPRESSION PARSER`, `2. QUINE-MCCLUSKEY ENGINE`, `3. FLIP-FLOP EXCITATION TABLES`, `4. MAIN GENERATION CONTROLLER`; `parseBool` and `flatAST` moved to Section 1 (top of file) to reflect their dependency order
- **`lastResult` payload**: Added `outVarNames` field so renderers receive the correct variable name list for the output K-map (state-only for Moore, full for Mealy)

#### Changed — `js/render/kmapRender.js`

- **`getCornerHtml()` helper**: K-map corner cells now render with a CSS diagonal divider line (textbook style) — row variable label anchored bottom-left, column variable label anchored top-right; plain `backslash` separator replaced
- **`outVarNames` routing**: Output K-map now passes `outVarNames` (from `lastResult`) to `renderKMap` so the Moore output K-map shows only state variable axes, not the input variable axis

#### Changed — `css/styles.css`

- **`.drag-handle`**: New indicator element — `≡` icon in `.card-header` that turns `--primary` blue on hover, signaling the panel is draggable; hidden from drag events (`pointer-events: none` on `h2`)
- **`.transition-table` specialization**: First column of the state table gets a light `#f1f5f9` background with a darker right border to visually separate the origin state; first cell gets a subtle dot pseudo-element (`::before`)
- **`.btn-bordered`**: New button variant (light background, visible border, muted text) for utility buttons such as Settings and About; replaces `.btn-ghost` in the footer
- **Section comments**: Added `/* --- */` comment headers throughout the file to improve navigation

#### Changed — `index.html` & `js/ui/tableManager.js`

- **Drag handle markup**: Added `.header-title` wrapper with `<span class="drag-handle">≡</span>` to all three card headers
- **State table class**: Added `transition-table` to the table element to pick up first-column styling
- **Settings / About buttons**: Swapped from `.btn-ghost` to `.btn.btn-bordered`
- **Cell placeholders**: Input cell placeholder text changed from `"A"` / `"0"` to `"-"` for neutrality
- **`loadExample` defensive coding**: Added null guards before setting `inputVars`, `outputVars`, `thInput`, `thOutput`

---

### [1.3.0] — 2026-06-25

#### Added — `js/app.js`

- **Panel resize engine**: Drag gutters between panels to resize them freely; enforces 280 px minimum per panel to preserve usability
- **Panel drag-and-drop reorder**: Long-press (300 ms) on a card header to unlock drag; panels can be repositionally swapped via HTML5 drag-and-drop API; `reorderPanels()` re-inserts DOM nodes with gutters to maintain layout consistency
- **SVG auto-fit on resize**: `window.resize` now calls `svgFit()` so the circuit diagram rescales when the browser window changes size
- **Defensive generate binding**: `btnGenerate` now checks `typeof generate === 'function'` before binding to surface load-order errors in the console instead of silently failing

#### Added — `css/styles.css`

- **CSS Design Tokens** (`:root`): Introduced `--bg-color`, `--nav-bg`, `--card-bg`, `--text-main`, `--text-muted`, `--border-color`, `--primary`, `--success`, `--danger`, `--shadow-sm`, `--shadow-md`, `--radius` — all component styles now reference these variables instead of hardcoded hex values
- **Long-press glow animation engine**: `.card.long-pressing-loading` triggers a red SVG-border draw animation (`draw-glow-border`, 300 ms) that races exactly with the JS press timer; on unlock it snaps to `.drag-ready` which locks the border to stable green; `.dragging` fades the card to 0.6 opacity with a dashed blue outline on the drop target

#### Changed — `css/styles.css` & `index.html`

- **Navbar**: Replaced `.toolbar` + `.info-bar` with `<nav class="navbar">` containing `.nav-brand` (logo + title) and `.nav-user` (student badge, name, ID); student info is now structured HTML instead of inline string
- **Card system**: Replaced `.panel.panel-left/mid/right` with semantic `<section class="card">` elements sharing uniform `.card-header` / `.card-body` anatomy; panel widths are now flex-driven instead of hardcoded pixel values
- **Resizable gutters**: Added `<div class="gutter">` between cards; styled with a 4 px drag handle that turns blue on hover/active
- **Form layout**: Left panel configuration reorganized into numbered `.form-section` blocks; input/output variable fields placed side-by-side in `.input-row`
- **State table**: Replaced ad-hoc `<table>` styles with `.modern-table` inside `.table-container`; header row uses dark navy background (`#1e293b`) with white uppercase text; cells use monospace font at 15 px; even rows lightly striped
- **Button system**: Replaced single `.btn` class with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-large`, `.btn-micro`; GENERATE button relabeled to **GENERATE CIRCUIT** and promoted to `.btn-large`
- **Bottom bar**: Replaced `.footer` with `<footer class="bottom-bar">` using a left / center / right three-zone layout; Export button moved to right zone as `.btn-secondary`
- **Empty states**: Placeholder text in middle and right panels replaced with `.empty-state` components (icon + instructional text)
- **App title**: Shortened from "Sequential Circuit Design Automation System" to "Sequential Circuit EDA" in the navbar

#### Changed — `js/render/kmapRender.js`

- **Equation table**: Rebuilt with `.modern-table` + `.table-container`; FF input equations displayed in blue (`#2563eb`), output equation highlighted in red (`#ef4444`) with a dedicated `.highlight-row`
- **State variable display**: Changed separator from double-space to comma; label now rendered as a chip badge
- **K-map cell styling**: Replaced class-based coloring (`.k1`, `.kdc`, `.k0`) with per-cell inline style via new `getCellHtml()` helper; `1` cells render on `#f0fdf4` green, `X` on `#fffbeb` amber, `0` on transparent
- **K-map container**: Table uses `position:absolute` inside a fixed-size `div` so the SVG prime-implicant overlay aligns exactly with cell boundaries regardless of browser rendering quirks
- **Prime implicant colors**: Updated to modern Tailwind-aligned palette (red / blue / emerald / amber / violet / cyan / pink / lime); fill opacity reduced from `26` to `1A` (10 %) for less visual noise
- **Border color**: K-map borders changed from `#bbb` to `#94a3b8` to match design tokens

#### Changed — `js/ui/exportManager.js`

- **Student info source**: Changed selector from `.info-bar` to `.nav-user` to match new HTML structure
- **Report color scheme**: All hardcoded legacy colors (`#1a2744`, `#1a7a3a`, `#222`) replaced with new design token values (`#0f172a`, `#2563eb`, `#334155`)
- **PDF state table**: Wrapped in `.table-container` + `.modern-table` with dark header and even-row striping; `highlight-row` applied to output equation row
- **Page-break rules**: Added `page-break-after: avoid` to `h2` and `h3` to prevent orphaned section headings; `page-break-inside: avoid` on `.table-container`
- **Section titles**: "State Table" → "State Transition Table", "Equations & K-Maps" → "Logic Synthesis", "Sequential Circuit Diagram" → "Sequential Circuit Schematic"
- **Circuit SVG in PDF**: Added `border: 1px solid #cbd5e1` and `border-radius: 4px` for visual framing

---

### [1.2.0] — 2026-06-25

#### Improved — `circuitRender.js`

- **Layout compaction**: Reduced overall SVG padding from 40 px to 10 px; tightened horizontal zone gaps (`AND_X`, `OR_X`, `FF_INLET`) to produce more compact diagrams without sacrificing readability
- **Bus origin**: Shifted `BUS_START_X` from 160 to 140 and reduced signal-bus spacing from 16 px to 14 px, narrowing the horizontal footprint for circuits with many signals
- **NOT gate tap**: Changed complement tap X from a hardcoded `60` to a dynamic `BUS_START_X - 70`, making the NOT gate position scale correctly with variable bus widths
- **Flip-flop vertical spacing**: Increased `FF_GAP` from 140 px to 180 px; reduced `TOP_MARGIN` from 120 px to 80 px; net effect is more room between flip-flops for cross-wires while keeping the top margin tighter
- **Clock routing**: Clock branch drop offset changed from `bottomY + 20` to `bottomY + 60`, routing the clock tree fully below each flip-flop box to prevent clock lines crossing gate logic
- **Output logic zone** (`Z_Y`): Pushed down from `lastFFBot + 120` to `lastFFBot + 160` to guarantee output logic clears the lowest flip-flop's clock route
- **Feedback routing**: Horizontal offset per feedback signal reduced from 16 px to 14 px; feedback trunk moved left from `FF_RIGHT + 30` to `FF_RIGHT + 20`, reducing the feedback waterfall width
- **`AND`/`OR` input spacing**: `andSpacing` reduced from 56 px to 52 px, slightly tightening gate input spread for multi-input OR stages

#### Improved — `exportManager.js`

- **SVG size cap in PDF**: Added `max-height: 120mm` and switched SVG from `width: 100%` to `max-width: 100%; width: auto` so large circuit diagrams are scaled to fit the A4 page without overflowing
- **Page break protection**: Added `page-break-inside: avoid` to `.circuit-section` to prevent the circuit diagram from being split across PDF pages
- **Code readability**: Expanded dense inline CSS property chains and multi-statement HTML template strings into per-property multi-line format; no functional change

### [1.1.0] — 2025-06-25

#### Changed
- Refactored monolithic `script.js` into modular `js/` directory structure
  - `logicEngine.js`: Quine-McCluskey and excitation logic
  - `kmapRender.js`: K-map card rendering
  - `circuitRender.js`: SVG circuit diagram generation
  - `tableManager.js`: State table CRUD
  - `exportManager.js`: PDF and image export
  - `app.js`: Top-level event binding

#### Improved
- Separated rendering concerns from core logic (design pattern optimization)

### [1.0.0] — 2025-06-24

#### Added
- State table editor with dynamic row management
- Mealy / Moore FSM model selection
- JK, T, D flip-flop type support
- Quine-McCluskey minimization engine with don't-care handling
- K-map renderer (1–4 variables) with prime implicant SVG overlays
- Gate-level SVG circuit diagram with zone-based layout
- AND / OR / NOT gate rendering with dynamic height scaling
- Flip-flop block rendering with clock tree routing
- Zoom controls (in / out / reset / fit)
- PDF report export with A4 print-optimized layout
- SVG and PNG (2×) circuit diagram download
- Load Example function for quick demo