import { UNITS } from './units.js';
import { formatValue, FormatMode } from './formatter.js';
import { parseLinear, parseReciprocal } from './parser.js';
import { initSpectrum, updateSpectrum } from './spectrum.js';

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
  initSpectrum();
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
  updateSpectrum(state.values['nm']);
}

function clearAll(): void {
  state.values = {};
  for (const unit of UNITS) inputs[unit.key].value = '';
  updateSpectrum(undefined);
}

function clearOthers(activeKey: string): void {
  for (const unit of UNITS) {
    if (unit.key !== activeKey) inputs[unit.key].value = '';
  }
  updateSpectrum(undefined);
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
