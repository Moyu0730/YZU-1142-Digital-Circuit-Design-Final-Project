# Sequential Circuit Design Automation System

> A client-side web application that automates the full pipeline of sequential circuit design — from state table input to minimized equations, K-map visualization, logic gate diagrams, and exportable PDF reports.

**Course:** YZU 114-2 Digital Circuit Design Final Project
**Author:** Chen Po-Hao (s1131525)
**Status:** `Active Development`

---

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

---

## Overview

This tool takes a finite state machine (FSM) description as a state table and automatically synthesizes:

1. **Flip-flop excitation equations** via Quine-McCluskey minimization
2. **Karnaugh maps** with color-coded prime implicant groupings
3. **Gate-level circuit diagrams** rendered as SVG
4. **Printable PDF reports** formatted for academic submission

Supports **Mealy** and **Moore** machine models with **JK**, **T**, and **D** flip-flop types.

---

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

---

## Tech Stack

- **Runtime:** Browser (ES6+, no build step)
- **Language:** Vanilla JavaScript
- **Markup/Style:** HTML5, CSS3 (Flexbox)
- **Graphics:** SVG (dynamically generated via DOM API)
- **Export:** `window.print()` with print-optimized CSS

No frameworks. No bundler. No backend.

---

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

---

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

---

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

---

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

---

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

---

## Roadmap

- [ ] **Multi-output support** — independent minimization for each output variable
- [ ] **POS (Product of Sums)** synthesis option
- [ ] **Petrick's method** for exact minimal cover (vs. greedy)
- [ ] **State minimization** — merge equivalent states before encoding
- [ ] **Custom state encoding** — user-defined binary assignments
- [ ] **Timing diagram** — waveform visualization for verification
- [ ] **Settings panel** — currently stubbed, activate with saved preferences
- [ ] **Mobile layout** — responsive breakpoints for tablet/phone

---

## Known Issues

| ID | Severity | Description |
|---|---|---|
| KI-001 | Medium | Output variable synthesis uses only the first defined output variable; multi-output circuits require manual workaround |
| KI-002 | Low | `script.js` (legacy monolith) and the modular `js/` tree are not kept in sync; `script.js` is for reference only |
| KI-003 | Low | Settings panel button is wired but shows a placeholder stub |
| KI-004 | Low | Very large state machines (5+ flip-flops) may produce cluttered SVG diagrams with overlapping routes |

---

## Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

### [Unreleased]

> Track planned work here before it is merged.

---

### [1.1.0] — 2025-06-XX

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

---

### [1.0.0] — 2025-06-XX

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