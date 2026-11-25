// src/features/tds/TdsCalculator.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

type TdsSection =
  | '192'    // Salary
  | '194A'   // Interest
  | '194C'   // Contractor
  | '194I'   // Rent
  | '194J'   // Professional / Technical
  | '194IA'  // Sale of immovable property
  | '194T';  // Payments to partners

interface SectionDef {
  id: TdsSection;
  label: string;
  newSection: string; // For Income-tax Act, 2025
  rate: number;
  rateNoPan: number;
  thresholdValue: number;
  isMonthlyThreshold?: boolean;
  thresholdDescription: string;
  hasSubType?: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    id: '192',
    label: '192 — Salary',
    newSection: '392(1)',
    rate: 0,
    rateNoPan: 0,
    thresholdValue: 0,
    thresholdDescription: 'Slab-based',
  },
  {
    id: '194A',
    label: '194A — Interest',
    newSection: '393(1)[5(ii)]',
    rate: 10,
    rateNoPan: 20,
    thresholdValue: 50000, // Bank default
    thresholdDescription: '₹50,000 (₹1L seniors). Others: ₹10,000.',
    hasSubType: true,
  },
  {
    id: '194C',
    label: '194C — Contractor',
    newSection: '393(1)[6(i)]',
    rate: 1, // Ind/HUF default
    rateNoPan: 20,
    thresholdValue: 0,
    thresholdDescription: '₹30,000 single / ₹1,00,000 aggregate',
    hasSubType: true,
  },
  {
    id: '194I',
    label: '194I — Rent',
    newSection: '393(1)[2(ii)]',
    rate: 10, // Land/Building default
    rateNoPan: 20,
    thresholdValue: 50000,
    isMonthlyThreshold: true,
    thresholdDescription: '₹50,000 per month',
    hasSubType: true,
  },
  {
    id: '194J',
    label: '194J — Professional / Technical',
    newSection: '393(1)[6(iii)]',
    rate: 10, // Professional default
    rateNoPan: 20,
    thresholdValue: 50000,
    thresholdDescription: '₹50,000/year',
    hasSubType: true,
  },
  {
    id: '194IA',
    label: '194IA — Sale of immovable property',
    newSection: '393(1)[3(i)]',
    rate: 1,
    rateNoPan: 20,
    thresholdValue: 5000000,
    thresholdDescription: '₹50,00,000',
  },
  {
    id: '194T',
    label: '194T — Payments to partners',
    newSection: '393(1)[6(iv)]',
    rate: 10,
    rateNoPan: 20,
    thresholdValue: 20000,
    thresholdDescription: '₹20,000/year',
  },
];

type SubType = 'bank' | 'nonBank' | 'individual' | 'company' | 'landBuilding' | 'machinery' | 'professional' | 'technical';

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
  const [isSenior, setIsSenior] = useState(false);
  const [subType, setSubType] = useState<SubType>('bank'); // Default for 194A
  
  const [history, setHistory] = useState<TdsRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void repos.preferences.get<TdsRecord[]>('tds-history').then(h => setHistory(h ?? []));
  }, [repos]);

  const section = SECTIONS.find(s => s.id === sectionId)!;

  // Reset subType when section changes
  useEffect(() => {
    if (sectionId === '194A') setSubType('bank');
    if (sectionId === '194C') setSubType('individual');
    if (sectionId === '194I') setSubType('landBuilding');
    if (sectionId === '194J') setSubType('professional');
  }, [sectionId]);

  const result = useMemo(() => {
    let amount = 0;
    try { amount = Math.round(parseFloat(amountStr) * 100); } catch { return null; }
    if (amount <= 0) return null;

    if (sectionId === '192') {
      return {
        tds: null,
        rate: null,
        note: 'Salary TDS depends on your slab. Use the Income Tax Calculator for exact figures.',
        netAmount: amount,
      };
    }

    // Dynamic Rate & Threshold
    let rate = section.rate;
    let threshold = section.thresholdValue;

    if (sectionId === '194A') {
      if (subType === 'nonBank') threshold = 10000;
    } else if (sectionId === '194C') {
      if (subType === 'company') rate = 2;
    } else if (sectionId === '194I') {
      if (subType === 'machinery') rate = 2;
    } else if (sectionId === '194J') {
      if (subType === 'technical') rate = 2;
    }

    if (!panAvailable) rate = section.rateNoPan;

    // Threshold check (simplified)
    let thresholdApplied = false;
    if (sectionId === '194C') {
      if (amount < 3000000 && amount < 10000000) thresholdApplied = true; // Simplified for single txn
    } else if (section.isMonthlyThreshold) {
      if (amount < threshold * 100) thresholdApplied = true;
    } else {
      const effThreshold = sectionId === '194A' && isSenior ? 100000 : threshold;
      if (amount < effThreshold * 100) thresholdApplied = true;
    }

    if (thresholdApplied) {
      return {
        tds: 0,
        rate: 0,
        note: `Amount is below the ${section.thresholdDescription} threshold. No TDS deducted.`,
        netAmount: amount,
      };
    }

    const tds = Math.round((amount * rate) / 100);
    return {
      tds,
      rate,
      note: null,
      netAmount: amount - tds,
    };
  }, [sectionId, amountStr, panAvailable, isSenior, subType, section]);

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
        Calculate TDS under major sections for Tax Year 2026-27 (Income-tax Act, 2025).
      </p>

      <Card className="mt-4">
        <div className="grid-2" style={{ alignItems: 'start' }}>
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

          {/* Sub-type selectors */}
          {sectionId === '194A' && (
            <Field label="Payer Type">
              <div className="tabbar">
                <button className={subType === 'bank' ? 'active' : ''} onClick={() => setSubType('bank')}>Bank/Co-op/Post</button>
                <button className={subType === 'nonBank' ? 'active' : ''} onClick={() => setSubType('nonBank')}>Others</button>
              </div>
            </Field>
          )}

          {sectionId === '194C' && (
            <Field label="Payee Type">
              <div className="tabbar">
                <button className={subType === 'individual' ? 'active' : ''} onClick={() => setSubType('individual')}>Individual/HUF (1%)</button>
                <button className={subType === 'company' ? 'active' : ''} onClick={() => setSubType('company')}>Company/Other (2%)</button>
              </div>
            </Field>
          )}

          {sectionId === '194I' && (
            <Field label="Rent Type">
              <div className="tabbar">
                <button className={subType === 'landBuilding' ? 'active' : ''} onClick={() => setSubType('landBuilding')}>Land/Building (10%)</button>
                <button className={subType === 'machinery' ? 'active' : ''} onClick={() => setSubType('machinery')}>Plant/Machinery (2%)</button>
              </div>
            </Field>
          )}

          {sectionId === '194J' && (
            <Field label="Service Type">
              <div className="tabbar">
                <button className={subType === 'professional' ? 'active' : ''} onClick={() => setSubType('professional')}>Professional (10%)</button>
                <button className={subType === 'technical' ? 'active' : ''} onClick={() => setSubType('technical')}>Technical (2%)</button>
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

          <Field label="PAN Available?">
            <div className="tabbar">
              <button className={panAvailable ? 'active' : ''} onClick={() => setPanAvailable(true)}>Yes</button>
              <button className={!panAvailable ? 'active' : ''} onClick={() => setPanAvailable(false)}>No (206AA)</button>
            </div>
          </Field>
        </div>

        <div className="pill pill-brand mt-3" style={{ fontSize: '0.82rem' }}>
          Threshold: {section.thresholdDescription} · New Act Section: {section.newSection}
        </div>
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
                {result.note ? (
                   <div className="pill pill-warning mt-2">{result.note}</div>
                ) : (
                  <>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted">TDS Rate Applied</span>
                      <span className="mono">{result.rate}%</span>
                    </div>
                    <div className="divider" />
                    <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>TDS Deducted</span>
                      <span className="mono" style={{ color: 'var(--danger)' }}>{formatINR(result.tds)}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Net Amount Received</span>
                      <span className="mono" style={{ color: 'var(--success)' }}>{formatINR(result.netAmount)}</span>
                    </div>
                  </>
                )}
              </div>
              {!result.note && result.tds !== null && (
                <Button variant="primary" className="mt-3" onClick={saveToHistory}>💾 Save to History</Button>
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
                  <div className="muted" style={{ fontSize: '0.7rem' }}>{new Date(h.timestamp).toLocaleString()}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteRecord(h.id)}>✕</Button>
              </div>
            ))}
            {history.length === 0 && <p className="muted">No saved calculations.</p>}
          </div>
        </Card>
      )}

      <div className="mt-4" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p><strong>Disclaimer:</strong> For informational purposes only. TDS rates and thresholds are as per the Income-tax Act, 2025, applicable from Tax Year 2026-27. Consult a CA for filing and compliance.</p>
        <p><strong>Key changes:</strong> 194A threshold is ₹1,00,000 for senior citizens and ₹50,000 for others (bank). 194I rent threshold is ₹50,000/month. 194J has different rates for professional (10%) vs technical (2%). New Section 194T applies at 10% above ₹20,000.</p>
      </div>
    </div>
  );
}