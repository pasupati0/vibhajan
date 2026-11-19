import { describe, it, expect } from 'vitest';
import { pairwiseForExpense, computePairwise, myBalances } from '../src/lib/balance';
import { Expense } from '../src/db/types';

const mkExpense = (partial: Partial<Expense>): Expense => ({
  id: 'e1', description: 'x', total: 0, gstRate: 0, gstMode: 'inclusive', gstBase: 0, gstAmount: 0,
  category: 'other', date: '2024-01-01', participants: [], payers: [], allocations: [],
  createdAt: '', updatedAt: '', ...partial,
});

describe('balance', () => {
  it('single payer, others owe', () => {
    const e = mkExpense({
      total: 118000,
      participants: [{ id: 'me', name: 'You' }, { id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      payers: [{ participantId: 'me', amount: 118000 }],
      allocations: [{ participantId: 'me', amount: 47200 }, { participantId: 'a', amount: 41300 }, { participantId: 'b', amount: 29500 }],
    });
    const p = pairwiseForExpense(e);
    const agg = new Map(p);
    const my = myBalances(agg);
    expect(my.totalReceivable).toBe(41300 + 29500);
    expect(my.totalPayable).toBe(0);
    expect(my.owesMe.get('a')).toBe(41300);
    expect(my.owesMe.get('b')).toBe(29500);
  });

  it('settlements reduce balances', () => {
    const e = mkExpense({
      total: 300, participants: [{ id: 'me', name: 'You' }, { id: 'a', name: 'A' }],
      payers: [{ participantId: 'me', amount: 300 }],
      allocations: [{ participantId: 'me', amount: 150 }, { participantId: 'a', amount: 150 }],
    });
    const before = myBalances(computePairwise([e], []));
    expect(before.totalReceivable).toBe(150);
    const payment = {
      id: 'p1', expenseId: 'e1', fromId: 'a', toId: 'me', amount: 150,
      method: 'upi' as const, date: '2024-01-02', createdAt: '', updatedAt: '',
    };
    const after = myBalances(computePairwise([e], [payment]));
    expect(after.totalReceivable).toBe(0);
  });
});