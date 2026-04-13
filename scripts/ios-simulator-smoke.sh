#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "iOS simulator smoke tests require macOS."
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required for iOS simulator smoke tests."
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required for iOS simulator smoke tests."
  exit 1
fi

BUNDLE_ID="com.gimmegolf.app"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-$PWD/.tmp/ios-smoke-derived-data}"
SIM_NAME="GimmeGolfSmoke-$RANDOM"
DEEP_LINK_URL="gimmegolf://auth/callback?access_token=smoke_access&refresh_token=smoke_refresh"

mkdir -p "$DERIVED_DATA_PATH"

DEVICE_TYPE_ID="$(
  xcrun simctl list devicetypes | sed -nE 's/.*iPhone 15[[:space:]]+\((com\.apple\.CoreSimulator\.SimDeviceType\.[^)]+)\).*/\1/p' | head -n 1
)"
if [[ -z "$DEVICE_TYPE_ID" ]]; then
  DEVICE_TYPE_ID="$(
    xcrun simctl list devicetypes | sed -nE 's/.*iPhone[[:space:]].*\((com\.apple\.CoreSimulator\.SimDeviceType\.[^)]+)\).*/\1/p' | head -n 1
  )"
fi

RUNTIME_ID="$(
  xcrun simctl list runtimes | sed -nE 's/.*iOS[[:space:]].*\((com\.apple\.CoreSimulator\.SimRuntime\.[^)]+)\)[[:space:]]+\(available\).*/\1/p' | tail -n 1
)"

if [[ -z "$DEVICE_TYPE_ID" || -z "$RUNTIME_ID" ]]; then
  echo "Unable to resolve iOS simulator runtime/device type."
  exit 1
fi

SIM_ID="$(xcrun simctl create "$SIM_NAME" "$DEVICE_TYPE_ID" "$RUNTIME_ID")"
if [[ -z "$SIM_ID" ]]; then
  echo "Unable to create iOS simulator."
  exit 1
fi

cleanup() {
  xcrun simctl shutdown "$SIM_ID" >/dev/null 2>&1 || true
  xcrun simctl delete "$SIM_ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Booting simulator $SIM_ID ..."
xcrun simctl boot "$SIM_ID"
xcrun simctl bootstatus "$SIM_ID" -b

echo "Building iOS app for simulator smoke test ..."
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination "id=$SIM_ID" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  CODE_SIGNING_ALLOWED=NO \
  build \
  >/dev/null

APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphonesimulator/App.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Built app not found at $APP_PATH."
  exit 1
fi

echo "Installing built app into simulator ..."
xcrun simctl install "$SIM_ID" "$APP_PATH"

echo "Launching app ..."
xcrun simctl launch "$SIM_ID" "$BUNDLE_ID" >/dev/null
sleep 2

echo "Opening auth callback deep link ..."
xcrun simctl openurl "$SIM_ID" "$DEEP_LINK_URL"
sleep 2

echo "Backgrounding and resuming app ..."
xcrun simctl ui "$SIM_ID" home
sleep 1
xcrun simctl launch "$SIM_ID" "$BUNDLE_ID" >/dev/null
sleep 1

echo "Terminating and relaunching app ..."
xcrun simctl terminate "$SIM_ID" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl launch "$SIM_ID" "$BUNDLE_ID" >/dev/null

echo "iOS simulator smoke test passed."
