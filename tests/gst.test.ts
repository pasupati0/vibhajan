import { describe, it, expect } from 'vitest';
import { computeGstInclusive, computeGstExclusive } from '../src/lib/gst';

describe('GST Calculation', () => {
  it('calculates exclusive GST', () => {
    const res = computeGstExclusive(100000, 18); // 1000 INR
    expect(res.base).toBe(100000);
    expect(res.gst).toBe(18000);
    expect(res.total).toBe(118000);
  });

  it('calculates inclusive GST', () => {
    const res = computeGstInclusive(118000, 18); // 1180 INR
    expect(res.base).toBe(100000);
    expect(res.gst).toBe(18000);
    expect(res.total).toBe(118000);
  });
});