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
