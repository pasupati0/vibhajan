import { Attachment, Expense, Group, Payment, PreferencesRow, Profile } from '../db/types';

export interface ExpenseRepository {
  list(): Promise<Expense[]>;
  get(id: string): Promise<Expense | undefined>;
  save(e: Expense): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface PaymentRepository {
  list(): Promise<Payment[]>;
  listByExpense(expenseId: string): Promise<Payment[]>;
  save(p: Payment): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface GroupRepository {
  list(): Promise<Group[]>;
  get(id: string): Promise<Group | undefined>;
  save(g: Group): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface AttachmentRepository {
  get(id: string): Promise<Attachment | undefined>;
  save(a: Attachment): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PreferencesRepository {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  getProfile(): Promise<Profile>;
  setProfile(p: Profile): Promise<void>;
}

export interface Repos {
  expenses: ExpenseRepository;
  payments: PaymentRepository;
  groups: GroupRepository;
  attachments: AttachmentRepository;
  preferences: PreferencesRepository;
}

export type { PreferencesRow, Profile };