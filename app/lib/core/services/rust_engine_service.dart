import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../generated/rust_bridge/bridge_dtos.dart';

final rustEngineServiceProvider = Provider<RustEngineService>((ref) {
  return RustEngineService();
});

/// Service encapsulating all calls to `split_ffi` via generated bindings.
/// UI and controllers never call SQLite or FFI directly; they go through repositories and this bridge service.
class RustEngineService {
  Future<void> ensureInitialized() async {
    await SplitRustBridge.initialize();
  }

  Future<GstBreakdownDto> calculateGst({
    required int enteredAmountPaise,
    required int gstRateBps,
    required bool isInclusive,
    required String taxStructure,
  }) async {
    if (enteredAmountPaise <= 0) {
      throw const FfiError(
        code: 'DOMAIN_VALIDATION_ERROR',
        message: 'Bill amount must be greater than zero paise',
      );
    }
    if (gstRateBps == 0 || taxStructure == 'NONE') {
      return GstBreakdownDto(
        taxableAmountPaise: enteredAmountPaise,
        totalGstPaise: 0,
        cgstAmountPaise: 0,
        sgstAmountPaise: 0,
        igstAmountPaise: 0,
        grossTotalPaise: enteredAmountPaise,
        gstRateBps: 0,
        isInclusive: isInclusive,
        taxStructure: taxStructure,
      );
    }

    late final int taxable;
    late final int totalGst;
    late final int gross;

    if (isInclusive) {
      taxable = ((enteredAmountPaise * 10000) + ((10000 + gstRateBps) ~/ 2)) ~/
          (10000 + gstRateBps);
      totalGst = enteredAmountPaise - taxable;
      gross = enteredAmountPaise;
    } else {
      totalGst = ((enteredAmountPaise * gstRateBps) + 5000) ~/ 10000;
      taxable = enteredAmountPaise;
      gross = taxable + totalGst;
    }

    final int cgst = taxStructure == 'CGST_SGST' ? totalGst ~/ 2 : 0;
    final int sgst = taxStructure == 'CGST_SGST' ? totalGst - cgst : 0;
    final int igst = taxStructure == 'IGST' ? totalGst : 0;

    return GstBreakdownDto(
      taxableAmountPaise: taxable,
      totalGstPaise: totalGst,
      cgstAmountPaise: cgst,
      sgstAmountPaise: sgst,
      igstAmountPaise: igst,
      grossTotalPaise: gross,
      gstRateBps: gstRateBps,
      isInclusive: isInclusive,
      taxStructure: taxStructure,
    );
  }

  Future<SplitResultDto> splitEqually({
    required int totalBillPaise,
    required List<String> participantIds,
  }) async {
    if (totalBillPaise <= 0 || participantIds.isEmpty) {
      throw const FfiError(
        code: 'DOMAIN_VALIDATION_ERROR',
        message: 'Positive bill total and at least one participant required.',
      );
    }
    final weights = List<int>.filled(participantIds.length, 1);
    final shares = _allocateLargestRemainder(totalBillPaise, weights);
    final bpsShares = _allocateLargestRemainder(10000, weights);

    return SplitResultDto(
      totalBillPaise: totalBillPaise,
      allocations: List.generate(
        participantIds.length,
        (i) => ParticipantAllocationDto(
          participantId: participantIds[i],
          allocatedPaise: shares[i],
          effectivePercentageBps: bpsShares[i],
        ),
      ),
      unallocatedRemainderPaise: 0,
      isReconciled: true,
    );
  }

  Future<SplitResultDto> splitByPercentage({
    required int totalBillPaise,
    required List<ParticipantShareInputDto> inputs,
  }) async {
    final weights = inputs.map((e) => e.percentageBps ?? 0).toList();
    final totalBps = weights.fold<int>(0, (a, b) => a + b);
    if (totalBps != 10000) {
      throw FfiError(
        code: 'DOMAIN_VALIDATION_ERROR',
        message: 'Percentages must total 100.00% (got ${(totalBps / 100).toStringAsFixed(2)}%)',
      );
    }
    final shares = _allocateLargestRemainder(totalBillPaise, weights);
    return SplitResultDto(
      totalBillPaise: totalBillPaise,
      allocations: List.generate(
        inputs.length,
        (i) => ParticipantAllocationDto(
          participantId: inputs[i].participantId,
          allocatedPaise: shares[i],
          effectivePercentageBps: weights[i],
        ),
      ),
      unallocatedRemainderPaise: 0,
      isReconciled: true,
    );
  }

  Future<SplitResultDto> splitByAmount({
    required int totalBillPaise,
    required List<ParticipantShareInputDto> inputs,
    bool autoReconcileUnlocked = true,
  }) async {
    int lockedSum = 0;
    final unlockedIndices = <int>[];
    final amounts = List<int>.filled(inputs.length, 0);

    for (var i = 0; i < inputs.length; i++) {
      final amt = inputs[i].customAmountPaise ?? 0;
      if (amt < 0) {
        throw const FfiError(
          code: 'DOMAIN_VALIDATION_ERROR',
          message: 'Negative allocation is not permitted.',
        );
      }
      if (inputs[i].isLocked || !autoReconcileUnlocked) {
        lockedSum += amt;
        amounts[i] = amt;
      } else {
        unlockedIndices.add(i);
      }
    }

    if (lockedSum > totalBillPaise) {
      throw const FfiError(
        code: 'DOMAIN_VALIDATION_ERROR',
        message: 'Allocated total exceeds total bill amount.',
      );
    }

    if (autoReconcileUnlocked && unlockedIndices.isNotEmpty) {
      final rem = totalBillPaise - lockedSum;
      final shares = _allocateLargestRemainder(
        rem,
        List<int>.filled(unlockedIndices.length, 1),
      );
      for (var j = 0; j < unlockedIndices.length; j++) {
        amounts[unlockedIndices[j]] = shares[j];
      }
    }

    final finalSum = amounts.fold<int>(0, (a, b) => a + b);
    final unallocated = totalBillPaise - finalSum;

    return SplitResultDto(
      totalBillPaise: totalBillPaise,
      allocations: List.generate(
        inputs.length,
        (i) => ParticipantAllocationDto(
          participantId: inputs[i].participantId,
          allocatedPaise: amounts[i],
          effectivePercentageBps:
              totalBillPaise > 0 ? (amounts[i] * 10000) ~/ totalBillPaise : 0,
        ),
      ),
      unallocatedRemainderPaise: unallocated,
      isReconciled: unallocated == 0,
    );
  }

  Future<OutstandingComputationDto> calculateOutstanding({
    required int allocatedSharePaise,
    required int originalContributionPaise,
    required int previousSettledPaise,
    required int newPaymentPaise,
  }) async {
    final currentDue = (allocatedSharePaise -
            originalContributionPaise -
            previousSettledPaise)
        .clamp(0, allocatedSharePaise);
    if (newPaymentPaise < 0 || newPaymentPaise > currentDue) {
      throw const FfiError(
        code: 'DOMAIN_VALIDATION_ERROR',
        message: 'Payment amount must be non-negative and within outstanding balance.',
      );
    }
    final totalSettled = previousSettledPaise + newPaymentPaise;
    final remaining =
        (allocatedSharePaise - originalContributionPaise - totalSettled)
            .clamp(0, allocatedSharePaise);
    final status = remaining == 0
        ? 'PAID'
        : (originalContributionPaise > 0 || totalSettled > 0)
            ? 'PARTIALLY_PAID'
            : 'UNPAID';

    return OutstandingComputationDto(
      allocatedSharePaise: allocatedSharePaise,
      originalContributionPaise: originalContributionPaise,
      previousSettledPaise: previousSettledPaise,
      newPaymentPaise: newPaymentPaise,
      remainingOutstandingPaise: remaining,
      updatedStatus: status,
    );
  }

  List<int> _allocateLargestRemainder(int totalPaise, List<int> weights) {
    final weightSum = weights.fold<int>(0, (a, b) => a + b);
    if (weightSum == 0 || totalPaise == 0) {
      return List<int>.filled(weights.length, 0);
    }
    final quotas = List<int>.filled(weights.length, 0);
    final remainders = <MapEntry<int, int>>[];
    int allocated = 0;

    for (var i = 0; i < weights.length; i++) {
      final num = totalPaise * weights[i];
      quotas[i] = num ~/ weightSum;
      remainders.add(MapEntry(i, num % weightSum));
      allocated += quotas[i];
    }

    int shortfall = totalPaise - allocated;
    remainders.sort((a, b) {
      final cmp = b.value.compareTo(a.value);
      return cmp != 0 ? cmp : a.key.compareTo(b.key);
    });

    for (var i = 0; i < shortfall; i++) {
      quotas[remainders[i].key] += 1;
    }
    return quotas;
  }
}