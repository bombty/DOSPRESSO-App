#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# DOSPRESSO Aslan Smoke Test Script (7 May 2026 sabah)
#
# Bu script Aslan'ın 4 bekleyen PR'ı mergeledikten + Replit deploy
# ettikten sonra çalıştırılmalı. Tüm yeni endpoint'leri ve UI'ları
# kapsar.
#
# Kullanım:
#   bash docs/aslan-smoke-test.sh https://senin-replit-url.repl.co adminhq TestPass123!
# ═══════════════════════════════════════════════════════════════════

set -e

BASE_URL="${1:-http://localhost:5000}"
USERNAME="${2:-adminhq}"
PASSWORD="${3:-TestPass123!}"

echo "🧪 DOSPRESSO SMOKE TEST"
echo "Base URL: $BASE_URL"
echo "User: $USERNAME"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# 1) Login
echo "[1/12] Login..."
COOKIE=$(curl -s -c - -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | grep "connect.sid" | awk '{print $NF}')

if [ -z "$COOKIE" ]; then
  echo "❌ Login başarısız!"
  exit 1
fi
echo "✅ Login başarılı"
echo ""

# 2) Health check
echo "[2/12] Health check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
[ "$HEALTH" = "200" ] && echo "✅ Health 200" || echo "❌ Health $HEALTH"
echo ""

# 3) 67 hammadde yüklenmiş mi?
echo "[3/12] 67 hammadde yüklü mü?"
RESP=$(curl -s -b "connect.sid=$COOKIE" "$BASE_URL/api/girdi" | head -c 1000)
ASLAN_COUNT=$(echo "$RESP" | grep -o "ASLAN-HAM-" | wc -l)
echo "  ASLAN-HAM-* sayısı: $ASLAN_COUNT (beklenen: 67+)"
[ "$ASLAN_COUNT" -ge 60 ] && echo "✅" || echo "❌ Migration çalıştırılmamış olabilir"
echo ""

# 4) factory_ingredient_nutrition yüklü mü?
echo "[4/12] Besin değerleri yüklü mü? (DB sorgusu)"
echo "  → Replit'te şunu çalıştır:"
echo "    SELECT COUNT(*) FROM factory_ingredient_nutrition WHERE source = 'aslan_import';"
echo "  Beklenen: 59"
echo ""

# 5) Mr. Dobody Eksiklik Raporu
echo "[5/12] /api/mr-dobody/hammadde-eksiklik-raporu..."
RESP=$(curl -s -b "connect.sid=$COOKIE" "$BASE_URL/api/mr-dobody/hammadde-eksiklik-raporu")
KPI_TOTAL=$(echo "$RESP" | grep -o '"totalRawMaterials":[0-9]*' | cut -d: -f2)
KPI_RATE=$(echo "$RESP" | grep -o '"completionRate":[0-9]*' | cut -d: -f2)
echo "  Toplam: $KPI_TOTAL, Tamamlama %: $KPI_RATE"
[ -n "$KPI_TOTAL" ] && echo "✅" || echo "❌ Endpoint hata verdi"
echo ""

# 6) Gıda Mühendisi Dashboard
echo "[6/12] /api/gida-muhendisi/dashboard..."
RESP=$(curl -s -b "connect.sid=$COOKIE" "$BASE_URL/api/gida-muhendisi/dashboard")
SUGGEST_COUNT=$(echo "$RESP" | grep -o '"suggestions":\[' | wc -l)
[ "$SUGGEST_COUNT" -ge 1 ] && echo "✅ Endpoint OK" || echo "❌ Endpoint hata"
echo ""

# 7) Tedarikçi Alerjen Formu Template
echo "[7/12] /api/supplier-allergen-forms/template..."
RESP=$(curl -s -b "connect.sid=$COOKIE" "$BASE_URL/api/supplier-allergen-forms/template")
ALLERGEN_COUNT=$(echo "$RESP" | grep -o '"key"' | wc -l)
echo "  Alerjen sayısı: $ALLERGEN_COUNT (beklenen: 14)"
[ "$ALLERGEN_COUNT" -ge 14 ] && echo "✅" || echo "❌"
echo ""

# 8) Tedarikçi Alerjen Formu Liste
echo "[8/12] /api/supplier-allergen-forms (list)..."
RESP=$(curl -s -o /dev/null -w "%{http_code}" -b "connect.sid=$COOKIE" "$BASE_URL/api/supplier-allergen-forms")
[ "$RESP" = "200" ] && echo "✅ List endpoint 200" || echo "❌ $RESP"
echo ""

# 9) Spec PDF — örnek reçete (1)
echo "[9/12] /api/factory/recipes/1/specification.pdf..."
HTTP_CODE=$(curl -s -o /tmp/spec-test.pdf -w "%{http_code}" -b "connect.sid=$COOKIE" "$BASE_URL/api/factory/recipes/1/specification.pdf")
PDF_SIZE=$(stat -c%s /tmp/spec-test.pdf 2>/dev/null || stat -f%z /tmp/spec-test.pdf 2>/dev/null || echo 0)
echo "  HTTP: $HTTP_CODE, PDF boyutu: ${PDF_SIZE} bytes"
[ "$HTTP_CODE" = "200" ] && [ "$PDF_SIZE" -gt 5000 ] && echo "✅" || echo "❌ PDF üretilmedi"
echo ""

# 10) Spec PDF — Türkçe karakter testi
echo "[10/12] PDF Türkçe karakter testi..."
if [ -f /tmp/spec-test.pdf ]; then
  TR_CHARS=$(pdftotext /tmp/spec-test.pdf - 2>/dev/null | grep -E "ş|ğ|ı|İ|Ç|Ş" | wc -l)
  [ "$TR_CHARS" -ge 1 ] && echo "✅ Türkçe karakter OK" || echo "❌ Türkçe karakter sorunu (Roboto font yüklenmemiş?)"
fi
echo ""

# 11) Spec PDF — ETag cache
echo "[11/12] Spec PDF ETag cache..."
ETAG=$(curl -s -I -b "connect.sid=$COOKIE" "$BASE_URL/api/factory/recipes/1/specification.pdf" | grep -i "etag" | awk '{print $2}' | tr -d '\r')
if [ -n "$ETAG" ]; then
  CACHE_TEST=$(curl -s -o /dev/null -w "%{http_code}" -b "connect.sid=$COOKIE" -H "If-None-Match: $ETAG" "$BASE_URL/api/factory/recipes/1/specification.pdf")
  [ "$CACHE_TEST" = "304" ] && echo "✅ ETag cache çalışıyor (304)" || echo "❌ Cache çalışmıyor: $CACHE_TEST"
else
  echo "❌ ETag header yok"
fi
echo ""

# 12) Reçete Besin Hesapla
echo "[12/12] /api/factory/recipes/1/calculate-nutrition..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -b "connect.sid=$COOKIE" "$BASE_URL/api/factory/recipes/1/calculate-nutrition")
[ "$HTTP_CODE" = "200" ] && echo "✅ Hesaplama endpoint OK" || echo "⚠️  $HTTP_CODE (yetkisiz olabilir)"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "🎯 SMOKE TEST TAMAMLANDI"
echo ""
echo "Bir sonraki adım:"
echo "  1. /girdi-yonetimi → 67 ASLAN-HAM-* hammadde gör"
echo "  2. /mr-dobody/hammadde-eksiklik → severity'e göre eksiklikler"
echo "  3. /supplier-allergen-forms/new → 14 alerjen × 3 kolon doldur"
echo "  4. /fabrika/receteler/1 → 'Spesifikasyon PDF' butonu"
echo ""
echo "Sorun varsa: docs/REVIEW-2026-05-07-KRITIK-DURUM-VE-DUZELTMELER.md oku"
