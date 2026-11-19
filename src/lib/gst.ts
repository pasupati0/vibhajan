import { Paise } from './money';

export type GstMode = 'inclusive' | 'exclusive';

export interface GstBreakdown {
  /** total bill amount in paise (always GST-inclusive) */
  total: Paise;
  /** taxable base in paise */
  base: Paise;
  /** GST amount in paise */
  gst: Paise;
  rate: number;
}

/** Total (input) is GST-inclusive. Derive base and GST. */
export function computeGstInclusive(total: Paise, ratePercent: number): GstBreakdown {
  if (total < 0) throw new Error('Total must be ≥ 0');
  if (ratePercent < 0) throw new Error('GST rate must be ≥ 0');
  const base = Math.round(total / (1 + ratePercent / 100));
  return { total, base, gst: total - base, rate: ratePercent };
}

/** Base (input) is pre-GST. Derive total and GST. */
export function computeGstExclusive(base: Paise, ratePercent: number): GstBreakdown {
  if (base < 0) throw new Error('Base must be ≥ 0');
  if (ratePercent < 0) throw new Error('GST rate must be ≥ 0');
  const gst = Math.round((base * ratePercent) / 100);
  return { total: base + gst, base, gst, rate: ratePercent };
}