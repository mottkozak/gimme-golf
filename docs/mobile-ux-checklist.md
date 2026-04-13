# Mobile UX Device Checklist

## Orientation Strategy
- Strategy: Fully support both portrait and landscape layouts.
- Implementation: `app-shell` applies orientation classes (`app-shell--portrait` / `app-shell--landscape`) and landscape-specific spacing/layout adjustments for short-height viewports.

## Network Strategy
- Offline banner appears with reconnect retry action.
- Poor-network banner appears for slow connections (`2g`, `slow-2g`, or data-saver mode).
- Network-required controls are marked with `data-requires-network="true"` and are blocked offline with feedback.
- Web/PWA first-ever offline visit is not supported by design; browser must complete one online bootstrap first.
- Installed native iOS/Android app is expected to launch offline.

## Keyboard Strategy
- Visual keyboard detection uses `visualViewport` metrics.
- Focused inputs are scrolled into view while the keyboard is open.
- Docked UI (home floating dock, recap toast) hides while typing.
- Modal sheets switch to top-aligned behavior with keyboard-aware bottom padding and max-height.

## Touch Target Strategy
- Global minimum `44x44` target enforcement is applied to interactive controls in `app.css`.

## Device Pass Checklist

### iPhone (iOS Safari + Capacitor iOS)
- [ ] Portrait: navigation, setup, hole play, hole results, recap usable.
- [ ] Landscape: no clipped header/footer; controls remain reachable.
- [ ] Keyboard: focused inputs remain visible in setup, onboarding, and modal flows.
- [ ] Offline: offline banner visible; retry works after reconnect.
- [ ] Poor network: poor-network banner visible on throttled connection.
- [ ] Network-required actions blocked offline with inline feedback.

### Android (Chrome + Capacitor Android)
- [ ] Portrait: navigation, setup, hole play, hole results, recap usable.
- [ ] Landscape: no clipped header/footer; controls remain reachable.
- [ ] Keyboard: focused inputs remain visible in setup, onboarding, and modal flows.
- [ ] Offline: offline banner visible; retry works after reconnect.
- [ ] Poor network: poor-network banner visible on throttled connection.
- [ ] Network-required actions blocked offline with inline feedback.

## Manual Validation Notes
- Network tests: use airplane mode + reconnect, then simulate poor network (`Slow 3G/2G`) in device tools.
- Orientation tests: rotate on each major screen and verify no action controls drop below safe area.
- Touch target tests: verify every tappable control meets >=44px target in computed styles.
