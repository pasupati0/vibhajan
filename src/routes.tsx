// src/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { lazy, Suspense } from 'react';

// Lazy load all tools
const Landing = lazy(() => import('./features/landing/Landing'));
const QuickSplit = lazy(() => import('./features/quick-split/QuickSplit'));
const EmiCalculator = lazy(() => import('./features/emi/EmiCalculator'));
const GstCalculator = lazy(() => import('./features/gst/GstCalculator'));
const SipCalculator = lazy(() => import('./features/sip/SipCalculator'));
const IncomeTaxCalculator = lazy(() => import('./features/income-tax/IncomeTaxCalculator'));
const NriDayTracker = lazy(() => import('./features/nri-days/NriDayTracker'));
const CurrencyConverter = lazy(() => import('./features/currency/CurrencyConverter'));
const HraCalculator = lazy(() => import('./features/hra/HraCalculator'));
const TdsCalculator = lazy(() => import('./features/tds/TdsCalculator'));

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 20 }}>Loading…</div>}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <L><Landing /></L> },
      { path: 'tool/quick-split', element: <L><QuickSplit /></L> },
      { path: 'tool/emi', element: <L><EmiCalculator /></L> },
      { path: 'tool/gst', element: <L><GstCalculator /></L> },
      { path: 'tool/sip', element: <L><SipCalculator /></L> },
      { path: 'tool/income-tax', element: <L><IncomeTaxCalculator /></L> },
      { path: 'tool/nri-days', element: <L><NriDayTracker /></L> },
      { path: 'tool/currency', element: <L><CurrencyConverter /></L> },
      { path: 'tool/hra', element: <L><HraCalculator /></L> },
      { path: 'tool/tds', element: <L><TdsCalculator /></L> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);