// src/i18n/dict.ts

export type Lang =
  | 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or';

export const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'brand': 'Ganaka',
  'nav.quickSplit': 'Quick Split',
  'nav.balances': 'Balances',
  'nav.groups': 'Groups',
  'nav.history': 'History',
  'landing.subtitle': 'Your complete Indian financial toolkit.',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.done': 'Done',
  'common.amount': 'Amount',
  'common.notes': 'Notes',
  'common.date': 'Date',
  'common.category': 'Category',
  'common.description': 'Description',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.results': 'Results',
  'common.history': 'History',
  'common.clearHistory': 'Clear All',
  'common.saveToHistory': 'Save to History',
  'common.disclaimer': 'For informational purposes only. Consult a CA for financial advice.',
  'common.recommendation': 'Recommendation',
  'common.loading': 'Loading…',
  'common.error': 'An error occurred.',
  'common.theme': 'Theme',
  'common.language': 'Language',

  // Tools
  'tool.quickSplit': 'Split Bill',
  'tool.emi': 'EMI Calculator',
  'tool.gst': 'GST Calculator',
  'tool.sip': 'SIP Calculator',
  'tool.incomeTax': 'Income Tax',
  'tool.currency': 'Currency Converter',
  'tool.nriDays': 'NRI Day Tracker',
  'tool.hra': 'HRA Calculator',
  'tool.tds': 'TDS Calculator',

  // Quick Split
  'qs.title': 'Quick Split',
  'qs.subtitle': 'Enter a bill. Split instantly.',
  'qs.totalBill': 'Total bill (incl. GST)',
  'qs.gstRate': 'GST %',
  'qs.base': 'Base',
  'qs.gst': 'GST',
  'qs.participants': 'Participants',
  'qs.addParticipant': 'Add participant',
  'qs.loadGroup': 'Load from group…',
  'qs.splitMode': 'Split mode',
  'qs.equal': 'Equal',
  'qs.percent': 'Percentage',
  'qs.custom': 'Custom',
  'qs.paidBy': 'Paid by',
  'qs.splitBill': 'Split Bill',
  'qs.remaining': 'Remaining',
  'qs.over': 'Over-allocated by',

  // Expense Detail & Status
  'exp.title': 'Expense',
  'exp.participant': 'Participant',
  'exp.allocation': 'Allocation',
  'exp.contributed': 'Paid',
  'exp.outstanding': 'Outstanding',
  'exp.status': 'Status',
  'exp.recordPayment': 'Record payment',
  'exp.deleteConfirm': 'Delete this expense?',
  'exp.payments': 'Payments',
  'status.paid': 'Paid',
  'status.partial': 'Partially Paid',
  'status.unpaid': 'Unpaid',

  // Balances
  'bal.title': 'Balances',
  'bal.owesMe': 'Owes me',
  'bal.iOwe': 'I owe',
  'bal.receivable': 'Total receivable',
  'bal.payable': 'Total payable',
  'bal.settle': 'Settle',
  'bal.empty': 'All settled up.',

  // Groups
  'grp.title': 'Groups',
  'grp.create': 'Create group',
  'grp.name': 'Group name',
  'grp.members': 'Members',
  'grp.empty': 'No groups yet.',

  // History
  'hist.title': 'History',
  'hist.search': 'Search',
  'hist.filter': 'Filter',
  'hist.exportCsv': 'Export CSV',
  'hist.exportPdf': 'Export PDF',
  'hist.empty': 'No expenses yet.',

  // EMI Calculator
  'emi.amount': 'Loan Amount (₹)',
  'emi.rate': 'Interest Rate (% p.a.)',
  'emi.tenure': 'Tenure',
  'emi.monthly': 'Monthly EMI',
  'emi.totalInterest': 'Total Interest',
  'emi.totalPayment': 'Total Payment',

  // GST Calculator
  'gst.taxableValue': 'Taxable Value',
  'gst.totalGst': 'Total GST',
  'gst.cgst': 'CGST',
  'gst.sgst': 'SGST/UTGST',
  'gst.igst': 'IGST',
  'gst.finalAmount': 'Final Amount',
  'gst.intra': 'Intra-State (CGST+SGST)',
  'gst.inter': 'Inter-State (IGST)',

  // SIP Calculator
  'sip.monthlyInvest': 'Monthly Investment (₹)',
  'sip.expectedReturn': 'Expected Annual Return (%)',
  'sip.tenure': 'Tenure',
  'sip.stepUp': 'Annual Step-Up',
  'sip.flat': 'Flat SIP',
  'sip.totalInvested': 'Total Invested',
  'sip.estReturns': 'Estimated Returns',
  'sip.maturity': 'Maturity Value',

  // Income Tax
  'tax.gross': 'Gross Annual Income (₹)',
  'tax.salaried': 'Salaried / Pensioner?',
  'tax.deductions': 'Deductions (Old Regime)',
  'tax.newRegime': 'New Regime (Section 202)',
  'tax.oldRegime': 'Old Regime',
  'tax.stdDeduction': 'Standard Deduction',
  'tax.taxableIncome': 'Taxable Income',
  'tax.slabTax': 'Slab Tax',
  'tax.rebate156': 'Section 156 Rebate',
  'tax.surcharge': 'Surcharge',
  'tax.marginalRelief': 'Marginal Relief',
  'tax.cess': 'Health & Education Cess (4%)',
  'tax.totalTaxable': 'Total Tax Payable',
  'tax.effectiveRate': 'Effective Tax Rate',

  // Currency Converter
  'curr.amount': 'Amount in INR (₹)',
  'curr.target': 'Target Currency',
  'curr.youGet': 'You get',
  'curr.rate': 'Reference rate',

  // HRA Calculator
  'hra.basic': 'Basic Salary (Annual, ₹)',
  'hra.da': 'Dearness Allowance (Annual, ₹)',
  'hra.received': 'Actual HRA Received (Annual, ₹)',
  'hra.rentPaid': 'Annual Rent Paid (₹)',
  'hra.metro': 'Metro (50%)',
  'hra.nonMetro': 'Non-Metro (40%)',
  'hra.exempt': 'Exempt HRA',
  'hra.taxable': 'Taxable HRA',
  'hra.binding': 'Binding constraint',

  // TDS Calculator
  'tds.section': 'Section / Nature of Payment',
  'tds.amount': 'Amount (₹)',
  'tds.pan': 'PAN Available?',
  'tds.senior': 'Senior Citizen?',
  'tds.payeeType': 'Payee Type',
  'tds.rate': 'TDS Rate Applied',
  'tds.deducted': 'TDS Deducted',
  'tds.netAmount': 'Net Amount Received',

  // NRI Day Tracker
  'nridays.fy': 'Tax Year',
  'nridays.travelLog': 'Travel Log',
  'nridays.entry': 'Entry Date (Arrival)',
  'nridays.exit': 'Exit Date (Departure)',
  'nridays.addTrip': 'Add Trip',
  'nridays.manual': 'Manual Day Input',
  'nridays.daysThisFy': 'Days in India this tax year',
  'nridays.daysPrev4': 'Days in India in preceding 4 tax years',
  'nridays.excludeArrival': 'Exclude arrival day from count',
  'nridays.totalDays': 'Total days in India',
};

const hi: Dict = {
  ...en,
  'brand': 'गणक',
  'landing.subtitle': 'आपका संपूर्ण भारतीय वित्तीय टूलकिट।',
  'common.theme': 'थीम',
  'common.language': 'भाषा',
  'tool.quickSplit': 'बिल विभाजित करें',
  'tool.emi': 'EMI कैलकुलेटर',
  'tool.gst': 'GST कैलकुलेटर',
  'tool.sip': 'SIP कैलकुलेटर',
  'tool.incomeTax': 'आयकर कैलकुलेटर',
  'tool.currency': 'मुद्रा परिवर्तक',
  'tool.nriDays': 'NRI दिन ट्रैकर',
  'tool.hra': 'HRA कैलकुलेटर',
  'tool.tds': 'TDS कैलकुलेटर',
  
  'tax.newRegime': 'नई व्यवस्था (धारा 202)',
  'tax.rebate156': 'धारा 156 छूट',
};

const te: Dict = { ...en, 'brand': 'గణకుడు', 'landing.subtitle': 'మీ సంపూర్ణ భారతీయ ఆర్థిక సాధనం.' };
const ta: Dict = { ...en, 'brand': 'கணకன்', 'landing.subtitle': 'உங்கள் முழுமையான இந்திய நிதிக் கருவி.' };
const kn: Dict = { ...en, 'brand': 'ಗಣಕ', 'landing.subtitle': 'ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಭಾರತೀಯ ಆರ್ಥಿಕ ಪರಿಕರ.' };
const ml: Dict = { ...en, 'brand': 'ഗണക', 'landing.subtitle': 'നിങ്ങളുടെ സമ്പൂർണ്ണ ഇന്ത്യൻ സാമ്പത്തിക ടൂൾകിറ്റ്.' };
const mr: Dict = { ...en, 'brand': 'गणक', 'landing.subtitle': 'तुमचे संपूर्ण भारतीय आर्थिक साधन.' };
const bn: Dict = { ...en, 'brand': 'গণক', 'landing.subtitle': 'আপনার সম্পূর্ণ ভারতীয় আর্থিক টুলকিট।' };
const gu: Dict = { ...en, 'brand': 'ગણક', 'landing.subtitle': 'તમારું સંપૂર્ણ ભારતીય નાણાકીય સાધન.' };
const pa: Dict = { ...en, 'brand': 'ਗਣਕ', 'landing.subtitle': 'ਤੁਹਾਡੀ ਪੂਰੀ ਭਾਰਤੀ ਵਿੱਤੀ ਟੂਲਕਿਟ।' };
const or: Dict = { ...en, 'brand': 'ଗଣକ', 'landing.subtitle': 'ଆପଣଙ୍କର ସମ୍ପୂର୍ଣ୍ଣ ଭାରତୀୟ ଆର୍ଥିକ ଟୁଲକିଟ୍।' };

export const DICTS: Record<Lang, Dict> = { en, hi, te, ta, kn, ml, mr, bn, gu, pa, or };