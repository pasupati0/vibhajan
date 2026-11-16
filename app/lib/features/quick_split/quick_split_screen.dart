import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/utils/inr_formatter.dart';
import 'quick_split_controller.dart';

class QuickSplitScreen extends ConsumerWidget {
  const QuickSplitScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(quickSplitProvider);
    final notifier = ref.read(quickSplitProvider.notifier);
    final gst = state.gstBreakdown;
    final split = state.splitResult;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: [
        // 1. Amount & GST Hero Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total Bill Amount (Inclusive of GST)',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  initialValue: (state.enteredTotalPaise / 100).toStringAsFixed(2),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                  decoration: const InputDecoration(
                    prefixText: '₹ ',
                    suffixText: 'INR',
                  ),
                  onChanged: (v) {
                    final parsed = double.tryParse(v);
                    if (parsed != null && parsed > 0) {
                      notifier.setBillAmountRupees(parsed);
                    }
                  },
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  children: [0.0, 5.0, 12.0, 18.0, 28.0].map((rate) {
                    final isSelected = (state.gstRateBps / 100) == rate;
                    return ChoiceChip(
                      label: Text('${rate.toInt()}% GST'),
                      selected: isSelected,
                      onSelected: (_) {
                        HapticFeedback.selectionClick();
                        notifier.setGstRatePercent(rate);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'CGST_SGST', label: Text('CGST + SGST')),
                    ButtonSegment(value: 'IGST', label: Text('IGST')),
                    ButtonSegment(value: 'NONE', label: Text('No Tax')),
                  ],
                  selected: {state.taxStructure},
                  onSelectionChanged: (s) => notifier.setTaxStructure(s.first),
                ),
                if (gst != null) ...[
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Taxable Value'),
                      Text(
                        InrFormatter.formatPaise(gst.taxableAmountPaise),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        state.taxStructure == 'CGST_SGST'
                            ? 'Included GST (CGST ${InrFormatter.formatPaise(gst.cgstAmountPaise)} + SGST ${InrFormatter.formatPaise(gst.sgstAmountPaise)})'
                            : 'Included IGST',
                      ),
                      Text(
                        InrFormatter.formatPaise(gst.totalGstPaise),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // 2. Split Mode & Participant Allocations
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Participants (${state.participants.length})',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    TextButton.icon(
                      onPressed: () => _showAddParticipantDialog(context, notifier),
                      icon: const Icon(Icons.person_add_alt_1, size: 18),
                      label: const Text('Add Person'),
                    ),
                  ],
                ),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'EQUAL', label: Text('Equal')),
                    ButtonSegment(value: 'PERCENTAGE', label: Text('% Split')),
                    ButtonSegment(value: 'CUSTOM', label: Text('₹ Custom')),
                  ],
                  selected: {state.splitMode},
                  onSelectionChanged: (s) {
                    HapticFeedback.lightImpact();
                    notifier.setSplitMode(s.first);
                  },
                ),
                const SizedBox(height: 12),
                if (state.validationError != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      state.validationError!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                ...state.participants.map((p) {
                  final alloc = split?.allocations
                      .where((a) => a.participantId == p.id)
                      .firstOrNull;
                  final sharePaise = alloc?.allocatedPaise ?? 0;
                  final effPct = (alloc?.effectivePercentageBps ?? 0) / 100.0;

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor:
                              Theme.of(context).colorScheme.primaryContainer,
                          child: Text(p.name.substring(0, 1).toUpperCase()),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.name,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              Text(
                                '${effPct.toStringAsFixed(2)}% of bill',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        if (state.splitMode == 'PERCENTAGE')
                          SizedBox(
                            width: 82,
                            child: TextFormField(
                              initialValue: p.customPercent.toStringAsFixed(0),
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                suffixText: '%',
                                isDense: true,
                              ),
                              onChanged: (val) {
                                final pct = double.tryParse(val);
                                if (pct != null) {
                                  notifier.updateParticipantPercent(p.id, pct);
                                }
                              },
                            ),
                          ),
                        const SizedBox(width: 12),
                        Text(
                          InrFormatter.formatPaise(sharePaise),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // 3. Action Buttons (Save + WhatsApp Share)
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  if (gst == null || split == null) return;
                  final lines = split.allocations.map((a) {
                    final name = state.participants
                        .firstWhere((p) => p.id == a.participantId)
                        .name;
                    return '• $name: ${InrFormatter.formatPaise(a.allocatedPaise)}';
                  }).join('\n');
                  Share.share(
                    '🧾 *${state.description}*\n'
                    'Total: ${InrFormatter.formatPaise(gst.grossTotalPaise)} '
                    '(Taxable: ${InrFormatter.formatPaise(gst.taxableAmountPaise)}, GST: ${InrFormatter.formatPaise(gst.totalGstPaise)})\n\n'
                    '*Split Breakdown:*\n$lines',
                  );
                },
                icon: const Icon(Icons.share_outlined),
                label: const Text('WhatsApp Share'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                onPressed: () async {
                  HapticFeedback.mediumImpact();
                  final saved = await notifier.saveCurrentBill();
                  if (saved != null && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Saved "${saved.description}" (${InrFormatter.formatPaise(saved.gstBreakdown.grossTotalPaise)})',
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Save Bill'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showAddParticipantDialog(
    BuildContext context,
    QuickSplitNotifier notifier,
  ) {
    final controller = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Participant'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Name (e.g., Vikram)'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              notifier.addParticipant(controller.text);
              Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}