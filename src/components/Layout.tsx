// src/components/Layout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../context/ThemeProvider';
import { LANGS } from '../i18n/dict';

function Sidebar() {
  const { t, lang, setLang } = useI18n();
  const { toggle, theme } = useTheme();

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <div className="brand-mark" aria-hidden>ग</div>
        <span>{t('brand')}</span>
      </div>
      <nav className="side-nav" style={{ flex: 1 }}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico" aria-hidden>🏠</span>
          <span>Home</span>
        </NavLink>
      </nav>
      
      {/* Global Toggles at bottom of Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div className="field">
          <label style={{ fontSize: '0.75rem' }}>{t('common.language')}</label>
          <select className="select" value={lang} onChange={e => setLang(e.target.value as any)}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <button className="btn btn-ghost" onClick={toggle} style={{ justifyContent: 'flex-start' }}>
          <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  const { t, lang, setLang } = useI18n();
  const { toggle, theme } = useTheme();

  return (
    <header className="topbar">
      <NavLink to="/" className="row" style={{ gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-mark" aria-hidden>ग</div>
        <strong>{t('brand')}</strong>
      </NavLink>
      <div className="row" style={{ flex: '0 0 auto', gap: 6 }}>
        <select 
          className="select" 
          value={lang} 
          onChange={e => setLang(e.target.value as any)}
          style={{ width: 'auto', minHeight: 36, padding: '4px 30px 4px 12px', fontSize: '0.85rem' }}
        >
          {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
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