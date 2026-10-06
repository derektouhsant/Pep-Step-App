import UIKit
import Capacitor
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

/// Registers Health on the bridge itself. Name lookup can still miss the class,
/// and the web stub never calls HealthKit, so the app never appears in
/// Settings → Health → Data Access & Devices. This instance is registered
/// before the web view loads.
public class PepStepBridgeViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
