// src/features/quick-split/QuickSplit.tsx
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field } from '../../components/ui';
import { Paise, rupeesToPaise } from '../../lib/money';
import { allocateEqual, allocateByPercent, validateCustom } from '../../lib/allocation';
import { formatINR, todayISO, formatDate } from '../../lib/format';
import { uuid, ME_ID } from '../../lib/id';
import { Expense } from '../../db/types';

type Mode = 'equal' | 'percent' | 'custom';
interface Row { id: string; name: string; pct: number; custom: string; }

interface PreviewDebt {
  debtorId: string;
  debtorName: string;
  amount: Paise;
}

interface PreviewData {
  id: string;
  total: Paise;
  payerId: string;
  payerName: string;
  debts: PreviewDebt[];
}

export default function QuickSplit() {
  const { t } = useI18n();
  const { profile, groups, saveExpense, expenses, deleteExpense } = useData();

  // Form State
  const [totalStr, setTotalStr] = useState('');
  const [gstRateStr, setGstRateStr] = useState('0');
  // Updated custom to string to allow smooth typing (e.g. ".14")
  const [rows, setRows] = useState<Row[]>([{ id: ME_ID, name: profile.name || 'You', pct: 100, custom: '0' }]);
  const [mode, setMode] = useState<Mode>('equal');
  const [paidBy, setPaidBy] = useState<string>(ME_ID);

  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setRows(r => {
      const has = r.find(x => x.id === ME_ID);
      if (has) return r.map(x => (x.id === ME_ID ? { ...x, name: profile.name || 'You' } : x));
      return [{ id: ME_ID, name: profile.name || 'You', pct: 100, custom: '0' }, ...r];
    });
  }, [profile.name]);

  // Calculations
  const total = useMemo<Paise>(() => {
    try { return rupeesToPaise(totalStr); } catch { return 0; }
  }, [totalStr]);

  const gstRate = useMemo(() => Math.max(0, Number(gstRateStr) || 0), [gstRateStr]);

  const { baseAmount, gstAmount, gstShares } = useMemo(() => {
    if (total <= 0 || rows.length === 0) {
      return { baseAmount: 0, gstAmount: 0, gstShares: [] };
    }
    // Standard legal extraction: Total - (Total / 1.rate)
    const gst = Math.round(total - (total / (1 + (gstRate / 100))));
    const base = total - gst;
    // Divide GST equally among all participants with exact remainder distribution
    const shares = allocateEqual(gst, rows.length);
    return { baseAmount: base, gstAmount: gst, gstShares: shares };
  }, [total, gstRate, rows.length]);

  const parsedCustoms = useMemo(() => {
    return rows.map(r => {
      try { return rupeesToPaise(r.custom); } catch { return 0; }
    });
  }, [rows]);

  const allocations = useMemo<Paise[]>(() => {
    if (total <= 0 || rows.length === 0) return rows.map(() => 0);
    try {
      let baseAllocations: Paise[] = [];
      if (mode === 'equal') {
        return allocateEqual(total, rows.length);
      } 
      if (mode === 'percent') {
        baseAllocations = allocateByPercent(baseAmount, rows.map(r => r.pct || 0));
      } else {
        baseAllocations = parsedCustoms;
      }
      return baseAllocations.map((a, i) => a + (gstShares[i] || 0));
    } catch { return rows.map(() => 0); }
  }, [total, baseAmount, mode, rows, gstShares, parsedCustoms]);

  const allocatedSum = allocations.reduce((a, b) => a + b, 0);
  const remaining = total - allocatedSum;
  const customOk = mode !== 'custom' || validateCustom(baseAmount, parsedCustoms).ok;
  const pctSum = rows.reduce((s, r) => s + (r.pct || 0), 0);
  const pctOk = mode !== 'percent' || Math.abs(pctSum - 100) < 0.001;

  const canSave =
    total > 0 &&
    rows.length >= 1 &&
    rows.every(r => r.name.trim()) &&
    customOk &&
    pctOk &&
    paidBy.length > 0 &&
    allocations.every(a => a >= 0);

  // Handlers
  function addRow(name = '') {
    setRows(r => [...r, { id: uuid(), name, pct: 0, custom: '0' }]);
  }
  function updateRow(id: string, patch: Partial<Row>) {
    setRows(r => r.map(x => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeRow(id: string) {
    if (id === ME_ID) return;
    setRows(r => r.filter(x => x.id !== id));
    if (paidBy === id) setPaidBy(ME_ID);
  }

  function handleLoadGroup(e: React.ChangeEvent<HTMLSelectElement>) {
    const g = groups.find(x => x.id === e.target.value);
    if (!g) return;
    const newRows = g.members.map(m => ({ id: m.id, name: m.name, pct: 0, custom: '0' }));
    if (!newRows.find(r => r.id === ME_ID)) {
      newRows.unshift({ id: ME_ID, name: profile.name || 'You', pct: 0, custom: '0' });
    }
    const pct = 100 / newRows.length;
    setRows(newRows.map(r => ({ ...r, pct })));
  }

  const buildPreviewData = (exp: Expense): PreviewData => {
    const payerId = exp.payers[0]?.participantId || '';
    const payerName = exp.participants.find(p => p.id === payerId)?.name || 'Someone';
    const debts = exp.allocations
      .filter(a => a.participantId !== payerId && a.amount > 0)
      .map(a => ({
        debtorId: a.participantId,
        debtorName: exp.participants.find(p => p.id === a.participantId)?.name || 'Unknown',
        amount: a.amount
      }));

    return {
      id: exp.id,
      total: exp.total,
      payerId,
      payerName: payerId === ME_ID ? 'You' : payerName,
      debts,
    };
  };

  async function handleSplit() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const expense: Expense = {
        id: uuid(),
        description: 'Quick Split',
        category: 'other',
        date: todayISO(),
        total: total,
        gstRate: gstRate,
        gstMode: 'inclusive',
        gstBase: baseAmount,
        gstAmount: gstAmount,
        notes: '',
        participants: rows.map(r => ({ id: r.id, name: r.name.trim() })),
        payers: [{ participantId: paidBy, amount: total }],
        allocations: rows.map((r, i) => ({ participantId: r.id, amount: allocations[i] })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveExpense(expense);

      setPreviewData(buildPreviewData(expense));
      setIsHistoricalView(false);
      setShowPreview(true);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTotalStr('');
    setGstRateStr('0');
    setRows([{ id: ME_ID, name: profile.name || 'You', pct: 100, custom: '0' }]);
    setMode('equal');
    setPaidBy(ME_ID);
  }

  function handleDone() {
    setShowPreview(false);
    if (!isHistoricalView) {
      resetForm();
    }
    setPreviewData(null);
  }

  function openHistoricalPreview(expense: Expense) {
    setPreviewData(buildPreviewData(expense));
    setIsHistoricalView(true);
    setShowPreview(true);
  }

  async function clearAllHistory() {
    if (!confirm('Clear all Quick Split history? This cannot be undone.')) return;
    for (const s of pastSplits) {
      await deleteExpense(s.id);
    }
  }

  const pastSplits = expenses.filter(e => e.description === 'Quick Split').sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('tool.quickSplit')}</h1>
        <Button size="sm" onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>
      <p className="muted">{t('qs.subtitle')}</p>

      <Card className="mt-4">
        {/* Added alignItems: 'start' to fix input height mismatch */}
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Field label={t('qs.totalBill')}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="1180.00"
              value={totalStr}
              onChange={e => setTotalStr(e.target.value)}
            />
          </Field>
          <Field label={t('qs.gstRate')} hint="Divides equally among participants">
            <input
              className="input"
              inputMode="decimal"
              type="number"
              min={0}
              step={0.01}
              value={gstRateStr}
              onChange={e => setGstRateStr(e.target.value)}
            />
          </Field>
        </div>

        {total > 0 && gstRate > 0 && (
          <div className="row mt-3" style={{ gap: 20 }}>
            <span className="muted">{t('qs.base')}: <strong className="mono">{formatINR(baseAmount)}</strong></span>
            <span className="muted">{t('qs.gst')}: <strong className="mono">{formatINR(gstAmount)}</strong></span>
          </div>
        )}
      </Card>

      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>{t('qs.participants')}</h3>
          <div className="row" style={{ flex: '0 0 auto', gap: 8 }}>
            {groups.length > 0 && (
              <select
                className="select"
                style={{ width: 'auto', minHeight: 36, padding: '4px 30px 4px 12px', fontSize: '0.85rem' }}
                onChange={handleLoadGroup}
                value=""
              >
                <option value="" disabled>{t('qs.loadGroup')}</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
            <Button size="sm" onClick={() => addRow()}>+ {t('qs.addParticipant')}</Button>
          </div>
        </div>

        <div className="list mt-3">
          {rows.map((r, i) => (
            <div key={r.id} className="split-row">
              <input
                className="input"
                style={{ maxWidth: 'none', textAlign: 'left' }}
                placeholder="Name"
                value={r.name}
                onChange={e => updateRow(r.id, { name: e.target.value })}
                aria-label="Participant name"
              />
              {mode === 'percent' && (
                <input
                  className="input"
                  inputMode="decimal"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={r.pct}
                  onChange={e => updateRow(r.id, { pct: Number(e.target.value) })}
                  aria-label="Percent"
                />
              )}
              {mode === 'custom' && (
                <input
                  className="input"
                  inputMode="decimal"
                  // Changed to raw string input to allow typing decimals naturally
                  value={r.custom}
                  onChange={e => updateRow(r.id, { custom: e.target.value })}
                  aria-label="Custom amount"
                />
              )}
              <span className="mono" style={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>
                {formatINR(allocations[i] ?? 0)}
              </span>
              {r.id !== ME_ID && (
                <button className="btn btn-sm btn-ghost" onClick={() => removeRow(r.id)} aria-label="Remove">✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>{t('qs.splitMode')}</div>
          <div className="tabbar" style={{ width: 'fit-content' }}>
            <button className={mode === 'equal' ? 'active' : ''} onClick={() => setMode('equal')}>{t('qs.equal')}</button>
            <button className={mode === 'percent' ? 'active' : ''} onClick={() => setMode('percent')}>{t('qs.percent')}</button>
            <button className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>{t('qs.custom')}</button>
          </div>
        </div>

        <div className="mt-3">
          {remaining !== 0 && (
            <div className="pill pill-danger" role="alert">
              {remaining > 0 ? `${t('qs.remaining')}: ${formatINR(remaining)}` : `${t('qs.over')}: ${formatINR(-remaining)}`}
            </div>
          )}
          {mode === 'percent' && !pctOk && (
            <div className="pill pill-warning mt-2">Percentages must sum to 100 (currently {pctSum})</div>
          )}
          {mode === 'custom' && !customOk && (
            <div className="pill pill-warning mt-2">Custom amounts must equal the Base Amount ({formatINR(baseAmount)})</div>
          )}
        </div>
      </Card>

      <Card>
        <h3>{t('qs.paidBy')}</h3>
        <select
          className="select mt-2"
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          aria-label={t('qs.paidBy')}
        >
          {rows.map(r => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
        </select>
      </Card>

      <div className="mt-4">
        <Button variant="primary" block onClick={handleSplit} disabled={!canSave || saving}>
          ⚡ {t('qs.splitBill')}
        </Button>
      </div>

      {error && <div className="pill pill-danger mt-3">{error}</div>}

      {showHistory && (
        <Card className="mt-4">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Past Splits</h3>
            <Button size="sm" variant="danger" onClick={clearAllHistory}>Clear All</Button>
          </div>
          <div className="list mt-2">
            {pastSplits.map(s => (
              <div 
                key={s.id} 
                className="list-item" 
                onClick={() => openHistoricalPreview(s)} 
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <strong>{formatDate(s.date)}</strong> · {s.participants.length} people
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    Paid by {s.participants.find(p => p.id === s.payers[0]?.participantId)?.name || 'Unknown'}
                  </div>
                </div>
                <div className="row" style={{ flex: '0 0 auto', gap: 8 }}>
                  <span className="mono" style={{ fontWeight: 700 }}>{formatINR(s.total)}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      deleteExpense(s.id);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
            {pastSplits.length === 0 && <p className="muted">No saved splits.</p>}
          </div>
        </Card>
      )}

      <div style={{ height: 'var(--space-6)' }} />

      {/* Split Bill Preview Modal */}
      {showPreview && previewData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 }}>
          <div className="card fade-in" style={{ maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-elevated)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Who owes whom</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              {isHistoricalView ? 'Historical record' : 'Saved automatically.'}
            </p>
            
            <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
                <span>{previewData.payerName} paid</span>
                <span className="mono">{formatINR(previewData.total)}</span>
              </div>
            </div>

            <div className="list" style={{ gap: 8 }}>
              {previewData.debts.map(d => (
                <div key={d.debtorId} className="list-item" style={{ padding: '10px 14px', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{d.debtorName}</span>
                    <strong className="mono">{formatINR(d.amount)}</strong>
                  </div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    owes {previewData.payerId === ME_ID ? 'You' : previewData.payerName}
                  </div>
                </div>
              ))}
              {previewData.debts.length === 0 && (
                <div className="muted" style={{ textAlign: 'center', padding: '16px 0' }}>
                  No one owes anything.
                </div>
              )}
            </div>

            <Button variant="primary" block style={{ marginTop: 24 }} onClick={handleDone}>
              {t('common.done')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}