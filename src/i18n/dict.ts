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
  'brand': 'Vibhajan',
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
  'common.settings': 'Settings',
  'common.results': 'Results',
  'common.history': 'History',
  'common.clearHistory': 'Clear All',
  'common.saveToHistory': 'Save to History',
  'common.disclaimer': 'For informational purposes only. Consult a CA for financial advice.',
  'common.recommendation': 'Recommendation',
  'common.loading': 'Loading…',
  'common.error': 'An error occurred.',

  // Tools
  'tool.quickSplit': 'Split Bill',
  'tool.emi': 'EMI Calculator',
  'tool.gst': 'GST Calculator',
  'tool.sip': 'SIP Calculator',
  'tool.incomeTax': 'Income Tax',
  'tool.currency': 'Currency Converter',
  'tool.nriTax': 'NRI Tax',
  'tool.nriDays': 'NRI Day Tracker',
  'tool.hra': 'HRA Calculator',
  'tool.tds': 'TDS Calculator',

  // Quick Split
  'qs.title': 'Quick Split',
  'qs.subtitle': 'Enter a bill. Split instantly.',
  'qs.totalBill': 'Total bill (incl. GST)',
  'qs.totalBillExcl': 'Total bill (excl. GST)',
  'qs.gstRate': 'GST %',
  'qs.gstMode': 'GST mode',
  'qs.inclusive': 'Inclusive',
  'qs.exclusive': 'Exclusive',
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
  'qs.attachBill': 'Attach bill',
  'qs.saveExpense': 'Save expense',
  'qs.splitBill': 'Split Bill',
  'qs.remaining': 'Remaining',
  'qs.over': 'Over-allocated by',
  'qs.mismatch': 'Allocation must equal total',
  'qs.required': 'Required',

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

  // Settings
  'set.title': 'Settings',
  'set.theme': 'Theme',
  'set.light': 'Light',
  'set.dark': 'Dark',
  'set.language': 'Language',
  'set.backup': 'Backup',
  'set.restore': 'Restore',
  'set.exportCsv': 'Export all CSV',
  'set.exportPdf': 'Print report',
  'set.profileName': 'Your name',
  'set.upi': 'UPI ID',
  'set.localMode': 'Local mode — data stored on this device only',

  // EMI Calculator
  'emi.amount': 'Loan Amount (₹)',
  'emi.rate': 'Interest Rate (% p.a.)',
  'emi.tenure': 'Tenure (Years)',
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
  'tax.newRegime': 'New Regime (Default)',
  'tax.oldRegime': 'Old Regime',
  'tax.stdDeduction': 'Standard Deduction',
  'tax.taxableIncome': 'Taxable Income',
  'tax.slabTax': 'Slab Tax',
  'tax.rebate87A': 'Section 87A Rebate',
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

  // NRI Tax Calculator
  'nri.daysThisYear': 'Days in India this FY',
  'nri.daysPrev4': 'Days in India (prev 4 years)',
  'nri.indianIncome': 'Indian-source income (₹)',
  'nri.isCitizen': 'Indian Citizen?',
  'nri.liableAbroad': 'Liable to tax abroad?',
  'nri.status': 'Residency Status',
  'nri.taxOnIncome': 'Tax on Indian Income',
  'nri.dtaa': 'Country of Residence (for DTAA)',

  // NRI Day Tracker
  'nridays.fy': 'Financial Year',
  'nridays.travelLog': 'Travel Log',
  'nridays.entry': 'Entry Date (Arrival)',
  'nridays.exit': 'Exit Date (Departure)',
  'nridays.addTrip': 'Add Trip',
  'nridays.manual': 'Manual Day Input',
  'nridays.daysThisFy': 'Days in India this FY',
  'nridays.daysPrev4': 'Days in India in preceding 4 FYs',
  'nridays.excludeArrival': 'Exclude arrival day from count',
  'nridays.totalDays': 'Total days in India',
};

const hi: Dict = {
  ...en,
  'brand': 'विभाजन',
  'landing.subtitle': 'आपका संपूर्ण भारतीय वित्तीय टूलकिट।',
  'nav.quickSplit': 'त्वरित विभाजन',
  'nav.balances': 'बकाया',
  'nav.groups': 'समूह',
  'nav.history': 'इतिहास',
  'common.save': 'सहेजें',
  'common.cancel': 'रद्द करें',
  'common.delete': 'हटाएँ',
  'common.edit': 'संपादित करें',
  'common.add': 'जोड़ें',
  'common.amount': 'राशि',
  'common.date': 'तारीख',
  'common.settings': 'सेटिंग्स',
  'common.history': 'इतिहास',
  'common.clearHistory': 'सभी हटाएँ',
  'common.saveToHistory': 'इतिहास में सहेजें',
  
  'tool.quickSplit': 'बिल विभाजित करें',
  'tool.emi': 'EMI कैलकुलेटर',
  'tool.gst': 'GST कैलकुलेटर',
  'tool.sip': 'SIP कैलकुलेटर',
  'tool.incomeTax': 'आयकर कैलकुलेटर',
  'tool.currency': 'मुद्रा परिवर्तक',
  'tool.nriTax': 'NRI टैक्स',
  'tool.nriDays': 'NRI दिन ट्रैकर',
  'tool.hra': 'HRA कैलकुलेटर',
  'tool.tds': 'TDS कैलकुलेटर',

  'qs.title': 'त्वरित विभाजन',
  'qs.totalBill': 'कुल बिल (GST सहित)',
  'qs.totalBillExcl': 'कुल बिल (GST रहित)',
  'qs.participants': 'प्रतिभागी',
  'qs.addParticipant': 'प्रतिभागी जोड़ें',
  'qs.loadGroup': 'समूह से लोड करें…',
  'qs.splitMode': 'विभाजन मोड',
  'qs.saveExpense': 'खर्च सहेजें',
  'qs.splitBill': 'बिल विभाजित करें',
  'qs.equal': 'समान', 
  'qs.percent': 'प्रतिशत', 
  'qs.custom': 'कस्टम',
  
  'bal.title': 'बकाया', 
  'bal.owesMe': 'मुझे देना है', 
  'bal.iOwe': 'मुझे देना है',
  'grp.title': 'समूह', 
  'grp.create': 'समूह बनाएँ', 
  'grp.name': 'समूह का नाम',
  'hist.title': 'इतिहास', 
  'hist.search': 'खोजें', 
  'hist.empty': 'अभी कोई खर्च नहीं।',
  'set.title': 'सेटिंग्स', 
  'set.theme': 'थीम', 
  'set.language': 'भाषा',
  'set.light': 'लाइट', 
  'set.dark': 'डार्क', 
  'set.backup': 'बैकअप', 
  'set.restore': 'पुनर्स्थापित',
  'status.paid': 'चुकता', 
  'status.partial': 'आंशिक भुगतान', 
  'status.unpaid': 'अदत्त',

  'emi.amount': 'ऋण राशि (₹)',
  'emi.rate': 'ब्याज दर (% वार्षिक)',
  'emi.tenure': 'अवधि (वर्ष)',
  'emi.monthly': 'मासिक EMI',
  'emi.totalInterest': 'कुल ब्याज',
  'emi.totalPayment': 'कुल भुगतान',

  'tax.gross': 'सकल वार्षिक आय (₹)',
  'tax.newRegime': 'नई व्यवस्था (डिफ़ॉल्ट)',
  'tax.oldRegime': 'पुरानी व्यवस्था',
  'tax.totalTaxable': 'कुल देय कर',
};

const te: Dict = { ...en, 'nav.quickSplit': 'త్వరిత చీలిక', 'nav.balances': 'నిల్వలు', 'nav.groups': 'గ్రూపులు', 'nav.history': 'చరిత్ర', 'common.save': 'సేవ్', 'qs.title': 'త్వరిత చీలిక' };
const ta: Dict = { ...en, 'nav.quickSplit': 'விரைவு பிரிப்பு', 'nav.balances': 'இருப்புகள்', 'nav.groups': 'குழுக்கள்', 'nav.history': 'வரலாறு', 'common.save': 'சேமி', 'qs.title': 'விரைவு பிரிப்பு' };
const kn: Dict = { ...en, 'nav.quickSplit': 'ತ್ವರಿತ ವಿಭಜನೆ', 'nav.balances': 'ಬಾಕಿಗಳು', 'nav.groups': 'ಗುಂಪುಗಳು', 'nav.history': 'ಇತಿಹಾಸ', 'common.save': 'ಉಳಿಸಿ', 'qs.title': 'ತ್ವರಿತ ವಿಭಜನೆ' };
const ml: Dict = { ...en, 'nav.quickSplit': 'ദ്രുത വിഭജനം', 'nav.balances': 'ബാലൻസുകൾ', 'nav.groups': 'ഗ്രൂപ്പുകൾ', 'nav.history': 'ചരിത്രം', 'common.save': 'സംരക്ഷിക്കുക', 'qs.title': 'ദ്രുത വിഭജനം' };
const mr: Dict = { ...en, 'nav.quickSplit': 'झटपट विभागणी', 'nav.balances': 'शिल्लक', 'nav.groups': 'गट', 'nav.history': 'इतिहास', 'common.save': 'जतन करा', 'qs.title': 'झटपट विभागणी' };
const bn: Dict = { ...en, 'nav.quickSplit': 'দ্রুত বিভাজন', 'nav.balances': 'ব্যালেন্স', 'nav.groups': 'গ্রুপ', 'nav.history': 'ইতিহাস', 'common.save': 'সংরক্ষণ', 'qs.title': 'দ্রুত বিভাজন' };
const gu: Dict = { ...en, 'nav.quickSplit': 'ઝડપી વિભાજન', 'nav.balances': 'બાકી', 'nav.groups': 'જૂથો', 'nav.history': 'ઇતિહાસ', 'common.save': 'સાચવો', 'qs.title': 'ઝડપી વિભાજન' };
const pa: Dict = { ...en, 'nav.quickSplit': 'ਤੇਜ਼ ਵੰਡ', 'nav.balances': 'ਬਕਾਇਆ', 'nav.groups': 'ਸਮੂਹ', 'nav.history': 'ਇਤਿਹਾਸ', 'common.save': 'ਸੰਭਾਲੋ', 'qs.title': 'ਤੇਜ਼ ਵੰਡ' };
const or: Dict = { ...en, 'nav.quickSplit': 'ଦ୍ରୁତ ବିଭାଜନ', 'nav.balances': 'ବକେୟା', 'nav.groups': 'ଗୋଷ୍ଠୀ', 'nav.history': 'ଇତିହାସ', 'common.save': 'ସଞ୍ଚୟ', 'qs.title': 'ଦ୍ରୁତ ବିଭାଜନ' };

export const DICTS: Record<Lang, Dict> = { en, hi, te, ta, kn, ml, mr, bn, gu, pa, or };