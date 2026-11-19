import { Paise } from './money';
import { Expense, Payment } from '../db/types';

/** key format: "debtorId|creditorId" → amount debtor owes creditor */
export type PairwiseMap = Map<string, Paise>;

const key = (from: string, to: string) => `${from}|${to}`;

function reducePair(p: PairwiseMap, from: string, to: string, amount: Paise) {
  // reduce `from`'s debt to `to` by amount; overflow becomes reverse debt
  if (amount <= 0 || from === to) return;
  const k1 = key(from, to);
  const k2 = key(to, from);
  const curFromOwesTo = (p.get(k1) ?? 0) - (p.get(k2) ?? 0);
  const next = curFromOwesTo - amount;
  if (next > 0) { p.set(k1, next); p.delete(k2); }
  else if (next < 0) { p.set(k2, -next); p.delete(k1); }
  else { p.delete(k1); p.delete(k2); }
}

/** Compute pairwise debts for a single expense (before any settlements). */
export function pairwiseForExpense(e: Expense): PairwiseMap {
  const net = new Map<string, Paise>();
  const ids = new Set<string>([
    ...e.payers.map(p => p.participantId),
    ...e.allocations.map(a => a.participantId),
  ]);
  for (const id of ids) net.set(id, 0);
  for (const pay of e.payers) net.set(pay.participantId, (net.get(pay.participantId) ?? 0) + pay.amount);
  for (const a of e.allocations) net.set(a.participantId, (net.get(a.participantId) ?? 0) - a.amount);

  const creditors = [...net.entries()].filter(([, v]) => v > 0).map(([id, v]) => ({ id, amt: v }));
  const debtors   = [...net.entries()].filter(([, v]) => v < 0).map(([id, v]) => ({ id, amt: -v }));
  const out: PairwiseMap = new Map();
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i], d = debtors[j];
    const amt = Math.min(c.amt, d.amt);
    reducePair(out, d.id, c.id, amt);
    c.amt -= amt; d.amt -= amt;
    if (c.amt === 0) i++;
    if (d.amt === 0) j++;
  }
  return out;
}

/** Aggregate across all expenses and settlements. */
export function computePairwise(expenses: Expense[], payments: Payment[]): PairwiseMap {
  const agg: PairwiseMap = new Map();
  for (const e of expenses) {
    if (e.deletedAt) continue;
    const local = pairwiseForExpense(e);
    for (const [k, v] of local) {
      const [from, to] = k.split('|');
      reducePair(agg, from, to, v);
    }
  }
  for (const p of payments) {
    if (p.deletedAt) continue;
    reducePair(agg, p.fromId, p.toId, p.amount);
  }
  return agg;
}

/** For "me" — summary. */
export function myBalances(pairwise: PairwiseMap) {
  const owesMe = new Map<string, Paise>();
  const iOwe  = new Map<string, Paise>();
  for (const [k, v] of pairwise) {
    const [from, to] = k.split('|');
    if (to === 'me') owesMe.set(from, (owesMe.get(from) ?? 0) + v);
    else if (from === 'me') iOwe.set(to, (iOwe.get(to) ?? 0) + v);
  }
  let totalReceivable = 0, totalPayable = 0;
  for (const v of owesMe.values()) totalReceivable += v;
  for (const v of iOwe.values()) totalPayable += v;
  return { owesMe, iOwe, totalReceivable, totalPayable };
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface ParticipantShareStatus {
  participantId: string;
  name: string;
  allocation: Paise;
  contributed: Paise;    // original payment
  settledIn: Paise;      // settlements this participant paid toward this expense
  outstanding: Paise;
  status: PaymentStatus;
}

export function expenseStatus(
  e: Expense,
  payments: Payment[],
  nameById: Map<string, string>,
): { participants: ParticipantShareStatus[]; overall: PaymentStatus } {
  const perParticipant = new Map<string, ParticipantShareStatus>();
  for (const a of e.allocations) {
    perParticipant.set(a.participantId, {
      participantId: a.participantId,
      name: nameById.get(a.participantId) ?? a.participantId,
      allocation: a.amount,
      contributed: 0,
      settledIn: 0,
      outstanding: a.amount,
      status: 'unpaid',
    });
  }
  for (const p of e.payers) {
    const s = perParticipant.get(p.participantId);
    if (s) s.contributed += p.amount;
  }
  for (const pay of payments) {
    if (pay.deletedAt || pay.expenseId !== e.id) continue;
    const s = perParticipant.get(pay.fromId);
    if (s) s.settledIn += pay.amount;
  }
  let anyUnpaid = false, anyPaid = false;
  for (const s of perParticipant.values()) {
    const effective = s.contributed + s.settledIn;
    const out = s.allocation - effective;
    s.outstanding = out > 0 ? out : 0;
    if (out <= 0 && s.allocation > 0) { s.status = 'paid'; anyPaid = true; }
    else if (effective > 0) { s.status = 'partial'; anyUnpaid = true; }
    else { s.status = 'unpaid'; anyUnpaid = true; }
  }
  const overall: PaymentStatus =
    anyUnpaid ? 'unpaid' : anyPaid ? 'paid' : 'paid';
  return { participants: [...perParticipant.values()], overall };
}