import { Paise } from './money';

/**
 * Deterministic largest-remainder allocation.
 * Guarantees: sum(result) === total, result[i] >= 0, all integers.
 */
export function allocateByWeights(total: Paise, weights: number[]): Paise[] {
  if (!Number.isInteger(total) || total < 0) throw new Error('total must be non-negative integer');
  const n = weights.length;
  if (n === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) throw new Error('Sum of weights must be > 0');
  const exact = weights.map(w => (total * w) / sumW);
  const floors = exact.map(x => Math.floor(x));
  const floorSum = floors.reduce((a, b) => a + b, 0);
  let remainder = total - floorSum;
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = floors.slice();
  for (let k = 0; k < remainder; k++) out[order[k].i] += 1;
  return out;
}

export function allocateEqual(total: Paise, n: number): Paise[] {
  return allocateByWeights(total, new Array(n).fill(1));
}

/** percentages must sum to 100 (within 0.001 tolerance). */
export function allocateByPercent(total: Paise, percents: number[]): Paise[] {
  const sum = percents.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.001) throw new Error('Percentages must sum to 100');
  return allocateByWeights(total, percents);
}

export function validateCustom(total: Paise, amounts: Paise[]): { ok: boolean; diff: Paise } {
  const s = amounts.reduce((a, b) => a + b, 0);
  return { ok: s === total, diff: total - s };
}