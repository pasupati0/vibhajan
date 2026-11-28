// src/features/income-tax/IncomeTaxCalculator.tsx
import { useState, useMemo } from 'react';
import { Card, Field } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { useI18n } from '../../i18n/I18nProvider';

interface Slab { min: number; max: number | null; rate: number; }
type Residency = 'resident' | 'nri';
type NriStatus = 'NRI' | 'RNOR' | 'Deemed Resident' | 'ROR';

const NEW_REGIME_SLABS: Slab[] = [
  { min: 0,       max: 400000,  rate: 0 },
  { min: 400000,  max: 800000,  rate: 0.05 },
  { min: 800000,  max: 1200000, rate: 0.10 },
  { min: 1200000, max: 1600000, rate: 0.15 },
  { min: 1600000, max: 2000000, rate: 0.20 },
  { min: 2000000, max: 2400000, rate: 0.25 },
  { min: 2400000, max: null,    rate: 0.30 },
];

const getOldRegimeSlabs = (ageGroup: string): Slab[] => {
  let exemptLimit = 250000;
  if (ageGroup === 'senior') exemptLimit = 300000;
  if (ageGroup === 'superSenior') exemptLimit = 500000;

  return [
    { min: 0, max: exemptLimit,  rate: 0 },
    { min: exemptLimit, max: 500000,  rate: 0.05 },
    { min: 500000, max: 1000000, rate: 0.20 },
    { min: 1000000, max: null,    rate: 0.30 },
  ];
};

const SURCHARGE_SLABS = [
  { min: 5000000,  max: 10000000, rate: 0.10 },
  { min: 10000000, max: 20000000, rate: 0.15 },
  { min: 20000000, max: 50000000, rate: 0.25 },
  { min: 50000000, max: null,     rate: 0.37 },
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
      if (isNew && rate > 0.25) rate = 0.25;
      return tax * rate;
    }
  }
  return 0;
}

interface TaxResult {
  gross: number;
  standardDeduction: number;
  taxableIncome: number;
  slabTax: number;
  rebate156: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
}

function computeTax(
  grossIncome: number,
  standardDeduction: number,
  otherDeductions: number,
  isNew: boolean,
  ageGroup: string,
  isNri: boolean
): TaxResult {
  const taxableIncome = Math.max(0, grossIncome - standardDeduction - otherDeductions);
  const slabs = isNew ? NEW_REGIME_SLABS : getOldRegimeSlabs(ageGroup);
  let slabTax = calcSlabTax(taxableIncome, slabs);

  // Section 156 Rebate (Not applicable to NRIs)
  let rebate156 = 0;
  if (!isNri) {
    if (isNew) {
      if (taxableIncome <= 1200000) {
        rebate156 = Math.min(slabTax, 60000);
      } else if (taxableIncome <= 1275000) {
        const excessIncome = taxableIncome - 1200000;
        if (slabTax > excessIncome) rebate156 = slabTax - excessIncome;
      }
    } else {
      if (taxableIncome <= 500000) {
        rebate156 = Math.min(slabTax, 12500);
      } else if (taxableIncome <= 512500) {
        const excessIncome = taxableIncome - 500000;
        if (slabTax > excessIncome) rebate156 = slabTax - excessIncome;
      }
    }
  }

  const taxAfterRebate = Math.max(0, slabTax - rebate156);
  const surcharge = calcSurcharge(taxAfterRebate, taxableIncome, isNew);
  let taxAfterSurcharge = taxAfterRebate + surcharge;

  for (const s of SURCHARGE_SLABS) {
    if (taxableIncome > s.min) {
      const excess = taxableIncome - s.min;
      const taxAtThreshold = calcSlabTax(s.min, slabs);
      let surchargeAtThreshold = 0;
      if (s.min === 10000000) surchargeAtThreshold = taxAtThreshold * 0.10;
      if (s.min === 20000000) surchargeAtThreshold = taxAtThreshold * 0.15;
      if (s.min === 50000000) surchargeAtThreshold = taxAtThreshold * 0.25;

      const maxTax = taxAtThreshold + surchargeAtThreshold + excess;
      if (taxAfterSurcharge > maxTax) taxAfterSurcharge = maxTax;
      break;
    }
  }

  const cess = taxAfterSurcharge * 0.04;
  const totalTax = taxAfterSurcharge + cess;

  return {
    gross: grossIncome,
    standardDeduction,
    taxableIncome,
    slabTax,
    rebate156,
    surcharge,
    cess,
    totalTax: Math.round(totalTax),
    effectiveRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
  };
}

export default function IncomeTaxCalculator() {
  const { t } = useI18n();

  // Common State
  const [grossStr, setGrossStr] = useState('1500000');
  const [isSalaried, setIsSalaried] = useState(true);
  const [ageGroup, setAgeGroup] = useState<'normal' | 'senior' | 'superSenior'>('normal');
  const [deductionsStr, setDeductionsStr] = useState('0');

  // NRI State
  const [residency, setResidency] = useState<Residency>('resident');
  const [daysThisYear, setDaysThisYear] = useState('150');
  const [daysPrev4, setDaysPrev4] = useState('400');
  const [indianIncomeStr, setIndianIncomeStr] = useState('2000000');
  const [liableToTaxAbroad, setLiableToTaxAbroad] = useState(true);
  const [dtaaCountry, setDtaaCountry] = useState('none');

  const isNri = residency === 'nri';

  // NRI Status Determination
  const nriStatus = useMemo<{ status: NriStatus; reason: string } | null>(() => {
    if (!isNri) return null;
    const days = parseInt(daysThisYear) || 0;
    const prev4 = parseInt(daysPrev4) || 0;
    const indianIncome = parseFloat(indianIncomeStr) || 0;

    if (days >= 182) {
      return { status: 'ROR', reason: 'Present in India for 182+ days. Global income is taxable.' };
    }
    
    let visitingThreshold = 182;
    if (indianIncome > 1500000) visitingThreshold = 120;

    if (days >= visitingThreshold && prev4 >= 365) {
      return { status: 'RNOR', reason: `Meets the ${visitingThreshold}-day threshold with 365+ days in preceding 4 years. Resident but Not Ordinarily Resident.` };
    }

    if (indianIncome > 1500000 && !liableToTaxAbroad) {
      return { status: 'Deemed Resident', reason: 'Deemed resident under Section 6(1A): Indian citizen with Indian income > ₹15L and not liable to tax abroad.' };
    }

    return { status: 'NRI', reason: 'Does not meet any resident test. Taxed only on Indian-source income.' };
  }, [isNri, daysThisYear, daysPrev4, indianIncomeStr, liableToTaxAbroad]);

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

    const newResult = computeTax(gross / 100, stdNew, 0, true, 'normal', isNri);
    const oldResult = computeTax(gross / 100, stdOld, deductions / 100, false, ageGroup, isNri);

    return { newResult, oldResult };
  }, [grossStr, deductionsStr, isSalaried, ageGroup, isNri]);

  return (
    <div className="fade-in">
      <h1>{t('tool.incomeTax')}</h1>
      <p className="muted">Compare Old vs New tax regime for Tax Year 2026-27.</p>

      <Card className="mt-4">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Field label="Residential Status">
            <select className="select" value={residency} onChange={e => setResidency(e.target.value as Residency)}>
              <option value="resident">Resident</option>
              <option value="nri">Non-Resident (NRI)</option>
            </select>
          </Field>
          
          <Field label="Gross Annual Income (₹)">
            <input className="input" type="number" value={grossStr} onChange={e => setGrossStr(e.target.value)} />
          </Field>
          
          <Field label="Age Category">
            <select className="select" value={ageGroup} onChange={e => setAgeGroup(e.target.value as any)}>
              <option value="normal">Less than 60 years</option>
              <option value="senior">Senior Citizen (60-79 years)</option>
              <option value="superSenior">Super Senior (80+ years)</option>
            </select>
          </Field>
          
          <Field label="Salaried / Pensioner?">
            <div className="tabbar">
              <button className={isSalaried ? 'active' : ''} onClick={() => setIsSalaried(true)}>Yes</button>
              <button className={!isSalaried ? 'active' : ''} onClick={() => setIsSalaried(false)}>No</button>
            </div>
          </Field>

          <Field label="Deductions under Old Regime (80C, 80D, etc.)">
            <input className="input" type="number" value={deductionsStr} onChange={e => setDeductionsStr(e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* NRI SPECIFIC SECTION */}
      {isNri && (
        <Card className="mt-3 fade-in" style={{ borderLeft: '4px solid var(--brand-500)' }}>
          <h3>NRI Residency & DTAA Details</h3>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Determine your exact NRI status and treaty benefits.</p>
          
          <div className="grid-2 mt-2">
            <Field label="Days in India this FY">
              <input className="input" type="number" value={daysThisYear} onChange={e => setDaysThisYear(e.target.value)} />
            </Field>
            <Field label="Days in India in preceding 4 years">
              <input className="input" type="number" value={daysPrev4} onChange={e => setDaysPrev4(e.target.value)} />
            </Field>
            <Field label="Indian-source income (₹)">
              <input className="input" type="number" value={indianIncomeStr} onChange={e => setIndianIncomeStr(e.target.value)} />
            </Field>
            <Field label="Liable to tax in country of residence?">
              <div className="tabbar">
                <button className={liableToTaxAbroad ? 'active' : ''} onClick={() => setLiableToTaxAbroad(true)}>Yes</button>
                <button className={!liableToTaxAbroad ? 'active' : ''} onClick={() => setLiableToTaxAbroad(false)}>No</button>
              </div>
            </Field>
            <Field label="Country of Residence (for DTAA)">
              <select className="select" value={dtaaCountry} onChange={e => setDtaaCountry(e.target.value)}>
                <option value="none">No DTAA claim</option>
                <option value="usa">USA (DTAA available)</option>
                <option value="uk">UK (DTAA available)</option>
                <option value="uae">UAE (DTAA available)</option>
                <option value="canada">Canada (DTAA available)</option>
                <option value="other">Other (has DTAA)</option>
              </select>
            </Field>
          </div>

          {nriStatus && (
            <div className="mt-3">
              <div className={`pill ${nriStatus.status === 'NRI' ? 'pill-brand' : nriStatus.status === 'RNOR' ? 'pill-warning' : 'pill-danger'}`} style={{ fontSize: '0.9rem' }}>
                Status: <strong>{nriStatus.status}</strong>
              </div>
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>{nriStatus.reason}</p>
            </div>
          )}

          {dtaaCountry !== 'none' && (
            <div className="pill pill-brand mt-2" style={{ fontSize: '0.82rem' }}>
              💡 DTAA relief available. File <strong>Form 67</strong> before ITR to claim Foreign Tax Credit (FTC). Treaty rates may be lower than domestic TDS (e.g., 15% on interest for US/UK residents).
            </div>
          )}
        </Card>
      )}

      {result && (
        <div className="grid-2 mt-3" style={{ gap: 'var(--space-3)' }}>
          <Card>
            <h3 style={{ color: 'var(--brand-600)' }}>New Regime (Section 202)</h3>
            <TaxBreakdown result={result.newResult} isNri={isNri} />
          </Card>
          <Card>
            <h3 style={{ color: 'var(--text-muted)' }}>Old Regime</h3>
            <TaxBreakdown result={result.oldResult} isNri={isNri} />
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
        <p>
          <strong>Disclaimer:</strong> This calculator provides an estimate based on the Income-tax Act, 2025 (amended by Finance Act, 2026) for Tax Year 2026-27. 
          It is for informational purposes only and does not constitute professional tax advice. 
          Actual tax liability may vary based on your specific income composition (e.g., capital gains, foreign assets, business income) and applicable deductions. 
          Surcharge and Marginal Relief calculations can be complex. Always consult a qualified Chartered Accountant (CA) for precise tax planning and filing.
        </p>
        <p>
          <strong>Note:</strong> Standard deduction is ₹75,000 for New Regime and ₹50,000 for Old Regime. Section 156 rebate is capped at ₹60,000 for New Regime and ₹12,500 for Old Regime. Marginal relief applies for incomes marginally exceeding the rebate thresholds. Surcharge is capped at 25% for New Regime.
        </p>
      </div>
    </div>
  );
}

function TaxBreakdown({ result, isNri }: { result: TaxResult; isNri: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      <Row label="Gross Income" value={formatINR(result.gross * 100)} />
      <Row label="Standard Deduction" value={`-${formatINR(result.standardDeduction * 100)}`} muted />
      <Row label="Taxable Income" value={formatINR(result.taxableIncome * 100)} bold />
      <div className="divider" />
      <Row label="Slab Tax" value={formatINR(result.slabTax * 100)} />
      {result.rebate156 > 0 && <Row label="Sec 156 Rebate" value={`-${formatINR(result.rebate156 * 100)}`} />}
      {isNri && <Row label="Sec 156 Rebate" value="Not applicable to NRIs" muted />}
      {result.surcharge > 0 && <Row label="Surcharge" value={formatINR(result.surcharge * 100)} />}
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