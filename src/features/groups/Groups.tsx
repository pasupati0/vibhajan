import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData } from '../../context/DataProvider';
import { Button, Card, Field } from '../../components/ui';
import { Group } from '../../db/types';
import { uuid } from '../../lib/id';

export default function Groups() {
  const { t } = useI18n();
  const { groups, saveGroup, deleteGroup } = useData();
  const [name, setName] = useState('');
  const [members, setMembers] = useState('');

  async function create() {
    if (!name.trim()) return;
    const g: Group = {
      id: uuid(),
      name: name.trim(),
      members: members.split(',').map(s => s.trim()).filter(Boolean).map(n => ({ id: uuid(), name: n })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveGroup(g);
    setName(''); setMembers('');
  }

  return (
    <div className="fade-in">
      <h1>{t('grp.title')}</h1>
      <Card className="mt-4">
        <div className="grid-2">
          <Field label={t('grp.name')}><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label={t('grp.members')} hint="Comma-separated names"><input className="input" value={members} onChange={e => setMembers(e.target.value)} /></Field>
        </div>
        <Button variant="primary" className="mt-3" onClick={create}>{t('grp.create')}</Button>
      </Card>

      <div className="list mt-3">
        {groups.map(g => (
          <div key={g.id} className="list-item">
            <div>
              <strong>{g.name}</strong>
              <div className="muted" style={{ fontSize: '0.82rem' }}>{g.members.map(m => m.name).join(', ')}</div>
            </div>
            <Button size="sm" variant="danger" onClick={() => deleteGroup(g.id)}>{t('common.delete')}</Button>
          </div>
        ))}
        {groups.length === 0 && <p className="muted">{t('grp.empty')}</p>}
      </div>
    </div>
  );
}