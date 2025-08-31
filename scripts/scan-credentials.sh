#!/usr/bin/env bash
set -euo pipefail
# Simple scanner to catch obvious key patterns in the repo.
# Run: bash scripts/scan-credentials.sh

PATTERNS=(
  "SUPABASE_SERVICE_ROLE_KEY"
  "sk-live_"
  "sk_test_"
  "sk-proj-"
  "BEGIN RSA PRIVATE KEY"
  "AIza"            # Google-style
  "ghp_"            # GitHub PAT
  "AKIA[0-9A-Z]{16}" # AWS Access Key
)

echo "Scanning working tree for credential patterns..."
for p in "${PATTERNS[@]}"; do
  if grep -RIn --exclude-dir=.git --binary-files=without-match -E "$p" . >/dev/null 2>&1; then
    echo "  ⚠️  Found matches for: $p"
    grep -RIn --exclude-dir=.git --binary-files=without-match -E "$p" . | head -n 10
    echo
  fi
done

echo "Done. Investigate any warnings above."
