import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { lazy, Suspense } from 'react';

const QuickSplit   = lazy(() => import('./features/quick-split/QuickSplit'));
const Balances     = lazy(() => import('./features/balances/Balances'));
const Groups       = lazy(() => import('./features/groups/Groups'));
const History      = lazy(() => import('./features/history/History'));
const ExpenseDetail = lazy(() => import('./features/expense/ExpenseDetail'));
const Settings     = lazy(() => import('./features/settings/Settings'));

function SuspenseFallback() {
  return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <L><QuickSplit /></L> },
      { path: 'balances', element: <L><Balances /></L> },
      { path: 'groups', element: <L><Groups /></L> },
      { path: 'history', element: <L><History /></L> },
      { path: 'expense/:id', element: <L><ExpenseDetail /></L> },
      { path: 'settings', element: <L><Settings /></L> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);