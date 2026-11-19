import { Attachment, Expense, Group, Payment, PreferencesRow, OutboxItem } from './types';

const DB_NAME = 'vibhajan';
const DB_VERSION = 1;

const STORES = [
  'expenses',
  'payments',
  'groups',
  'attachments',
  'preferences',
  'outbox',
] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          const store = db.createObjectStore(s, { keyPath: s === 'preferences' ? 'key' : 'id' });
          if (s === 'expenses') store.createIndex('byDate', 'date');
          if (s === 'expenses') store.createIndex('byGroup', 'groupId');
          if (s === 'payments') store.createIndex('byExpense', 'expenseId');
          if (s === 'attachments') store.createIndex('byExpense', 'expenseId');
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(storeName: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDB().then(db => new Promise<T | undefined>((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let result: T | undefined;
    const req = fn(store);
    if (req) req.onsuccess = () => (result = req.result);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  getAll: <T,>(store: string): Promise<T[]> => tx<T[]>(store, 'readonly', s => s.getAll()).then(r => r ?? []),
  get: <T,>(store: string, id: string): Promise<T | undefined> => tx<T>(store, 'readonly', s => s.get(id)),
  put: <T,>(store: string, value: T): Promise<void> => tx(store, 'readwrite', s => s.put(value)).then(() => {}),
  delete: (store: string, id: string): Promise<void> => tx(store, 'readwrite', s => s.delete(id)).then(() => {}),
  clear: (store: string): Promise<void> => tx(store, 'readwrite', s => s.clear()).then(() => {}),

  // transactional multi-store write
  async atomicWrite<T>(stores: string[], fn: (tx: IDBTransaction) => Promise<T> | T): Promise<T> {
    const d = await openDB();
    return new Promise<T>((resolve, reject) => {
      const t = d.transaction(stores, 'readwrite');
      Promise.resolve(fn(t)).then(resolve).catch(reject);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  },
};

export type { Expense, Payment, Group, Attachment, PreferencesRow, OutboxItem };