import { useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTheme } from '../../context/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field } from '../../components/ui';
import { LANGS } from '../../i18n/dict';
import { db } from '../../db/db';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { profile, setProfile, expenses, payments, groups, repos, refresh } = useData();

  const [name, setName] = useState(profile.name);
  const [upi, setUpi] = useState(profile.upiId ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveProfile() {
    await setProfile({ key: 'profile', name: name.trim() || 'You', upiId: upi.trim() || undefined });
  }

  async function backup() {
    const [e, p, g] = await Promise.all([repos.expenses.list(), repos.payments.list(), repos.groups.list()]);
    const payload = { version: 1, exportedAt: new Date().toISOString(), expenses: e, payments: p, groups: g };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vibhajan-backup-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function restore(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || data.version !== 1) throw new Error('Unsupported backup format');
    for (const e of data.expenses ?? []) await repos.expenses.save(e);
    for (const p of data.payments ?? []) await repos.payments.save(p);
    for (const g of data.groups ?? []) await repos.groups.save(g);
    await refresh();
  }

  async function wipe() {
    if (!confirm('Delete all local data?')) return;
    await db.clear('expenses'); await db.clear('payments'); await db.clear('groups');
    await db.clear('attachments'); await db.clear('preferences'); await db.clear('outbox');
    await refresh();
  }

  return (
    <div className="fade-in">
      <h1>{t('set.title')}</h1>

      <Card className="mt-4">
        <h3>{t('set.profileName')}</h3>
        <div className="row mt-2">
          <Field label={t('set.profileName')}><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label={t('set.upi')}><input className="input" value={upi} onChange={e => setUpi(e.target.value)} placeholder="name@bank" /></Field>
        </div>
        <Button variant="primary" className="mt-3" onClick={saveProfile}>{t('common.save')}</Button>
      </Card>

      <Card>
        <h3>{t('set.theme')}</h3>
        <div className="tabbar mt-2">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>{t('set.light')}</button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>{t('set.dark')}</button>
        </div>
      </Card>

      <Card>
        <h3>{t('set.language')}</h3>
        <select className="select mt-2" value={lang} onChange={e => setLang(e.target.value as any)}>
          {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </Card>

      <Card>
        <h3>{t('set.backup')}</h3>
        <div className="row mt-2">
          <Button onClick={backup}>⬇ {t('set.backup')}</Button>
          <Button onClick={() => fileRef.current?.click()}>⬆ {t('set.restore')}</Button>
          <input
            ref={fileRef} type="file" accept="application/json" hidden
            onChange={async e => { const f = e.target.files?.[0]; if (f) await restore(f); }}
          />
        </div>
      </Card>

      <Card>
        <h3>Diagnostics</h3>
        <p className="muted">Expenses: {expenses.length} · Payments: {payments.length} · Groups: {groups.length}</p>
        <p className="muted" style={{ fontSize: '0.8rem' }}>{t('set.localMode')}</p>
        <Button variant="danger" className="mt-2" onClick={wipe}>{t('common.delete')} all</Button>
      </Card>
    </div>
  );
}