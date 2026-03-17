# Energy Unit Converter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Rust/WASM energy unit converter with a TypeScript/Vite frontend deployed to GitHub Pages.

**Architecture:** The Rust library exposes two WASM functions (`convert_all`, `unit_to_hartree`) via wasm-bindgen. The TypeScript frontend imports these, parses arithmetic expressions from user input, and updates all 13 unit fields simultaneously. GitHub Actions builds WASM and the Vite bundle, then deploys to GitHub Pages.

**Tech Stack:** Rust, wasm-bindgen, serde-wasm-bindgen, TypeScript, Vite, Vitest, GitHub Pages

---

## File Map

| File | Responsibility |
|------|----------------|
| `Cargo.toml` | Rust lib crate config, wasm-bindgen + serde deps |
| `src/lib.rs` | WASM API: `convert_all`, `unit_to_hartree`, conversion math |
| `www/package.json` | npm deps: vite, vitest, typescript |
| `www/tsconfig.json` | TypeScript compiler config |
| `www/vite.config.ts` | Vite build config + Vitest test config |
| `www/index.html` | HTML shell |
| `www/src/style.css` | CSS variables, layout |
| `www/src/units.ts` | Unit descriptor array (key, label, symbol, reciprocal) |
| `www/src/formatter.ts` | Number formatting — modes A, B, C and sig-fig control |
| `www/src/formatter.test.ts` | Vitest tests for formatter |
| `www/src/parser.ts` | Arithmetic expression evaluator (reciprocal-aware) |
| `www/src/parser.test.ts` | Vitest tests for parser |
| `www/src/ui.ts` | DOM rendering, copy buttons, CSV export, input event handling |
| `www/src/main.ts` | WASM init, wires ui.ts to WASM functions |
| `.github/workflows/deploy.yml` | CI: build WASM + frontend, deploy to GitHub Pages |

---

### Task 1: Scaffold the Project

**Files:**
- Create: `Cargo.toml`
- Create: `src/lib.rs` (stub)
- Create: `www/package.json`
- Create: `www/tsconfig.json`
- Create: `www/vite.config.ts`
- Create: `www/index.html`

- [ ] **Step 1: Create Cargo.toml**

```toml
[package]
name = "energy-unit-converter"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[profile.release]
opt-level = "s"
```

- [ ] **Step 2: Create src/lib.rs stub**

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn unit_to_hartree(_value: f64, _unit: &str) -> f64 {
    0.0 // placeholder
}

#[wasm_bindgen]
pub fn convert_all(_hartree: f64) -> JsValue {
    JsValue::NULL // placeholder
}
```

- [ ] **Step 3: Verify Rust compiles**

Run: `cargo build`
Expected: compiles without errors.

- [ ] **Step 4: Create www/package.json**

```json
{
  "name": "energy-unit-converter-www",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.3.0"
  }
}
```

- [ ] **Step 5: Create www/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create www/vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    target: 'esnext',
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 7: Create www/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Energy Unit Converter</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="app">
    <div id="controls"></div>
    <div id="units-grid"></div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 8: Create placeholder www/src/main.ts**

```typescript
document.querySelector('#app')!.innerHTML = '<p>Loading...</p>';
```

- [ ] **Step 9: Install npm dependencies**

Run: `cd www && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 10: Verify Vite starts**

Run: `cd www && npm run dev`
Expected: Vite dev server starts at `http://localhost:5173`, browser shows "Loading...". Stop with Ctrl+C.

- [ ] **Step 11: Commit scaffold**

```bash
git add Cargo.toml src/lib.rs www/
git commit -m "chore: scaffold project structure"
```

---

### Task 2: Rust WASM Core

**Files:**
- Modify: `src/lib.rs`

The two public WASM functions delegate to private inner functions that contain the pure Rust logic. This allows `cargo test` to test the math without a WASM runtime.

- [ ] **Step 1: Write failing tests for unit_to_hartree round-trips**

Replace `src/lib.rs` with the full implementation and test module:

```rust
use wasm_bindgen::prelude::*;
use serde::Serialize;

// ── Physical constants (CODATA 2018) ──────────────────────────────────────
const EV_PER_HARTREE: f64 = 27.211386245988;
const KCAL_MOL_PER_HARTREE: f64 = 627.5094740631;
const KJ_MOL_PER_HARTREE: f64 = 2625.4996394799;
const J_PER_HARTREE: f64 = 4.3597447222071e-18;
const K_PER_HARTREE: f64 = 315775.02480407;
const WAVENUMBER_PER_HARTREE: f64 = 219474.6313632;
const HZ_PER_HARTREE: f64 = 6.5796839205e15;
const NM_HARTREE: f64 = 45.56335; // product: nm × Eh
const GAMMA_H: f64 = 2.6752218744e8; // rad/(s·T)
const G_E: f64 = 2.00231930436256;
const MU_B: f64 = 9.2740100783e-24; // J/T

// ── Inner logic (testable without WASM) ──────────────────────────────────

fn unit_to_hartree_inner(value: f64, unit: &str) -> f64 {
    match unit {
        "hartree"    => value,
        "ryd"        => value / 2.0,
        "ev"         => value / EV_PER_HARTREE,
        "kcal_mol"   => value / KCAL_MOL_PER_HARTREE,
        "kj_mol"     => value / KJ_MOL_PER_HARTREE,
        "j"          => value / J_PER_HARTREE,
        "k"          => value / K_PER_HARTREE,
        "wavenumber" => value / WAVENUMBER_PER_HARTREE,
        "hz"         => value / HZ_PER_HARTREE,
        "nm"         => NM_HARTREE / value,
        "sec"        => 1.0 / (HZ_PER_HARTREE * value),
        "t_nmr"      => value * (GAMMA_H / (2.0 * std::f64::consts::PI)) / HZ_PER_HARTREE,
        "t_epr"      => value * (G_E * MU_B) / J_PER_HARTREE,
        _            => f64::NAN,
    }
}

#[derive(Serialize)]
struct ConversionResult {
    hartree: f64,
    ryd: f64,
    ev: f64,
    kcal_mol: f64,
    kj_mol: f64,
    j: f64,
    k: f64,
    wavenumber: f64,
    hz: f64,
    nm: f64,
    sec: f64,
    t_nmr: f64,
    t_epr: f64,
}

fn convert_all_inner(hartree: f64) -> ConversionResult {
    let hz = hartree * HZ_PER_HARTREE;
    let j  = hartree * J_PER_HARTREE;
    ConversionResult {
        hartree,
        ryd:        hartree * 2.0,
        ev:         hartree * EV_PER_HARTREE,
        kcal_mol:   hartree * KCAL_MOL_PER_HARTREE,
        kj_mol:     hartree * KJ_MOL_PER_HARTREE,
        j,
        k:          hartree * K_PER_HARTREE,
        wavenumber: hartree * WAVENUMBER_PER_HARTREE,
        hz,
        nm:         NM_HARTREE / hartree,
        sec:        1.0 / hz,
        t_nmr:      hz / (GAMMA_H / (2.0 * std::f64::consts::PI)),
        t_epr:      j  / (G_E * MU_B),
    }
}

// ── WASM bindings ─────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn unit_to_hartree(value: f64, unit: &str) -> f64 {
    unit_to_hartree_inner(value, unit)
}

#[wasm_bindgen]
pub fn convert_all(hartree: f64) -> JsValue {
    serde_wasm_bindgen::to_value(&convert_all_inner(hartree)).unwrap()
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64, tol: f64) -> bool {
        (a - b).abs() < tol
    }

    // Each test converts 1 Eh → unit X, then back to Eh via unit_to_hartree_inner.
    #[test]
    fn roundtrip_ryd() {
        assert!(close(unit_to_hartree_inner(2.0, "ryd"), 1.0, 1e-10));
    }

    #[test]
    fn roundtrip_ev() {
        assert!(close(unit_to_hartree_inner(EV_PER_HARTREE, "ev"), 1.0, 1e-10));
    }

    #[test]
    fn roundtrip_kcal_mol() {
        assert!(close(unit_to_hartree_inner(KCAL_MOL_PER_HARTREE, "kcal_mol"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_kj_mol() {
        assert!(close(unit_to_hartree_inner(KJ_MOL_PER_HARTREE, "kj_mol"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_j() {
        assert!(close(unit_to_hartree_inner(J_PER_HARTREE, "j"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_k() {
        assert!(close(unit_to_hartree_inner(K_PER_HARTREE, "k"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_wavenumber() {
        assert!(close(unit_to_hartree_inner(WAVENUMBER_PER_HARTREE, "wavenumber"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_hz() {
        assert!(close(unit_to_hartree_inner(HZ_PER_HARTREE, "hz"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_nm() {
        // 1 Eh → nm: NM_HARTREE / 1.0; back: NM_HARTREE / that value = 1.0
        let nm = NM_HARTREE / 1.0;
        assert!(close(unit_to_hartree_inner(nm, "nm"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_sec() {
        let sec = 1.0 / HZ_PER_HARTREE;
        assert!(close(unit_to_hartree_inner(sec, "sec"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_t_nmr() {
        let r = convert_all_inner(1.0);
        assert!(close(unit_to_hartree_inner(r.t_nmr, "t_nmr"), 1.0, 1e-8));
    }

    #[test]
    fn roundtrip_t_epr() {
        let r = convert_all_inner(1.0);
        assert!(close(unit_to_hartree_inner(r.t_epr, "t_epr"), 1.0, 1e-8));
    }

    #[test]
    fn convert_all_base_values() {
        let r = convert_all_inner(1.0);
        assert_eq!(r.hartree, 1.0);
        assert_eq!(r.ryd, 2.0);
        assert!(close(r.ev, EV_PER_HARTREE, 1e-10));
    }

    #[test]
    fn reciprocal_units_zero_gives_infinity() {
        let r = convert_all_inner(0.0);
        assert!(r.nm.is_infinite());
        assert!(r.sec.is_infinite());
    }

    #[test]
    fn unknown_unit_gives_nan() {
        assert!(unit_to_hartree_inner(1.0, "furlong").is_nan());
    }
}
```

- [ ] **Step 2: Run tests — expect compile failure because placeholder is replaced**

Run: `cargo test`
Expected: Tests compile. Roundtrip tests fail because inner functions return `0.0` / `NULL`.

Actually in this step we've written both the tests AND the real implementation simultaneously (since they're in the same file). Run to confirm all pass:

- [ ] **Step 3: Confirm all tests pass**

Run: `cargo test`
Expected: All 15 tests pass with output like `test result: ok. 15 passed`.

- [ ] **Step 4: Commit**

```bash
git add src/lib.rs Cargo.toml
git commit -m "feat: implement Rust WASM conversion core with tests"
```

---

### Task 3: TypeScript — units.ts

**Files:**
- Create: `www/src/units.ts`

- [ ] **Step 1: Create www/src/units.ts**

```typescript
export interface UnitDescriptor {
  key: string;         // matches Rust unit string ("ev", "kcal_mol", etc.)
  label: string;       // display name
  symbol: string;      // Unicode symbol shown next to input
  reciprocal: boolean; // true for nm and sec (E = hc/λ or h/E)
}

export const UNITS: UnitDescriptor[] = [
  { key: 'hartree',    label: 'Hartree',       symbol: 'Eₕ',       reciprocal: false },
  { key: 'ryd',        label: 'Rydberg',       symbol: 'Ryd',      reciprocal: false },
  { key: 'ev',         label: 'Electron volt',  symbol: 'eV',       reciprocal: false },
  { key: 'kcal_mol',   label: 'kcal/mol',       symbol: 'kcal/mol', reciprocal: false },
  { key: 'kj_mol',     label: 'kJ/mol',         symbol: 'kJ/mol',   reciprocal: false },
  { key: 'j',          label: 'Joule',          symbol: 'J',        reciprocal: false },
  { key: 'k',          label: 'Kelvin',         symbol: 'K',        reciprocal: false },
  { key: 'wavenumber', label: 'Wavenumber',     symbol: 'cm⁻¹',     reciprocal: false },
  { key: 'hz',         label: 'Frequency',      symbol: 'Hz',       reciprocal: false },
  { key: 'nm',         label: 'Wavelength',     symbol: 'nm',       reciprocal: true  },
  { key: 'sec',        label: 'Period',         symbol: 's',        reciprocal: true  },
  { key: 't_nmr',      label: '¹H-NMR field',   symbol: 'T',        reciprocal: false },
  { key: 't_epr',      label: 'EPR field',      symbol: 'T',        reciprocal: false },
];
```

- [ ] **Step 2: Commit**

```bash
git add www/src/units.ts
git commit -m "feat: add unit descriptor table"
```

---

### Task 4: TypeScript — formatter.ts (TDD)

**Files:**
- Create: `www/src/formatter.ts`
- Create: `www/src/formatter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `www/src/formatter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatValue } from './formatter.js';

describe('formatValue', () => {
  describe('special values', () => {
    it('formats Infinity', () => {
      expect(formatValue(Infinity, 'A', 6)).toBe('Infinity');
    });
    it('formats -Infinity', () => {
      expect(formatValue(-Infinity, 'A', 6)).toBe('-Infinity');
    });
    it('formats NaN', () => {
      expect(formatValue(NaN, 'A', 6)).toBe('NaN');
    });
    it('formats zero', () => {
      expect(formatValue(0, 'A', 6)).toBe('0');
    });
  });

  describe('Mode A — scientific, drop trailing zeros', () => {
    it('formats 1.0 as 1E+0', () => {
      expect(formatValue(1.0, 'A', 6)).toBe('1E+0');
    });
    it('formats 0.0123456', () => {
      expect(formatValue(0.0123456, 'A', 6)).toBe('1.23456E-2');
    });
    it('drops trailing zeros', () => {
      expect(formatValue(1.2e3, 'A', 6)).toBe('1.2E+3');
    });
    it('handles negative numbers', () => {
      expect(formatValue(-0.0123456, 'A', 6)).toBe('-1.23456E-2');
    });
  });

  describe('Mode B — fixed decimal', () => {
    it('formats 1.0 with 6 sig figs', () => {
      expect(formatValue(1.0, 'B', 6)).toBe('1');
    });
    it('formats small number', () => {
      expect(formatValue(0.0123456, 'B', 6)).toBe('0.0123456');
    });
    it('formats large number to 6 sig figs', () => {
      expect(formatValue(27.211386245988, 'B', 6)).toBe('27.2114');
    });
  });

  describe('Mode C — scientific, keep trailing zeros', () => {
    it('formats 1.0 with trailing zeros', () => {
      expect(formatValue(1.0, 'C', 6)).toBe('1.00000E+0');
    });
    it('formats 0.0123456', () => {
      expect(formatValue(0.0123456, 'C', 6)).toBe('1.23456E-2');
    });
  });

  describe('sigFigs control', () => {
    it('3 sig figs in Mode A', () => {
      expect(formatValue(27.211386245988, 'A', 3)).toBe('2.72E+1');
    });
    it('3 sig figs in Mode C keeps trailing zeros', () => {
      expect(formatValue(1.0, 'C', 3)).toBe('1.00E+0');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd www && npx vitest run src/formatter.test.ts`
Expected: FAIL — `formatter.js` not found (module missing).

- [ ] **Step 3: Implement formatter.ts**

Create `www/src/formatter.ts`:

```typescript
export type FormatMode = 'A' | 'B' | 'C';

/**
 * Format a number for display.
 * Mode A: scientific notation, trailing zeros stripped.
 * Mode B: fixed decimal, sigFigs significant figures.
 * Mode C: scientific notation, trailing zeros kept.
 */
export function formatValue(value: number, mode: FormatMode, sigFigs: number): string {
  if (isNaN(value))      return 'NaN';
  if (!isFinite(value))  return value > 0 ? 'Infinity' : '-Infinity';
  if (value === 0)       return '0';

  switch (mode) {
    case 'A': return toScientific(value, sigFigs, false);
    case 'B': return toFixed(value, sigFigs);
    case 'C': return toScientific(value, sigFigs, true);
  }
}

function toScientific(value: number, sigFigs: number, keepTrailingZeros: boolean): string {
  const raw = value.toExponential(sigFigs - 1); // e.g. "1.23456e-2"
  const [mantissa, expPart] = raw.split('e');
  const exp = parseInt(expPart, 10);
  const expStr = exp >= 0 ? `+${exp}` : `${exp}`;
  const m = keepTrailingZeros
    ? mantissa
    : mantissa.replace(/\.?0+$/, '');
  return `${m}E${expStr}`;
}

function toFixed(value: number, sigFigs: number): string {
  // toPrecision returns fixed or scientific depending on magnitude
  const s = value.toPrecision(sigFigs);
  // If toPrecision chose scientific notation, convert to full decimal string
  if (s.includes('e') || s.includes('E')) {
    return parseFloat(s).toString();
  }
  // Strip trailing zeros after decimal point
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd www && npx vitest run src/formatter.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add www/src/formatter.ts www/src/formatter.test.ts
git commit -m "feat: implement number formatter with modes A/B/C"
```

---

### Task 5: TypeScript — parser.ts (TDD)

**Files:**
- Create: `www/src/parser.ts`
- Create: `www/src/parser.test.ts`

The parser uses recursive descent. For reciprocal units (nm, sec), each numeric token is individually converted to Hartree before arithmetic is applied — so `300-600` in nm computes `E(300nm) - E(600nm)` in Hartree.

Grammar:
```
expr    → term (('+' | '-') term)*
term    → unary (('*' | '/') unary)*
unary   → '-' unary | primary
primary → NUMBER | '(' expr ')'
```

- [ ] **Step 1: Write failing tests**

Create `www/src/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseLinear, parseReciprocal } from './parser.js';

describe('parseLinear', () => {
  it('parses a plain integer', () => {
    expect(parseLinear('42')).toBeCloseTo(42);
  });
  it('parses a decimal', () => {
    expect(parseLinear('3.14')).toBeCloseTo(3.14);
  });
  it('handles scientific notation (lowercase e)', () => {
    expect(parseLinear('1.5e-3')).toBeCloseTo(0.0015);
  });
  it('handles scientific notation (uppercase E)', () => {
    expect(parseLinear('3.2E+4')).toBeCloseTo(32000);
  });
  it('adds two numbers', () => {
    expect(parseLinear('3200+1200')).toBeCloseTo(4400);
  });
  it('subtracts two numbers', () => {
    expect(parseLinear('3200-1200')).toBeCloseTo(2000);
  });
  it('multiplies', () => {
    expect(parseLinear('3*4')).toBeCloseTo(12);
  });
  it('divides', () => {
    expect(parseLinear('10/4')).toBeCloseTo(2.5);
  });
  it('respects operator precedence (* before +)', () => {
    expect(parseLinear('2+3*4')).toBeCloseTo(14);
  });
  it('handles parentheses', () => {
    expect(parseLinear('(2+3)*4')).toBeCloseTo(20);
  });
  it('handles unary minus', () => {
    expect(parseLinear('-5')).toBeCloseTo(-5);
  });
  it('handles complex expression', () => {
    expect(parseLinear('(1+2)*(3-1)/3')).toBeCloseTo(2);
  });
  it('returns NaN for empty input', () => {
    expect(parseLinear('')).toBeNaN();
  });
  it('returns NaN for invalid input', () => {
    expect(parseLinear('abc')).toBeNaN();
  });
});

describe('parseReciprocal', () => {
  // 45.56335 nm·Eh, so toHartree(nm) = 45.56335 / nm
  const NM_HARTREE = 45.56335;
  const nmToHartree = (nm: number) => NM_HARTREE / nm;

  it('converts a single value to Hartree', () => {
    expect(parseReciprocal('300', nmToHartree)).toBeCloseTo(NM_HARTREE / 300, 8);
  });
  it('computes E(300nm) - E(600nm)', () => {
    const expected = NM_HARTREE / 300 - NM_HARTREE / 600;
    expect(parseReciprocal('300-600', nmToHartree)).toBeCloseTo(expected, 8);
  });
  it('applies arithmetic to Hartree-converted tokens', () => {
    // (E(300) + E(600)) / 2
    const expected = (NM_HARTREE / 300 + NM_HARTREE / 600) / 2;
    expect(parseReciprocal('(300+600)/2', nmToHartree)).toBeCloseTo(expected, 8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd www && npx vitest run src/parser.test.ts`
Expected: FAIL — `parser.js` not found.

- [ ] **Step 3: Implement parser.ts**

Create `www/src/parser.ts`:

```typescript
// Recursive-descent arithmetic parser.
// parseLinear: evaluates the expression numerically.
// parseReciprocal: converts each numeric token via toHartree() before evaluation.

type Token =
  | { t: 'num'; v: number }
  | { t: 'op';  v: '+' | '-' | '*' | '/' }
  | { t: 'lparen' }
  | { t: 'rparen' };

function tokenize(input: string, toHartree?: (n: number) => number): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch))  { i++; continue; }
    if (ch === '(')     { tokens.push({ t: 'lparen' }); i++; continue; }
    if (ch === ')')     { tokens.push({ t: 'rparen' }); i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ t: 'op', v: ch as '+' | '-' | '*' | '/' });
      i++;
      continue;
    }
    // Number token (supports scientific notation: 1.5e-3, 3.2E+4)
    const numMatch = input.slice(i).match(/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/);
    if (numMatch) {
      let v = parseFloat(numMatch[0]);
      if (toHartree !== undefined) v = toHartree(v);
      tokens.push({ t: 'num', v });
      i += numMatch[0].length;
      continue;
    }
    return []; // unrecognised character → signal invalid input
  }
  return tokens;
}

function evaluate(tokens: Token[]): number {
  let pos = 0;

  function peek(): Token | undefined { return tokens[pos]; }
  function consume(): Token          { return tokens[pos++]; }

  function parseExpr(): number {
    let left = parseTerm();
    for (;;) {
      const tok = peek();
      if (tok?.t === 'op' && (tok.v === '+' || tok.v === '-')) {
        consume();
        const right = parseTerm();
        left = tok.v === '+' ? left + right : left - right;
      } else break;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseUnary();
    for (;;) {
      const tok = peek();
      if (tok?.t === 'op' && (tok.v === '*' || tok.v === '/')) {
        consume();
        const right = parseUnary();
        left = tok.v === '*' ? left * right : left / right;
      } else break;
    }
    return left;
  }

  function parseUnary(): number {
    const tok = peek();
    if (tok?.t === 'op' && tok.v === '-') { consume(); return -parseUnary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) return NaN;
    if (tok.t === 'num')    { consume(); return tok.v; }
    if (tok.t === 'lparen') {
      consume();
      const v = parseExpr();
      if (peek()?.t === 'rparen') consume();
      return v;
    }
    return NaN;
  }

  if (tokens.length === 0) return NaN;
  const result = parseExpr();
  return pos === tokens.length ? result : NaN;
}

/** Parse a linear-unit arithmetic expression. Returns NaN on error. */
export function parseLinear(input: string): number {
  if (!input.trim()) return NaN;
  return evaluate(tokenize(input));
}

/**
 * Parse a reciprocal-unit expression.
 * Each numeric literal is converted to Hartree via toHartree() before
 * arithmetic is applied.
 */
export function parseReciprocal(input: string, toHartree: (n: number) => number): number {
  if (!input.trim()) return NaN;
  return evaluate(tokenize(input, toHartree));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd www && npx vitest run src/parser.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add www/src/parser.ts www/src/parser.test.ts
git commit -m "feat: implement arithmetic expression parser"
```

---

### Task 6: TypeScript — UI + Entry Point

**Files:**
- Create: `www/src/style.css`
- Create: `www/src/ui.ts`
- Modify: `www/src/main.ts`

**Prerequisite:** Run `wasm-pack build --target web` from the project root before starting this task. This generates `pkg/` which `main.ts` imports from.

- [ ] **Step 1: Build the WASM package**

Run: `wasm-pack build --target web` (from project root)
Expected: `pkg/` directory appears containing `energy_unit_converter.js`, `energy_unit_converter_bg.wasm`, `energy_unit_converter.d.ts`.

- [ ] **Step 2: Create www/src/style.css**

```css
:root {
  --bg: #ffffff;
  --surface: #f5f5f5;
  --border: #dddddd;
  --text: #111111;
  --accent: #0066cc;
  --flash: #22cc66;
  font-family: system-ui, sans-serif;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}

#app {
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1rem;
}

#controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

#controls label {
  font-size: 0.9rem;
}

.unit-row {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.unit-label {
  font-size: 0.85rem;
  color: #555;
  text-align: right;
}

.unit-symbol {
  font-size: 0.75rem;
  color: #888;
}

.unit-input {
  width: 100%;
  font-family: monospace;
  font-size: 0.95rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  box-sizing: border-box;
}

.unit-input:focus {
  outline: 2px solid var(--accent);
  background: #fff;
}

.copy-btn {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  cursor: pointer;
  white-space: nowrap;
}

.copy-btn.flashed {
  background: var(--flash);
  color: #fff;
  border-color: var(--flash);
}

#csv-btn {
  font-size: 0.85rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
}

#csv-btn:hover {
  background: var(--accent);
  color: #fff;
}

select,
input[type="number"] {
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  font-size: 0.9rem;
}
```

- [ ] **Step 3: Create www/src/ui.ts**

```typescript
import { UNITS } from './units.js';
import { formatValue, FormatMode } from './formatter.js';
import { parseLinear, parseReciprocal } from './parser.js';

type ConvertAll     = (hartree: number) => Record<string, number>;
type UnitToHartree  = (value: number, unit: string) => number;

interface State {
  mode: FormatMode;
  sigFigs: number;
  values: Record<string, number>;
  activeKey: string | null;
}

const state: State = { mode: 'A', sigFigs: 6, values: {}, activeKey: null };

let convertAll: ConvertAll;
let unitToHartree: UnitToHartree;

const inputs: Record<string, HTMLInputElement> = {};

// ── Build DOM ─────────────────────────────────────────────────────────────

function buildUI(): void {
  const controls = document.getElementById('controls')!;
  const grid     = document.getElementById('units-grid')!;

  controls.innerHTML = `
    <label>Format:
      <select id="mode-select">
        <option value="A">A — scientific</option>
        <option value="B">B — fixed</option>
        <option value="C">C — sci + zeros</option>
      </select>
    </label>
    <label>Sig figs:
      <input type="number" id="sigfig-input" min="1" max="15" value="6" style="width:4rem" />
    </label>
    <button id="csv-btn">Export CSV</button>
  `;

  for (const unit of UNITS) {
    const row     = document.createElement('div');
    row.className = 'unit-row';

    const label     = document.createElement('div');
    label.className = 'unit-label';
    label.innerHTML = `${unit.label} <span class="unit-symbol">(${unit.symbol})</span>`;

    const input        = document.createElement('input');
    input.type         = 'text';
    input.className    = 'unit-input';
    input.dataset.key  = unit.key;
    input.setAttribute('aria-label', unit.label);
    inputs[unit.key]   = input;

    const copyBtn       = document.createElement('button');
    copyBtn.className   = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => onCopy(unit.key, copyBtn));

    row.append(label, input, copyBtn);
    grid.append(row);
  }

  // Events
  for (const unit of UNITS) {
    inputs[unit.key].addEventListener('input', () => onInput(unit.key));
  }

  document.getElementById('mode-select')!.addEventListener('change', (e) => {
    state.mode = (e.target as HTMLSelectElement).value as FormatMode;
    refreshDisplay();
  });

  document.getElementById('sigfig-input')!.addEventListener('input', (e) => {
    const n = parseInt((e.target as HTMLInputElement).value, 10);
    if (n >= 1 && n <= 15) { state.sigFigs = n; refreshDisplay(); }
  });

  document.getElementById('csv-btn')!.addEventListener('click', onCsvExport);
}

// ── Input handling ────────────────────────────────────────────────────────

function onInput(key: string): void {
  state.activeKey = key;
  const raw = inputs[key].value.trim();
  if (!raw) { clearAll(); return; }

  const unit = UNITS.find(u => u.key === key)!;
  let hartree: number;

  if (unit.reciprocal) {
    hartree = parseReciprocal(raw, (v) => unitToHartree(v, key));
  } else {
    const parsed = parseLinear(raw);
    hartree = isNaN(parsed) ? NaN : unitToHartree(parsed, key);
  }

  if (isNaN(hartree)) { clearOthers(key); return; }

  state.values = convertAll(hartree);
  refreshDisplay();
}

function refreshDisplay(): void {
  for (const unit of UNITS) {
    if (unit.key === state.activeKey) continue;
    const v = state.values[unit.key];
    if (v === undefined) continue;
    inputs[unit.key].value = formatValue(v, state.mode, state.sigFigs);
  }
}

function clearAll(): void {
  state.values = {};
  for (const unit of UNITS) inputs[unit.key].value = '';
}

function clearOthers(activeKey: string): void {
  for (const unit of UNITS) {
    if (unit.key !== activeKey) inputs[unit.key].value = '';
  }
}

// ── Actions ───────────────────────────────────────────────────────────────

function onCopy(key: string, btn: HTMLButtonElement): void {
  const text = inputs[key].value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('flashed');
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.classList.remove('flashed');
      btn.textContent = 'Copy';
    }, 1200);
  });
}

function onCsvExport(): void {
  if (Object.keys(state.values).length === 0) return;
  const lines = UNITS.map(u => {
    const v = state.values[u.key];
    const formatted = v !== undefined ? formatValue(v, state.mode, state.sigFigs) : '';
    return `${u.label},${formatted}`;
  });
  const csv  = 'Unit,Value\n' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'energy-conversion.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Init ──────────────────────────────────────────────────────────────────

export function initUI(
  wasmConvertAll:    ConvertAll,
  wasmUnitToHartree: UnitToHartree,
): void {
  convertAll    = wasmConvertAll;
  unitToHartree = wasmUnitToHartree;
  buildUI();
}
```

- [ ] **Step 4: Replace www/src/main.ts**

```typescript
import init, { convert_all, unit_to_hartree } from '../../pkg/energy_unit_converter.js';
import { initUI } from './ui.js';

async function main(): Promise<void> {
  await init();
  initUI(
    (hartree) => convert_all(hartree) as Record<string, number>,
    (value, unit) => unit_to_hartree(value, unit),
  );
}

main().catch(console.error);
```

- [ ] **Step 5: Manual verification in browser**

Run: `cd www && npm run dev`

Open `http://localhost:5173` and verify:
- All 13 unit rows appear with labels and copy buttons
- Typing `1` in Hartree updates all other fields
- Typing `27.211386245988` in eV shows `1` in Hartree
- Typing `3200-1200` in Wavenumber (cm⁻¹) shows `2000` in Wavenumber
- Typing `300-600` in Wavelength (nm) shows the energy difference across all units
- Copy button flashes green and copies the value
- Format toggle (A/B/C) changes display immediately
- Sig figs spinner updates precision
- Export CSV downloads a valid two-column CSV

- [ ] **Step 6: Commit**

```bash
cd ..
git add www/src/style.css www/src/ui.ts www/src/main.ts www/index.html
git commit -m "feat: implement UI with WASM integration"
```

---

### Task 7: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `.gitignore`

- [ ] **Step 1: Enable GitHub Pages in repository settings**

Go to the repository on GitHub → **Settings → Pages → Source: GitHub Actions**. Save.

- [ ] **Step 2: Create .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown

      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

      - name: Build WASM
        run: wasm-pack build --target web

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: www/package-lock.json

      - name: Install npm dependencies
        run: cd www && npm ci

      - name: Run TypeScript tests
        run: cd www && npm test

      - name: Build frontend
        run: cd www && npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: www/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Update .gitignore**

Confirm these entries exist in `.gitignore` (add any that are missing):

```
/target/
/pkg/
/www/node_modules/
/www/dist/
```

- [ ] **Step 4: Run all tests locally**

```bash
cargo test
cd www && npm test
```

Expected: All Rust tests pass, all TypeScript tests pass.

- [ ] **Step 5: Commit and push**

```bash
cd ..
git add .github/workflows/deploy.yml .gitignore
git commit -m "feat: add GitHub Actions deployment to GitHub Pages"
git push origin main
```

- [ ] **Step 6: Verify CI on GitHub**

Go to the repository → **Actions** tab → confirm the latest workflow run shows both `build` and `deploy` jobs as green. Visit the deployed URL from Pages settings to verify the live site works.
