import 'package:url_launcher/url_launcher.dart';

/// Builds standard NPCI UPI deep-links (`upi://pay?...`).
/// Never marks a payment settled automatically; requires explicit user confirmation.
class UpiIntentService {
  static Uri buildUpiPayUri({
    required String payeeVpa,
    required String payeeName,
    required int amountPaise,
    required String transactionNote,
  }) {
    final rupeesDecimal = (amountPaise / 100.0).toStringAsFixed(2);
    return Uri(
      scheme: 'upi',
      host: 'pay',
      queryParameters: {
        'pa': payeeVpa,
        'pn': payeeName,
        'am': rupeesDecimal,
        'cu': 'INR',
        'tn': transactionNote,
      },
    );
  }

  static Future<bool> launchUpiApp(Uri uri) async {
    if (await canLaunchUrl(uri)) {
      return launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return false;
  }
}