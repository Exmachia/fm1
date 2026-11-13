#!/bin/sh
# Vuelve a generar public/og.jpg (el thumbnail para compartir) a partir de tools/og.html.
# Necesita el servidor de desarrollo corriendo (npm run dev -- --port 3500) y Google Chrome (macOS).
set -e
cd "$(dirname "$0")/.."
URL="${OG_URL:-http://localhost:3500/tools/og.html}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1200,630 --force-device-scale-factor=1 --virtual-time-budget=6000 --screenshot=og.tmp.png "$URL" 2>/dev/null
sips -s format jpeg -s formatOptions 88 og.tmp.png --out public/og.jpg >/dev/null
rm og.tmp.png
echo "public/og.jpg listo"
