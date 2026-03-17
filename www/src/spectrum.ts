// Log-scale range: 1 nm (X-ray) to 1e6 nm (1 mm, microwave)
const LOG_MIN = Math.log10(1);       // 0
const LOG_MAX = Math.log10(1e6);     // 6

const REGIONS: { label: string; maxNm: number; flex: number }[] = [
  { label: 'X-ray',     maxNm: 10,   flex: 1   },
  { label: 'UV',        maxNm: 400,  flex: 2   },
  { label: 'Visible',   maxNm: 700,  flex: 1   },
  { label: 'IR',        maxNm: 1e5,  flex: 1.5 },
  { label: 'Microwave', maxNm: 1e6,  flex: 0.5 },
];

const TICKS = ['1 nm', '10 nm', '100 nm', '400 nm', '700 nm', '10 µm', '1 mm'];

// Piecewise log-interpolation anchors matching the evenly-spaced tick positions
const TICK_NM  = [1,     10,      100,     400,     700,      1e4,     1e6];
const TICK_PCT = [0, 16.667,  33.333,  50.000,  66.667,  83.333,  100.000];

function nmToPct(nm: number): number {
  if (nm <= TICK_NM[0]) return 0;
  if (nm >= TICK_NM[TICK_NM.length - 1]) return 100;
  for (let i = 0; i < TICK_NM.length - 1; i++) {
    if (nm <= TICK_NM[i + 1]) {
      const t = (Math.log10(nm) - Math.log10(TICK_NM[i])) /
                (Math.log10(TICK_NM[i + 1]) - Math.log10(TICK_NM[i]));
      return TICK_PCT[i] + t * (TICK_PCT[i + 1] - TICK_PCT[i]);
    }
  }
  return 100;
}

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
  if (document.getElementById('em-spectrum')) return;
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
  if (!pointerEl) return;
  if (nm === undefined || isNaN(nm) || nm <= 0) {
    pointerEl.style.display = 'none';
    return;
  }

  const pct = Math.min(100, Math.max(0, nmToPct(nm)));

  pointerEl.style.display = 'block';
  pointerEl.style.left = `${pct}%`;
  labelEl.textContent = `${regionName(nm)} · ${formatNm(nm)}`;
}
