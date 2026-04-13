import XCTest

final class AppUITests: XCTestCase {
    private let deepLinkUrl = "gimmegolf://auth/callback?access_token=ui_smoke_access&refresh_token=ui_smoke_refresh"

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunchesApp() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertEqual(app.state, .runningForeground, "App should launch into foreground state")
    }

    func testDeepLinkAndResumeSmoke() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertEqual(app.state, .runningForeground, "App should be foreground after launch")

        let simulatorId = ProcessInfo.processInfo.environment["SIMULATOR_UDID"]

        if let simulatorId, !simulatorId.isEmpty {
            let openUrl = Process()
            openUrl.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
            openUrl.arguments = ["simctl", "openurl", simulatorId, deepLinkUrl]
            try? openUrl.run()
            openUrl.waitUntilExit()

            XCTAssertEqual(openUrl.terminationStatus, 0, "Deep link should open in simulator")
        }

        XCUIDevice.shared.press(.home)

        let reopenExpectation = expectation(description: "App re-enters foreground")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            app.activate()
            reopenExpectation.fulfill()
        }
        wait(for: [reopenExpectation], timeout: 5.0)

        XCTAssertEqual(app.state, .runningForeground, "App should return to foreground after background/resume")
    }
}
