#!/usr/bin/env bash
set -euo pipefail

COMMIT_MESSAGE="${1:-Message related to PR}"

git add .
git commit -m "$COMMIT_MESSAGE"
git push -u origin main
npm run build:mobile
npm run open:ios
