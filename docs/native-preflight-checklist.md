# Native Release Preflight Checklist

## Build Matrix (Mandatory)
- [ ] CI `android-release-build` passes on every PR/push.
- [ ] CI `ios-release-build` passes on every PR/push.
- [ ] CI `native-preflight` passes on every PR/push.
- [ ] CI `e2e-smoke-device-ios` passes on every PR/push.

## Local Reproducibility Gate (Mandatory before release)
- [ ] Run `npm run native:toolchain:gate`.
- [ ] If toolchain checks fail, resolve with `docs/native-toolchain-remediation.md`.
- [ ] Run `npm run test:e2e:ios:sim-smoke` (launch, deep-link callback, background/resume, relaunch).
- [ ] `java -version` is available locally.
- [ ] Android SDK path is configured (`ANDROID_SDK_ROOT` or `ANDROID_HOME`) and includes `platform-tools`.
- [ ] `xcode-select -p` and `xcodebuild -version` succeed on release machine.
- [ ] `xcrun simctl list devices` succeeds (CoreSimulator service healthy).
- [ ] `npm run build:android:release` passes locally on the release machine.
- [ ] `npm run build:ios:release` passes locally on the release machine.

## Signed Release Inputs

### Android secrets
- [ ] `GG_ANDROID_KEYSTORE_BASE64`
- [ ] `GG_ANDROID_STORE_PASSWORD`
- [ ] `GG_ANDROID_KEY_ALIAS`
- [ ] `GG_ANDROID_KEY_PASSWORD`

### iOS secrets
- [ ] `IOS_DIST_CERT_P12_BASE64`
- [ ] `IOS_DIST_CERT_PASSWORD`
- [ ] `IOS_PROVISIONING_PROFILE_BASE64`
- [ ] `IOS_TEAM_ID`
- [ ] `IOS_EXPORT_METHOD` (`app-store`, `ad-hoc`, or `enterprise`)

## Native Configuration

### Deep links
- [ ] Android custom callback: `gimmegolf://auth/callback`.
- [ ] Android app links: `https://gimme-golf.app` with `autoVerify=true`.
- [ ] iOS URL scheme: `gimmegolf`.
- [ ] iOS associated domains entitlement includes `applinks:gimme-golf.app`.

### Permissions and privacy
- [ ] Android manifest includes `POST_NOTIFICATIONS` and `INTERNET`.
- [ ] iOS `NSPhotoLibraryAddUsageDescription` copy is present.
- [ ] iOS `PrivacyInfo.xcprivacy` is present and declares required API reasons.

### Background and lifecycle behavior
- [ ] Android splash theme has a deterministic launch-to-app transition.
- [ ] iOS app delegate routes URL and universal-link callbacks via Capacitor.
- [ ] Native diagnostics telemetry receives launch traces, memory pressure signals, and sanitized deep-link metadata from both platforms.
- [ ] Reminder scheduling behavior is verified on both native platforms.

### App identity assets
- [ ] iOS app icon asset exists and launch assets are present.
- [ ] Android launcher icons and splash assets exist for all density buckets.
- [ ] Display name and package identifiers are correct for both stores.

## Signed Release Reproducibility
- [ ] Run `Native Release` workflow with fixed `version_name` and `build_number`.
- [ ] Android signed AAB artifact is generated.
- [ ] iOS signed IPA artifact is generated.
- [ ] Re-running workflow with same inputs produces equivalent artifacts and metadata.

## Store Upload Gate
- [ ] App Store Connect upload validation passes (no missing entitlements/privacy metadata).
- [ ] Google Play upload validation passes (no manifest/target SDK/signing issues).
- [ ] Final smoke run on physical iOS + Android release builds completes successfully.
