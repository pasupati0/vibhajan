import 'dart:convert';
import 'package:cryptography/cryptography.dart';

/// AES-GCM 256-bit Encrypted Local Backup and Restore Service backed by Android Keystore keys.
class EncryptedBackupService {
  final _cipher = AesGcm.with256bits();

  Future<String> exportEncryptedBackupJson({
    required Map<String, dynamic> databaseSnapshot,
    required SecretKey secretKey,
  }) async {
    final clearBytes = utf8.encode(jsonEncode(databaseSnapshot));
    final nonce = _cipher.newNonce();
    final secretBox = await _cipher.encrypt(
      clearBytes,
      secretKey: secretKey,
      nonce: nonce,
    );
    return base64Encode(secretBox.concatenation());
  }

  Future> restoreEncryptedBackupJson({
    required String encryptedPayloadBase64,
    required SecretKey secretKey,
  }) async {
    final rawBytes = base64Decode(encryptedPayloadBase64);
    final box = SecretBox.fromConcatenation(
      rawBytes,
      nonceLength: _cipher.nonceLength,
      macLength: _cipher.macAlgorithm.macLength,
    );
    final clearBytes = await _cipher.decrypt(box, secretKey: secretKey);
    return jsonDecode(utf8.decode(clearBytes)) as Map<String, dynamic>;
  }
}