// src/components/Layout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../context/ThemeProvider';

function Sidebar() {
  const { t } = useI18n();
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <div className="brand-mark" aria-hidden>व</div>
        <span>{t('brand')}</span>
      </div>
      <nav className="side-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico" aria-hidden>🏠</span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico" aria-hidden>⚙️</span>
          <span>{t('common.settings')}</span>
        </NavLink>
      </nav>
    </aside>
  );
}

function TopBar() {
  const { t } = useI18n();
  const { toggle, theme } = useTheme();
  return (
    <header className="topbar">
      <NavLink to="/" className="row" style={{ gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-mark" aria-hidden>व</div>
        <strong>{t('brand')}</strong>
      </NavLink>
      <div className="row" style={{ flex: '0 0 auto', gap: 6 }}>
        <NavLink to="/settings" className="btn btn-sm btn-ghost" aria-label={t('common.settings')}>⚙️</NavLink>
        <button className="btn btn-sm btn-ghost" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

export function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <TopBar />
        <Outlet />
      </main>
    </div>
  );
}