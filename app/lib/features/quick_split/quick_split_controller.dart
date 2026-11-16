import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/services/rust_engine_service.dart';
import '../../domain/repositories/repositories.dart';
import '../../generated/rust_bridge/api.dart';

class QuickSplitState {
  final int enteredTotalPaise;
  final int gstRateBps;
  final bool isGstInclusive;
  final String taxStructure; // CGST_SGST | IGST | NONE
  final String splitMode; // EQUAL | PERCENTAGE | CUSTOM
  final String description;
  final String category;
  final String? groupId;
  final String? attachmentPath;
  final List<ParticipantEntity> participants;
  final GstBreakdownDto? gstBreakdown;
  final SplitResultDto? splitResult;
  final String? validationError;
  final List<SavedBillEntity> savedBills;

  const QuickSplitState({
    required this.enteredTotalPaise,
    required this.gstRateBps,
    required this.isGstInclusive,
    required this.taxStructure,
    required this.splitMode,
    required this.description,
    required this.category,
    this.groupId,
    this.attachmentPath,
    required this.participants,
    this.gstBreakdown,
    this.splitResult,
    this.validationError,
    this.savedBills = const [],
  });

  QuickSplitState copyWith({
    int? enteredTotalPaise,
    int? gstRateBps,
    bool? isGstInclusive,
    String? taxStructure,
    String? splitMode,
    String? description,
    String? category,
    String? groupId,
    String? attachmentPath,
    List<ParticipantEntity>? participants,
    GstBreakdownDto? gstBreakdown,
    SplitResultDto? splitResult,
    String? validationError,
    List<SavedBillEntity>? savedBills,
  }) {
    return QuickSplitState(
      enteredTotalPaise: enteredTotalPaise ?? this.enteredTotalPaise,
      gstRateBps: gstRateBps ?? this.gstRateBps,
      isGstInclusive: isGstInclusive ?? this.isGstInclusive,
      taxStructure: taxStructure ?? this.taxStructure,
      splitMode: splitMode ?? this.splitMode,
      description: description ?? this.description,
      category: category ?? this.category,
      groupId: groupId ?? this.groupId,
      attachmentPath: attachmentPath ?? this.attachmentPath,
      participants: participants ?? this.participants,
      gstBreakdown: gstBreakdown ?? this.gstBreakdown,
      splitResult: splitResult ?? this.splitResult,
      validationError: validationError,
      savedBills: savedBills ?? this.savedBills,
    );
  }
}

class QuickSplitNotifier extends StateNotifier<QuickSplitState> {
  final RustEngineService _rustEngine;
  static const _uuid = Uuid();

  QuickSplitNotifier(this._rustEngine)
      : super(
          const QuickSplitState(
            enteredTotalPaise: 118000, // Default ₹1,180.00 ready for fast inspection
            gstRateBps: 1800, // 18% GST
            isGstInclusive: true,
            taxStructure: 'CGST_SGST',
            splitMode: 'PERCENTAGE',
            description: 'Dinner at Indiranagar Social',
            category: 'Food',
            participants: [
              ParticipantEntity(
                id: 'p_self',
                name: 'You (Payer)',
                isSelf: true,
                customPercent: 40.0,
              ),
              ParticipantEntity(
                id: 'p_priya',
                name: 'Priya Sharma',
                phoneE164: '+919876543210',
                upiId: 'priya@okicici',
                customPercent: 35.0,
              ),
              ParticipantEntity(
                id: 'p_rohan',
                name: 'Rohan Verma',
                phoneE164: '+919812345678',
                upiId: 'rohan@okaxis',
                customPercent: 25.0,
              ),
            ],
          ),
        ) {
    recalculateViaRust();
  }

  Future<void> recalculateViaRust() async {
    try {
      final gst = await _rustEngine.calculateGst(
        enteredAmountPaise: state.enteredTotalPaise,
        gstRateBps: state.gstRateBps,
        isInclusive: state.isGstInclusive,
        taxStructure: state.taxStructure,
      );

      late final SplitResultDto split;
      if (state.splitMode == 'EQUAL') {
        split = await _rustEngine.splitEqually(
          totalBillPaise: gst.grossTotalPaise,
          participantIds: state.participants.map((p) => p.id).toList(),
        );
      } else if (state.splitMode == 'PERCENTAGE') {
        split = await _rustEngine.splitByPercentage(
          totalBillPaise: gst.grossTotalPaise,
          inputs: state.participants
              .map(
                (p) => ParticipantShareInputDto(
                  participantId: p.id,
                  percentageBps: (p.customPercent * 100).round(),
                ),
              )
              .toList(),
        );
      } else {
        split = await _rustEngine.splitByAmount(
          totalBillPaise: gst.grossTotalPaise,
          inputs: state.participants
              .map(
                (p) => ParticipantShareInputDto(
                  participantId: p.id,
                  customAmountPaise: p.customAmountPaise,
                  isLocked: p.isLocked,
                ),
              )
              .toList(),
          autoReconcileUnlocked: true,
        );
      }

      state = state.copyWith(
        gstBreakdown: gst,
        splitResult: split,
        validationError: null,
      );
    } on FfiError catch (e) {
      state = state.copyWith(validationError: e.message);
    }
  }

  Future<void> setBillAmountRupees(double rupees) async {
    state = state.copyWith(enteredTotalPaise: (rupees * 100).round());
    await recalculateViaRust();
  }

  Future<void> setGstRatePercent(double ratePercent) async {
    state = state.copyWith(gstRateBps: (ratePercent * 100).round());
    await recalculateViaRust();
  }

  Future<void> setTaxStructure(String structure) async {
    state = state.copyWith(taxStructure: structure);
    await recalculateViaRust();
  }

  Future<void> setSplitMode(String mode) async {
    state = state.copyWith(splitMode: mode);
    await recalculateViaRust();
  }

  Future<void> addParticipant(String name) async {
    if (name.trim().isEmpty) return;
    final updated = [
      ...state.participants,
      ParticipantEntity(
        id: 'p_${_uuid.v4().substring(0, 8)}',
        name: name.trim(),
        customPercent: 0,
      ),
    ];
    state = state.copyWith(participants: updated);
    await recalculateViaRust();
  }

  Future<void> updateParticipantPercent(String id, double percent) async {
    final updated = state.participants
        .map((p) => p.id == id ? p.copyWith(customPercent: percent) : p)
        .toList();
    state = state.copyWith(participants: updated);
    await recalculateViaRust();
  }

  Future<SavedBillEntity?> saveCurrentBill() async {
    await recalculateViaRust();
    if (state.validationError != null ||
        state.gstBreakdown == null ||
        state.splitResult == null ||
        !state.splitResult!.isReconciled) {
      return null;
    }

    final allocMap = <String, int>{};
    for (final a in state.splitResult!.allocations) {
      allocMap[a.participantId] = a.allocatedPaise;
    }

    // By default, self participant paid the original bill at the merchant counter
    final selfId = state.participants.first.id;
    final contribMap = <String, int>{
      for (final p in state.participants)
        p.id: p.id == selfId ? state.gstBreakdown!.grossTotalPaise : 0,
    };

    final bill = SavedBillEntity(
      id: _uuid.v4(),
      description: state.description.isEmpty ? 'Quick Split Bill' : state.description,
      category: state.category,
      groupId: state.groupId,
      expenseDate: DateTime.now(),
      attachmentPath: state.attachmentPath,
      gstBreakdown: state.gstBreakdown!,
      participants: state.participants,
      allocatedPaiseByParticipant: allocMap,
      originalContributionsByParticipant: contribMap,
      subsequentSettledByParticipant: {
        for (final p in state.participants) p.id: 0,
      },
      auditLogEntries: [
        '${DateTime.now().toIso8601String()}: Created bill (${state.gstBreakdown!.grossTotalPaise} paise) via Rust FFI',
      ],
    );

    state = state.copyWith(savedBills: [bill, ...state.savedBills]);
    return bill;
  }

  /// Scenario B: Edit one participant's allocation and automatically reconcile remaining participants via Rust FFI
  Future<void> editSavedBillParticipantAllocation({
    required String billId,
    required String participantId,
    required int newAmountPaise,
  }) async {
    final idx = state.savedBills.indexWhere((b) => b.id == billId);
    if (idx < 0) return;
    final bill = state.savedBills[idx];

    final inputs = bill.participants.map((p) {
      if (p.id == participantId) {
        return ParticipantShareInputDto(
          participantId: p.id,
          customAmountPaise: newAmountPaise,
          isLocked: true,
        );
      }
      return ParticipantShareInputDto(
        participantId: p.id,
        customAmountPaise: null,
        isLocked: false,
      );
    }).toList();

    final reconciled = await _rustEngine.splitByAmount(
      totalBillPaise: bill.gstBreakdown.grossTotalPaise,
      inputs: inputs,
      autoReconcileUnlocked: true,
    );

    final updatedAlloc = <String, int>{
      for (final a in reconciled.allocations) a.participantId: a.allocatedPaise,
    };

    final updatedBill = SavedBillEntity(
      id: bill.id,
      description: bill.description,
      category: bill.category,
      groupId: bill.groupId,
      expenseDate: bill.expenseDate,
      notes: bill.notes,
      attachmentPath: bill.attachmentPath,
      gstBreakdown: bill.gstBreakdown,
      participants: bill.participants,
      allocatedPaiseByParticipant: updatedAlloc,
      originalContributionsByParticipant: bill.originalContributionsByParticipant,
      subsequentSettledByParticipant: bill.subsequentSettledByParticipant,
      auditLogEntries: [
        ...bill.auditLogEntries,
        '${DateTime.now().toIso8601String()}: Updated allocation for $participantId to $newAmountPaise paise and reconciled peers via Rust FFI.',
      ],
    );

    final nextList = [...state.savedBills];
    nextList[idx] = updatedBill;
    state = state.copyWith(savedBills: nextList);
  }

  /// Scenario C: Record partial or full subsequent payment (tracked separately from original bill contribution)
  Future<void> recordParticipantSettlement({
    required String billId,
    required String participantId,
    required int paymentPaise,
    String method = 'UPI',
  }) async {
    final idx = state.savedBills.indexWhere((b) => b.id == billId);
    if (idx < 0) return;
    final bill = state.savedBills[idx];

    final alloc = bill.allocatedPaiseByParticipant[participantId] ?? 0;
    final orig = bill.originalContributionsByParticipant[participantId] ?? 0;
    final prevSettled = bill.subsequentSettledByParticipant[participantId] ?? 0;

    final comp = await _rustEngine.calculateOutstanding(
      allocatedSharePaise: alloc,
      originalContributionPaise: orig,
      previousSettledPaise: prevSettled,
      newPaymentPaise: paymentPaise,
    );

    final nextSettled = Map<String, int>.from(bill.subsequentSettledByParticipant);
    nextSettled[participantId] = prevSettled + comp.newPaymentPaise;

    final updatedBill = SavedBillEntity(
      id: bill.id,
      description: bill.description,
      category: bill.category,
      groupId: bill.groupId,
      expenseDate: bill.expenseDate,
      notes: bill.notes,
      attachmentPath: bill.attachmentPath,
      gstBreakdown: bill.gstBreakdown,
      participants: bill.participants,
      allocatedPaiseByParticipant: bill.allocatedPaiseByParticipant,
      originalContributionsByParticipant: bill.originalContributionsByParticipant,
      subsequentSettledByParticipant: nextSettled,
      auditLogEntries: [
        ...bill.auditLogEntries,
        '${DateTime.now().toIso8601String()}: Recorded $method settlement of $paymentPaise paise for $participantId (Status: ${comp.updatedStatus}).',
      ],
    );

    final nextList = [...state.savedBills];
    nextList[idx] = updatedBill;
    state = state.copyWith(savedBills: nextList);
  }
}

final quickSplitProvider =
    StateNotifierProvider<QuickSplitNotifier, QuickSplitState>((ref) {
  return QuickSplitNotifier(ref.watch(rustEngineServiceProvider));
});