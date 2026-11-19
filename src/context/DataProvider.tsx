import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Expense, Group, Payment, Profile } from '../db/types';
import { getRepos, Repos } from '../repositories';

interface Ctx {
  ready: boolean;
  repos: Repos;
  expenses: Expense[];
  payments: Payment[];
  groups: Group[];
  profile: Profile;
  refresh: () => Promise<void>;
  saveExpense: (e: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  savePayment: (p: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  saveGroup: (g: Group) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  setProfile: (p: Profile) => Promise<void>;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const repos = useMemo(() => getRepos(), []);
  const [ready, setReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profile, setProfileState] = useState<Profile>({ key: 'profile', name: 'You' });

  const refresh = useCallback(async () => {
    const [e, p, g, prof] = await Promise.all([
      repos.expenses.list(), repos.payments.list(), repos.groups.list(), repos.preferences.getProfile(),
    ]);
    setExpenses(e.filter(x => !x.deletedAt));
    setPayments(p.filter(x => !x.deletedAt));
    setGroups(g.filter(x => !x.deletedAt));
    setProfileState(prof);
    setReady(true);
  }, [repos]);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveExpense = useCallback(async (e: Expense) => { await repos.expenses.save(e); await refresh(); }, [repos, refresh]);
  const deleteExpense = useCallback(async (id: string) => { await repos.expenses.softDelete(id); await refresh(); }, [repos, refresh]);
  const savePayment = useCallback(async (p: Payment) => { await repos.payments.save(p); await refresh(); }, [repos, refresh]);
  const deletePayment = useCallback(async (id: string) => { await repos.payments.softDelete(id); await refresh(); }, [repos, refresh]);
  const saveGroup = useCallback(async (g: Group) => { await repos.groups.save(g); await refresh(); }, [repos, refresh]);
  const deleteGroup = useCallback(async (id: string) => { await repos.groups.softDelete(id); await refresh(); }, [repos, refresh]);
  const setProfile = useCallback(async (p: Profile) => { await repos.preferences.setProfile(p); await refresh(); }, [repos, refresh]);

  const value: Ctx = {
    ready, repos, expenses, payments, groups, profile,
    refresh, saveExpense, deleteExpense, savePayment, deletePayment, saveGroup, deleteGroup, setProfile,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData outside provider');
  return c;
}