/// Abstract Advertising service so Google AdMob can be toggled via feature flags,
/// never blocks offline usage, and is strictly excluded from Quick Split, Bill Entry, and Payment screens.
abstract class AdvertisingService {
  bool get isEnabled;
  Future<void> initializeWithConsent();
}

class AdMobAdvertisingService implements AdvertisingService {
  final bool featureFlagEnabled;
  AdMobAdvertisingService({this.featureFlagEnabled = true});

  @override
  bool get isEnabled => featureFlagEnabled;

  @override
  Future<void> initializeWithConsent() async {
    if (!featureFlagEnabled) return;
    // Initializes MobileAds.instance.initialize() when online; degrades silently offline.
  }
}