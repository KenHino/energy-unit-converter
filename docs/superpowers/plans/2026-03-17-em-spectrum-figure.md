# EM Spectrum Figure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live EM spectrum reference figure at the bottom of the energy unit converter that shows a rainbow gradient bar and moves a pointer to indicate where the current input value falls on the spectrum.

**Architecture:** A new `spectrum.ts` module owns all spectrum DOM and logic. `ui.ts` calls `initSpectrum()` once on startup and `updateSpectrum(nm)` after every conversion. The gradient bar spans 1 nm → 1 mm on a log scale, with the visible region (400–700 nm) rendered as a full rainbow and occupying ~15% of the bar width.

**Tech Stack:** TypeScript, Vite, vanilla DOM, CSS custom properties (no new dependencies)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `www/src/spectrum.ts` | Build spectrum DOM, compute log-scale pointer position, update pointer |
| Modify | `www/src/ui.ts` | Import and call `initSpectrum` / `updateSpectrum` |
| Modify | `www/src/style.css` | Styles for `#em-spectrum` container, bar, pointer, labels |

---

### Task 1: Add spectrum styles to `style.css`

**Files:**
- Modify: `www/src/style.css`

- [ ] **Step 1: Append spectrum CSS**

Open `www/src/style.css` and append:

```css
/* ── EM Spectrum Figure ───────────────────────────────────────────────── */

#em-spectrum {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.spectrum-regions {
  display: flex;
  font-size: 0.6rem;
  color: #777;
  margin-bottom: 3px;
  user-select: none;
}

.spectrum-regions span {
  text-align: center;
}

.spectrum-bar-wrap {
  position: relative;
  height: 20px;
  border-radius: 4px;
  /* log range 1 nm → 1e6 nm (1 mm), 6 decades
     X-ray  1–10 nm    →  0–16.7%
     UV     10–400 nm  → 16.7–42%
     VIS    400–700 nm → 42–57%  (rainbow)
     IR     700–1e5 nm → 57–83%
     µwave  1e5–1e6 nm → 83–100% */
  background: linear-gradient(to right,
    #111111  0%,
    #440088 16%,
    #6600aa 42%,
    #7700cc 42%, #4400ff 44%, #0000ff 46%,
    #00aaff 49%, #00ff88 51%, #aaff00 53%,
    #ffff00 54.5%, #ffaa00 55.5%, #ff4400 56.5%,
    #ff0000 57%,
    #cc2200 57%,
    #882200 70%,
    #441100 83%,
    #221100 100%
  );
  margin-bottom: 5px;
}

.spectrum-pointer {
  display: none;
  position: absolute;
  top: -6px;
  width: 2px;
  height: 32px;
  background: #111;
  transform: translateX(-50%);
  pointer-events: none;
}

.spectrum-pointer-label {
  position: absolute;
  top: -24px;
  transform: translateX(-50%);
  background: #111;
  color: #fff;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.spectrum-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.58rem;
  color: #aaa;
}
```

- [ ] **Step 2: Verify dev server renders without errors**

Run: `make dev` (or `cd www && npx vite`)
Expected: no console errors, page looks unchanged (spectrum not visible yet — no DOM created)

- [ ] **Step 3: Commit**

```bash
git add www/src/style.css
git commit -m "style: add EM spectrum figure styles"
```

---

### Task 2: Create `spectrum.ts`

**Files:**
- Create: `www/src/spectrum.ts`

Context: The app converts all units through Hartree. After each conversion `state.values['nm']` holds the wavelength in nanometres as a plain number (no scale factor — check `units.ts`: `nm` has `reciprocal: true`, no `scale`). `updateSpectrum` receives this value.

- [ ] **Step 1: Create `www/src/spectrum.ts`**

```typescript
// Log-scale range: 1 nm (X-ray) to 1e6 nm (1 mm, microwave)
const LOG_MIN = Math.log10(1);       // 0
const LOG_MAX = Math.log10(1e6);     // 6

const REGIONS: { label: string; maxNm: number; flex: number }[] = [
  { label: 'X-ray',     maxNm: 10,   flex: 1   },
  { label: 'UV',        maxNm: 400,  flex: 1.5 },
  { label: 'Visible',   maxNm: 700,  flex: 2   },
  { label: 'IR',        maxNm: 1e5,  flex: 3   },
  { label: 'Microwave', maxNm: 1e6,  flex: 2.5 },
];

const TICKS = ['1 nm', '10 nm', '100 nm', '400 nm', '700 nm', '10 µm', '1 mm'];

let pointerEl: HTMLDivElement;
let labelEl: HTMLSpanElement;

function regionName(nm: number): string {
  for (const r of REGIONS) {
    if (nm <= r.maxNm) return r.label;
  }
  return 'Microwave';
}

function formatNm(nm: number): string {
  if (nm >= 1e6) return `${(nm / 1e6).toPrecision(3)} mm`;
  if (nm >= 1e3) return `${(nm / 1e3).toPrecision(3)} µm`;
  return `${nm.toPrecision(3)} nm`;
}

export function initSpectrum(): void {
  const app = document.getElementById('app')!;

  const container = document.createElement('div');
  container.id = 'em-spectrum';

  // Region labels
  const regions = document.createElement('div');
  regions.className = 'spectrum-regions';
  for (const r of REGIONS) {
    const span = document.createElement('span');
    span.textContent = r.label;
    span.style.flex = String(r.flex);
    regions.append(span);
  }

  // Gradient bar
  const barWrap = document.createElement('div');
  barWrap.className = 'spectrum-bar-wrap';

  pointerEl = document.createElement('div');
  pointerEl.className = 'spectrum-pointer';

  labelEl = document.createElement('span');
  labelEl.className = 'spectrum-pointer-label';

  pointerEl.append(labelEl);
  barWrap.append(pointerEl);

  // Tick labels
  const ticks = document.createElement('div');
  ticks.className = 'spectrum-ticks';
  for (const t of TICKS) {
    const span = document.createElement('span');
    span.textContent = t;
    ticks.append(span);
  }

  container.append(regions, barWrap, ticks);
  app.append(container);
}

export function updateSpectrum(nm: number | undefined): void {
  if (nm === undefined || isNaN(nm) || nm <= 0) {
    pointerEl.style.display = 'none';
    return;
  }

  const pct = Math.min(100, Math.max(0,
    ((Math.log10(nm) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100
  ));

  pointerEl.style.display = 'block';
  pointerEl.style.left = `${pct}%`;
  labelEl.textContent = `${regionName(nm)} · ${formatNm(nm)}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add www/src/spectrum.ts
git commit -m "feat: add spectrum.ts with initSpectrum and updateSpectrum"
```

---

### Task 3: Wire `spectrum.ts` into `ui.ts`

**Files:**
- Modify: `www/src/ui.ts`

- [ ] **Step 1: Add import at top of `ui.ts`**

After the existing imports (line 3), add:

```typescript
import { initSpectrum, updateSpectrum } from './spectrum.js';
```

- [ ] **Step 2: Call `initSpectrum()` at end of `buildUI()`**

At the end of `buildUI()` (after the `document.getElementById('csv-btn')` event listener, before the closing `}`), add:

```typescript
  initSpectrum();
```

- [ ] **Step 3: Call `updateSpectrum` in `refreshDisplay()`**

At the end of `refreshDisplay()` (after the `for` loop), add:

```typescript
  updateSpectrum(state.values['nm']);
```

- [ ] **Step 4: Call `updateSpectrum` in `clearAll()` and `clearOthers()`**

At the end of `clearAll()` (after the `for` loop), add:

```typescript
  updateSpectrum(undefined);
```

At the end of `clearOthers()` (after the `for` loop), add:

```typescript
  updateSpectrum(undefined);
```

This ensures the pointer hides both when the field is emptied and when an invalid value is typed.

- [ ] **Step 5: Run dev server and verify manually**

Run: `make dev`

Test the following:
1. Type `3` in the **Electron volt** field → pointer should appear in the **Visible** region (~414 nm)
2. Type `1000` in the **Kayser (cm⁻¹)** field → pointer should appear in the **IR** region (~10 µm)
3. Type `400` in the **Frequency (MHz)** field → pointer should appear in the **Microwave** region
4. Clear the field → pointer should disappear

- [ ] **Step 6: Commit**

```bash
git add www/src/ui.ts
git commit -m "feat: wire EM spectrum figure into UI"
```

---

### Task 4: Build and verify

- [ ] **Step 1: Run full build**

```bash
make build
```

Expected: exits 0, `www/dist/` updated with no TypeScript errors.

- [ ] **Step 2: Run tests**

```bash
make test
```

Expected: all tests pass (spectrum module has no unit tests — it is pure DOM).

- [ ] **Step 3: Commit if any build artefacts need updating**

If `www/dist/` is tracked in git and changed:

```bash
git add www/dist/
git commit -m "chore: rebuild with EM spectrum figure"
```
