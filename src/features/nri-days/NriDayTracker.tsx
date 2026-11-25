// src/features/nri-days/NriDayTracker.tsx
import { useState, useMemo, useEffect } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

type Residency = 'NRI' | 'RNOR' | 'ROR' | 'Deemed Resident';

interface TravelEntry {
  id: string;
  entryDate: string; // YYYY-MM-DD
  exitDate: string;  // YYYY-MM-DD
}

interface DayRecord {
  id: string;
  daysThisYear: number;
  daysPrev4: number;
  indianIncome: string;
  status: Residency;
  timestamp: string;
}

export default function NriDayTracker() {
  const { t } = useI18n();
  const { repos } = useData();

  // FY selection (defaults to current FY based on date)
  const currentFY = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    // Indian FY: April 1 to March 31
    if (m >= 4) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
    return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
  }, []);

  const [fy, setFy] = useState(currentFY);

  // Manual day inputs
  const [manualDays, setManualDays] = useState('0');
  const [manualPrev4, setManualPrev4] = useState('0');

  // Travel log
  const [travelEntries, setTravelEntries] = useState<TravelEntry[]>([]);
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');

  // Exclude arrival day (ITAT ruling)
  const [excludeArrival, setExcludeArrival] = useState(false);

  // Income & citizenship
  const [indianIncomeStr, setIndianIncomeStr] = useState('0');
  const [isIndianCitizen, setIsIndianCitizen] = useState(true);
  const [liableToTaxAbroad, setLiableToTaxAbroad] = useState(true);

  // History
  const [history, setHistory] = useState<DayRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void repos.preferences.get<DayRecord[]>('nri-days-history').then(h => setHistory(h ?? []));
  }, [repos]);

  // Day counting from travel log
  const computedDays = useMemo(() => {
    if (travelEntries.length === 0) return null;

    let totalDays = 0;
    for (const e of travelEntries) {
      if (!e.entryDate || !e.exitDate) continue;
      const start = new Date(e.entryDate);
      const end = new Date(e.exitDate);
      if (end < start) continue;

      // Both arrival and departure days count as full days by default.
      // If excludeArrival is true, subtract 1 for the arrival day.
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
      totalDays += excludeArrival ? diffDays - 1 : diffDays;
    }
    return totalDays;
  }, [travelEntries, excludeArrival]);

  // Effective days
  const effectiveDays = computedDays !== null ? computedDays : (parseInt(manualDays) || 0);
  const effectivePrev4 = parseInt(manualPrev4) || 0;
  const indianIncome = parseFloat(indianIncomeStr) || 0;

  // Residency determination (Updated for Income-tax Act, 2025)
  const residency = useMemo<{ status: Residency; reason: string; safeLimit: number | null }>(() => {
    const days = effectiveDays;
    const prev4 = effectivePrev4;

    // 1. Basic 182-day rule (Section 6(2)(a))
    if (days >= 182) {
      return {
        status: 'ROR',
        reason: 'Present in India for 182+ days in the tax year. Full resident with global income taxable.',
        safeLimit: null,
      };
    }

    // 2. 120-Day Rule for visiting Indian citizens / PIOs with high income (Section 6(5))
    // Applies if Indian income > ₹15L. The 60-day threshold is substituted by 120 days.
    const visitingThreshold = (isIndianCitizen && indianIncome > 1500000) ? 120 : 60;

    // Check cumulative general rule (60 days + 365 days) and special visiting rule
    const meetsCumulativeGeneral = days >= 60 && prev4 >= 365;
    const meetsCumulativeVisiting = isIndianCitizen && days >= visitingThreshold && prev4 >= 365;

    if (meetsCumulativeVisiting && days < 182) {
      return {
        status: 'RNOR',
        reason: `Meets the ${visitingThreshold}-day threshold (Section 6(5)) with 365+ days in preceding 4 years. Resident but Not Ordinarily Resident (RNOR).`,
        safeLimit: visitingThreshold - 1,
      };
    }

    if (!isIndianCitizen && meetsCumulativeGeneral) {
      return {
        status: 'ROR',
        reason: 'Meets the 60-day + 365-day test (Section 6(2)(b)). Full resident.',
        safeLimit: 59,
      };
    }

    // 3. Deemed Residency (Section 6(7)) - Overrides day count if conditions met
    if (isIndianCitizen && indianIncome > 1500000 && !liableToTaxAbroad) {
      return {
        status: 'Deemed Resident',
        reason: 'Deemed resident under Section 6(7): Indian citizen with Indian income > ₹15L and not liable to tax in any other country. Global income becomes taxable in India regardless of days stayed.',
        safeLimit: null,
      };
    }

    // 4. Otherwise, NRI
    const safeLimit = Math.max(0, visitingThreshold - 1 - days);
    return {
      status: 'NRI',
      reason: `Does not meet any resident test. You can stay up to ${safeLimit} more day${safeLimit === 1 ? '' : 's'} in India this tax year without triggering resident status${indianIncome > 1500000 ? ' (120-day threshold applies because Indian income > ₹15L)' : ''}.`,
      safeLimit,
    };
  }, [effectiveDays, effectivePrev4, indianIncome, isIndianCitizen, liableToTaxAbroad]);

  // Travel log handlers
  function addTravelEntry() {
    if (!entryDate || !exitDate) return;
    if (new Date(exitDate) < new Date(entryDate)) {
      alert('Exit date cannot be before entry date.');
      return;
    }
    const entry: TravelEntry = { id: uuid(), entryDate, exitDate };
    setTravelEntries(prev => [...prev, entry]);
    setEntryDate('');
    setExitDate('');
  }

  function removeTravelEntry(id: string) {
    setTravelEntries(prev => prev.filter(e => e.id !== id));
  }

  // History
  async function saveToHistory() {
    const rec: DayRecord = {
      id: uuid(),
      daysThisYear: effectiveDays,
      daysPrev4: effectivePrev4,
      indianIncome: indianIncomeStr,
      status: residency.status,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50);
    setHistory(updated);
    await repos.preferences.set('nri-days-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all day tracking history?')) return;
    setHistory([]);
    await repos.preferences.set('nri-days-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('nri-days-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.nriDays')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">
        Track your days in India and determine your tax residency status for Tax Year {fy}.
      </p>

      {/* FY Selector */}
      <Card className="mt-4">
        <Field label="Tax Year">
          <select className="select" value={fy} onChange={e => setFy(e.target.value)}>
            {[0, 1, 2, 3].map(offset => {
              const y = parseInt(currentFY.split('-')[0]) - offset;
              const fyStr = `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
              return <option key={fyStr} value={fyStr}>Tax Year {fyStr}</option>;
            })}
          </select>
        </Field>
      </Card>

      {/* TRAVEL LOG SECTION */}
      <Card className="mt-3">
        <h3>1. Travel Log (Optional but Recommended)</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Add each trip to India. The tool will sum the days automatically.
        </p>

        <div className="grid-2 mt-2">
          <Field label="Entry Date (Arrival)">
            <input className="input" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </Field>
          <Field label="Exit Date (Departure)">
            <input className="input" type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
          </Field>
        </div>
        <Button size="sm" onClick={addTravelEntry} className="mt-2">+ Add Trip</Button>

        {travelEntries.length > 0 && (
          <div className="list mt-3">
            {travelEntries.map(e => (
              <div key={e.id} className="list-item">
                <div>
                  <strong>{new Date(e.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  {' → '}
                  <strong>{new Date(e.exitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    {Math.round((new Date(e.exitDate).getTime() - new Date(e.entryDate).getTime()) / 86400000) + 1} days
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeTravelEntry(e.id)}>✕</Button>
              </div>
            ))}
          </div>
        )}

        <div className="row mt-3" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            id="excludeArrival"
            checked={excludeArrival}
            onChange={e => setExcludeArrival(e.target.checked)}
          />
          <label htmlFor="excludeArrival" style={{ fontSize: '0.85rem' }}>
            Exclude arrival day from count (per ITAT Delhi ruling)
          </label>
        </div>
        <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
          By default, both arrival and departure days count as full days. The ITAT Delhi has ruled that the day of arrival should be excluded while computing the period of stay (relying on Section 9 of the General Clauses Act). The Income Tax Department may still count both ways. Conservative approach: count both.
        </p>

        {computedDays !== null && (
          <div className="pill pill-brand mt-3" style={{ fontSize: '0.9rem' }}>
            Total days in India (from travel log): <strong>{computedDays}</strong>
          </div>
        )}
      </Card>

      {/* MANUAL OVERRIDE */}
      <Card className="mt-3">
        <h3>2. Manual Day Input</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          If you don't want to log every trip, enter the total directly.
        </p>
        <div className="grid-2 mt-2">
          <Field label="Days in India this tax year">
            <input
              className="input"
              type="number"
              value={computedDays !== null ? String(computedDays) : manualDays}
              onChange={e => setManualDays(e.target.value)}
              disabled={computedDays !== null}
            />
          </Field>
          <Field label="Days in India in preceding 4 tax years">
            <input className="input" type="number" value={manualPrev4} onChange={e => setManualPrev4(e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* CITIZENSHIP & INCOME */}
      <Card className="mt-3">
        <h3>3. Citizenship & Income</h3>
        <div className="grid-2 mt-2">
          <Field label="Indian Citizen / PIO?">
            <div className="tabbar">
              <button className={isIndianCitizen ? 'active' : ''} onClick={() => setIsIndianCitizen(true)}>Yes</button>
              <button className={!isIndianCitizen ? 'active' : ''} onClick={() => setIsIndianCitizen(false)}>No</button>
            </div>
          </Field>
          <Field label="Indian-source income (₹)">
            <input
              className="input"
              type="number"
              value={indianIncomeStr}
              onChange={e => setIndianIncomeStr(e.target.value)}
            />
          </Field>
          <Field label="Liable to tax in country of residence?">
            <div className="tabbar">
              <button className={liableToTaxAbroad ? 'active' : ''} onClick={() => setLiableToTaxAbroad(true)}>Yes</button>
              <button className={!liableToTaxAbroad ? 'active' : ''} onClick={() => setLiableToTaxAbroad(false)}>No</button>
            </div>
          </Field>
        </div>
      </Card>

      {/* RESULT */}
      <Card className="mt-3" style={{ borderLeft: `4px solid ${residency.status === 'NRI' ? 'var(--brand-500)' : residency.status === 'RNOR' ? 'var(--warning)' : 'var(--danger)'}` }}>
        <h3>Your Residency Status</h3>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>
          {residency.status}
        </div>
        <p className="muted mt-2">{residency.reason}</p>

        {residency.status === 'NRI' && residency.safeLimit !== null && (
          <div className="pill pill-brand mt-2" style={{ fontSize: '0.9rem' }}>
            ⏳ You can stay up to <strong>{residency.safeLimit}</strong> more day{residency.safeLimit === 1 ? '' : 's'} in India this tax year without becoming a resident.
          </div>
        )}

        {residency.status === 'RNOR' && (
          <div className="pill pill-warning mt-2" style={{ fontSize: '0.9rem' }}>
            RNOR: Foreign income is largely tax-exempt in India. This status can last 2–3 years after returning.
          </div>
        )}

        {residency.status === 'ROR' && (
          <div className="pill pill-danger mt-2" style={{ fontSize: '0.9rem' }}>
            ROR: Global income is taxable in India. Ensure you claim Foreign Tax Credit (Form 44) if applicable.
          </div>
        )}

        {residency.status === 'Deemed Resident' && (
          <div className="pill pill-danger mt-2" style={{ fontSize: '0.9rem' }}>
            ⚠️ Deemed Resident: You are treated as a resident even if you stayed 0 days in India. Global income taxable.
          </div>
        )}

        <Button variant="primary" className="mt-3" onClick={saveToHistory}>
          💾 Save to History
        </Button>
      </Card>

      {/* KEY RULES SUMMARY (Updated for Section 6(7)) */}
      <Card className="mt-3">
        <h3>Residency Tests at a Glance (Tax Year {fy})</h3>
        <div style={{ display: 'grid', gap: 8, marginTop: 8, fontSize: '0.85rem' }}>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>182-Day Rule (Section 6(2)(a))</strong>
            <span className="muted">All individuals. Stay ≥ 182 days → Resident.</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>60-Day Rule (Section 6(2)(b))</strong>
            <span className="muted">Stay ≥ 60 days this year + ≥ 365 days in preceding 4 years → Resident.</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>120-Day Rule (Section 6(5))</strong>
            <span className="muted">Indian citizen/PIO visiting India with Indian income {'>'} ₹15L. Stay ≥ 120 days + ≥ 365 days in preceding 4 years → RNOR (not full ROR).</span>
          </div>
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <strong>Deemed Residency (Section 6(7))</strong>
            <span className="muted">Indian citizen with Indian income {'>'} ₹15L and not liable to tax anywhere → Deemed Resident regardless of days in India.</span>
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
                  <strong>{h.status}</strong> · {h.daysThisYear} days
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    Prev 4 yrs: {h.daysPrev4} days · Indian income: ₹{h.indianIncome}
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
        <p><strong>Disclaimer:</strong> For informational purposes only. Residency is determined by the Income Tax Department based on your travel records. Consult a CA for definitive advice.</p>
        <p><strong>Tax Year {fy} rules:</strong> The Income-tax Act, 2025 applies from Tax Year 2026-27. The residency tests remain materially the same as the 1961 Act, but section numbering has changed (e.g., deemed residency is now Section 6(7)). Maintain passport stamps and boarding passes as evidence.</p>
      </div>
    </div>
  );
}