import { describe, it, expect } from 'vitest';
import { allocateEqual, allocateByPercent, allocateByWeights, validateCustom } from '../src/lib/allocation';

describe('allocation', () => {
  it('equal split reconciles exactly', () => {
    for (const total of [100, 1000, 118000, 99, 1]) {
      for (const n of [1, 2, 3, 4, 7]) {
        const r = allocateEqual(total, n);
        expect(r.reduce((a,b)=>a+b,0)).toBe(total);
        expect(r.every(x => x >= 0)).toBe(true);
      }
    }
  });

  it('40/35/25 of ₹1180 = ₹472 / ₹413 / ₹295', () => {
    const r = allocateByPercent(118000, [40, 35, 25]);
    expect(r).toEqual([47200, 41300, 29500]);
  });

  it('deterministic remainder distribution', () => {
    const a = allocateByPercent(100, [33.33, 33.33, 33.34]);
    const b = allocateByPercent(100, [33.33, 33.33, 33.34]);
    expect(a).toEqual(b);
    expect(a.reduce((x,y)=>x+y,0)).toBe(100);
  });

  it('validateCustom', () => {
    expect(validateCustom(1000, [400, 350, 250])).toEqual({ ok: true, diff: 0 });
    expect(validateCustom(1000, [400, 350, 200]).ok).toBe(false);
  });

  it('zero weights throws', () => {
    expect(() => allocateByWeights(100, [0, 0])).toThrow();
  });
});