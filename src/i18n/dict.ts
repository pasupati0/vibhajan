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

  'qs.title': 'Quick Split',
  'qs.subtitle': 'Enter a bill. Split instantly.',
  'qs.totalBill': 'Total bill (incl. GST)',
  'qs.gstRate': 'GST %',
  'qs.gstMode': 'GST mode',
  'qs.inclusive': 'Inclusive',
  'qs.exclusive': 'Exclusive',
  'qs.base': 'Base',
  'qs.gst': 'GST',
  'qs.participants': 'Participants',
  'qs.addParticipant': 'Add participant',
  'qs.splitMode': 'Split mode',
  'qs.equal': 'Equal',
  'qs.percent': 'Percentage',
  'qs.custom': 'Custom',
  'qs.paidBy': 'Paid by',
  'qs.attachBill': 'Attach bill',
  'qs.saveExpense': 'Save expense',
  'qs.remaining': 'Remaining',
  'qs.over': 'Over-allocated by',
  'qs.mismatch': 'Allocation must equal total',
  'qs.required': 'Required',

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

  'bal.title': 'Balances',
  'bal.owesMe': 'Owes me',
  'bal.iOwe': 'I owe',
  'bal.receivable': 'Total receivable',
  'bal.payable': 'Total payable',
  'bal.settle': 'Settle',
  'bal.empty': 'All settled up.',

  'grp.title': 'Groups',
  'grp.create': 'Create group',
  'grp.name': 'Group name',
  'grp.members': 'Members',
  'grp.empty': 'No groups yet.',

  'hist.title': 'History',
  'hist.search': 'Search',
  'hist.filter': 'Filter',
  'hist.exportCsv': 'Export CSV',
  'hist.exportPdf': 'Export PDF',
  'hist.empty': 'No expenses yet.',

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
};

const hi: Dict = {
  ...en,
  'brand': 'विभाजन',
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
  'qs.title': 'त्वरित विभाजन',
  'qs.totalBill': 'कुल बिल (GST सहित)',
  'qs.participants': 'प्रतिभागी',
  'qs.addParticipant': 'प्रतिभागी जोड़ें',
  'qs.saveExpense': 'खर्च सहेजें',
  'qs.equal': 'समान', 'qs.percent': 'प्रतिशत', 'qs.custom': 'कस्टम',
  'bal.title': 'बकाया', 'bal.owesMe': 'मुझे देना है', 'bal.iOwe': 'मुझे देना है',
  'grp.title': 'समूह', 'grp.create': 'समूह बनाएँ', 'grp.name': 'समूह का नाम',
  'hist.title': 'इतिहास', 'hist.search': 'खोजें', 'hist.empty': 'अभी कोई खर्च नहीं।',
  'set.title': 'सेटिंग्स', 'set.theme': 'थीम', 'set.language': 'भाषा',
  'set.light': 'लाइट', 'set.dark': 'डार्क', 'set.backup': 'बैकअप', 'set.restore': 'पुनर्स्थापित',
  'status.paid': 'चुकता', 'status.partial': 'आंशिक भुगतान', 'status.unpaid': 'अदत्त',
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