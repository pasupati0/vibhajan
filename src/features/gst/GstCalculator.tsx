// src/features/gst/GstCalculator.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card, Field, Button } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { rupeesToPaise } from '../../lib/money';
import { uuid } from '../../lib/id';
import { useData } from '../../context/DataProvider';
import { useI18n } from '../../i18n/I18nProvider'; // <-- Added missing import

const GST_RATES = [0, 5, 18, 40];

interface GstRecord {
  id: string;
  amount: string;
  rate: number;
  mode: 'inclusive' | 'exclusive';
  type: 'intra' | 'inter';
  timestamp: string;
}

export default function GstCalculator() {
  const { t } = useI18n();
  const { repos } = useData();

  const [amountStr, setAmountStr] = useState('1000');
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [type, setType] = useState<'intra' | 'inter'>('intra');
  const [history, setHistory] = useState<GstRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from IndexedDB
  useEffect(() => {
    void repos.preferences.get<GstRecord[]>('gst-history').then(h => setHistory(h ?? []));
  }, [repos]);

  const result = useMemo(() => {
    let base = 0;
    let gst = 0;
    let total = 0;
    try {
      const inputPaise = rupeesToPaise(amountStr);
      if (inputPaise <= 0) return null;

      if (mode === 'exclusive') {
        base = inputPaise;
        gst = Math.round((base * rate) / 100);
        total = base + gst;
      } else {
        total = inputPaise;
        base = Math.round((total * 100) / (100 + rate));
        gst = total - base;
      }
    } catch { return null; }

    const cgst = type === 'intra' ? Math.round(gst / 2) : 0;
    const sgst = type === 'intra' ? gst - cgst : 0;
    const igst = type === 'inter' ? gst : 0;

    return { base, gst, total, cgst, sgst, igst };
  }, [amountStr, rate, mode, type]);

  async function saveToHistory() {
    if (!result) return;
    const rec: GstRecord = {
      id: uuid(),
      amount: amountStr,
      rate,
      mode,
      type,
      timestamp: new Date().toISOString(),
    };
    const updated = [rec, ...history].slice(0, 50); // keep last 50
    setHistory(updated);
    await repos.preferences.set('gst-history', updated);
  }

  async function clearHistory() {
    if (!confirm('Clear all GST history?')) return;
    setHistory([]);
    await repos.preferences.set('gst-history', []);
  }

  async function deleteRecord(id: string) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await repos.preferences.set('gst-history', updated);
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.gst')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">Calculate GST (inclusive or exclusive) with CGST/SGST/IGST breakdown.</p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label={mode === 'inclusive' ? 'Total Amount (incl. GST)' : 'Amount (excl. GST)'}>
            <input
              className="input"
              inputMode="decimal"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </Field>
          <Field label="GST Rate (%)">
            <select className="select" value={rate} onChange={e => setRate(Number(e.target.value))}>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </Field>
          <Field label="Mode">
            <div className="tabbar">
              <button className={mode === 'exclusive' ? 'active' : ''} onClick={() => setMode('exclusive')}>Exclusive</button>
              <button className={mode === 'inclusive' ? 'active' : ''} onClick={() => setMode('inclusive')}>Inclusive</button>
            </div>
          </Field>
          <Field label="Transaction Type">
            <div className="tabbar">
              <button className={type === 'intra' ? 'active' : ''} onClick={() => setType('intra')}>Intra-State (CGST+SGST)</button>
              <button className={type === 'inter' ? 'active' : ''} onClick={() => setType('inter')}>Inter-State (IGST)</button>
            </div>
          </Field>
        </div>
      </Card>

      {result && (
        <Card className="mt-3">
          <h3>Breakdown</h3>
          <div className="grid-2 mt-2">
            <div>
              <div className="muted">Taxable Value</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }} className="mono">
                {formatINR(result.base)}
              </div>
            </div>
            <div>
              <div className="muted">Total GST</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }} className="mono">
                {formatINR(result.gst)}
              </div>
            </div>
            {type === 'intra' ? (
              <>
                <div>
                  <div className="muted">CGST</div>
                  <div style={{ fontWeight: 600 }} className="mono">{formatINR(result.cgst)}</div>
                </div>
                <div>
                  <div className="muted">SGST/UTGST</div>
                  <div style={{ fontWeight: 600 }} className="mono">{formatINR(result.sgst)}</div>
                </div>
              </>
            ) : (
              <div>
                <div className="muted">IGST</div>
                <div style={{ fontWeight: 600 }} className="mono">{formatINR(result.igst)}</div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="muted">Final Amount</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }} className="mono">
                {formatINR(result.total)}
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
                  <strong>₹{h.amount}</strong> · {h.rate}% · {h.mode} · {h.type === 'intra' ? 'Intra' : 'Inter'}
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
        <p><strong>Disclaimer:</strong> For informational purposes only. Verify with a tax professional.</p>
        <p>Rates effective from 22 September 2025 (GST 2.0).</p>
      </div>
    </div>
  );
}