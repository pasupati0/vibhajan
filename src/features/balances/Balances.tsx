import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field } from '../../components/ui';
import { computePairwise, myBalances } from '../../lib/balance';
import { formatINR } from '../../lib/format';
import { rupeesToPaise } from '../../lib/money';
import { Payment } from '../../db/types';
import { uuid } from '../../lib/id';
import { todayISO } from '../../lib/format';

export default function Balances() {
  const { t } = useI18n();
  const { expenses, payments, groups, savePayment } = useData();

  const pairwise = useMemo(() => computePairwise(expenses, payments), [expenses, payments]);
  const me = useMemo(() => myBalances(pairwise), [pairwise]);

  const [settleWith, setSettleWith] = useState<string | null>(null);
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState<'upi' | 'cash' | 'bank' | 'other'>('upi');
  const [note, setNote] = useState('');

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of expenses) for (const p of e.participants) m.set(p.id, p.name);
    for (const g of groups) for (const p of g.members) m.set(p.id, p.name);
    m.set('me', 'You');
    return m;
  }, [expenses, groups]);

  async function settle() {
    if (!settleWith) return;
    let amount = 0;
    try { amount = rupeesToPaise(amt); } catch { return; }
    if (amount <= 0) return;
    // Determine direction: if other owes me → from=other,to=me; else from=me,to=other
    const otherOwesMe = me.owesMe.get(settleWith) ?? 0;
    const iOweOther = me.iOwe.get(settleWith) ?? 0;
    const from = otherOwesMe >= iOweOther ? settleWith : 'me';
    const to   = otherOwesMe >= iOweOther ? 'me' : settleWith;

    // Record a settlement as a Payment tied to a synthetic expense-free record.
    // For expense-anchored balances, pick the first expense with this pair.
    const anchor = expenses.find(e =>
      e.participants.some(p => p.id === from) && e.participants.some(p => p.id === to),
    );
    if (!anchor) return;
    const p: Payment = {
      id: uuid(), expenseId: anchor.id, fromId: from, toId: to,
      amount, method, date: todayISO(), notes: note || undefined,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await savePayment(p);
    setSettleWith(null); setAmt(''); setNote('');
  }

  return (
    <div className="fade-in">
      <h1>{t('bal.title')}</h1>

      <div className="grid-2 mt-4">
        <Card>
          <div className="muted">{t('bal.receivable')}</div>
          <div className="num-pos" style={{ fontSize: '1.6rem' }}>{formatINR(me.totalReceivable)}</div>
        </Card>
        <Card>
          <div className="muted">{t('bal.payable')}</div>
          <div className="num-neg" style={{ fontSize: '1.6rem' }}>{formatINR(me.totalPayable)}</div>
        </Card>
      </div>

      <Card className="mt-3">
        <h3>{t('bal.owesMe')}</h3>
        <div className="list mt-2">
          {[...me.owesMe.entries()].map(([id, v]) => (
            <div key={id} className="list-item">
              <strong>{nameById.get(id) ?? id}</strong>
              <div className="row" style={{ flex: '0 0 auto' }}>
                <span className="num-pos">{formatINR(v)}</span>
                <Button size="sm" onClick={() => { setSettleWith(id); setAmt(String(v / 100)); }}>{t('bal.settle')}</Button>
              </div>
            </div>
          ))}
          {me.owesMe.size === 0 && <p className="muted">{t('bal.empty')}</p>}
        </div>
      </Card>

      <Card className="mt-3">
        <h3>{t('bal.iOwe')}</h3>
        <div className="list mt-2">
          {[...me.iOwe.entries()].map(([id, v]) => (
            <div key={id} className="list-item">
              <strong>{nameById.get(id) ?? id}</strong>
              <div className="row" style={{ flex: '0 0 auto' }}>
                <span className="num-neg">{formatINR(v)}</span>
                <Button size="sm" onClick={() => { setSettleWith(id); setAmt(String(v / 100)); }}>{t('bal.settle')}</Button>
              </div>
            </div>
          ))}
          {me.iOwe.size === 0 && <p className="muted">{t('bal.empty')}</p>}
        </div>
      </Card>

      {settleWith && (
        <Card className="mt-3">
          <h3>{t('bal.settle')} · {nameById.get(settleWith) ?? settleWith}</h3>
          <div className="row mt-2">
            <Field label={t('common.amount')}><input className="input" value={amt} onChange={e => setAmt(e.target.value)} inputMode="decimal" /></Field>
            <Field label="Method">
              <select className="select" value={method} onChange={e => setMethod(e.target.value as any)}>
                {['upi', 'cash', 'bank', 'other'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={t('common.notes')}><input className="input" value={note} onChange={e => setNote(e.target.value)} /></Field>
          </div>
          <div className="row mt-3">
            <Button variant="primary" onClick={settle}>{t('common.save')}</Button>
            <Button onClick={() => setSettleWith(null)}>{t('common.cancel')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}