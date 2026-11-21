// src/features/currency/CurrencyConverter.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider';

interface ConversionRecord {
  id: string;
  amountINR: string;
  targetCurrency: string;
  rate: number;
  convertedAmount: number;
  timestamp: string;
}

export default function CurrencyConverter() {
  const { t } = useI18n();
  const { repos } = useData();

  const [amountStr, setAmountStr] = useState('1000');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history
  useEffect(() => {
    void repos.preferences.get<ConversionRecord[]>('currency-history').then(h => setHistory(h ?? []));
  }, [repos]);

  // Fetch available currencies (excluding INR, since it's the base)
  useEffect(() => {
    let cancelled = false;
    async function fetchCurrencies() {
      try {
        const res = await fetch('https://api.frankfurter.dev/v1/currencies');
        if (!res.ok) throw new Error('Failed to load currencies');
        const data: Record<string, string> = await res.json();
        if (!cancelled) {
          const list = Object.keys(data).filter(c => c !== 'INR').sort();
          setCurrencies(list);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Network error');
      }
    }
    fetchCurrencies();
    return () => { cancelled = true; };
  }, []);

  // Fetch latest rate for the selected target currency (with caching)
  const fetchRate = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check Cache
      const cached = localStorage.getItem(`rate-INR-${target}`);
      if (cached) {
        try {
          const { rate: cachedRate, date: cachedDate } = JSON.parse(cached);
          const today = new Date().toISOString().slice(0, 10);
          // Use cache if it's from today
          if (cachedDate === today) {
            setRate(cachedRate);
            setLastUpdated(cachedDate);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Ignore JSON parse errors and proceed to fetch
          console.warn('Failed to parse cached rate', e);
        }
      }

      // 2. Fetch from API if cache is stale or empty
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=INR&symbols=${target}`);
      if (!res.ok) throw new Error('Failed to fetch exchange rate');
      const data = await res.json();
      
      if (data?.rates?.[target]) {
        const newRate = data.rates[target];
        const newDate = data.date;
        setRate(newRate);
        setLastUpdated(newDate);
        
        // 3. Save to Cache
        localStorage.setItem(
          `rate-INR-${target}`, 
          JSON.stringify({ rate: newRate, date: newDate })
        );
      } else {
        throw new Error('Rate not available for selected currency');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not fetch exchange rate');
      setRate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currencies.length > 0 && targetCurrency) {
      void fetchRate(targetCurrency);
    }
  }, [targetCurrency, currencies.length, fetchRate]);

  const convertedAmount = useMemo(() => {
    const amt = parseFloat(amountStr) || 0;
    if (rate === null || amt <= 0) return null;
    return amt * rate;
  }, [amountStr, rate]);

  async function saveToHistory() {
    if (convertedAmount === null || rate === null) return;
    const rec: ConversionRecord = {
      id: uuid(),
      amountINR: amountStr,
      targetCurrency,
      rate,
      convertedAmount,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50);
    setHistory(updated);
    await repos.preferences.set('currency-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all currency conversion history?')) return;
    setHistory([]);
    await repos.preferences.set('currency-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('currency-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.currency')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">Convert Indian Rupees (INR) to major world currencies.</p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label="Amount in INR (₹)">
            <input
              className="input"
              type="number"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </Field>
          <Field label="Target Currency">
            <select
              className="select"
              value={targetCurrency}
              onChange={e => setTargetCurrency(e.target.value)}
              disabled={currencies.length === 0}
            >
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {loading && <Card className="mt-3"><p className="muted">Loading exchange rate…</p></Card>}
      {error && <Card className="mt-3"><p className="pill pill-danger">{error}</p></Card>}

      {!loading && !error && convertedAmount !== null && rate !== null && (
        <Card className="mt-3">
          <h3>Conversion</h3>
          <div style={{ marginTop: 8 }}>
            <div className="muted">You get</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }} className="mono">
              {convertedAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {targetCurrency}
            </div>
            <div className="muted" style={{ fontSize: '0.9rem', marginTop: 4 }}>
              1 INR = {rate.toFixed(6)} {targetCurrency}
              {lastUpdated && ` · Reference rate as of ${lastUpdated}`}
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
                  <strong>{formatINR(Math.round(parseFloat(h.amountINR) * 100))} → {h.targetCurrency}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {h.convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {h.targetCurrency} @ {h.rate.toFixed(4)}
                  </div>
                  <div className="muted" style={{ fontSize: '0.7rem' }}>
                    {new Date(h.timestamp).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteRecord(h.id)}>✕</Button>
              </div>
            ))}
            {history.length === 0 && <p className="muted">No saved conversions.</p>}
          </div>
        </Card>
      )}

      <div className="mt-4" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p>
          <strong>Disclaimer:</strong> For informational purposes only. Exchange rates are reference rates sourced from
          public providers (e.g., European Central Bank) and are not live market quotes. Rates update once or a few times
          per day. Confirm with your bank or authorized dealer for actual transaction rates.
        </p>
        <p>Data provided by <a href="https://frankfurter.dev" target="_blank" rel="noopener noreferrer">Frankfurter</a>.</p>
      </div>
    </div>
  );
}