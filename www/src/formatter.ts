export type FormatMode = 'A' | 'B' | 'C';

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
  const raw = value.toExponential(sigFigs - 1);
  const [mantissa, expPart] = raw.split('e');
  const exp = parseInt(expPart, 10);
  const expStr = exp >= 0 ? `+${exp}` : `${exp}`;
  const m = keepTrailingZeros
    ? mantissa
    : mantissa.replace(/\.?0+$/, '');
  return `${m}E${expStr}`;
}

function toFixed(value: number, sigFigs: number): string {
  const s = value.toPrecision(sigFigs);
  if (s.includes('e') || s.includes('E')) {
    return parseFloat(s).toString();
  }
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
