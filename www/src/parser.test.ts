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
