import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class BaatoTheme {
  static const Color primaryOrange = Color(0xFFFF5A1F); // Vibrant Indian Saffron-Orange
  static const Color deepOrangeContainer = Color(0xFFFFEDE6);
  static const Color darkSurface = Color(0xFF141210);
  static const Color darkCard = Color(0xFF1F1C19);
  static const Color settledGreen = Color(0xFF12805C);
  static const Color payableRed = Color(0xFFD93829);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryOrange,
      primary: primaryOrange,
      brightness: Brightness.light,
      surface: const Color(0xFFFAF8F6),
    );
    return _baseTheme(scheme, isDark: false);
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryOrange,
      primary: const Color(0xFFFF7847),
      brightness: Brightness.dark,
      surface: darkSurface,
    );
    return _baseTheme(scheme, isDark: true);
  }

  static ThemeData _baseTheme(ColorScheme scheme, {required bool isDark}) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light.copyWith(
                statusBarColor: Colors.transparent,
                systemNavigationBarColor: Colors.transparent,
              )
            : SystemUiOverlayStyle.dark.copyWith(
                statusBarColor: Colors.transparent,
                systemNavigationBarColor: Colors.transparent,
              ),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: isDark ? darkCard : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: scheme.outlineVariant.withOpacity(0.45),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF28231F) : const Color(0xFFF3EFEA),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
    );
  }
}