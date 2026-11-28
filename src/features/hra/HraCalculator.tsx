// src/features/hra/HraCalculator.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

interface HraRecord {
  id: string;
  basic: string;
  da: string;
  hraReceived: string;
  rentPaid: string;
  isMetro: boolean;
  exemption: number;
  timestamp: string;
}

const TAX_YEAR = '2026-27';

export default function HraCalculator() {
  const { t } = useI18n();
  const { repos } = useData();

  const [basicStr, setBasicStr] = useState('600000');
  const [daStr, setDaStr] = useState('0');
  const [hraStr, setHraStr] = useState('300000');
  const [rentStr, setRentStr] = useState('240000');
  const [isMetro, setIsMetro] = useState(true);

  const [history, setHistory] = useState<HraRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void repos.preferences.get<HraRecord[]>('hra-history').then(h => setHistory(h ?? []));
  }, [repos]);

  const result = useMemo(() => {
    const basic = parseFloat(basicStr) || 0;
    const da = parseFloat(daStr) || 0;
    const hra = parseFloat(hraStr) || 0;
    const rent = parseFloat(rentStr) || 0;

    if (basic < 0 || da < 0 || hra < 0 || rent < 0) return null;

    const salary = basic + da;
    if (salary <= 0) return null;

    // Three limbs (annual)
    const limb1 = hra; // Actual HRA received
    const limb2 = Math.max(0, rent - 0.10 * salary); // Rent paid minus 10% of salary
    const limb3 = salary * (isMetro ? 0.50 : 0.40); // 50% metro / 40% non-metro

    const exempt = Math.max(0, Math.min(limb1, limb2, limb3));
    const taxableHra = Math.max(0, hra - exempt);

    // Identify binding constraint
    let binding = 'Limb 1 (Actual HRA received)';
    let minVal = limb1;
    if (limb2 < minVal) { minVal = limb2; binding = 'Limb 2 (Rent − 10% of salary)'; }
    if (limb3 < minVal) { minVal = limb3; binding = 'Limb 3 (City limit)'; }

    return {
      salary,
      limb1,
      limb2,
      limb3,
      exempt,
      taxableHra,
      binding,
      rent,
      hra,
    };
  }, [basicStr, daStr, hraStr, rentStr, isMetro]);

  async function saveToHistory() {
    if (!result) return;
    const rec: HraRecord = {
      id: uuid(),
      basic: basicStr,
      da: daStr,
      hraReceived: hraStr,
      rentPaid: rentStr,
      isMetro,
      exemption: result.exempt,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50);
    setHistory(updated);
    await repos.preferences.set('hra-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all HRA history?')) return;
    setHistory([]);
    await repos.preferences.set('hra-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('hra-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.hra')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">
        Calculate your House Rent Allowance exemption under Section 11 read with Schedule III (Table Sl. No. 11) for Tax Year {TAX_YEAR}.
      </p>

      <div className="pill pill-warning mt-2" style={{ fontSize: '0.85rem' }}>
        ⚠️ HRA exemption is available <strong>only under the old tax regime</strong>. The new regime fully taxes HRA.
      </div>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label="Basic Salary (Annual, ₹)">
            <input
              className="input"
              type="number"
              value={basicStr}
              onChange={e => setBasicStr(e.target.value)}
            />
          </Field>
          <Field label="Dearness Allowance (Annual, ₹)" hint="Only DA that counts for retirement benefits">
            <input
              className="input"
              type="number"
              value={daStr}
              onChange={e => setDaStr(e.target.value)}
            />
          </Field>
          <Field label="Actual HRA Received (Annual, ₹)">
            <input
              className="input"
              type="number"
              value={hraStr}
              onChange={e => setHraStr(e.target.value)}
            />
          </Field>
          <Field label="Annual Rent Paid (₹)">
            <input
              className="input"
              type="number"
              value={rentStr}
              onChange={e => setRentStr(e.target.value)}
            />
          </Field>
          <Field label={`City Type (Tax Year ${TAX_YEAR})`}>
            <div className="tabbar">
              <button className={isMetro ? 'active' : ''} onClick={() => setIsMetro(true)}>
                Metro (50%)
              </button>
              <button className={!isMetro ? 'active' : ''} onClick={() => setIsMetro(false)}>
                Non-Metro (40%)
              </button>
            </div>
            <span className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Metro for Tax Year {TAX_YEAR}: Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad.
              All other cities are non-metro (40%).
            </span>
          </Field>
        </div>
      </Card>

      {result && (
        <Card className="mt-3">
          <h3>Exemption Calculation</h3>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <LimbRow
              label="Limb 1: Actual HRA Received"
              value={formatINR(result.limb1 * 100)}
              active={result.binding.includes('Limb 1')}
            />
            <LimbRow
              label="Limb 2: Rent Paid − 10% of Salary"
              value={formatINR(result.limb2 * 100)}
              active={result.binding.includes('Limb 2')}
            />
            <LimbRow
              label={`Limb 3: ${isMetro ? '50%' : '40%'} of Salary (Basic + DA)`}
              value={formatINR(result.limb3 * 100)}
              active={result.binding.includes('Limb 3')}
            />
          </div>

          <div className="divider" />

          <div style={{ display: 'grid', gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Salary (Basic + DA)</span>
              <span className="mono">{formatINR(result.salary * 100)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Exempt HRA</span>
              <span className="mono" style={{ color: 'var(--success)', fontSize: '1.2rem' }}>
                {formatINR(result.exempt * 100)}
              </span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Taxable HRA</span>
              <span className="mono" style={{ color: 'var(--danger)' }}>
                {formatINR(result.taxableHra * 100)}
              </span>
            </div>
          </div>

          <div className="pill pill-brand mt-3" style={{ fontSize: '0.82rem' }}>
            Binding constraint: {result.binding}
          </div>

          <Button variant="primary" className="mt-3" onClick={saveToHistory}>
            💾 Save to History
          </Button>
        </Card>
      )}

      {result && (
        <Card className="mt-3">
          <h3>Regime Comparison</h3>
          <div className="grid-2 mt-2">
            <div>
              <div className="muted">Old Regime (Exemption Available)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }} className="mono">
                {formatINR(result.exempt * 100)} exempt
              </div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>Taxable HRA: {formatINR(result.taxableHra * 100)}</div>
            </div>
            <div>
              <div className="muted">New Regime (No Exemption)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--danger)' }} className="mono">
                {formatINR(result.hra * 100)} fully taxable
              </div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>Consider this when choosing your regime.</div>
            </div>
          </div>
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
                  <strong>₹{h.exemption.toLocaleString('en-IN')} exempt</strong> · {h.isMetro ? 'Metro' : 'Non-Metro'}
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    Basic ₹{h.basic} · HRA ₹{h.hraReceived} · Rent ₹{h.rentPaid}
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
        <p>
          <strong>Disclaimer:</strong> This calculator provides an estimate based on the Income-tax Act, 2025 for Tax Year {TAX_YEAR}. 
          It is for informational purposes only and does not constitute professional tax advice. 
          Actual exemption may vary based on your specific salary structure and rent payments. 
          Always consult a qualified Chartered Accountant (CA) for precise tax planning.
        </p>
        <p>
          <strong>Rules:</strong> Exemption under Section 11 read with Schedule III (Table Sl. No. 11) and Rule 279. Salary for HRA = Basic + DA (retirement-linked) + turnover commission. Rent receipts required; landlord PAN mandatory if annual rent exceeds ₹1,00,000. If your salary or rent changed mid-year, calculate each period separately.
        </p>
      </div>
    </div>
  );
}

function LimbRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className="list-item"
      style={{
        padding: '10px 14px',
        borderColor: active ? 'var(--brand-500)' : undefined,
        background: active ? 'var(--brand-50)' : undefined,
        color: active ? 'var(--brand-900)' : 'inherit', 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: active ? 700 : 400 }}>{label}</span>
        
        {/* Replaced the class with explicit inline styles to guarantee contrast */}
        {active && (
          <span 
            style={{ 
              fontSize: '0.7rem', 
              padding: '2px 8px', 
              borderRadius: '999px', 
              fontWeight: 700,
              backgroundColor: 'var(--brand-200)', /* Light orange */
              color: 'var(--brand-900)', /* Dark brown text */
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            Lowest
          </span>
        )}
      </div>
      <span className="mono" style={{ fontWeight: active ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}