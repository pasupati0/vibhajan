class InrFormatter {
  /// Formats integer paise into Indian standard format: ₹1,23,456.78
  static String formatPaise(int paise) {
    final bool isNegative = paise < 0;
    final int absPaise = paise.abs();
    final int rupees = absPaise ~/ 100;
    final int remPaise = absPaise % 100;

    final String rupeeStr = rupees.toString();
    String formattedRupees;
    if (rupeeStr.length <= 3) {
      formattedRupees = rupeeStr;
    } else {
      final String lastThree = rupeeStr.substring(rupeeStr.length - 3);
      String head = rupeeStr.substring(0, rupeeStr.length - 3);
      final List<String> groups = [];
      while (head.length > 2) {
        groups.insert(0, head.substring(head.length - 2));
        head = head.substring(0, head.length - 2);
      }
      if (head.isNotEmpty) {
        groups.insert(0, head);
      }
      formattedRupees = '${groups.join(',')},$lastThree';
    }

    final String sign = isNegative ? '-' : '';
    return '$sign₹$formattedRupees.${remPaise.toString().padLeft(2, '0')}';
  }
}