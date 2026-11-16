import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/services/rust_engine_service.dart';
import 'core/theme/app_theme.dart';
import 'features/shell/main_shell_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  final container = ProviderContainer();
  await container.read(rustEngineServiceProvider).ensureInitialized();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const BaatoApp(),
    ),
  );
}

class BaatoApp extends ConsumerWidget {
  const BaatoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp(
      title: 'Baaṭo Split',
      debugShowCheckedModeBanner: false,
      theme: BaatoTheme.light(),
      darkTheme: BaatoTheme.dark(),
      themeMode: themeMode,
      home: const MainShellScreen(),
    );
  }
}