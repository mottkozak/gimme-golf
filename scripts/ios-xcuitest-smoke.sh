#!/usr/bin/env bash
set -euo pipefail

PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
TEST_TARGET="AppUITests"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required to run iOS XCUITest smoke checks."
  exit 1
fi

DESTINATION_ID="${IOS_XCUITEST_SIMULATOR_ID:-}"
if [ -z "$DESTINATION_ID" ]; then
  DESTINATION_ID="$( (xcodebuild -project "$PROJECT" -scheme "$SCHEME" -showdestinations 2>/dev/null \
    | sed -n 's/.*platform:iOS Simulator, id:\([^,]*\),.*/\1/p' \
    | head -n 1) || true )"
fi

if [ -z "$DESTINATION_ID" ]; then
  echo "No iOS simulator destination found for scheme '$SCHEME'."
  exit 1
fi

echo "Running XCUITest smoke suite on simulator id: $DESTINATION_ID"
xcodebuild test \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -destination "id=$DESTINATION_ID" \
  -only-testing:"$TEST_TARGET"/AppUITests/testLaunchesApp \
  -only-testing:"$TEST_TARGET"/AppUITests/testDeepLinkAndResumeSmoke \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO
