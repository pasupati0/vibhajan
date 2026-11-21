import { describe, it, expect } from 'vitest';

// Extracted formula for testing
const calculateEmi = (P: number, annualRate: number, years: number) => {
  const R = annualRate / 12 / 100;
  const N = years * 12;
  if (P <= 0 || R <= 0 || N <= 0) return null;
  return (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
};

describe('EMI Calculation', () => {
  it('calculates correct EMI for standard loan', () => {
    // 50L, 8.5%, 20 years => approx ₹43,391
    const emi = calculateEmi(5000000, 8.5, 20);
    expect(emi).not.toBeNull();
    expect(Math.round(emi!)).toBe(43391); 
  });
  
  it('returns null for zero values', () => {
    expect(calculateEmi(0, 8.5, 20)).toBeNull();
    expect(calculateEmi(5000000, 0, 20)).toBeNull();
  });
});