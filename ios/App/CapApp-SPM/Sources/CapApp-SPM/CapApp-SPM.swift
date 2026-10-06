import CapacitorApp
import CapacitorSplashScreen
import CapacitorStatusBar
import CapgoCapacitorHealth

public let isCapacitorApp = true

/// Capacitor finds plugins with NSClassFromString after reading packageClassList.
/// Swift classes in these static SPM libraries are dropped by the linker unless
/// something in the app target references them, and the JS bridge then uses the
/// web stub. Calling this from AppDelegate keeps the classes in the signed binary.
public enum CapacitorPluginRegistration {
    public static func load() {
        _ = AppPlugin.self
        _ = SplashScreenPlugin.self
        _ = StatusBarPlugin.self
        _ = HealthPlugin.self
    }
}
