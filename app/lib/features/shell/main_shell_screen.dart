import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/inr_formatter.dart';
import '../quick_split/quick_split_controller.dart';
import '../quick_split/quick_split_screen.dart';

final languageProvider = StateProvider<SupportedIndianLanguage>(
  (ref) => SupportedIndianLanguage.en,
);

final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

class MainShellScreen extends ConsumerStatefulWidget {
  const MainShellScreen({super.key});

  @override
  ConsumerState<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends ConsumerState<MainShellScreen> {
  // Tab 0 is ALWAYS Quick Split on app launch
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(languageProvider);
    final strings = BaatoStrings(lang);
    final splitState = ref.watch(quickSplitProvider);

    final pages = [
      const QuickSplitScreen(),
      _BalancesTabView(savedBills: splitState.savedBills),
      const _GroupsTabView(),
      _HistoryTabView(savedBills: splitState.savedBills),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                '₹ बाँटो',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              strings.tr('quick_split'),
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        actions: [
          // One-tap 11-Indian-language switcher
          PopupMenuButton<SupportedIndianLanguage>(
            icon: const Icon(Icons.translate_rounded),
            tooltip: 'Switch Language',
            onSelected: (selected) {
              HapticFeedback.selectionClick();
              ref.read(languageProvider.notifier).state = selected;
            },
            itemBuilder: (ctx) => SupportedIndianLanguage.values
                .map(
                  (l) => PopupMenuItem(
                    value: l,
                    child: Text('${l.nativeLabel} (${l.englishName})'),
                  ),
                )
                .toList(),
          ),
          IconButton(
            icon: const Icon(Icons.brightness_6_outlined),
            onPressed: () {
              final current = ref.read(themeModeProvider);
              ref.read(themeModeProvider.notifier).state =
                  current == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
            },
          ),
        ],
      ),
      body: pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) {
          HapticFeedback.selectionClick();
          setState(() => _selectedIndex = idx);
        },
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.bolt_outlined),
            selectedIcon: const Icon(Icons.bolt),
            label: strings.tr('quick_split'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: const Icon(Icons.account_balance_wallet),
            label: strings.tr('balances'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.groups_outlined),
            selectedIcon: const Icon(Icons.groups),
            label: strings.tr('groups'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long),
            label: strings.tr('history'),
          ),
        ],
      ),
    );
  }
}

class _BalancesTabView extends ConsumerWidget {
  final List<dynamic> savedBills;
  const _BalancesTabView({required this.savedBills});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(quickSplitProvider);
    final notifier = ref.read(quickSplitProvider.notifier);

    int totalReceivablePaise = 0;
    for (final bill in state.savedBills) {
      for (final p in bill.participants) {
        if (!p.isSelf) {
          totalReceivablePaise += bill.remainingOutstandingFor(p.id);
        }
      }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Receivables (Owed to You)'),
                    const SizedBox(height: 4),
                    Text(
                      InrFormatter.formatPaise(totalReceivablePaise),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: BaatoTheme.settledGreen,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ],
                ),
                const Icon(Icons.trending_up, color: BaatoTheme.settledGreen, size: 32),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...state.savedBills.map(
          (bill) => Card(
            child: ExpansionTile(
              title: Text(
                bill.description,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                'Total: ${InrFormatter.formatPaise(bill.gstBreakdown.grossTotalPaise)} • Tax: ${InrFormatter.formatPaise(bill.gstBreakdown.totalGstPaise)}',
              ),
              children: [
                ...bill.participants.where((p) => !p.isSelf).map((p) {
                  final rem = bill.remainingOutstandingFor(p.id);
                  final status = bill.statusFor(p.id);
                  return ListTile(
                    title: Text('${p.name} ($status)'),
                    subtitle: Text(
                      'Allocated: ${InrFormatter.formatPaise(bill.allocatedPaiseByParticipant[p.id] ?? 0)} | Remaining: ${InrFormatter.formatPaise(rem)}',
                    ),
                    trailing: rem > 0
                        ? FilledButton.tonal(
                            onPressed: () {
                              final payAmt = rem > 20000 ? 20000 : rem;
                              notifier.recordParticipantSettlement(
                                billId: bill.id,
                                participantId: p.id,
                                paymentPaise: payAmt,
                              );
                            },
                            child: const Text('Record Pay'),
                          )
                        : const Icon(Icons.verified, color: BaatoTheme.settledGreen),
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _GroupsTabView extends StatelessWidget {
  const _GroupsTabView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Card(
          child: ListTile(
            leading: CircleAvatar(child: Icon(Icons.apartment)),
            title: Text('Indiranagar Flatmates'),
            subtitle: Text('3 Members • Rent, Utilities, Wi-Fi & Groceries'),
          ),
        ),
        Card(
          child: ListTile(
            leading: CircleAvatar(child: Icon(Icons.flight_takeoff)),
            title: Text('Gokarna Weekend Roadtrip'),
            subtitle: Text('5 Members • Fuel, Stays & Cafe Bills'),
          ),
        ),
      ],
    );
  }
}

class _HistoryTabView extends StatelessWidget {
  final List<dynamic> savedBills;
  const _HistoryTabView({required this.savedBills});

  @override
  Widget build(BuildContext context) {
    if (savedBills.isEmpty) {
      return const Center(
        child: Text('No bills saved yet. Use Quick Split to create your first bill.'),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: savedBills.length,
      itemBuilder: (ctx, idx) {
        final bill = savedBills[idx];
        return Card(
          child: ListTile(
            title: Text(bill.description),
            subtitle: Text(
              '${bill.category} • Audit entries: ${bill.auditLogEntries.length}',
            ),
            trailing: Text(
              InrFormatter.formatPaise(bill.gstBreakdown.grossTotalPaise),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        );
      },
    );
  }
}