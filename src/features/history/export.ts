import { Expense } from '../../db/types';
import { paiseToRupeesString } from '../../lib/money';

export function exportCsv(expenses: Expense[]) {
  const header = ['date', 'description', 'category', 'total_inr', 'gst_rate', 'gst_inr', 'participants', 'allocations', 'notes'];
  const lines = [header.join(',')];
  for (const e of expenses) {
    const row = [
      e.date,
      csv(e.description),
      e.category,
      paiseToRupeesString(e.total),
      String(e.gstRate),
      paiseToRupeesString(e.gstAmount),
      csv(e.participants.map(p => p.name).join('|')),
      csv(e.allocations.map(a => `${a.participantId}:${paiseToRupeesString(a.amount)}`).join('|')),
      csv(e.notes ?? ''),
    ];
    lines.push(row.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  download(blob, `vibhajan-history-${new Date().toISOString().slice(0,10)}.csv`);
}

function csv(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}