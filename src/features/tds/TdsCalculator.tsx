// src/features/tds/TdsCalculator.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

type TdsSection =
  | '192'    // Salary
  | '194A'   // Interest (bank / others)
  | '194C'   // Contractor
  | '194I'   // Rent (land/building or P&M)
  | '194J'   // Professional / technical fees
  | '194IA'  // Sale of immovable property
  | '194T';  // Payments to partners (FY 2025-26 onwards)

interface SectionDef {
  id: TdsSection;
  label: string;
  rate: number;            // default rate (%)
  rateNoPan: number;       // Section 206AA rate
  thresholdDescription: string;
  isMonthlyThreshold?: boolean;
  thresholdValue: number;  // in INR (annual or monthly as noted)
  minSingleTxn?: number;   // for 194C single txn threshold
  annualAggregate?: number;// for 194C aggregate threshold
}

const SECTIONS: SectionDef[] = [
  {
    id: '192',
    label: '192 — Salary',
    rate: 0, // slab-based; handled separately
    rateNoPan: 0,
    thresholdDescription: 'Basic exemption limit / slab-based',
    thresholdValue: 0,
  },
  {
    id: '194A',
    label: '194A — Interest (bank/co-op/post office)',
    rate: 10,
    rateNoPan: 20,
    thresholdDescription: '₹50,000/year (₹1,00,000 for senior citizens)',
    thresholdValue: 50000,
  },
  {
    id: '194C',
    label: '194C — Contractor / Sub-contractor',
    rate: 1, // for individual/HUF; 2% for others
    rateNoPan: 20,
    thresholdDescription: '₹30,000 single txn OR ₹1,00,000 aggregate/year',
    thresholdValue: 0,
    minSingleTxn: 30000,
    annualAggregate: 100000,
  },
  {
    id: '194I',
    label: '194I — Rent (land / building / furniture)',
    rate: 10,
    rateNoPan: 20,
    thresholdDescription: '₹50,000 per month (₹6,00,000/year)',
    thresholdValue: 50000,
    isMonthlyThreshold: true,
  },
  {
    id: '194J',
    label: '194J — Professional / Technical fees',
    rate: 10,
    rateNoPan: 20,
    thresholdDescription: '₹50,000/year',
    thresholdValue: 50000,
  },
  {
    id: '194IA',
    label: '194IA — Sale of immovable property',
    rate: 1,
    rateNoPan: 20,
    thresholdDescription: '₹50,00,000 (aggregate consideration)',
    thresholdValue: 5000000,
  },
  {
    id: '194T',
    label: '194T — Payments to partners (firm/LLP)',
    rate: 10,
    rateNoPan: 20,
    thresholdDescription: '₹20,000/year (aggregate)',
    thresholdValue: 20000,
  },
];

interface TdsRecord {
  id: string;
  section: TdsSection;
  amount: string;
  panAvailable: boolean;
  tds: number;
  timestamp: string;
}

export default function TdsCalculator() {
  const { t } = useI18n();
  const { repos } = useData();

  const [sectionId, setSectionId] = useState<TdsSection>('194A');
  const [amountStr, setAmountStr] = useState('100000');
  const [panAvailable, setPanAvailable] = useState(true);
  const [isSenior, setIsSenior] = useState(false); // for 194A
  const [isIndividual, setIsIndividual] = useState(true); // for 194C rate
  const [history, setHistory] = useState<TdsRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void repos.preferences.get<TdsRecord[]>('tds-history').then(h => setHistory(h ?? []));
  }, [repos]);

  const section = SECTIONS.find(s => s.id === sectionId)!;

  const result = useMemo(() => {
    let amount = 0;
    try { amount = Math.round(parseFloat(amountStr) * 100); } catch { return null; }
    if (amount <= 0) return null;

    // Salary is slab-based; for a simple calculator we ask user to supply
    // the rate they're in, or we display that salary TDS = slab rate.
    if (sectionId === '192') {
      return {
        tds: null,
        rate: null,
        thresholdApplied: false,
        note: 'Salary TDS depends on your slab (old/new regime). Use the Income Tax Calculator for exact figures.',
        netAmount: amount,
      };
    }

    // Threshold check
    let thresholdApplied = false;
    if (sectionId === '194C') {
      if (amount < (section.minSingleTxn ?? 0) && amount < (section.annualAggregate ?? 0)) {
        thresholdApplied = true;
      }
    } else if (section.isMonthlyThreshold) {
      // Threshold is ₹50,000 per month; user enters annual/aggregate rent.
      // If the total amount is below ₹50,000 (i.e., likely a single month), skip.
      if (amount < section.thresholdValue * 100) thresholdApplied = true;
    } else {
      const effThreshold = sectionId === '194A' && isSenior
        ? 100000
        : section.thresholdValue;
      if (amount < effThreshold * 100) thresholdApplied = true;
    }

    // Rate selection
    let rate: number;
    if (sectionId === '194C') {
      rate = isIndividual ? 1 : 2;
    } else if (sectionId === '194A' && isSenior) {
      rate = 10;
    } else {
      rate = section.rate;
    }

    // No-PAN override
    if (!panAvailable) rate = section.rateNoPan;

    if (thresholdApplied) {
      return {
        tds: 0,
        rate: 0,
        thresholdApplied: true,
        note: `Amount is below the ${section.thresholdDescription} threshold. No TDS deducted.`,
        netAmount: amount,
      };
    }

    const tds = Math.round((amount * rate) / 100);
    return {
      tds,
      rate,
      thresholdApplied: false,
      note: null,
      netAmount: amount - tds,
    };
  }, [sectionId, amountStr, panAvailable, isSenior, isIndividual, section]);

  async function saveToHistory() {
    if (!result || result.tds === null) return;
    const rec: TdsRecord = {
      id: uuid(),
      section: sectionId,
      amount: amountStr,
      panAvailable,
      tds: result.tds,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50);
    setHistory(updated);
    await repos.preferences.set('tds-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all TDS history?')) return;
    setHistory([]);
    await repos.preferences.set('tds-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('tds-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.tds')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">
        Calculate TDS under major sections for FY 2025-26 (post-Budget 2025 thresholds).
      </p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label="Section / Nature of Payment">
            <select
              className="select"
              value={sectionId}
              onChange={e => setSectionId(e.target.value as TdsSection)}
            >
              {SECTIONS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₹)">
            <input
              className="input"
              type="number"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </Field>

          {sectionId !== '192' && (
            <Field label="PAN Available?">
              <div className="tabbar">
                <button className={panAvailable ? 'active' : ''} onClick={() => setPanAvailable(true)}>Yes</button>
                <button className={!panAvailable ? 'active' : ''} onClick={() => setPanAvailable(false)}>
                  No (206AA)
                </button>
              </div>
            </Field>
          )}

          {sectionId === '194A' && (
            <Field label="Senior Citizen?">
              <div className="tabbar">
                <button className={!isSenior ? 'active' : ''} onClick={() => setIsSenior(false)}>No</button>
                <button className={isSenior ? 'active' : ''} onClick={() => setIsSenior(true)}>Yes</button>
              </div>
            </Field>
          )}

          {sectionId === '194C' && (
            <Field label="Payee Type">
              <div className="tabbar">
                <button className={isIndividual ? 'active' : ''} onClick={() => setIsIndividual(true)}>
                  Individual / HUF (1%)
                </button>
                <button className={!isIndividual ? 'active' : ''} onClick={() => setIsIndividual(false)}>
                  Company / Other (2%)
                </button>
              </div>
            </Field>
          )}
        </div>

        {sectionId !== '192' && (
          <div className="pill pill-brand mt-3" style={{ fontSize: '0.82rem' }}>
            Threshold: {section.thresholdDescription}
          </div>
        )}
      </Card>

      {result && (
        <Card className="mt-3">
          <h3>Result</h3>
          {result.tds === null ? (
            <p className="muted mt-2">{result.note}</p>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="muted">Gross Amount</span>
                  <span className="mono">{formatINR(Math.round(parseFloat(amountStr || '0') * 100))}</span>
                </div>
                {result.thresholdApplied ? (
                  <div className="pill pill-warning mt-2">
                    Below threshold — no TDS deducted
                  </div>
                ) : (
                  <>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted">TDS Rate Applied</span>
                      <span className="mono">{result.rate}%</span>
                    </div>
                    <div className="divider" />
                    <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>TDS Deducted</span>
                      <span className="mono" style={{ color: 'var(--danger)' }}>
                        {formatINR(result.tds)}
                      </span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Net Amount Received</span>
                      <span className="mono" style={{ color: 'var(--success)' }}>
                        {formatINR(result.netAmount)}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {result.note && <p className="muted mt-2" style={{ fontSize: '0.85rem' }}>{result.note}</p>}
              {!result.thresholdApplied && result.tds !== null && (
                <Button variant="primary" className="mt-3" onClick={saveToHistory}>
                  💾 Save to History
                </Button>
              )}
            </>
          )}
        </Card>
      )}

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
                  <strong>Section {h.section}</strong> · ₹{h.amount}
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    TDS: {formatINR(h.tds)} {h.panAvailable ? '' : '· No PAN (20%)'}
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
        <p><strong>Disclaimer:</strong> For informational purposes only. TDS rates and thresholds are as per FY 2025-26 (post-Budget 2025). Consult a CA for filing and compliance.</p>
        <p>
          <strong>Key FY 2025-26 changes:</strong> 194A threshold raised to ₹50,000 (₹1,00,000 seniors). 194I rent threshold
          is now ₹50,000/month. 194J professional fees threshold raised to ₹50,000. New Section 194T (10% TDS on partner
          payments above ₹20,000 by firms/LLPs).
        </p>
        <p>
          <strong>Salary (192):</strong> TDS is deducted by the employer based on the employee's slab under the chosen regime.
          Use the Income Tax Calculator to estimate your liability, and ensure your employer has your regime declaration.
        </p>
      </div>
    </div>
  );
}