// src/features/emi/EmiCalculator.tsx
import { useState, useMemo } from 'react';
import { Card, Field} from '../../components/ui';
import { formatINR } from '../../lib/format';
import { rupeesToPaise} from '../../lib/money';

export default function EmiCalculator() {
  const [principalStr, setPrincipalStr] = useState('5000000');
  const [rateStr, setRateStr] = useState('8.5');
  const [tenureYears, setTenureYears] = useState(20);

  const result = useMemo(() => {
    const P = rupeesToPaise(principalStr);
    const annualRate = parseFloat(rateStr) || 0;
    const R = annualRate / 12 / 100;
    const N = tenureYears * 12;

    if (P <= 0 || R <= 0 || N <= 0) return null;

    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;

    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
    };
  }, [principalStr, rateStr, tenureYears]);

  return (
    <div className="fade-in">
      <h1>EMI Calculator</h1>
      <p className="muted">Calculate your monthly loan instalment.</p>

      <Card className="mt-4">
        <div className="grid-2">
          <Field label="Loan Amount (₹)">
            <input className="input" type="number" value={principalStr} onChange={e => setPrincipalStr(e.target.value)} />
          </Field>
          <Field label="Interest Rate (% p.a.)">
            <input className="input" type="number" step="0.1" value={rateStr} onChange={e => setRateStr(e.target.value)} />
          </Field>
          <Field label={`Tenure (Years): ${tenureYears}`}>
            <input className="input" type="range" min="1" max="30" value={tenureYears} onChange={e => setTenureYears(Number(e.target.value))} />
          </Field>
        </div>
      </Card>

      {result && (
        <Card className="mt-3">
          <h3>Results</h3>
          <div className="grid-2 mt-2">
            <div>
              <div className="muted">Monthly EMI</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }} className="mono">{formatINR(result.emi)}</div>
            </div>
            <div>
              <div className="muted">Total Interest</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }} className="mono">{formatINR(result.totalInterest)}</div>
            </div>
            <div>
              <div className="muted">Total Payment</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }} className="mono">{formatINR(result.totalPayment)}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}