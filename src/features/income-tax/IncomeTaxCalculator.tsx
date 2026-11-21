// src/features/income-tax/IncomeTaxCalculator.tsx
import { useState, useMemo } from 'react';
import { Card, Field } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { useI18n } from '../../i18n/I18nProvider';

interface Slab { min: number; max: number | null; rate: number; }

const NEW_REGIME_SLABS: Slab[] = [
  { min: 0,       max: 400000,  rate: 0 },
  { min: 400000,  max: 800000,  rate: 0.05 },
  { min: 800000,  max: 1200000, rate: 0.10 },
  { min: 1200000, max: 1600000, rate: 0.15 },
  { min: 1600000, max: 2000000, rate: 0.20 },
  { min: 2000000, max: 2400000, rate: 0.25 },
  { min: 2400000, max: null,    rate: 0.30 },
];

const OLD_REGIME_SLABS: Slab[] = [
  { min: 0,       max: 250000,  rate: 0 },
  { min: 250000,  max: 500000,  rate: 0.05 },
  { min: 500000,  max: 1000000, rate: 0.20 },
  { min: 1000000, max: null,    rate: 0.30 },
];

const SURCHARGE_SLABS = [
  { min: 5000000,  max: 10000000, rate: 0.10 },
  { min: 10000000, max: 20000000, rate: 0.15 },
  { min: 20000000, max: 50000000, rate: 0.25 },
  { min: 50000000, max: null,     rate: 0.37 }, // 25% under new regime
];

function calcSlabTax(income: number, slabs: Slab[]): number {
  let tax = 0;
  for (const s of slabs) {
    if (income <= s.min) break;
    const taxable = Math.min(income, s.max ?? income) - s.min;
    tax += taxable * s.rate;
  }
  return tax;
}

function calcSurcharge(tax: number, income: number, isNew: boolean): number {
  for (const s of SURCHARGE_SLABS) {
    if (income > s.min) {
      let rate = s.rate;
      if (isNew && rate > 0.25) rate = 0.25; // cap at 25% for new regime
      return tax * rate;
    }
  }
  return 0;
}

function calcMarginalRelief(income: number, taxBeforeRelief: number, isNew: boolean): number {
  // Marginal relief prevents tax from exceeding income above threshold
  const thresholds = isNew ? [500000, 1000000, 2000000] : [500000, 1000000, 2000000];
  for (const t of thresholds) {
    if (income > t) {
      const excess = income - t;
      // Tax + surcharge should not exceed tax at threshold + excess
      const taxAtThreshold = calcSlabTax(t, isNew ? NEW_REGIME_SLABS : OLD_REGIME_SLABS);
      const surchargeAtThreshold = 0; // surcharge is nil at threshold
      const maxTax = taxAtThreshold + surchargeAtThreshold + excess;
      if (taxBeforeRelief > maxTax) return taxBeforeRelief - maxTax;
    }
  }
  return 0;
}

interface TaxResult {
  gross: number;
  standardDeduction: number;
  taxableIncome: number;
  slabTax: number;
  rebate87A: number;
  surcharge: number;
  marginalRelief: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
}

function computeTax(
  grossIncome: number,
  standardDeduction: number,
  isNew: boolean,
): TaxResult {
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  const slabs = isNew ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const slabTax = calcSlabTax(taxableIncome, slabs);

  // Section 87A rebate
  let rebate87A = 0;
  if (isNew) {
    if (taxableIncome <= 1200000) rebate87A = Math.min(slabTax, 60000);
  } else {
    if (taxableIncome <= 500000) rebate87A = Math.min(slabTax, 12500);
  }

  const taxAfterRebate = Math.max(0, slabTax - rebate87A);
  const surcharge = calcSurcharge(taxAfterRebate, taxableIncome, isNew);
  const taxBeforeRelief = taxAfterRebate + surcharge;
  const marginalRelief = calcMarginalRelief(taxableIncome, taxBeforeRelief, isNew);
  const taxAfterRelief = Math.max(0, taxBeforeRelief - marginalRelief);
  const cess = taxAfterRelief * 0.04;
  const totalTax = taxAfterRelief + cess;
  const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

  return {
    gross: grossIncome,
    standardDeduction,
    taxableIncome,
    slabTax,
    rebate87A,
    surcharge,
    marginalRelief,
    cess,
    totalTax: Math.round(totalTax),
    effectiveRate,
  };
}

export default function IncomeTaxCalculator() {
  const { t } = useI18n();

  const [grossStr, setGrossStr] = useState('1500000');
  const [isSalaried, setIsSalaried] = useState(true);
  const [deductionsStr, setDeductionsStr] = useState('0'); // 80C, 80D, HRA etc. (old regime only)

  const result = useMemo(() => {
    let gross = 0;
    let deductions = 0;
    try {
      gross = Math.round(parseFloat(grossStr) * 100);
      deductions = Math.round(parseFloat(deductionsStr) * 100);
    } catch { return null; }
    if (gross <= 0) return null;

    const stdNew = isSalaried ? 75000 : 0;
    const stdOld = isSalaried ? 50000 : 0;

    // New regime: no additional deductions
    const newResult = computeTax(gross / 100, stdNew, true);
    // Old regime: additional deductions
    const oldResult = computeTax(gross / 100, stdOld + deductions / 100, false);

    return { newResult, oldResult, isSalaried };
  }, [grossStr, deductionsStr, isSalaried]);

  return (
    <div className="fade-in">
      <h1>{t('tool.incomeTax')}</h1>
      <p className="muted">Compare Old vs New tax regime for FY 2025-26 (AY 2026-27).</p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label="Gross Annual Income (₹)">
            <input
              className="input"
              type="number"
              value={grossStr}
              onChange={e => setGrossStr(e.target.value)}
            />
          </Field>
          <Field label="Salaried / Pensioner?">
            <div className="tabbar">
              <button className={isSalaried ? 'active' : ''} onClick={() => setIsSalaried(true)}>Yes</button>
              <button className={!isSalaried ? 'active' : ''} onClick={() => setIsSalaried(false)}>No</button>
            </div>
          </Field>
          <Field label="Deductions under Old Regime (80C, 80D, HRA, etc.)">
            <input
              className="input"
              type="number"
              value={deductionsStr}
              onChange={e => setDeductionsStr(e.target.value)}
              disabled={!isSalaried}
            />
          </Field>
        </div>
      </Card>

      {result && (
        <div className="grid-2 mt-3" style={{ gap: 'var(--space-3)' }}>
          <Card>
            <h3 style={{ color: 'var(--brand-600)' }}>New Regime (Default)</h3>
            <TaxBreakdown result={result.newResult} />
          </Card>
          <Card>
            <h3 style={{ color: 'var(--text-muted)' }}>Old Regime</h3>
            <TaxBreakdown result={result.oldResult} />
          </Card>
        </div>
      )}

      {result && (
        <Card className="mt-3">
          <h3>Recommendation</h3>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {result.newResult.totalTax < result.oldResult.totalTax ? (
              <span style={{ color: 'var(--success)' }}>
                ✅ New Regime saves you {formatINR(result.oldResult.totalTax - result.newResult.totalTax)} more
              </span>
            ) : result.oldResult.totalTax < result.newResult.totalTax ? (
              <span style={{ color: 'var(--success)' }}>
                ✅ Old Regime saves you {formatINR(result.newResult.totalTax - result.oldResult.totalTax)} more
              </span>
            ) : (
              <span>Both regimes result in the same tax.</span>
            )}
          </div>
        </Card>
      )}

      <div className="mt-4" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p><strong>Disclaimer:</strong> For informational purposes only. Consult a CA for precise tax planning.</p>
        <p><strong>Note:</strong> Surcharge cap of 25% under new regime applies. Surcharge of 37% applies under old regime for income above ₹5 crore. Marginal relief computed for thresholds of ₹50L, ₹1Cr, ₹2Cr.</p>
      </div>
    </div>
  );
}

function TaxBreakdown({ result }: { result: TaxResult }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      <Row label="Gross Income" value={formatINR(result.gross * 100)} />
      <Row label="Standard Deduction" value={`-${formatINR(result.standardDeduction * 100)}`} muted />
      <Row label="Taxable Income" value={formatINR(result.taxableIncome * 100)} bold />
      <div className="divider" />
      <Row label="Slab Tax" value={formatINR(result.slabTax * 100)} />
      {result.rebate87A > 0 && <Row label="Section 87A Rebate" value={`-${formatINR(result.rebate87A * 100)}`} />}
      {result.surcharge > 0 && <Row label="Surcharge" value={formatINR(result.surcharge * 100)} />}
      {result.marginalRelief > 0 && <Row label="Marginal Relief" value={`-${formatINR(result.marginalRelief * 100)}`} />}
      <Row label="Health & Education Cess (4%)" value={formatINR(result.cess * 100)} />
      <div className="divider" />
      <Row label="Total Tax Payable" value={formatINR(result.totalTax)} bold color="var(--danger)" />
      <Row label="Effective Tax Rate" value={`${result.effectiveRate.toFixed(2)}%`} muted />
    </div>
  );
}

function Row({ label, value, muted, bold, color }: { label: string; value: string; muted?: boolean; bold?: boolean; color?: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', fontWeight: bold ? 700 : 400 }}>
      <span className={muted ? 'muted' : ''} style={{ fontSize: '0.9rem' }}>{label}</span>
      <span className="mono" style={{ color: color ?? 'inherit' }}>{value}</span>
    </div>
  );
}