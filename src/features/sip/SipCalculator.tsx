// src/features/sip/SipCalculator.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { rupeesToPaise } from '../../lib/money';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

interface SipRecord {
  id: string;
  monthlyInvestment: string;
  stepUpPercent: number;
  years: number;
  expectedReturn: number;
  timestamp: string;
}

export default function SipCalculator() {
  const { t } = useI18n();
  const { repos } = useData();

  const [monthlyStr, setMonthlyStr] = useState('10000');
  const [years, setYears] = useState(15);
  const [returnRate, setReturnRate] = useState(12);
  const [stepUp, setStepUp] = useState(0); // 0 means flat SIP
  const [history, setHistory] = useState<SipRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from IndexedDB
  useEffect(() => {
    void repos.preferences.get<SipRecord[]>('sip-history').then(h => setHistory(h ?? []));
  }, [repos]);

  const result = useMemo(() => {
    let monthlyPaise = 0;
    try { monthlyPaise = rupeesToPaise(monthlyStr); } catch { return null; }
    if (monthlyPaise <= 0 || years <= 0 || returnRate < 0) return null;

    const monthlyRate = returnRate / 12 / 100;
    const months = years * 12;
    const stepUpRate = stepUp / 100;

    let totalInvested = 0;
    let futureValue = 0;

    if (stepUp === 0) {
      // Flat SIP: standard closed-form formula
      // FV = P × [((1+i)^n - 1) / i] × (1+i)
      if (monthlyRate === 0) {
        futureValue = monthlyPaise * months;
        totalInvested = monthlyPaise * months;
      } else {
        futureValue = monthlyPaise * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate);
        totalInvested = monthlyPaise * months;
      }
    } else {
      // Step-up SIP: simulate month by month (required for accuracy)
      let currentMonthly = monthlyPaise;
      for (let m = 1; m <= months; m++) {
        // Increase SIP amount at the start of each year (every 12 months)
        if (m > 1 && (m - 1) % 12 === 0) {
          currentMonthly = Math.round(currentMonthly * (1 + stepUpRate));
        }
        totalInvested += currentMonthly;
        futureValue = (futureValue + currentMonthly) * (1 + monthlyRate);
      }
    }

    return {
      futureValue: Math.round(futureValue),
      totalInvested: Math.round(totalInvested),
      totalGains: Math.round(futureValue - totalInvested),
    };
  }, [monthlyStr, years, returnRate, stepUp]);

  async function saveToHistory() {
    if (!result) return;
    const rec: SipRecord = {
      id: uuid(),
      monthlyInvestment: monthlyStr,
      stepUpPercent: stepUp,
      years,
      expectedReturn: returnRate,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50);
    setHistory(updated);
    await repos.preferences.set('sip-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all SIP history?')) return;
    setHistory([]);
    await repos.preferences.set('sip-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('sip-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.sip')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">
        Estimate your mutual fund SIP returns. Compare flat SIP vs. step-up SIP.
      </p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label="Monthly Investment (₹)">
            <input
              className="input"
              type="number"
              value={monthlyStr}
              onChange={e => setMonthlyStr(e.target.value)}
            />
          </Field>
          <Field label="Expected Annual Return (%)">
            <input
              className="input"
              type="number"
              step="0.1"
              value={returnRate}
              onChange={e => setReturnRate(Number(e.target.value))}
            />
          </Field>
          <Field label={`Tenure: ${years} year${years > 1 ? 's' : ''}`}>
            <input
              className="input"
              type="range"
              min="1"
              max="40"
              value={years}
              onChange={e => setYears(Number(e.target.value))}
            />
          </Field>
          <Field label={`Annual Step-Up: ${stepUp}% (0 = Flat SIP)`}>
            <input
              className="input"
              type="range"
              min="0"
              max="30"
              step="1"
              value={stepUp}
              onChange={e => setStepUp(Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      {result && (
        <Card className="mt-3">
          <h3>Results</h3>
          <div className="grid-2 mt-2">
            <div>
              <div className="muted">Total Invested</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }} className="mono">
                {formatINR(result.totalInvested)}
              </div>
            </div>
            <div>
              <div className="muted">Estimated Returns</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }} className="mono">
                {formatINR(result.totalGains)}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="muted">Maturity Value</div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }} className="mono">
                {formatINR(result.futureValue)}
              </div>
            </div>
          </div>
          <Button variant="primary" className="mt-3" onClick={saveToHistory}>
            💾 Save to History
          </Button>
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
                  <strong>₹{h.monthlyInvestment}/mo</strong> · {h.years} yrs · {h.expectedReturn}% · Step-up: {h.stepUpPercent}%
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
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
        <p><strong>Disclaimer:</strong> For informational purposes only. Mutual fund investments are subject to market risks. Consult a financial advisor.</p>
        <p><strong>Tax Note (FY 2025-26):</strong> Equity LTCG above ₹1.25 lakh is taxed at 12.5% as per Finance Act 2024[reference:2].</p>
      </div>
    </div>
  );
}