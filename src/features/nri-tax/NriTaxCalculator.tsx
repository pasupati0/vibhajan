// src/features/nri-tax/NriTaxCalculator.tsx
import { useState, useMemo, useEffect } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

// -------- Tax slabs (FY 2025-26) --------
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

function calcMarginalRelief(income: number, taxBeforeRelief: number, isNew: boolean): number {
  const thresholds = [500000, 1000000, 2000000];
  for (const t of thresholds) {
    if (income > t) {
      const excess = income - t;
      const taxAtThreshold = calcSlabTax(t, isNew ? NEW_REGIME_SLABS : OLD_REGIME_SLABS);
      const maxTax = taxAtThreshold + excess;
      if (taxBeforeRelief > maxTax) return taxBeforeRelief - maxTax;
    }
  }
  return 0;
}

// -------- Types --------
type Residency = 'NRI' | 'RNOR' | 'ROR';
type DtaaCountry = 'none' | 'usa' | 'uk' | 'uae' | 'canada' | 'australia' | 'other';

interface TaxResult {
  gross: number;
  taxableIncome: number;
  slabTax: number;
  surcharge: number;
  marginalRelief: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
  rebate87A: number; // will always be 0 for NRI
}

function computeNriTax(
  grossIncome: number,
  deductions: number,
  isNew: boolean,
): TaxResult {
  // NRIs cannot claim Section 87A rebate. Standard deduction applies only for salary income;
  // we let the user enter net taxable income to keep the scope manageable.
  const taxableIncome = Math.max(0, grossIncome - deductions);
  const slabs = isNew ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const slabTax = calcSlabTax(taxableIncome, slabs);

  const surcharge = calcSurcharge(slabTax, taxableIncome, isNew);
  const taxBeforeRelief = slabTax + surcharge;
  const marginalRelief = calcMarginalRelief(taxableIncome, taxBeforeRelief, isNew);
  const taxAfterRelief = Math.max(0, taxBeforeRelief - marginalRelief);
  const cess = taxAfterRelief * 0.04;
  const totalTax = taxAfterRelief + cess;

  return {
    gross: grossIncome,
    taxableIncome,
    slabTax,
    surcharge,
    marginalRelief,
    cess,
    totalTax: Math.round(totalTax),
    effectiveRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
    rebate87A: 0, // NRIs are excluded from 87A
  };
}

interface NriRecord {
  id: string;
  residency: Residency;
  grossIncome: string;
  totalTaxNew: number;
  totalTaxOld: number;
  timestamp: string;
}

export default function NriTaxCalculator() {
  const { t } = useI18n();
  const { repos } = useData();

  // Residency section
  const [daysThisYear, setDaysThisYear] = useState('150');
  const [daysPrev4, setDaysPrev4] = useState('400');
  const [indianIncomeStr, setIndianIncomeStr] = useState('2000000');
  const [liableToTaxAbroad, setLiableToTaxAbroad] = useState(true);
  const [isIndianCitizen, setIsIndianCitizen] = useState(true);

  // Tax section
  const [grossIncomeStr, setGrossIncomeStr] = useState('2000000');
  const [deductionsStr, setDeductionsStr] = useState('0');
  const [dtaaCountry, setDtaaCountry] = useState<DtaaCountry>('none');

  const [history, setHistory] = useState<NriRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void repos.preferences.get<NriRecord[]>('nri-tax-history').then(h => setHistory(h ?? []));
  }, [repos]);

  // -------- Residency determination --------
  const residency = useMemo<{ status: Residency; reason: string }>(() => {
    const days = parseInt(daysThisYear) || 0;
    const prev4 = parseInt(daysPrev4) || 0;
    const indianIncome = parseFloat(indianIncomeStr) || 0;

    // Basic tests (Section 6)
    const meets182 = days >= 182;

    // Special relaxation for Indian citizens leaving for employment / visiting PIOs:
    // 60-day test replaced by 182 days (or 120 days if Indian income > 15L).
    let effective60Threshold = 60;
    if (isIndianCitizen) {
      if (indianIncome > 1500000) {
        effective60Threshold = 120;
      } else {
        // Leaving for employment or visiting — 182-day threshold applies
        effective60Threshold = 182;
      }
    }

    const meetsSpecial = days >= effective60Threshold && prev4 >= 365;

    if (meets182) {
      return { status: 'ROR', reason: 'Present in India for 182+ days (basic resident test).' };
    }

    if (meetsSpecial) {
      // Resident but can be RNOR if not ordinarily resident
      // Simplified: RNOR if stay < 182 days but meets the 120/60-day + 365-day test
      return { status: 'RNOR', reason: 'Meets the 120/60-day + 365-day test but stayed under 182 days.' };
    }

    // Deemed residency (Section 6(1A)): Indian citizen, Indian income > 15L, not taxed abroad
    if (isIndianCitizen && indianIncome > 1500000 && !liableToTaxAbroad) {
      return {
        status: 'RNOR',
        reason: 'Deemed resident: Indian citizen with Indian income > ₹15L and no tax liability abroad (Section 6(1A)).',
      };
    }

    return { status: 'NRI', reason: 'Does not meet any resident test; treated as Non-Resident.' };
  }, [daysThisYear, daysPrev4, indianIncomeStr, isIndianCitizen, liableToTaxAbroad]);

  // -------- Tax calculation --------
  const result = useMemo(() => {
    let gross = 0;
    let deductions = 0;
    try {
      gross = Math.round(parseFloat(grossIncomeStr) * 100);
      deductions = Math.round(parseFloat(deductionsStr) * 100);
    } catch { return null; }
    if (gross <= 0) return null;

    const newR = computeNriTax(gross / 100, deductions / 100, true);
    const oldR = computeNriTax(gross / 100, deductions / 100, false);

    return { newR, oldR };
  }, [grossIncomeStr, deductionsStr]);

  async function saveToHistory() {
    if (!result) return;
    const rec: NriRecord = {
      id: uuid(),
      residency: residency.status,
      grossIncome: grossIncomeStr,
      totalTaxNew: result.newR.totalTax,
      totalTaxOld: result.oldR.totalTax,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50);
    setHistory(updated);
    await repos.preferences.set('nri-tax-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all NRI tax history?')) return;
    setHistory([]);
    await repos.preferences.set('nri-tax-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('nri-tax-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.nriTax')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">
        Determine your residential status and calculate tax liability on Indian income for FY 2025-26.
      </p>

      {/* SECTION 1: RESIDENCY DETERMINATION */}
      <Card className="mt-4">
        <h3>1. Residential Status</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Under Section 6 of the Income Tax Act. Residency is determined annually.
        </p>
        <div className="grid-2 mt-2">
          <Field label="Days in India this financial year">
            <input
              className="input"
              type="number"
              value={daysThisYear}
              onChange={e => setDaysThisYear(e.target.value)}
            />
          </Field>
          <Field label="Days in India in preceding 4 years">
            <input
              className="input"
              type="number"
              value={daysPrev4}
              onChange={e => setDaysPrev4(e.target.value)}
            />
          </Field>
          <Field label="Indian-source income (₹)">
            <input
              className="input"
              type="number"
              value={indianIncomeStr}
              onChange={e => setIndianIncomeStr(e.target.value)}
            />
          </Field>
          <Field label="Indian citizen?">
            <div className="tabbar">
              <button className={isIndianCitizen ? 'active' : ''} onClick={() => setIsIndianCitizen(true)}>Yes</button>
              <button className={!isIndianCitizen ? 'active' : ''} onClick={() => setIsIndianCitizen(false)}>No</button>
            </div>
          </Field>
          <Field label="Liable to tax in your country of residence?">
            <div className="tabbar">
              <button className={liableToTaxAbroad ? 'active' : ''} onClick={() => setLiableToTaxAbroad(true)}>Yes</button>
              <button className={!liableToTaxAbroad ? 'active' : ''} onClick={() => setLiableToTaxAbroad(false)}>No</button>
            </div>
          </Field>
        </div>

        <div
          className={`pill ${residency.status === 'NRI' ? 'pill-brand' : residency.status === 'RNOR' ? 'pill-warning' : 'pill-danger'}`}
          style={{ marginTop: 12, fontSize: '0.9rem' }}
        >
          Status: <strong>{residency.status}</strong>
        </div>
        <p className="muted mt-2" style={{ fontSize: '0.85rem' }}>{residency.reason}</p>
        {residency.status === 'NRI' && (
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            NRI: Taxed only on Indian-source income. Foreign income is outside India's tax net.
          </p>
        )}
        {residency.status === 'RNOR' && (
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            RNOR: Taxed on Indian income + foreign business income controlled from India. Foreign salary remains exempt.
          </p>
        )}
        {residency.status === 'ROR' && (
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            ROR: Taxed on global income. Foreign tax credit via DTAA (Form 67) can offset double taxation.
          </p>
        )}
      </Card>

      {/* SECTION 2: TAX CALCULATION */}
      <Card className="mt-3">
        <h3>2. Tax on Indian Income</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          NRIs are <strong>not eligible</strong> for Section 87A rebate. The new regime is default.
        </p>
        <div className="grid-2 mt-2">
          <Field label="Gross Indian Income (₹)">
            <input
              className="input"
              type="number"
              value={grossIncomeStr}
              onChange={e => setGrossIncomeStr(e.target.value)}
            />
          </Field>
          <Field label="Deductions (old regime only)">
            <input
              className="input"
              type="number"
              value={deductionsStr}
              onChange={e => setDeductionsStr(e.target.value)}
            />
          </Field>
          <Field label="Country of Residence (for DTAA)">
            <select
              className="select"
              value={dtaaCountry}
              onChange={e => setDtaaCountry(e.target.value as DtaaCountry)}
            >
              <option value="none">No DTAA claim</option>
              <option value="usa">USA (DTAA available)</option>
              <option value="uk">UK (DTAA available)</option>
              <option value="uae">UAE (DTAA available)</option>
              <option value="canada">Canada (DTAA available)</option>
              <option value="australia">Australia (DTAA available)</option>
              <option value="other">Other (has DTAA)</option>
            </select>
          </Field>
        </div>
        {dtaaCountry !== 'none' && (
          <div className="pill pill-brand mt-2" style={{ fontSize: '0.82rem' }}>
            💡 DTAA relief available. File <strong>Form 67</strong> before ITR to claim Foreign Tax Credit (FTC).
            Treaty rates may be lower than domestic TDS (e.g., 15% on interest for US/UK residents).
          </div>
        )}
      </Card>

      {/* RESULTS */}
      {result && (
        <>
          <div className="grid-2 mt-3" style={{ gap: 'var(--space-3)' }}>
            <Card>
              <h3 style={{ color: 'var(--brand-600)' }}>New Regime (Default)</h3>
              <NriTaxBreakdown result={result.newR} />
            </Card>
            <Card>
              <h3 style={{ color: 'var(--text-muted)' }}>Old Regime</h3>
              <NriTaxBreakdown result={result.oldR} />
            </Card>
          </div>

          <Card className="mt-3">
            <h3>Recommendation</h3>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {result.newR.totalTax < result.oldR.totalTax ? (
                <span style={{ color: 'var(--success)' }}>
                  ✅ New Regime saves you {formatINR(result.oldR.totalTax - result.newR.totalTax)} more
                </span>
              ) : result.oldR.totalTax < result.newR.totalTax ? (
                <span style={{ color: 'var(--success)' }}>
                  ✅ Old Regime saves you {formatINR(result.newR.totalTax - result.oldR.totalTax)} more
                </span>
              ) : (
                <span>Both regimes result in the same tax.</span>
              )}
            </div>
            <Button variant="primary" className="mt-3" onClick={saveToHistory}>
              💾 Save to History
            </Button>
          </Card>
        </>
      )}

      {/* KEY NRI TAX NOTES */}
      <Card className="mt-3">
        <h3>Key NRI Tax Rules (FY 2025-26)</h3>
        <div style={{ display: 'grid', gap: 8, marginTop: 8, fontSize: '0.85rem' }}>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>NRE & FCNR Interest</strong>
            <span className="muted">Tax-free in India. No TDS.</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>NRO Interest</strong>
            <span className="muted">Fully taxable. TDS @ 30% + surcharge + cess (before DTAA).</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>LTCG on Equity / Property</strong>
            <span className="muted">12.5% (without indexation for property bought after 23 July 2024).</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>Rental Income</strong>
            <span className="muted">Tenant deducts TDS @ 30% + surcharge + cess under Section 195.</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>Section 87A Rebate</strong>
            <span className="muted">NRIs are explicitly excluded under both regimes.</span>
          </div>
        </div>
      </Card>

      {/* HISTORY */}
      {showHistory && (
        <Card className="mt-3">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>History</h3>
            <Button size="sm" variant="danger" onClick={clearHistory}>Clear All</Button>
          </div>
          <div className="list mt-2">
            {history.map(h => (
              <div key={h.id} className="list-item">
                <div>
                  <strong>{h.residency}</strong> · ₹{h.grossIncome}
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    New: {formatINR(h.totalTaxNew)} · Old: {formatINR(h.totalTaxOld)}
                  </div>
                  <div className="muted" style={{ fontSize: '0.7rem' }}>
                    {new Date(h.timestamp).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteRecord(h.id)}>✕</Button>
              </div>
            ))}
            {history.length === 0 && <p className="muted">No saved calculations.</p>}
          </div>
        </Card>
      )}

      <div className="mt-4" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p><strong>Disclaimer:</strong> For informational purposes only. NRI tax is fact-specific and depends on DTAA, residency certificates, and income composition. Consult a cross-border tax advisor.</p>
        <p><strong>FY 2025-26 rules:</strong> New regime default under Section 115BAC. NRIs excluded from Section 87A rebate. Deemed residency under Section 6(1A) for Indian citizens with Indian income {'>'} ₹15L not taxed abroad. 120-day threshold for visiting Indian citizens/PIOs with Indian income {'>'} ₹15L.</p>
      </div>
    </div>
  );
}

function NriTaxBreakdown({ result }: { result: TaxResult }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      <Row label="Gross Income" value={formatINR(result.gross * 100)} />
      <Row label="Taxable Income" value={formatINR(result.taxableIncome * 100)} bold />
      <div className="divider" />
      <Row label="Slab Tax" value={formatINR(result.slabTax * 100)} />
      {result.surcharge > 0 && <Row label="Surcharge" value={formatINR(result.surcharge * 100)} />}
      {result.marginalRelief > 0 && <Row label="Marginal Relief" value={`-${formatINR(result.marginalRelief * 100)}`} />}
      <Row label="Health & Education Cess (4%)" value={formatINR(result.cess * 100)} />
      <div className="divider" />
      <Row label="Total Tax Payable" value={formatINR(result.totalTax)} bold color="var(--danger)" />
      <Row label="Effective Tax Rate" value={`${result.effectiveRate.toFixed(2)}%`} muted />
      <Row label="87A Rebate" value="Not available to NRIs" muted />
    </div>
  );
}

function Row({ label, value, bold, muted, color }: { label: string; value: string; bold?: boolean; muted?: boolean; color?: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', fontWeight: bold ? 700 : 400 }}>
      <span className={muted ? 'muted' : ''} style={{ fontSize: '0.9rem' }}>{label}</span>
      <span className="mono" style={{ color: color ?? 'inherit' }}>{value}</span>
    </div>
  );
}