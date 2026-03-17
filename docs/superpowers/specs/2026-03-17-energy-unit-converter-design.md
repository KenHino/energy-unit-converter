# Energy Unit Converter — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

A modern web-based energy unit converter for computational chemistry, compiled from Rust to WebAssembly and served as a static site on GitHub Pages. The user enters a value (or arithmetic expression) in any unit field and all other fields update instantly.

---

## Units Supported (13 total)

| Label | Symbol | Conversion type |
|---|---|---|
| Hartree | Eh | linear (base unit) |
| Rydberg | Ryd | linear (1 Eh = 2 Ryd) |
| Electron volt | eV | linear |
| kcal/mol | kcal/mol | linear |
| kJ/mol | kJ/mol | linear |
| Joule | J | linear |
| Kelvin | K | linear (via k_B) |
| Wavenumber | cm⁻¹ | linear |
| Frequency | Hz | linear (via h) |
| Wavelength | nm | **reciprocal** (E = hc/λ) |
| Period | sec | **reciprocal** (t = h/E) |
| ¹H-NMR field | T_NMR | linear (via ℏγ_H) |
| EPR field | T_EPR | linear (via g_e·μ_B) |

Physical constants: CODATA 2018.

---

## Project Structure

```
energy-unit-converter/
├── src/
│   └── lib.rs                    # Rust WASM library
├── www/                          # TypeScript + Vite frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts               # Entry point, WASM init
│       ├── units.ts              # Unit metadata and ordering
│       ├── formatter.ts          # Number formatting
│       ├── parser.ts             # Arithmetic expression parser
│       └── ui.ts                 # DOM, copy buttons, CSV export
├── Cargo.toml
├── docs/
│   └── superpowers/specs/
│       └── 2026-03-17-energy-unit-converter-design.md
└── .github/
    └── workflows/
        └── deploy.yml            # GitHub Pages CI
```

---

## Architecture

### Initialisation Order

1. `cargo init` creates the Rust library (`lib` crate type)
2. `wasm-pack build --target web` compiles Rust → `pkg/`
3. Vite (`www/`) imports from `../pkg/` and bundles the frontend
4. GitHub Actions runs both steps on push to `main`, deploys `www/dist/`

### Rust WASM API (`src/lib.rs`)

Two public functions exported via `wasm-bindgen`:

```rust
/// Convert a value already expressed in Hartree to all units.
/// Returns a JS object: { hartree, ryd, ev, kcal_mol, kj_mol, j, k, wavenumber, hz, nm, sec, t_nmr, t_epr }
#[wasm_bindgen]
pub fn convert_all(hartree: f64) -> JsValue

/// Convert a single value from a named unit to Hartree.
/// unit strings: "hartree", "ryd", "ev", "kcal_mol", "kj_mol", "j", "k",
///               "wavenumber", "hz", "nm", "sec", "t_nmr", "t_epr"
#[wasm_bindgen]
pub fn unit_to_hartree(value: f64, unit: &str) -> f64
```

**Zero handling:** input of `0` to a reciprocal unit (nm, sec) returns `f64::INFINITY` for reciprocal-derived values, propagated as `Infinity` in JavaScript.

**Conversion factors** (Hartree → unit, linear units):
- Ryd: × 2
- eV: × 27.211386245988
- kcal/mol: × 627.5094740631
- kJ/mol: × 2625.4996394799
- J: × 4.3597447222071e-18
- K: × 315775.02480407 (= Eh/k_B)
- cm⁻¹: × 219474.6313632
- Hz: × 6.5796839205e15
- nm: hc/E → 45.56335 / Eh_value (nm·Eh)
- sec: h/E → 1/(Hz_factor × Eh_value)
- T_NMR: Hz / (γ_H/2π) where γ_H = 2.6752218744e8 rad/(s·T)
- T_EPR: J / (g_e × μ_B) where g_e = 2.00231930436256, μ_B = 9.2740100783e-24 J/T

### TypeScript Modules

**`units.ts`** — array of unit descriptors:
```ts
{ key: string, label: string, symbol: string, reciprocal: boolean }
```
Defines display order and which units require reciprocal arithmetic.

**`parser.ts`** — safe arithmetic expression evaluator (no `eval()`):
- Supports: `+`, `-`, `*`, `/`, parentheses, scientific notation (`1.5e-3`, `3.2E+4`)
- For **linear units**: evaluates expression numerically → returns a single `f64`
- For **reciprocal units** (nm, sec): converts each numeric token to Hartree via `unit_to_hartree`, then applies arithmetic operators to the Hartree values — so `300-600` in nm computes `E(300nm) − E(600nm)`

Example:
- `3200-1200` in cm⁻¹ → `2000` cm⁻¹ → convert normally
- `300-600` in nm → `E(300nm) − E(600nm)` in Hartree → convert to all units

**`formatter.ts`** — number formatting:
- Mode A (default): scientific notation, e.g. `1.23456E-2`
- Mode B: fixed decimal, e.g. `0.0123456`
- Mode C: scientific with trailing zeros, e.g. `1.234560000E-2`
- Configurable significant figures (default: 6)

**`ui.ts`** — DOM management:
- Renders 13 rows: `[unit label] [input field] [copy button]`
- Format controls bar (top): format toggle (A/B/C), sig-fig spinner
- CSV export button: downloads two-column CSV (`unit, value`)
- On any field input: parse → `unit_to_hartree` → `convert_all` → update all other fields

### Data Flow

```
User types in field X
  → parser.ts: parse expression (reciprocal-aware) → hartree: f64
  → WASM: convert_all(hartree) → { unit: value, ... }
  → formatter.ts: format each value per current settings
  → ui.ts: update all input fields except X
```

---

## Build & Deployment

### Local Development

```bash
wasm-pack build --target web       # build Rust → pkg/
cd www && npm install && npm run dev  # Vite dev server
```

### GitHub Actions (`deploy.yml`)

Trigger: push to `main`

Steps:
1. Install Rust toolchain + `wasm-pack`
2. `wasm-pack build --target web`
3. `cd www && npm ci && npm run build`
4. Deploy `www/dist/` to `gh-pages` branch via `actions/deploy-pages`

---

## UI Design

- Clean, minimal layout — one row per unit
- No external CSS framework; plain CSS with CSS variables for theming
- Format controls fixed at top of page
- CSV export and copy buttons use the Clipboard API with a visual "copied!" flash

---

## Out of Scope

- Unit systems beyond energy (no force, pressure, etc.)
- User-defined custom units
- Saving/loading sessions
- Mobile-specific layout optimisations (responsive but not a priority)
