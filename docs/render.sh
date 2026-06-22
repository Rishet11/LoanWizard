#!/usr/bin/env bash
# Render the HTML sources in docs/src/*.html to PDFs in docs/ using headless Chromium.
# These PDFs are the judge-facing deliverables (technical documentation, architecture
# diagram, presentation deck). Regenerate after editing any source HTML.
set -euo pipefail

CHROME="${CHROME_BIN:-$(command -v chromium || command -v google-chrome || echo /opt/pw-browsers/chromium-1194/chrome-linux/chrome)}"
HERE="$(cd "$(dirname "$0")" && pwd)"

for src in "$HERE"/src/*.html; do
  name="$(basename "$src" .html)"
  out="$HERE/$name.pdf"
  echo "rendering $name.pdf"
  "$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$out" "file://$src" >/dev/null 2>&1 || \
  "$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$out" "file://$src"
done
echo "done"
