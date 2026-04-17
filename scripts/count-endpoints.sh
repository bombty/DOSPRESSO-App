#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# DOSPRESSO — Standart Endpoint/Route/Sidebar Sayım Scripti
# ═══════════════════════════════════════════════════════════════════════
#
# Amaç: Sprint A boyunca tutarlı baseline metrikler.
# Çalıştırma: ./scripts/count-endpoints.sh
#
# Replit'in 18 Nisan audit'inde 17 Nisan ile +912 endpoint farkı çıktı
# (820 → 1,732). Sebep: farklı regex kullanımı. Bu script tek standart
# metodoloji sağlar.
#
# ÇIKTI FORMATI:
#   Backend Endpoint : NNN
#   Frontend Route   : NNN
#   Sidebar Menu     : NNN (requires DATABASE_URL env var)
#
# Sprint A boyunca her Cuma çalıştırılacak, replit.md Session State'e kaydedilecek.
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════════════════════════"
echo "  DOSPRESSO Endpoint Sayım — $(date +%Y-%m-%d\ %H:%M)"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# ─── 1) Backend Endpoint ───────────────────────────────────────────────
# Metot: router.* ve app.* hem GET/POST/PUT/PATCH/DELETE hem de all/use
# Yorum satırları (//) hariç.
BACKEND_ENDPOINTS=$(
  grep -rE "(router|app)\.(get|post|put|patch|delete|all|use)\(['\"][/]" \
    server/ --include="*.ts" 2>/dev/null \
    | grep -v "node_modules" \
    | grep -vE "^\s*//" \
    | wc -l
)

echo "🔌 Backend Endpoint   : $BACKEND_ENDPOINTS"
echo "   Regex: (router|app)\\.(get|post|put|patch|delete|all|use)\\(['\"][/]"
echo "   Filter: node_modules hariç, yorum satırları hariç"
echo ""

# ─── 2) Frontend Route ────────────────────────────────────────────────
# Metot: App.tsx içinde path="..." tanımları
FRONTEND_ROUTES=$(
  grep -oE 'path="/[^"]*"' client/src/App.tsx 2>/dev/null \
    | sort -u \
    | wc -l
)

echo "🖥️  Frontend Route    : $FRONTEND_ROUTES"
echo "   Regex: path=\"/[^\"]*\" in client/src/App.tsx"
echo "   Filter: unique (sort -u)"
echo ""

# ─── 3) Sidebar Menu (PostgreSQL menu_items) ──────────────────────────
# Gereklilik: DATABASE_URL env variable
if [ -z "${DATABASE_URL:-}" ]; then
  echo "📋 Sidebar Menu      : [ATLANDI — DATABASE_URL set değil]"
  echo "   Manuel sorgu: SELECT COUNT(*) FROM menu_items WHERE is_active = true;"
  SIDEBAR_COUNT="N/A"
else
  SIDEBAR_COUNT=$(
    psql "$DATABASE_URL" -tA -c \
      "SELECT COUNT(*) FROM menu_items WHERE is_active = true;" 2>/dev/null || echo "ERROR"
  )
  echo "📋 Sidebar Menu      : $SIDEBAR_COUNT"
  echo "   Query: SELECT COUNT(*) FROM menu_items WHERE is_active = true"
fi

# ─── 4) Ek Sağlık Metrikleri ──────────────────────────────────────────
echo ""
echo "─── Ek Metrikler ──────────────────────────────────────────────────"

# Route dosyası sayısı
ROUTE_FILES=$(ls server/routes/*.ts 2>/dev/null | wc -l)
echo "   Backend Route Dosyası     : $ROUTE_FILES"

# Page dosyası sayısı
PAGE_FILES=$(find client/src/pages -name "*.tsx" 2>/dev/null | wc -l)
echo "   Frontend Page Dosyası     : $PAGE_FILES"

# Schema dosyası sayısı
SCHEMA_FILES=$(ls shared/schema/*.ts 2>/dev/null | wc -l)
echo "   Schema Dosyası            : $SCHEMA_FILES"

# Toplam TypeScript/TSX dosya
TOTAL_TS=$(find server/ client/src/ shared/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
echo "   Toplam TS/TSX Dosyası     : $TOTAL_TS"

# Git durum
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "   Git Commit                : $CURRENT_COMMIT @ $BRANCH"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "📊 BASELINE ÖZET (kopyala → replit.md Session State):"
echo ""
echo "\`\`\`"
echo "Baseline [$(date +%Y-%m-%d)]:"
echo "  Backend Endpoint : $BACKEND_ENDPOINTS"
echo "  Frontend Route   : $FRONTEND_ROUTES"
echo "  Sidebar Menu     : $SIDEBAR_COUNT"
echo "  Commit           : $CURRENT_COMMIT"
echo "\`\`\`"
echo "═══════════════════════════════════════════════════════════════════════"
