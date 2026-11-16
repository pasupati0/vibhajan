import 'package:baato_split/core/services/rust_engine_service.dart';
import 'package:baato_split/features/quick_split/quick_split_controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late RustEngineService engine;
  late QuickSplitNotifier notifier;

  setUp(() {
    engine = RustEngineService();
    notifier = QuickSplitNotifier(engine);
  });

  test('Scenario A: ₹1,180 inclusive of 18% GST + 40/35/25% split produces ₹472, ₹413, ₹295', () async {
    await notifier.recalculateViaRust();
    final state = notifier.state;

    expect(state.gstBreakdown!.taxableAmountPaise, 100000); // ₹1,000.00
    expect(state.gstBreakdown!.totalGstPaise, 18000); // ₹180.00
    expect(state.gstBreakdown!.cgstAmountPaise, 9000); // ₹90.00
    expect(state.gstBreakdown!.sgstAmountPaise, 9000); // ₹90.00

    final allocations = state.splitResult!.allocations;
    expect(allocations[0].allocatedPaise, 47200); // ₹472.00
    expect(allocations[1].allocatedPaise, 41300); // ₹413.00
    expect(allocations[2].allocatedPaise, 29500); // ₹295.00
    expect(state.splitResult!.isReconciled, isTrue);

    final saved = await notifier.saveCurrentBill();
    expect(saved, isNotNull);
    expect(notifier.state.savedBills.length, 1);
  });

  test('Scenario B & C: Expense allocation edit, reconciliation, audit log, and partial->full settlement', () async {
    final saved = (await notifier.saveCurrentBill())!;

    // Scenario B: Change p_self allocation to ₹500.00 (50,000 paise); remaining ₹680.00 splits into ₹340.00 each
    await notifier.editSavedBillParticipantAllocation(
      billId: saved.id,
      participantId: 'p_self',
      newAmountPaise: 50000,
    );

    var updated = notifier.state.savedBills.first;
    expect(updated.allocatedPaiseByParticipant['p_self'], 50000);
    expect(updated.allocatedPaiseByParticipant['p_priya'], 34000);
    expect(updated.allocatedPaiseByParticipant['p_rohan'], 34000);
    expect(updated.auditLogEntries.length, 2);

    // Scenario C: Priya owes ₹340.00 (34,000 paise). Record ₹140.00 partial payment, then ₹200.00 final payment.
    await notifier.recordParticipantSettlement(
      billId: saved.id,
      participantId: 'p_priya',
      paymentPaise: 14000,
    );
    updated = notifier.state.savedBills.first;
    expect(updated.remainingOutstandingFor('p_priya'), 20000);
    expect(updated.statusFor('p_priya'), 'Partially Paid');

    await notifier.recordParticipantSettlement(
      billId: saved.id,
      participantId: 'p_priya',
      paymentPaise: 20000,
    );
    updated = notifier.state.savedBills.first;
    expect(updated.remainingOutstandingFor('p_priya'), 0);
    expect(updated.statusFor('p_priya'), 'Paid');
  });
}