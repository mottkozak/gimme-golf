# Native app (iOS & Android)

This project uses Capacitor for iOS and Android builds.

## Offline guarantees

- Native app (Capacitor iOS/Android): offline-capable from first launch after install.
- Web/PWA: first-ever browser visit must be online; offline works after first successful load.
- Full matrix and wording: [docs/offline-guarantees.md](docs/offline-guarantees.md)

## Local build commands

```bash
npm run native:toolchain:gate
npm run build:mobile
npm run test:e2e:ios:sim-smoke
npm run build:android:release
npm run build:ios:release
npm run native:preflight
```

## Local toolchain prerequisites (release builds)

- Java JDK installed and available via `java -version`.
- Android SDK installed (`ANDROID_SDK_ROOT` or `ANDROID_HOME`), including `platform-tools` (`adb`).
- Android Gradle wrapper executable (`android/gradlew`).
- macOS + Xcode for iOS builds:
  - `xcode-select -p` resolves to a valid developer path.
  - `xcodebuild -version` succeeds.
  - `xcrun simctl list devices` succeeds (CoreSimulator service healthy).

Run `npm run native:toolchain:gate` before attempting local release builds.  
`build:android:release` and `build:ios:release` run platform-specific hard gates automatically.
If checks fail, follow [docs/native-toolchain-remediation.md](docs/native-toolchain-remediation.md).

## CI and release workflows

- `.github/workflows/ci.yml`
  - `native-toolchain-gate-android`
  - `native-toolchain-gate-ios`
  - `native-preflight`
  - `e2e-smoke-device-ios` (launch/deep-link/resume smoke on iOS Simulator)
  - `android-release-build`
  - `ios-release-build`
- `.github/workflows/native-release.yml`
  - Manual signed release workflow (Android AAB + iOS IPA)
  - Inputs: `version_name`, `build_number`
  - Uses repository secrets for signing material

## Deep links

- Native callback: `gimmegolf://auth/callback`
- Android verified links: `https://gimme-golf.app`
- iOS associated domains entitlement: `applinks:gimme-golf.app`
- Deep-link diagnostics are emitted natively with sanitized metadata (`scheme`, `host`, `path`, query keys only; no token values).
- To sync URL scheme changes:

```bash
npm run sync:auth-scheme
```

## Permissions and privacy

### Android
- `INTERNET`
- `POST_NOTIFICATIONS`
- Backup/data-extraction/network-security rules configured via XML resources.
- Capacitor shared preferences are included in backup/device-transfer rules so mirrored local round/preferences keys can restore on new devices.

### iOS
- `NSPhotoLibraryAddUsageDescription`
- `PrivacyInfo.xcprivacy` with UserDefaults reason `CA92.1`
- `App.entitlements` includes associated domains for universal links.

## Signed release setup

Configure these repository secrets before running `Native Release` workflow:

### Android
- `GG_ANDROID_KEYSTORE_BASE64`
- `GG_ANDROID_STORE_PASSWORD`
- `GG_ANDROID_KEY_ALIAS`
- `GG_ANDROID_KEY_PASSWORD`

### iOS
- `IOS_DIST_CERT_P12_BASE64`
- `IOS_DIST_CERT_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_TEAM_ID`
- `IOS_EXPORT_METHOD`

Use [docs/native-preflight-checklist.md](docs/native-preflight-checklist.md) as the final gate before store upload.
