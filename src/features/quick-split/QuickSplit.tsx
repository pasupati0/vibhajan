import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field } from '../../components/ui';
import { Paise, rupeesToPaise, paiseToRupeesString } from '../../lib/money';
import { GstMode, computeGstExclusive } from '../../lib/gst';
import { allocateEqual, allocateByPercent, validateCustom } from '../../lib/allocation';
import { formatINR, todayISO } from '../../lib/format';
import { uuid, ME_ID } from '../../lib/id';
import { Expense } from '../../db/types';

type Mode = 'equal' | 'percent' | 'custom';
interface Row { id: string; name: string; pct: number; custom: Paise; }

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
  const { profile, groups, saveExpense } = useData();
  const navigate = useNavigate();

  const [totalStr, setTotalStr] = useState('');
  const [gstRate, setGstRate] = useState(0);
  const [gstMode, setGstMode] = useState<GstMode>('inclusive');
  const [rows, setRows] = useState<Row[]>([{ id: ME_ID, name: profile.name || 'You', pct: 100, custom: 0 }]);
  const [mode, setMode] = useState<Mode>('equal');
  const [paidBy, setPaidBy] = useState<string>(ME_ID);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(r => {
      const has = r.find(x => x.id === ME_ID);
      if (has) return r.map(x => (x.id === ME_ID ? { ...x, name: profile.name || 'You' } : x));
      return [{ id: ME_ID, name: profile.name || 'You', pct: 100, custom: 0 }, ...r];
    });
  }, [profile.name]);

  const total = useMemo<Paise>(() => {
    try { return rupeesToPaise(totalStr); } catch { return 0; }
  }, [totalStr]);

  const gst = useMemo(() => {
    if (total <= 0) return { total: 0, base: 0, gst: 0, rate: 0 };
    return gstMode === 'inclusive'
      ? { total, base: total, gst: 0, rate: 0 }
      : computeGstExclusive(total, gstRate);
  }, [total, gstRate, gstMode]);

  const allocations = useMemo<Paise[]>(() => {
    if (total <= 0 || rows.length === 0) return rows.map(() => 0);
    try {
      if (mode === 'equal') return allocateEqual(total, rows.length);
      if (mode === 'percent') return allocateByPercent(total, rows.map(r => r.pct || 0));
      return rows.map(r => r.custom);
    } catch { return rows.map(() => 0); }
  }, [total, mode, rows]);

  const allocatedSum = allocations.reduce((a, b) => a + b, 0);
  const remaining = total - allocatedSum;
  const customOk = mode !== 'custom' || validateCustom(total, allocations).ok;
  const pctSum = rows.reduce((s, r) => s + (r.pct || 0), 0);
  const pctOk = mode !== 'percent' || Math.abs(pctSum - 100) < 0.001;

  const canSave = total > 0 && rows.length >= 1 && rows.every(r => r.name.trim()) && customOk && pctOk && paidBy.length > 0 && remaining === 0;

  function addRow(name = '') {
    setRows(r => [...r, { id: uuid(), name, pct: 0, custom: 0 }]);
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
    const newRows = g.members.map(m => ({ id: m.id, name: m.name, pct: 0, custom: 0 }));
    if (!newRows.find(r => r.id === ME_ID)) {
      newRows.unshift({ id: ME_ID, name: profile.name || 'You', pct: 0, custom: 0 });
    }
    const pct = 100 / newRows.length;
    setRows(newRows.map(r => ({ ...r, pct })));
  }

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
        total: gst.total,
        gstRate: 0,
        gstMode: 'inclusive',
        gstBase: gst.base,
        gstAmount: 0,
        notes: '',
        participants: rows.map(r => ({ id: r.id, name: r.name.trim() })),
        payers: [{ participantId: paidBy, amount: gst.total }],
        allocations: rows.map((r, i) => ({ participantId: r.id, amount: allocations[i] })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveExpense(expense);

      const payerName = rows.find(r => r.id === paidBy)?.name || 'Someone';
      const debts: PreviewDebt[] = expense.allocations
        .filter(a => a.participantId !== paidBy && a.amount > 0)
        .map(a => ({
          debtorId: a.participantId,
          debtorName: rows.find(r => r.id === a.participantId)?.name || 'Unknown',
          amount: a.amount
        }));

      setPreviewData({
        id: expense.id,
        total: expense.total,
        payerId: paidBy,
        payerName: paidBy === ME_ID ? 'You' : payerName,
        debts,
      });
      setShowPreview(true);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fade-in">
      <h1>{t('qs.title')}</h1>
      <p className="muted">{t('qs.subtitle')}</p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label={gstMode === 'inclusive' ? t('qs.totalBill') : t('qs.totalBillExcl')}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="1180.00"
              value={totalStr}
              onChange={e => setTotalStr(e.target.value)}
            />
          </Field>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            {gstMode === 'exclusive' && (
              <Field label={t('qs.gstRate')}>
                <input
                  className="input"
                  inputMode="decimal"
                  type="number"
                  min={0}
                  step={0.01}
                  value={gstRate}
                  onChange={e => setGstRate(Number(e.target.value))}
                />
              </Field>
            )}
            <Field label={t('qs.gstMode')}>
              <div className="tabbar">
                <button className={gstMode === 'inclusive' ? 'active' : ''} onClick={() => setGstMode('inclusive')}>{t('qs.inclusive')}</button>
                <button className={gstMode === 'exclusive' ? 'active' : ''} onClick={() => setGstMode('exclusive')}>{t('qs.exclusive')}</button>
              </div>
            </Field>
          </div>
        </div>
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
                />
              )}
              {mode === 'custom' && (
                <input
                  className="input"
                  inputMode="decimal"
                  value={paiseToRupeesString(r.custom)}
                  onChange={e => {
                    try { updateRow(r.id, { custom: rupeesToPaise(e.target.value) }); } catch { /* ignore */ }
                  }}
                />
              )}
              <span className="mono" style={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>
                {formatINR(allocations[i] ?? 0)}
              </span>
              {r.id !== ME_ID && (
                <button className="btn btn-sm btn-ghost" onClick={() => removeRow(r.id)}>✕</button>
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
        </div>
      </Card>

      <Card>
        <h3>{t('qs.paidBy')}</h3>
        <select
          className="select mt-2"
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
        >
          {rows.map(r => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
        </select>
      </Card>

      {error && <div className="pill pill-danger mt-3">{error}</div>}

      <div className="mt-4">
        <Button variant="primary" block onClick={handleSplit} disabled={!canSave || saving}>
          ⚡ {t('qs.splitBill')}
        </Button>
      </div>

      {showPreview && previewData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 }}>
          <div className="card fade-in" style={{ maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-elevated)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Who owes whom</h2>
            <p className="muted" style={{ marginBottom: 16 }}>Saved automatically.</p>
            
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
            </div>

            <Button variant="primary" block style={{ marginTop: 24 }} onClick={() => { setShowPreview(false); navigate(`/expense/${previewData.id}`); }}>
              {t('common.done')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}