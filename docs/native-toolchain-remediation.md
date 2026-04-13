# Native Toolchain Remediation Playbook

Use this when `npm run native:toolchain:gate` (or CI `Native Toolchain Gate`) fails.

## Fast verification commands

Run from repo root:

```bash
npm run native:toolchain:gate
npm run native:toolchain:gate:android
npm run native:toolchain:gate:ios
```

Direct checks:

```bash
java -version
xcode-select -p
xcodebuild -version
xcrun --find simctl
xcrun simctl list devices
```

## Android remediation (Java + SDK)

### 1) Java missing or wrong version

Symptoms:
- `Java runtime unavailable`
- `java: command not found`

Fix (macOS/Homebrew):

```bash
brew install --cask temurin
/usr/libexec/java_home -V
export JAVA_HOME=$(/usr/libexec/java_home)
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Persist in shell profile (`~/.zshrc`) if needed:

```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
```

### 2) Android SDK not detected

Symptoms:
- `Android SDK path not found`
- missing `adb` executable

Fix:
1. Install Android SDK (Android Studio or command-line tools).
2. Ensure `platform-tools` is installed.
3. Set one of:
   - `ANDROID_SDK_ROOT`
   - `ANDROID_HOME`

Example (default macOS path):

```bash
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"
adb version
```

Persist in `~/.zshrc` if needed.

### 3) Gradle wrapper not executable

Symptoms:
- `android/gradlew` exists but is not executable

Fix:

```bash
chmod +x android/gradlew
```

## iOS remediation (Xcode + CoreSimulator)

### 1) `xcode-select` / `xcodebuild` failures

Symptoms:
- `xcode-select path is unavailable`
- `xcodebuild is unavailable`

Fix:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcode-select -p
xcodebuild -version
```

If using a non-default Xcode path, switch to that installed bundle path.

### 2) CoreSimulator unhealthy (`simctl list devices` fails)

Symptoms:
- `CoreSimulator service check failed`
- `Connection invalid` / `Unable to discover any Simulator runtimes`

Fix sequence:

```bash
open -a Simulator
xcrun simctl list devices
```

If still failing:

```bash
killall -9 Simulator || true
killall -9 com.apple.CoreSimulator.CoreSimulatorService || true
xcrun simctl shutdown all || true
xcrun simctl erase all || true
open -a Simulator
xcrun simctl list devices
```

If runtimes are missing, install at least one iOS Simulator runtime in Xcode:
- Xcode -> Settings -> Platforms

### 3) Xcode cache/permission issues

Symptoms:
- DerivedData permission errors
- module cache write failures

Fix:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ~/Library/Caches/org.swift.swiftpm
```

Then retry:

```bash
npm run native:toolchain:gate:ios
```

## CI expectation (PR/release gate)

Both workflows now enforce toolchain checks:
- `.github/workflows/ci.yml`
  - `native-toolchain-gate-android`
  - `native-toolchain-gate-ios`
- `.github/workflows/native-release.yml`
  - Android/iOS jobs each run platform-specific `native:toolchain:gate`

A failing gate should be treated as a blocker for native release confidence.
