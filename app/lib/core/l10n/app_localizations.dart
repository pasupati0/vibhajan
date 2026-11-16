import 'package:flutter/material.dart';

enum SupportedIndianLanguage {
  en('en', 'English', 'English'),
  hi('hi', 'हिन्दी', 'Hindi'),
  te('te', 'తెలుగు', 'Telugu'),
  ta('ta', 'தமிழ்', 'Tamil'),
  kn('kn', 'ಕನ್ನಡ', 'Kannada'),
  ml('ml', 'മലയാളം', 'Malayalam'),
  mr('mr', 'मराठी', 'Marathi'),
  bn('bn', 'বাংলা', 'Bengali'),
  gu('gu', 'ગુજરાતી', 'Gujarati'),
  pa('pa', 'ਪੰਜਾਬੀ', 'Punjabi'),
  or_('or', 'ଓଡ଼ିଆ', 'Odia');

  final String code;
  final String nativeLabel;
  final String englishName;
  const SupportedIndianLanguage(this.code, this.nativeLabel, this.englishName);

  static SupportedIndianLanguage fromCode(String code) {
    return SupportedIndianLanguage.values.firstWhere(
      (l) => l.code == code,
      orElse: () => SupportedIndianLanguage.en,
    );
  }
}

class BaatoStrings {
  final SupportedIndianLanguage lang;
  const BaatoStrings(this.lang);

  static const Map<String, Map<String, String>> _translations = {
    'en': {
      'quick_split': 'Quick Split',
      'balances': 'Balances',
      'groups': 'Groups',
      'history': 'History',
      'bill_total_gst': 'Total Bill Amount (₹)',
      'taxable_amount': 'Taxable Amount',
      'included_gst': 'GST Component',
      'save_bill': 'Save & Split Bill',
      'you_are_owed': 'People Owe You',
      'you_owe': 'You Owe',
      'record_payment': 'Record Payment',
    },
    'hi': {
      'quick_split': 'तुरंत बाँटें',
      'balances': 'हिसाब-किताब',
      'groups': 'समूह',
      'history': 'इतिहास',
      'bill_total_gst': 'कुल बिल राशि (₹)',
      'taxable_amount': 'कर योग्य राशि',
      'included_gst': 'कुल जीएसटी',
      'save_bill': 'बिल सहेजें',
      'you_are_owed': 'आपको मिलेंगे',
      'you_owe': 'आपको देने हैं',
      'record_payment': 'भुगतान दर्ज करें',
    },
    'te': {
      'quick_split': 'త్వరిత స్ప్లిట్',
      'balances': 'నిల్వలు',
      'groups': 'గ్రూపులు',
      'history': 'చరిత్ర',
      'bill_total_gst': 'మొత్తం బిల్లు (₹)',
      'taxable_amount': 'పన్ను విధించదగిన మొత్తం',
      'included_gst': 'GST మొత్తం',
      'save_bill': 'బిల్లు సేవ్ చేయండి',
      'you_are_owed': 'మీకు రావాల్సినవి',
      'you_owe': 'మీరు ఇవ్వాల్సినవి',
      'record_payment': 'చెల్లింపు నమోదు',
    },
    'ta': {
      'quick_split': 'விரைவு பகிர்வு',
      'balances': 'நிலுவைகள்',
      'groups': 'குழுக்கள்',
      'history': 'வரலாறு',
      'bill_total_gst': 'மொத்த பில் தொகை (₹)',
      'taxable_amount': 'வரிக்குரிய தொகை',
      'included_gst': 'ஜிஎஸ்டி தொகை',
      'save_bill': 'பில்லை சேமி',
      'you_are_owed': 'உங்களுக்கு வரவேண்டியவை',
      'you_owe': 'நீங்கள் தரவேண்டியவை',
      'record_payment': 'பணம் செலுத்துதலை பதிவு செய்',
    },
    'kn': {
      'quick_split': 'ತ್ವರಿತ ವಿಭಜನೆ',
      'balances': 'ಬಾಕಿಗಳು',
      'groups': 'ಗುಂಪುಗಳು',
      'history': 'ಇತಿಹಾಸ',
      'bill_total_gst': 'ಒಟ್ಟು ಬಿಲ್ ಮೊತ್ತ (₹)',
      'taxable_amount': 'ತೆರಿಗೆಗೆ ಒಳಪಡುವ ಮೊತ್ತ',
      'included_gst': 'ಜಿಎಸ್‌ಟಿ ಮೊತ್ತ',
      'save_bill': 'ಬಿಲ್ ಉಳಿಸಿ',
      'you_are_owed': 'ನಿಮಗೆ ಬರಬೇಕಾದ್ದು',
      'you_owe': 'ನೀವು ಕೊಡಬೇಕಾದ್ದು',
      'record_payment': 'ಪಾವತಿ ದಾಖಲಿಸಿ',
    },
    'ml': {
      'quick_split': 'ക്വിക്ക് സ്പ്ലിറ്റ്',
      'balances': 'ബാലൻസുകൾ',
      'groups': 'ഗ്രൂപ്പുകൾ',
      'history': 'ചരിത്രം',
      'bill_total_gst': 'ആകെ ബിൽ തുക (₹)',
      'taxable_amount': 'നികുതി വിധേയമായ തുക',
      'included_gst': 'ജിഎസ്ടി തുക',
      'save_bill': 'ബിൽ സേവ് ചെയ്യുക',
      'you_are_owed': 'നിങ്ങൾക്ക് ലഭിക്കാനുള്ളത്',
      'you_owe': 'നിങ്ങൾ നൽകാനുള്ളത്',
      'record_payment': 'പേയ്‌മെന്റ് രേഖപ്പെടുത്തുക',
    },
    'mr': {
      'quick_split': 'झटपट वाटणी',
      'balances': 'शिल्लक',
      'groups': 'गट',
      'history': 'इतिहास',
      'bill_total_gst': 'एकूण बिल रक्कम (₹)',
      'taxable_amount': 'करपात्र रक्कम',
      'included_gst': 'समाविष्ट जीएसटी',
      'save_bill': 'बिल जतन करा',
      'you_are_owed': 'तुम्हाला येणे',
      'you_owe': 'तुम्ही देणे',
      'record_payment': 'पेमेंट नोंदवा',
    },
    'bn': {
      'quick_split': 'কুইক স্প্লিট',
      'balances': 'হিসাব',
      'groups': 'গ্রুপ',
      'history': 'ইতিহাস',
      'bill_total_gst': 'মোট বিল (₹)',
      'taxable_amount': 'করযোগ্য পরিমাণ',
      'included_gst': 'জিএসটি পরিমাণ',
      'save_bill': 'বিল সেভ করুন',
      'you_are_owed': 'আপনি পাবেন',
      'you_owe': 'আপনি দেবেন',
      'record_payment': 'পেমেন্ট রেকর্ড করুন',
    },
    'gu': {
      'quick_split': 'ઝડપી ભાગ',
      'balances': 'હિસાબ',
      'groups': 'જૂથો',
      'history': 'ઇતિહાस',
      'bill_total_gst': 'કુલ બિલ રકમ (₹)',
      'taxable_amount': 'કરપાત્ર રકમ',
      'included_gst': 'જીએસટી રકમ',
      'save_bill': 'બિલ સાચવો',
      'you_are_owed': 'તમને મળવાના બાકી',
      'you_owe': 'તમારે ચૂકવવાના બાકી',
      'record_payment': 'ચૂકવણી નોંધો',
    },
    'pa': {
      'quick_split': 'ਤੁਰੰਤ ਵੰਡ',
      'balances': 'ਬਕਾਇਆ',
      'groups': 'ਗਰੁੱਪ',
      'history': 'ਇਤਿਹਾਸ',
      'bill_total_gst': 'ਕੁੱਲ ਬਿੱਲ ਰਕਮ (₹)',
      'taxable_amount': 'ਟੈਕਸਯੋਗ ਰਕਮ',
      'included_gst': 'ਜੀਐਸਟੀ ਰਕਮ',
      'save_bill': 'ਬਿੱਲ ਸੇਵ ਕਰੋ',
      'you_are_owed': 'ਤੁਸੀਂ ਲੈਣੇ ਹਨ',
      'you_owe': 'ਤੁਸੀਂ ਦੇਣੇ ਹਨ',
      'record_payment': 'ਭੁਗਤਾਨ ਦਰਜ ਕਰੋ',
    },
    'or': {
      'quick_split': 'ତୁରନ୍ତ ଭାগ',
      'balances': 'ବାକି ହିସାବ',
      'groups': 'ଗ୍ରୁପ୍',
      'history': 'ଇତିହାସ',
      'bill_total_gst': 'ମୋଟ ବିଲ୍ ରାଶି (₹)',
      'taxable_amount': 'ଟିକସ ଯୋଗ୍ୟ ରାଶି',
      'included_gst': 'GST ରାଶି',
      'save_bill': 'ବିଲ୍ ସେଭ୍ କରନ୍ତୁ',
      'you_are_owed': 'ଆପଣ ପାଇବେ',
      'you_owe': 'ଆପଣ ଦେବେ',
      'record_payment': 'ପେମେଣ୍ଟ ରେକର୍ଡ କରନ୍ତୁ',
    },
  };

  String tr(String key) {
    return _translations[lang.code]?[key] ?? _translations['en']![key] ?? key;
  }
}