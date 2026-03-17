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

  const pct = Math.min(100, Math.max(0,
    ((Math.log10(nm) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100
  ));

  pointerEl.style.display = 'block';
  pointerEl.style.left = `${pct}%`;
  labelEl.textContent = `${regionName(nm)} · ${formatNm(nm)}`;
}
