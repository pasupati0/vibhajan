import { db } from '../db/db';
import { Attachment, Expense, Group, Payment, Profile } from '../db/types';
import { Repos } from './types';

export const localRepos: Repos = {
  expenses: {
    list: () => db.getAll<Expense>('expenses'),
    get: (id) => db.get<Expense>('expenses', id),
    save: (e) => db.put('expenses', e),
    softDelete: async (id) => {
      const e = await db.get<Expense>('expenses', id);
      if (!e) return;
      await db.put('expenses', { ...e, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
  },
  payments: {
    list: () => db.getAll<Payment>('payments'),
    listByExpense: async (expenseId) => {
      const all = await db.getAll<Payment>('payments');
      return all.filter(p => p.expenseId === expenseId && !p.deletedAt);
    },
    save: (p) => db.put('payments', p),
    softDelete: async (id) => {
      const p = await db.get<Payment>('payments', id);
      if (!p) return;
      await db.put('payments', { ...p, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
  },
  groups: {
    list: () => db.getAll<Group>('groups'),
    get: (id) => db.get<Group>('groups', id),
    save: (g) => db.put('groups', g),
    softDelete: async (id) => {
      const g = await db.get<Group>('groups', id);
      if (!g) return;
      await db.put('groups', { ...g, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
  },
  attachments: {
    get: (id) => db.get<Attachment>('attachments', id),
    save: (a) => db.put('attachments', a),
    delete: (id) => db.delete('attachments', id),
  },
  preferences: {
    get: async <T,>(key: string) => {
      const row = await db.get<{ key: string; value: T }>('preferences', key);
      return row?.value;
    },
    set: async <T,>(key: string, value: T) => {
      await db.put('preferences', { key, value });
    },
    getProfile: async (): Promise<Profile> => {
      const row = await db.get<{ key: string; value: Profile }>('preferences', 'profile');
      return row?.value ?? { key: 'profile', name: 'You' };
    },
    setProfile: async (p) => {
      await db.put('preferences', { key: 'profile', value: p });
    },
  },
};