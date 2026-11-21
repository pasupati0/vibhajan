import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from './context/ThemeProvider';
import { I18nProvider } from './i18n/I18nProvider';
import { DataProvider } from './context/DataProvider';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <DataProvider>
          <RouterProvider router={router} />
        </DataProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed', err));
  });
}