// src/features/currency/CurrencyConverter.tsx
import { useState, useEffect, useCallback } from 'react';
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

  const [inrAmount, setInrAmount] = useState('1000');
  const [targetAmount, setTargetAmount] = useState('');
  
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

  // Fetch available currencies
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

  // Fetch latest rate
  const fetchRate = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      // Check Cache
      const cached = localStorage.getItem(`rate-INR-${target}`);
      if (cached) {
        const { rate: cachedRate, date } = JSON.parse(cached);
        const today = new Date().toISOString().slice(0, 10);
        if (date === today) {
          setRate(cachedRate);
          setLastUpdated(date);
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=INR&symbols=${target}`);
      if (!res.ok) throw new Error('Failed to fetch exchange rate');
      const data = await res.json();
      
      if (data?.rates?.[target]) {
        setRate(data.rates[target]);
        setLastUpdated(data.date);
        localStorage.setItem(`rate-INR-${target}`, JSON.stringify({ rate: data.rates[target], date: data.date }));
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

  // Update Target Amount when Rate loads or currency changes
  useEffect(() => {
    if (rate !== null && inrAmount) {
      const num = parseFloat(inrAmount);
      if (!isNaN(num)) {
        setTargetAmount((num * rate).toFixed(2));
      }
    }
  }, [rate, targetCurrency]); // Note: deliberately not including inrAmount to avoid overwriting user typing

  const handleInrChange = (val: string) => {
    setInrAmount(val);
    if (rate !== null) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        setTargetAmount((num * rate).toFixed(2));
      } else {
        setTargetAmount('');
      }
    }
  };

  const handleTargetChange = (val: string) => {
    setTargetAmount(val);
    if (rate !== null) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        setInrAmount((num / rate).toFixed(2));
      } else {
        setInrAmount('');
      }
    }
  };

  async function saveToHistory() {
    if (rate === null || !inrAmount || !targetAmount) return;
    const rec: ConversionRecord = {
      id: uuid(),
      amountINR: inrAmount,
      targetCurrency,
      rate,
      convertedAmount: parseFloat(targetAmount),
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
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Field label="Amount in INR (₹)">
            <input
              className="input"
              type="number"
              value={inrAmount}
              onChange={e => handleInrChange(e.target.value)}
            />
          </Field>
          
          <Field label={`Amount in ${targetCurrency}`}>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                type="number"
                value={targetAmount}
                onChange={e => handleTargetChange(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="select"
                value={targetCurrency}
                onChange={e => setTargetCurrency(e.target.value)}
                disabled={currencies.length === 0}
                style={{ flex: '0 0 100px' }}
              >
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Field>
        </div>
      </Card>

      {loading && <Card className="mt-3"><p className="muted">Loading exchange rate…</p></Card>}
      {error && <Card className="mt-3"><p className="pill pill-danger">{error}</p></Card>}

      {!loading && !error && rate !== null && (
        <Card className="mt-3">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                1 INR = {rate.toFixed(6)} {targetCurrency}
                {lastUpdated && ` · Reference rate as of ${lastUpdated}`}
              </div>
            </div>
            <Button variant="primary" onClick={saveToHistory}>
              💾 Save to History
            </Button>
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