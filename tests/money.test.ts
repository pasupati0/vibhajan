import { describe, it, expect } from 'vitest';
import { rupeesToPaise, paiseToRupeesString } from '../src/lib/money';

describe('money', () => {
  it('parses rupees to paise', () => {
    expect(rupeesToPaise('1180')).toBe(118000);
    expect(rupeesToPaise('1180.50')).toBe(118050);
    expect(rupeesToPaise('0.01')).toBe(1);
    expect(rupeesToPaise('1,180.00')).toBe(118000);
  });
  it('round-trips', () => {
    for (const r of ['0.00', '0.01', '1180.00', '999999.99']) {
      expect(paiseToRupeesString(rupeesToPaise(r))).toBe(r);
    }
  });
  it('rejects invalid', () => {
    expect(() => rupeesToPaise('abc')).toThrow();
    expect(() => rupeesToPaise('1.234')).toThrow();
  });
});