# GIMME GOLF

Mobile-first React + TypeScript + Vite web app for running a golf side game alongside a real round.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The Vite config uses `base: './'` so generated asset paths are relative and work on GitHub Pages project sites (`https://<user>.github.io/<repo>/`).

## GitHub Pages Manual Deploy

### One-time GitHub setup
1. Push this repo to GitHub.
2. Open GitHub: `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
4. Set `Branch` to `gh-pages` and folder to `/ (root)`.
5. Save.

### Deploy commands (run each release)
```bash
npm install
npm run build
npx gh-pages -d dist
```

### Verify
Open:

`https://<your-github-username>.github.io/<your-repo-name>/`

GitHub Pages may take 1-3 minutes to update after push.

## Native (iOS / Android)

The app is wrapped with [Capacitor](https://capacitorjs.com/) for iOS and Android. After building the web app, sync and open the native projects:

```bash
npm run build:mobile   # build web app and sync to ios/ and android/
npm run open:ios       # open Xcode
npm run open:android   # open Android Studio
```

See [MOBILE.md](MOBILE.md) for app icons, signing, and store submission. The homescreen app icon is **Gimme-Golf-Grass.png** (web favicon and native iOS/Android). To regenerate native and PWA icons from it, run `npm run cap:icons` (source: `assets/icon.png`).

## Notes
- Static-only deployment; no backend/server required.
- LocalStorage is used for app data persistence.
- Offline guarantees differ by surface:
  - Native iOS/Android app: supports first launch offline after install.
  - Web/PWA: first-ever visit must be online; offline is supported after initial successful load.
  - See [docs/offline-guarantees.md](docs/offline-guarantees.md).

## Supabase Setup (Optional Magic Link Login)

By default, auth is disabled and onboarding/profile data are stored locally. Set
`VITE_ENABLE_SUPABASE_AUTH=true` to re-enable Supabase magic-link login.

### Multiplayer backend (Phase 1)

Room-code multiplayer backend schema/RPCs are provided in:

- [supabase/migrations/20260408_phase1_multiplayer_foundation.sql](supabase/migrations/20260408_phase1_multiplayer_foundation.sql)
- [supabase/migrations/20260408_phase5_multiplayer_hardening.sql](supabase/migrations/20260408_phase5_multiplayer_hardening.sql)
- [docs/multiplayer-phase1-backend.md](docs/multiplayer-phase1-backend.md)

Run the SQL migration in your Supabase project SQL editor before implementing the
client multiplayer screens/services.

### Multiplayer QA + rollout (Phase 5)

Phase 5 validation checklist and staged rollout gates are documented in:

- [docs/multiplayer-phase5-qa-rollout.md](docs/multiplayer-phase5-qa-rollout.md)

### 1) Add environment variables

Create a local `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-or-publishable-key>
VITE_PUBLIC_APP_URL=https://<your-public-app-url>
VITE_NATIVE_AUTH_SCHEME=gimmegolf
VITE_ENABLE_SUPABASE_AUTH=true
VITE_ENABLE_MULTIPLAYER=true
# Optional (dev only): bypass auth gate/account validation locally
# VITE_DEV_BYPASS_AUTH=true
```

Important:
- Use `VITE_*` keys (not `EXPO_PUBLIC_*`) because this is a Vite app.
- Do **not** put a Postgres connection string in client-side env vars.
- Treat keys/passwords as secrets; rotate immediately if exposed.
- `VITE_NATIVE_AUTH_SCHEME` is synced into iOS and Android automatically by `npm run cap:sync` and `npm run build:mobile`.
- `VITE_DEV_BYPASS_AUTH` is honored only in Vite dev mode; it bypasses login/account validation to speed local UI testing.

### 2) Configure Supabase redirect URLs

In Supabase Auth settings, allow redirect URLs for:
- local web dev: `http://localhost:5173`
- your production web URL (for example GitHub Pages URL)
- native deep-link callback: `<your-native-scheme>://auth/callback`

### 3) Magic-link redirect behavior

- **Local web (`npm run dev`)**: magic links redirect back to your local origin and session is picked up automatically.
- **Mobile (Capacitor build)**: magic links use native deep-link callbacks and return directly into app:
  - default callback: `gimmegolf://auth/callback`
  - configurable via `VITE_NATIVE_AUTH_SCHEME`
  - iOS and Android native URL handlers are auto-synced from your env scheme

### 4) Quick verification checklist

1. Start local app: `npm run dev`
2. Open login gate and request magic link
3. Tap link from email
4. Confirm you return to app origin and onboarding starts
5. Build mobile: `npm run build:mobile`
6. Request magic link on device and confirm it opens the app directly (no browser landing page)

If you change `VITE_NATIVE_AUTH_SCHEME` later:
1. Update your `.env`
2. Run `npm run cap:sync`
3. Add the new `<scheme>://auth/callback` to Supabase redirect URLs
