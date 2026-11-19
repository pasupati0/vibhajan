/**
 * Money is stored as integer paise (1 INR = 100 paise).
 * NEVER use floating point for arithmetic.
 */

export type Paise = number;

export function rupeesToPaise(input: string | number): Paise {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Invalid amount');
    return Math.round(input * 100);
  }
  const s = input.trim().replace(/,/g, '');
  if (!s) return 0;
  if (!/^-?\d*(\.\d{0,2})?$/.test(s)) throw new Error('Invalid amount format');
  const [intPart, fracPart = ''] = s.split('.');
  const sign = intPart.startsWith('-') ? -1 : 1;
  const intAbs = Math.abs(Number(intPart || '0'));
  const frac = (fracPart + '00').slice(0, 2);
  return sign * (intAbs * 100 + Number(frac));
}

export function paiseToRupeesString(p: Paise): string {
  const sign = p < 0 ? '-' : '';
  const abs = Math.abs(p);
  const r = Math.floor(abs / 100);
  const f = String(abs % 100).padStart(2, '0');
  return `${sign}${r}.${f}`;
}

export function addPaise(...xs: Paise[]): Paise {
  return xs.reduce((a, b) => a + b, 0);
}

export function assertNonNegative(p: Paise): void {
  if (!Number.isInteger(p) || p < 0) throw new Error('Amount must be a non-negative integer (paise)');
}