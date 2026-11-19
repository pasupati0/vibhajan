import { Category, Expense, Group, Payment, PaymentMethod } from '../db/types';

export interface ApiError { code: string; message: string; details?: unknown; }

export interface ExpenseDTO {
  id: string;
  group_id?: string;
  description: string;
  total_paise: string;      // decimal string, precision-safe
  gst_rate: number;
  gst_mode: 'inclusive' | 'exclusive';
  category: Category;
  date: string;
  notes?: string;
  participants: Array<{ id: string; name: string }>;
  payers: Array<{ participant_id: string; amount_paise: string }>;
  allocations: Array<{ participant_id: string; amount_paise: string }>;
  attachment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentDTO {
  id: string;
  expense_id: string;
  from_id: string;
  to_id: string;
  amount_paise: string;
  method: PaymentMethod;
  date: string;
  notes?: string;
}

export interface BalanceDTO {
  person_id: string;
  name: string;
  net_paise: string; // positive = they owe me
}

export type { Expense, Payment, Group };