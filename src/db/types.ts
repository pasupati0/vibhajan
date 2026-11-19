import { Paise } from '../lib/money';
import { GstMode } from '../lib/gst';

export type ISODate = string;

export type Category =
  | 'food' | 'rent' | 'travel' | 'shopping' | 'fuel'
  | 'utilities' | 'entertainment' | 'other';

export interface Participant { id: string; name: string; }

export interface Allocation { participantId: string; amount: Paise; }
export interface Payer     { participantId: string; amount: Paise; }

export interface Expense {
  id: string;
  groupId?: string;
  description: string;
  total: Paise;              // GST-inclusive
  gstRate: number;
  gstMode: GstMode;
  gstBase: Paise;
  gstAmount: Paise;
  category: Category;
  date: ISODate;
  notes?: string;
  participants: Participant[];
  payers: Payer[];
  allocations: Allocation[];
  attachmentId?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt?: ISODate;
}

export type PaymentMethod = 'upi' | 'cash' | 'bank' | 'other';

export interface Payment {
  id: string;
  expenseId: string;
  fromId: string;
  toId: string;
  amount: Paise;
  method: PaymentMethod;
  date: ISODate;
  notes?: string;
  history?: Array<{ at: ISODate; snapshot: unknown }>;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt?: ISODate;
}

export interface Group {
  id: string;
  name: string;
  members: Participant[];
  category?: Category;
  archived?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt?: ISODate;
}

export interface Attachment {
  id: string;
  expenseId?: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: ISODate;
}

export interface Profile {
  key: 'profile';
  name: string;
  phone?: string;
  upiId?: string;
}

export interface PreferencesRow {
  key: string;
  value: unknown;
}

export interface OutboxItem {
  id: string;
  entity: 'expense' | 'payment' | 'group';
  entityId: string;
  op: 'upsert' | 'delete';
  payload: unknown;
  queuedAt: ISODate;
}