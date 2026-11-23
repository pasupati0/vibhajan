// src/features/emi/EmiCalculator.tsx
import { useState, useMemo } from 'react';
import { Card, Field } from '../../components/ui';
import { formatINR } from '../../lib/format';
import { rupeesToPaise } from '../../lib/money';
import { useI18n } from '../../i18n/I18nProvider';

const GST_RATE = 0.18; // 18% GST on interest and processing fee

export default function EmiCalculator() {
  const { t } = useI18n();
  const [principalStr, setPrincipalStr] = useState('5000000');
  const [rateStr, setRateStr] = useState('8.5');
  const [tenureValue, setTenureValue] = useState(20);
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years');
  const [interestType, setInterestType] = useState<'reducing' | 'flat'>('reducing');
  const [isNoCost, setIsNoCost] = useState(false);
  const [processingFeeStr, setProcessingFeeStr] = useState('0');

  // Force No Cost to be false if the user selects Flat Rate
  const effectiveIsNoCost = isNoCost && interestType === 'reducing';

  const result = useMemo(() => {
    const P = rupeesToPaise(principalStr);
    const annualRate = parseFloat(rateStr) || 0;
    const R = annualRate / 12 / 100;
    const N = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
    const fee = rupeesToPaise(processingFeeStr) || 0;

    if (P <= 0 || N <= 0) return null;

    let emi = 0;
    let totalInterest = 0;
    let totalPayment = 0;

    if (interestType === 'flat') {
      // Flat Rate Method
      const totalInterestCalc = P * (annualRate / 100) * (N / 12);
      totalPayment = P + totalInterestCalc;
      emi = totalPayment / N;
      totalInterest = totalInterestCalc;
    } else {
      // Reducing Balance Method
      emi = R > 0 ? (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1) : P / N;
      totalPayment = emi * N;
      totalInterest = totalPayment - P;
    }

    const totalStandardCost = totalPayment + fee * (1 + GST_RATE);

    // Use the effectiveIsNoCost flag here
    if (!effectiveIsNoCost) {
      return {
        emi: Math.round(emi),
        totalInterest: Math.round(totalInterest),
        totalPayment: Math.round(totalPayment),
        processingFee: Math.round(fee * (1 + GST_RATE)),
        totalCost: Math.round(totalStandardCost),
        isNoCost: false,
        discount: 0,
        gstOnInterest: 0,
        effectivePrincipal: P,
      };
    }

    // No Cost EMI always uses the Reducing Balance method internally
    const noCostEmi = P / N;
    const P_actual = R > 0 
      ? (noCostEmi * (Math.pow(1 + R, N) - 1)) / (R * Math.pow(1 + R, N)) 
      : noCostEmi * N;
      
    const discount = P - P_actual;
    const gstOnInterest = discount * GST_RATE;
    const feeWithGst = fee * (1 + GST_RATE);
    const totalNoCostCost = P + gstOnInterest + feeWithGst;

    return {
      emi: Math.round(noCostEmi),
      totalInterest: Math.round(discount), 
      totalPayment: Math.round(P),
      processingFee: Math.round(feeWithGst),
      totalCost: Math.round(totalNoCostCost),
      isNoCost: true,
      discount: Math.round(discount),
      gstOnInterest: Math.round(gstOnInterest),
      effectivePrincipal: Math.round(P_actual),
    };
  }, [principalStr, rateStr, tenureValue, tenureUnit, interestType, effectiveIsNoCost, processingFeeStr]);

  return (
    <div className="fade-in">
      <h1>{t('tool.emi')}</h1>
      <p className="muted">Calculate standard and No Cost EMI with hidden charges.</p>

      <Card className="mt-4">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Field label={t('emi.amount')}>
            <input className="input" type="number" value={principalStr} onChange={e => setPrincipalStr(e.target.value)} />
          </Field>
          <Field label={t('emi.rate')}>
            <input className="input" type="number" step="0.1" value={rateStr} onChange={e => setRateStr(e.target.value)} />
          </Field>
          
          <Field label={`Tenure (${tenureUnit === 'years' ? 'Years' : 'Months'})`}>
            <div className="row" style={{ gap: 8 }}>
              <input 
                className="input" 
                type="number" 
                min="1" 
                max={tenureUnit === 'years' ? 30 : 360} 
                value={tenureValue} 
                onChange={e => setTenureValue(Number(e.target.value))} 
              />
              <div className="tabbar" style={{ flex: '0 0 auto' }}>
                <button className={tenureUnit === 'years' ? 'active' : ''} onClick={() => setTenureUnit('years')}>Years</button>
                <button className={tenureUnit === 'months' ? 'active' : ''} onClick={() => setTenureUnit('months')}>Months</button>
              </div>
            </div>
          </Field>

          <Field label="Processing Fee (₹)" hint="Include GST? We handle that.">
            <input className="input" type="number" value={processingFeeStr} onChange={e => setProcessingFeeStr(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 6, fontWeight: 600 }}>Interest Calculation Method</div>
          <div className="tabbar" style={{ width: 'fit-content' }}>
            <button 
              className={interestType === 'reducing' ? 'active' : ''} 
              onClick={() => setInterestType('reducing')}
            >
              Reducing Balance (Recommended)
            </button>
            <button 
              className={interestType === 'flat' ? 'active' : ''} 
              onClick={() => {
                setInterestType('flat');
                setIsNoCost(false); // Automatically uncheck No Cost when switching to Flat
              }}
            >
              Flat Rate
            </button>
          </div>
          
          <div style={{ 
            marginTop: 10, 
            padding: 12, 
            background: 'var(--bg-subtle)', 
            borderRadius: 8,
            fontSize: '0.85rem'
          }}>
            {interestType === 'reducing' ? (
              <p style={{ margin: 0 }}>
                <strong>Use for: Home Loans, Car Loans, Personal Loans, Education Loans.</strong><br />
                Interest is calculated only on the remaining outstanding principal every month. This is the RBI standard, and results in lower total interest.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <strong>Use for: Consumer Durable Loans, NBFC Instant Loans, Some Two-Wheeler Loans.</strong><br />
                Interest is calculated on the full principal for the entire duration, regardless of how much you have repaid. The effective interest rate is much higher than the quoted rate.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: interestType === 'flat' ? 'not-allowed' : 'pointer' }}>
            <input 
              type="checkbox" 
              checked={effectiveIsNoCost} 
              onChange={e => setIsNoCost(e.target.checked)} 
              disabled={interestType === 'flat'} 
            />
            <span style={{ fontWeight: 600, opacity: interestType === 'flat' ? 0.5 : 1 }}>
              Calculate as No Cost EMI (merchant discount)
            </span>
          </label>
          {interestType === 'flat' && (
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4, marginLeft: 24 }}>
              Note: No Cost EMI always uses the Reducing Balance method internally.
            </p>
          )}
        </div>
      </Card>

      {result && (
        <Card className="mt-3">
          <h3>{t('common.results')} {result.isNoCost && <span className="pill pill-brand" style={{ marginLeft: 8 }}>No Cost</span>}</h3>
          
          <div className="grid-2 mt-3">
            <div>
              <div className="muted">{t('emi.monthly')}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }} className="mono">{formatINR(result.emi)}</div>
            </div>
            <div>
              <div className="muted">{result.isNoCost ? 'Upfront Discount (Interest)' : t('emi.totalInterest')}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }} className="mono">{formatINR(result.totalInterest)}</div>
            </div>
          </div>

          {result.isNoCost && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-subtle)', borderRadius: 12 }}>
              <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>Hidden Costs Breakdown</div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Product Price</span>
                <span className="mono">{formatINR(rupeesToPaise(principalStr))}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>+ GST on Interest (18%)</span>
                <span className="mono">{formatINR(result.gstOnInterest)}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>+ Processing Fee (incl. GST)</span>
                <span className="mono">{formatINR(result.processingFee)}</span>
              </div>
              <div className="divider" />
              <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total Effective Cost</span>
                <span className="mono" style={{ color: 'var(--danger)' }}>{formatINR(result.totalCost)}</span>
              </div>
            </div>
          )}

          {!result.isNoCost && (
            <div style={{ marginTop: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{t('emi.totalPayment')}</span>
                <span className="mono">{formatINR(result.totalPayment)}</span>
              </div>
              {result.processingFee > 0 && (
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="muted">Processing Fee (incl. GST)</span>
                  <span className="mono">{formatINR(result.processingFee)}</span>
                </div>
              )}
              <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700, marginTop: 8 }}>
                <span>Total Cost</span>
                <span className="mono">{formatINR(result.totalCost)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="mt-4" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p><strong>Disclaimer:</strong> For informational purposes only.</p>
        <p>
          <strong>Reducing Balance:</strong> Interest is calculated on the remaining outstanding principal. This is the RBI standard for home, auto, and personal loans.
        </p>
        <p>
          <strong>Flat Rate:</strong> Interest is calculated on the original principal for the entire tenure. Often used by NBFCs and consumer loans.
        </p>
      </div>
    </div>
  );
}