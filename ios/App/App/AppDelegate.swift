import UIKit
import Capacitor
import OSLog
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let nativeLogger = Logger(subsystem: "com.gimmegolf.app", category: "native_lifecycle")
    private let nativeDiagnosticsEventName = "gimmegolf:native-diagnostics"
    private let maxDiagnosticsDeliveryAttempts = 6
    private let diagnosticsRetryDelaySeconds = 0.25
    private let launchStartedAtMs = Int(Date().timeIntervalSince1970 * 1000)
    private var lifecycleObservers: [NSObjectProtocol] = []
    private var memoryWarningCount = 0
    private var deepLinkOpenCount = 0

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureBootAppearance()
        installLifecycleDiagnosticsObservers()
        nativeLogger.debug("iOS lifecycle: didFinishLaunching")
        emitNativeDiagnostics(
            event: "launch_trace",
            payload: [
                "launchStartedAtMs": launchStartedAtMs,
                "launchOptionsPresent": launchOptions != nil,
            ]
        )

        if let launchUrl = launchOptions?[.url] as? URL {
            deepLinkOpenCount += 1
            emitNativeDiagnostics(
                event: "deep_link",
                payload: [
                    "source": "launch_options",
                    "handled": true,
                    "deepLinkOpenCount": deepLinkOpenCount,
                    "url": makeSanitizedUrlPayload(from: launchUrl),
                ]
            )
        }
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        let handled = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        deepLinkOpenCount += 1
        nativeLogger.debug("iOS lifecycle: openURL handled=\(handled, privacy: .public)")
        emitNativeDiagnostics(
            event: "deep_link",
            payload: [
                "source": "open_url",
                "handled": handled,
                "deepLinkOpenCount": deepLinkOpenCount,
                "url": makeSanitizedUrlPayload(from: url),
            ]
        )
        return handled
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        let handled = ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
        if let webpageUrl = userActivity.webpageURL {
            deepLinkOpenCount += 1
            emitNativeDiagnostics(
                event: "deep_link",
                payload: [
                    "source": "continue_user_activity",
                    "handled": handled,
                    "deepLinkOpenCount": deepLinkOpenCount,
                    "url": makeSanitizedUrlPayload(from: webpageUrl),
                ]
            )
        }
        nativeLogger.debug("iOS lifecycle: continueUserActivity handled=\(handled, privacy: .public)")
        return handled
    }

    func applicationWillTerminate(_ application: UIApplication) {
        nativeLogger.debug("iOS lifecycle: willTerminate")
        removeLifecycleDiagnosticsObservers()
    }

    private func configureBootAppearance() {
        // Keep boot background aligned with Capacitor splash color while the web layer initializes.
        window?.backgroundColor = UIColor(red: 0.06, green: 0.15, blue: 0.10, alpha: 1.0)
    }

    private func installLifecycleDiagnosticsObservers() {
        guard lifecycleObservers.isEmpty else {
            return
        }

        let center = NotificationCenter.default
        let trackedNotifications: [(Notification.Name, String)] = [
            (UIApplication.didBecomeActiveNotification, "didBecomeActive"),
            (UIApplication.willResignActiveNotification, "willResignActive"),
            (UIApplication.willEnterForegroundNotification, "willEnterForeground"),
            (UIApplication.didEnterBackgroundNotification, "didEnterBackground"),
            (UIApplication.didReceiveMemoryWarningNotification, "didReceiveMemoryWarning"),
        ]

        lifecycleObservers = trackedNotifications.map { notificationName, eventLabel in
            center.addObserver(forName: notificationName, object: nil, queue: .main) { [weak self] _ in
                self?.nativeLogger.debug("iOS lifecycle: \(eventLabel, privacy: .public)")
                if eventLabel == "didReceiveMemoryWarning" {
                    self?.memoryWarningCount += 1
                    self?.emitNativeDiagnostics(
                        event: "memory_warning",
                        payload: [
                            "memoryWarningCount": self?.memoryWarningCount ?? 0,
                            "phase": eventLabel,
                        ]
                    )
                    return
                }
                self?.emitNativeDiagnostics(
                    event: "lifecycle",
                    payload: [
                        "phase": eventLabel,
                    ]
                )
            }
        }
    }

    private func removeLifecycleDiagnosticsObservers() {
        let center = NotificationCenter.default
        for observer in lifecycleObservers {
            center.removeObserver(observer)
        }
        lifecycleObservers.removeAll()
    }

    private func resolveBridgeWebView() -> WKWebView? {
        if let bridgeViewController = window?.rootViewController as? CAPBridgeViewController {
            return bridgeViewController.webView
        }

        if let navigationController = window?.rootViewController as? UINavigationController {
            let bridgeController = navigationController.viewControllers.first { controller in
                controller is CAPBridgeViewController
            } as? CAPBridgeViewController
            return bridgeController?.webView
        }

        return nil
    }

    private func emitNativeDiagnostics(
        event: String,
        payload: [String: Any],
        attempt: Int = 0
    ) {
        let diagnosticsDetail: [String: Any] = [
            "event": event,
            "platform": "ios",
            "timestampMs": Int(Date().timeIntervalSince1970 * 1000),
            "payload": payload,
        ]

        guard
            JSONSerialization.isValidJSONObject(diagnosticsDetail),
            let data = try? JSONSerialization.data(withJSONObject: diagnosticsDetail, options: []),
            let detailJson = String(data: data, encoding: .utf8)
        else {
            return
        }

        let script = "window.dispatchEvent(new CustomEvent('\(nativeDiagnosticsEventName)', { detail: \(detailJson) }));"

        guard let webView = resolveBridgeWebView() else {
            guard attempt < maxDiagnosticsDeliveryAttempts else {
                return
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + diagnosticsRetryDelaySeconds) { [weak self] in
                self?.emitNativeDiagnostics(event: event, payload: payload, attempt: attempt + 1)
            }
            return
        }

        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    private func makeSanitizedUrlPayload(from url: URL) -> [String: Any] {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let queryKeys = components?.queryItems?.map(\.name) ?? []
        let hasFragment = !(url.fragment ?? "").isEmpty

        return [
            "scheme": url.scheme ?? "",
            "host": url.host ?? "",
            "path": url.path,
            "hasQuery": !queryKeys.isEmpty,
            "queryKeys": queryKeys,
            "hasFragment": hasFragment,
        ]
    }
}
