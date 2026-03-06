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

## Notes
- Static-only deployment; no backend/server required.
- LocalStorage is used for app data persistence.
