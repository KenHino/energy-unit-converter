# EM Spectrum Figure — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Overview

Add a static EM spectrum reference figure at the bottom of the energy unit converter page. A vertical pointer moves to indicate where the current input value falls on the spectrum. The pointer is driven solely by the input value and updates live as the user types.

## Visual Design

- A full-width horizontal gradient bar representing the electromagnetic spectrum from γ-rays (~0.001 nm) to radio (~1 m), displayed on a **log scale**.
- The **Visible region (400–700 nm) must render as a full rainbow gradient** (violet → blue → cyan → green → yellow → orange → red) and occupy enough bar width to be clearly distinguishable — achieved by expanding the log-scale range so the visible band is not squeezed too narrow. In practice, spanning λ from ~1 nm to ~1 mm (rather than the full γ-to-radio range) gives the visible band adequate width; γ-ray and radio extremes can be trimmed.
- Approximate region labels above the bar: γ-ray, X-ray, UV, Visible, IR, Microwave, Radio.
- Approximate wavelength tick labels below the bar (e.g. 1 nm, 10 nm, 100 nm, 400 nm, 700 nm, 10 µm, 1 mm).
- A vertical line pointer with a small tooltip label showing the region name and wavelength (e.g. `"Visible · 400 nm"`).
- Pointer is hidden when no input value is present.

## Architecture

### New file: `www/src/spectrum.ts`

Exports two functions:

```ts
export function initSpectrum(): void
export function updateSpectrum(nm: number | undefined): void
```

- `initSpectrum()` — called once during `buildUI()`. Creates the `#em-spectrum` container DOM (region labels, gradient bar, pointer element, tick labels) and appends it inside `#app`.
- `updateSpectrum(nm)` — called after every conversion with the wavelength in nanometres. Computes the log-scale horizontal position and updates the pointer's CSS `left` value and label text. Hides the pointer when `nm` is `undefined` or `NaN`.

### Changes to `www/src/ui.ts`

- Import `initSpectrum` and `updateSpectrum` from `./spectrum.js`.
- Call `initSpectrum()` at the end of `buildUI()`.
- Call `updateSpectrum(state.values['nm'])` at the end of `refreshDisplay()`.
- Call `updateSpectrum(undefined)` inside `clearAll()`.

### Changes to `www/index.html`

No structural change needed — `initSpectrum()` appends directly to `#app`.

### Changes to `www/src/style.css`

Add styles for `#em-spectrum`, `.spectrum-bar`, `.spectrum-pointer`, `.spectrum-pointer-label`, `.spectrum-regions`, `.spectrum-ticks`.

## Log-Scale Position Formula

```
position% = (log10(λ_nm) − log10(λ_min)) / (log10(λ_max) − log10(λ_min)) × 100
```

Where `λ_min = 1` nm (X-ray/UV boundary) and `λ_max = 1e6` nm (1 mm, microwave end). This range gives the visible band (~400–700 nm) a comfortable ~15% of the bar width. Values outside this range are clamped to the bar edges.

Pointer `left` CSS value is clamped to `[0%, 100%]`.

## Region Boundaries (approximate, for label only)

| Region     | λ range (nm)       |
|------------|--------------------|
| γ-ray      | < 0.01             |
| X-ray      | 0.01 – 10          |
| UV         | 10 – 400           |
| Visible    | 400 – 700          |
| IR         | 700 – 1e6          |
| Microwave  | 1e6 – 1e9          |
| Radio      | > 1e9              |

## Data Flow

```
user types → onInput() → convertAll() → state.values['nm'] populated
                                       → refreshDisplay() → updateSpectrum(nm)
```

The `nm` value is always available after a successful conversion because every unit converts through Hartree and back.

## Out-of-Range Behaviour

- If `nm < λ_min`: pointer clamped to left edge (still visible).
- If `nm > λ_max`: pointer clamped to right edge.
- If `nm` is `undefined` / `NaN`: pointer hidden via `display: none`.

## Testing

- No automated tests needed for the DOM rendering.
- Verify manually: enter a value in eV (~3 eV → pointer in Visible), enter a microwave frequency → pointer in Microwave, clear input → pointer disappears.
