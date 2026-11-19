import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card } from '../../components/ui';
import { formatINR, formatDate } from '../../lib/format';
import { expenseStatus } from '../../lib/balance';
import { exportCsv } from './export';

export default function History() {
  const { t } = useI18n();
  const { expenses, payments } = useData();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  const rows = useMemo(() => {
    const nameById = new Map<string, string>();
    for (const e of expenses) for (const p of e.participants) nameById.set(p.id, p.name);
    const filtered = expenses.filter(e => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (q) {
        const hay = [e.description, e.category, ...e.participants.map(p => p.name), e.notes ?? ''].join(' ').toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (status !== 'all') {
        const s = expenseStatus(e, payments, nameById).overall;
        if (s !== status) return false;
      }
      return true;
    });
    filtered.sort((a, b) => {
      if (sort === 'date_desc') return b.date.localeCompare(a.date);
      if (sort === 'date_asc')  return a.date.localeCompare(b.date);
      if (sort === 'amount_desc') return b.total - a.total;
      return a.total - b.total;
    });
    return filtered;
  }, [expenses, payments, q, from, to, status, sort]);

  return (
    <div className="fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('hist.title')}</h1>
        <div className="row" style={{ flex: '0 0 auto' }}>
          <Button size="sm" onClick={() => exportCsv(rows)}>{t('hist.exportCsv')}</Button>
          <Button size="sm" onClick={() => window.print()}>{t('hist.exportPdf')}</Button>
        </div>
      </div>

      <Card className="mt-4">
        <div className="grid-2">
          <input className="input" placeholder={t('hist.search')} value={q} onChange={e => setQ(e.target.value)} />
          <select className="select" value={sort} onChange={e => setSort(e.target.value as any)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Amount ↓</option>
            <option value="amount_asc">Amount ↑</option>
          </select>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="From" />
          <input className="input" type="date" value={to}   onChange={e => setTo(e.target.value)}   aria-label="To" />
          <select className="select" value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </Card>

      <div className="list mt-3">
        {rows.map(e => (
          <Link key={e.id} to={`/expense/${e.id}`} className="list-item">
            <div>
              <strong>{e.description}</strong>
              <div className="muted" style={{ fontSize: '0.82rem' }}>{formatDate(e.date)} · {e.category}</div>
            </div>
            <span className="mono" style={{ fontWeight: 700 }}>{formatINR(e.total)}</span>
          </Link>
        ))}
        {rows.length === 0 && <p className="muted">{t('hist.empty')}</p>}
      </div>
    </div>
  );
}