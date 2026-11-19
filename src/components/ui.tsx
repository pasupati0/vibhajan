import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; block?: boolean; size?: 'sm' }) {
  const { variant = 'ghost', block, size, className = '', ...rest } = props;
  const cls = [
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'danger' && 'btn-danger',
    block && 'btn-block',
    size === 'sm' && 'btn-sm',
    className,
  ].filter(Boolean).join(' ');
  return <button {...rest} className={cls} />;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="muted" style={{ fontSize: '0.78rem' }}>{hint}</span>}
    </div>
  );
}

export function Pill({ kind, children }: { kind: 'success' | 'warning' | 'danger' | 'brand'; children: React.ReactNode }) {
  const map = { success: 'pill pill-success', warning: 'pill pill-warning', danger: 'pill pill-danger', brand: 'pill pill-brand' };
  return <span className={map[kind]}>{children}</span>;
}