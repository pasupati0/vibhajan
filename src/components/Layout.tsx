import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../context/ThemeProvider';

const items = [
  { to: '/', key: 'nav.quickSplit', ico: '⚡', end: true },
  { to: '/balances', key: 'nav.balances', ico: '💰' },
  { to: '/groups', key: 'nav.groups', ico: '👥' },
  { to: '/history', key: 'nav.history', ico: '📜' },
];

function Sidebar() {
  const { t } = useI18n();
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <div className="brand-mark" aria-hidden>व</div>
        <span>{t('brand')}</span>
      </div>
      <nav className="side-nav">
        {items.map(i => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico" aria-hidden>{i.ico}</span>
            <span>{t(i.key)}</span>
          </NavLink>
        ))}
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico" aria-hidden>⚙️</span>
          <span>{t('common.settings')}</span>
        </NavLink>
      </nav>
    </aside>
  );
}

function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(i => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico" aria-hidden>{i.ico}</span>
          <span>{t(i.key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function TopBar() {
  const { t } = useI18n();
  const { toggle, theme } = useTheme();
  return (
    <header className="topbar">
      <div className="row" style={{ gap: 10 }}>
        <div className="brand-mark" aria-hidden>व</div>
        <strong>{t('brand')}</strong>
      </div>
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
      <BottomNav />
    </div>
  );
}