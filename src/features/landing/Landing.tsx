// src/features/landing/Landing.tsx
import { Link } from 'react-router-dom';

const TOOLS = [
  { path: '/tool/quick-split', label: 'Split Bill', icon: '⚡', desc: 'Split bills with friends' },
  { path: '/tool/emi', label: 'EMI Calculator', icon: '🏡', desc: 'Home, car & personal loans' },
  { path: '/tool/gst', label: 'GST Calculator', icon: '🧾', desc: 'Inclusive & exclusive' },
  { path: '/tool/sip', label: 'SIP Calculator', icon: '📈', desc: 'Mutual fund returns' },
  { path: '/tool/income-tax', label: 'Income Tax', icon: '📊', desc: 'Resident & NRI tax' },
  { path: '/tool/nri-days', label: 'NRI Day Tracker', icon: '📅', desc: '182-day residency rule' },
  { path: '/tool/currency', label: 'Currency Converter', icon: '₹', desc: 'INR to world' },
  { path: '/tool/hra', label: 'HRA Calculator', icon: '🏠', desc: 'House rent allowance' },
  { path: '/tool/tds', label: 'TDS Calculator', icon: '📑', desc: 'Tax deducted at source' },
];

export default function Landing() {

  return (
    <div className="fade-in">
      {/* Branding header removed */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--space-4)',
          maxWidth: '900px',
          margin: '0 auto',
        }}
        className="tool-grid"
      >
        {TOOLS.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="card tool-button"
            aria-label={`Open ${tool.label}: ${tool.desc}`}
          >
            <span aria-hidden="true" style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: 8 }}>
              {tool.icon}
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              {tool.label}
            </h2>
            <p className="muted" style={{ fontSize: '0.75rem', margin: '4px 0 0' }}>
              {tool.desc}
            </p>
          </Link>
        ))}
      </div>

      <style>{`
        .tool-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-5) var(--space-3);
          text-decoration: none;
          color: inherit;
          transition: transform 120ms ease, box-shadow 120ms ease;
          min-height: 160px;
          border-radius: var(--radius-lg);
        }
        .tool-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-2);
          text-decoration: none !important;
        }
        @media (min-width: 768px) {
          .tool-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}