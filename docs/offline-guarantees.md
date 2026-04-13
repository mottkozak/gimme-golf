# Offline Guarantees By Surface

This app supports offline play, but guarantees differ by runtime surface.

## Native apps (iOS/Android via Capacitor)

- **First launch offline:** supported after app install (web assets are bundled in the native app package).
- **Subsequent launches offline:** supported.
- **Round persistence offline:** supported (local storage + mirrored native storage).
- **Network-required actions:** blocked with in-app feedback until reconnection.

## Web/PWA in browser

- **First-ever visit offline:** **not supported by design**.
  The browser has no cached app shell yet, so bootstrap can fail without an initial online load.
- **After at least one successful online load:** supported via cached shell/service worker.
- **Subsequent offline sessions:** supported for local round flow, with network-required actions blocked.

## Product expectation summary

- Native app install is the strongest offline surface.
- Web/PWA is offline-capable only after first online bootstrap.
