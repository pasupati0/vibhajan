import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field } from '../../components/ui';
import { Paise, rupeesToPaise, paiseToRupeesString } from '../../lib/money';
import { GstMode, computeGstInclusive, computeGstExclusive } from '../../lib/gst';
import { allocateEqual, allocateByPercent, validateCustom } from '../../lib/allocation';
import { formatINR, todayISO } from '../../lib/format';
import { uuid, ME_ID } from '../../lib/id';
import { Category, Expense, Participant } from '../../db/types';
import { compressImage } from '../../lib/image';

type Mode = 'equal' | 'percent' | 'custom';

interface Row { id: string; name: string; pct: number; custom: Paise; }

const CATEGORIES: Category[] = ['food', 'rent', 'travel', 'shopping', 'fuel', 'utilities', 'entertainment', 'other'];

export default function QuickSplit() {
  const { t } = useI18n();
  const { profile, groups, saveExpense, repos } = useData();
  const navigate = useNavigate();

  const [totalStr, setTotalStr] = useState('');
  const [gstRate, setGstRate] = useState(0);
  const [gstMode, setGstMode] = useState<GstMode>('inclusive');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [groupId, setGroupId] = useState<string>('');

  const [rows, setRows] = useState<Row[]>([{ id: ME_ID, name: profile.name || 'You', pct: 100, custom: 0 }]);
  const [mode, setMode] = useState<Mode>('equal');
  const [paidBy, setPaidBy] = useState<string>(ME_ID);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
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
    if (total <= 0) return { total: 0, base: 0, gst: 0, rate: gstRate };
    return gstMode === 'inclusive' ? computeGstInclusive(total, gstRate) : computeGstExclusive(total, gstRate);
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

  const canSave =
    total > 0 &&
    rows.length >= 1 &&
    rows.every(r => r.name.trim()) &&
    customOk &&
    pctOk &&
    paidBy.length > 0 &&
    allocations.every(a => a >= 0);

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

  async function onPickFile(f: File | null) {
    setFile(f);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      // ensure paidBy participant exists
      const payerRow = rows.find(r => r.id === paidBy);
      if (!payerRow) throw new Error('Payer missing');

      let attachmentId: string | undefined;
      if (file) {
        const blob = await compressImage(file);
        attachmentId = uuid();
        await repos.attachments.save({
          id: attachmentId, mime: 'image/jpeg', size: blob.size, blob, createdAt: new Date().toISOString(),
        });
      }

      const participants: Participant[] = rows.map(r => ({ id: r.id, name: r.name.trim() }));
      const gstBreakdown = gstMode === 'inclusive'
        ? computeGstInclusive(total, gstRate)
        : computeGstExclusive(total, gstRate);

      const expense: Expense = {
        id: uuid(),
        groupId: groupId || undefined,
        description: description.trim() || 'Expense',
        total: gstBreakdown.total,
        gstRate,
        gstMode,
        gstBase: gstBreakdown.base,
        gstAmount: gstBreakdown.gst,
        category,
        date,
        notes: notes.trim() || undefined,
        participants,
        payers: [{ participantId: paidBy, amount: total }],
        allocations: rows.map((r, i) => ({ participantId: r.id, amount: allocations[i] })),
        attachmentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveExpense(expense);
      navigate(`/expense/${expense.id}`);
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
          <Field label={t('qs.totalBill')}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="1180.00"
              value={totalStr}
              onChange={e => setTotalStr(e.target.value)}
              aria-label={t('qs.totalBill')}
            />
          </Field>
          <div className="row" style={{ alignItems: 'flex-end' }}>
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
            <Field label={t('qs.gstMode')}>
              <div className="tabbar">
                <button className={gstMode === 'inclusive' ? 'active' : ''} onClick={() => setGstMode('inclusive')}>{t('qs.inclusive')}</button>
                <button className={gstMode === 'exclusive' ? 'active' : ''} onClick={() => setGstMode('exclusive')}>{t('qs.exclusive')}</button>
              </div>
            </Field>
          </div>
        </div>

        {total > 0 && (
          <div className="row mt-3" style={{ gap: 20 }}>
            <span className="muted">{t('qs.base')}: <strong className="mono">{formatINR(gst.base)}</strong></span>
            <span className="muted">{t('qs.gst')}: <strong className="mono">{formatINR(gst.gst)}</strong></span>
            <span className="muted">{t('qs.totalBill')}: <strong className="mono">{formatINR(gst.total)}</strong></span>
          </div>
        )}
      </Card>

      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>{t('qs.participants')}</h3>
          <Button size="sm" onClick={() => addRow()}>+ {t('qs.addParticipant')}</Button>
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
                  value={paiseToRupeesString(r.custom)}
                  onChange={e => {
                    try { updateRow(r.id, { custom: rupeesToPaise(e.target.value) }); } catch { /* ignore */ }
                  }}
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

        <div className="row mt-3" style={{ justifyContent: 'space-between' }}>
          <div className="tabbar" style={{ flex: '0 0 auto' }}>
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

      <Card>
        <div className="grid-2">
          <Field label={t('common.description')}>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Dinner at..." />
          </Field>
          <Field label={t('common.category')}>
            <select className="select" value={category} onChange={e => setCategory(e.target.value as Category)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={t('common.date')}>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Group (optional)">
            <select className="select" value={groupId} onChange={e => setGroupId(e.target.value)}>
              <option value="">— None —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t('common.notes')}>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>

        <Field label={t('qs.attachBill')}>
          <input type="file" accept="image/*" capture="environment" onChange={e => onPickFile(e.target.files?.[0] ?? null)} />
          {filePreview && <img src={filePreview} alt="Bill preview" style={{ marginTop: 8, maxHeight: 180, borderRadius: 12 }} />}
        </Field>
      </Card>

      {error && <div className="pill pill-danger mt-3">{error}</div>}

      <div className="mt-4">
        <Button variant="primary" block disabled={!canSave || saving} onClick={handleSave}>
          {saving ? '…' : t('qs.saveExpense')}
        </Button>
      </div>
      <div style={{ height: 'var(--space-6)' }} />
    </div>
  );
}