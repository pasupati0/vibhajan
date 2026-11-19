import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field, Pill } from '../../components/ui';
import {  Payment, PaymentMethod } from '../../db/types';
import { formatINR, formatDate, todayISO } from '../../lib/format';
import { expenseStatus, PaymentStatus } from '../../lib/balance';
import { rupeesToPaise } from '../../lib/money';
import { uuid } from '../../lib/id';

function StatusPill({ s }: { s: PaymentStatus }) {
  const { t } = useI18n();
  if (s === 'paid') return <Pill kind="success">{t('status.paid')}</Pill>;
  if (s === 'partial') return <Pill kind="warning">{t('status.partial')}</Pill>;
  return <Pill kind="danger">{t('status.unpaid')}</Pill>;
}

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { expenses, payments, savePayment, deleteExpense, repos } = useData();
  const nav = useNavigate();

  const expense = useMemo(() => expenses.find(e => e.id === id), [expenses, id]);
  const expensePayments = useMemo(() => payments.filter(p => p.expenseId === id), [payments, id]);

  const [photo, setPhoto] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [payFrom, setPayFrom] = useState<string>('');
  const [payTo, setPayTo] = useState<string>('');
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi');
  const [payDate, setPayDate] = useState(todayISO());

  useEffect(() => {
    if (!expense?.attachmentId) { setPhoto(null); return; }
    let url: string | null = null;
    void repos.attachments.get(expense.attachmentId).then(a => {
      if (a) { url = URL.createObjectURL(a.blob); setPhoto(url); }
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [expense?.attachmentId, repos]);

  if (!expense) return <p className="muted">Not found. <a href="/history">History</a></p>;

  const nameById = new Map(expense.participants.map(p => [p.id, p.name]));
  const status = expenseStatus(expense, expensePayments, nameById);

  async function recordPayment() {
    if (!expense) return;
    if (!payFrom || !payTo || payFrom === payTo) return;
    let amt = 0;
    try { amt = rupeesToPaise(payAmt); } catch { return; }
    if (amt <= 0) return;
    const p: Payment = {
      id: uuid(), expenseId: expense.id, fromId: payFrom, toId: payTo,
      amount: amt, method: payMethod, date: payDate,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await savePayment(p);
    setShowPay(false); setPayAmt('');
  }

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{expense.description}</h1>
        <StatusPill s={status.overall} />
      </div>
      <p className="muted">{formatDate(expense.date)} · {expense.category}</p>

      <div className="grid-2 mt-4">
        <Card>
          <h3>{t('qs.totalBill')}</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800 }} className="mono">{formatINR(expense.total)}</div>
          <div className="muted">Base: {formatINR(expense.gstBase)} · GST: {formatINR(expense.gstAmount)} ({expense.gstRate}%)</div>
          {expense.notes && <p className="mt-2">{expense.notes}</p>}
        </Card>
        {photo && (
          <Card>
            <h3>{t('qs.attachBill')}</h3>
            <img src={photo} alt="Bill" style={{ maxWidth: '100%', borderRadius: 12, marginTop: 8 }} />
          </Card>
        )}
      </div>

      <Card className="mt-3">
        <h3>{t('qs.participants')}</h3>
        <div className="list mt-2">
          {status.participants.map(s => (
            <div key={s.participantId} className="list-item">
              <div>
                <strong>{s.name}</strong>
                <div className="muted" style={{ fontSize: '0.82rem' }}>
                  {t('exp.allocation')}: {formatINR(s.allocation)} · {t('exp.contributed')}: {formatINR(s.contributed)} · {t('exp.outstanding')}: {formatINR(s.outstanding)}
                </div>
              </div>
              <StatusPill s={s.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>{t('exp.payments')}</h3>
          <Button size="sm" onClick={() => { setPayFrom(''); setPayTo(''); setShowPay(v => !v); }}>
            {t('exp.recordPayment')}
          </Button>
        </div>

        {showPay && (
          <div className="mt-3" style={{ display: 'grid', gap: 10 }}>
            <div className="row">
              <Field label="From"><select className="select" value={payFrom} onChange={e => setPayFrom(e.target.value)}>
                <option value="">—</option>
                {expense.participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></Field>
              <Field label="To"><select className="select" value={payTo} onChange={e => setPayTo(e.target.value)}>
                <option value="">—</option>
                {expense.participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></Field>
            </div>
            <div className="row">
              <Field label={t('common.amount')}><input className="input" inputMode="decimal" value={payAmt} onChange={e => setPayAmt(e.target.value)} /></Field>
              <Field label="Method">
                <select className="select" value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}>
                  {(['upi', 'cash', 'bank', 'other'] as PaymentMethod[]).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label={t('common.date')}><input className="input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></Field>
            </div>
            <Button variant="primary" onClick={recordPayment}>✓ {t('common.save')}</Button>
          </div>
        )}

        <div className="list mt-3">
          {expensePayments.map(p => (
            <div key={p.id} className="list-item">
              <div>
                <strong>{nameById.get(p.fromId)} → {nameById.get(p.toId)}</strong>
                <div className="muted" style={{ fontSize: '0.82rem' }}>{formatDate(p.date)} · {p.method}</div>
              </div>
              <span className="mono">{formatINR(p.amount)}</span>
            </div>
          ))}
          {expensePayments.length === 0 && <p className="muted">—</p>}
        </div>
      </Card>

      <div className="mt-4">
        <Button variant="danger" onClick={async () => {
          if (confirm(t('exp.deleteConfirm'))) { await deleteExpense(expense.id); nav('/history'); }
        }}>{t('common.delete')}</Button>
      </div>
    </div>
  );
}