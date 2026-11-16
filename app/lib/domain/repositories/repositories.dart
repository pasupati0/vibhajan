import '../../generated/rust_bridge/api.dart';

class ParticipantEntity {
  final String id;
  final String name;
  final String? phoneE164;
  final String? upiId;
  final bool isSelf;
  final double customPercent;
  final int? customAmountPaise;
  final bool isLocked;

  const ParticipantEntity({
    required this.id,
    required this.name,
    this.phoneE164,
    this.upiId,
    this.isSelf = false,
    this.customPercent = 0,
    this.customAmountPaise,
    this.isLocked = false,
  });

  ParticipantEntity copyWith({
    String? name,
    double? customPercent,
    int? customAmountPaise,
    bool? isLocked,
  }) {
    return ParticipantEntity(
      id: id,
      name: name ?? this.name,
      phoneE164: phoneE164,
      upiId: upiId,
      isSelf: isSelf,
      customPercent: customPercent ?? this.customPercent,
      customAmountPaise: customAmountPaise ?? this.customAmountPaise,
      isLocked: isLocked ?? this.isLocked,
    );
  }
}

class SavedBillEntity {
  final String id;
  final String description;
  final String category;
  final String? groupId;
  final DateTime expenseDate;
  final String? notes;
  final String? attachmentPath;
  final GstBreakdownDto gstBreakdown;
  final List<ParticipantEntity> participants;
  final Map<String, int> allocatedPaiseByParticipant;
  final Map<String, int> originalContributionsByParticipant;
  final Map<String, int> subsequentSettledByParticipant;
  final List<String> auditLogEntries;

  const SavedBillEntity({
    required this.id,
    required this.description,
    required this.category,
    this.groupId,
    required this.expenseDate,
    this.notes,
    this.attachmentPath,
    required this.gstBreakdown,
    required this.participants,
    required this.allocatedPaiseByParticipant,
    required this.originalContributionsByParticipant,
    required this.subsequentSettledByParticipant,
    required this.auditLogEntries,
  });

  int remainingOutstandingFor(String participantId) {
    final alloc = allocatedPaiseByParticipant[participantId] ?? 0;
    final orig = originalContributionsByParticipant[participantId] ?? 0;
    final settled = subsequentSettledByParticipant[participantId] ?? 0;
    return (alloc - orig - settled).clamp(0, alloc);
  }

  String statusFor(String participantId) {
    final rem = remainingOutstandingFor(participantId);
    final orig = originalContributionsByParticipant[participantId] ?? 0;
    final settled = subsequentSettledByParticipant[participantId] ?? 0;
    if (rem <= 0) return 'Paid';
    if (orig > 0 || settled > 0) return 'Partially Paid';
    return 'Unpaid';
  }
}

abstract class ExpenseRepository {
  Future<List<SavedBillEntity>> watchAllExpenses();
  Future<SavedBillEntity> saveExpense(SavedBillEntity expense);
  Future<SavedBillEntity> updateParticipantAllocation({
    required String expenseId,
    required String participantId,
    required int newAllocatedPaise,
  });
  Future<SavedBillEntity> recordPartialOrFullSettlement({
    required String expenseId,
    required String participantId,
    required int paymentPaise,
    required String paymentMethod,
  });
  Future<void> deleteExpense(String expenseId);
}

abstract class ConflictResolutionStrategy<T> {
  T resolveConflict({required T localEntity, required T remoteEntity});
}