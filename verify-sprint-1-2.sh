#!/bin/bash
# ═══════════════════════════════════════════════════════════
# DOSPRESSO Control Centrum v5 — Sprint 1+2 Doğrulama Raporu
# Replit'te çalıştır: bash verify-sprint-1-2.sh
# ═══════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════════╗"
echo "║  DOSPRESSO Sprint 1+2 Doğrulama Raporu              ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0
WARN=0

check() {
  if [ "$1" = "ok" ]; then
    echo "  ✅ $2"
    PASS=$((PASS+1))
  elif [ "$1" = "warn" ]; then
    echo "  ⚠️  $2"
    WARN=$((WARN+1))
  else
    echo "  ❌ $2"
    FAIL=$((FAIL+1))
  fi
}

# ═══ 1. GIT DURUMU ═══
echo "━━━ 1. GIT DURUMU ━━━"
LAST_COMMIT=$(git log --oneline -1 2>/dev/null)
echo "  Son commit: $LAST_COMMIT"
if echo "$LAST_COMMIT" | grep -q "Sprint 1+2"; then
  check "ok" "Doğru commit: Sprint 1+2 Control Centrum v5"
else
  check "fail" "Commit uyuşmuyor! 'git pull --rebase origin main' çalıştır"
fi

COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null)
echo "  Hash: $COMMIT_HASH"
echo ""

# ═══ 2. YENİ DOSYALAR ═══
echo "━━━ 2. YENİ CENTRUM SAYFALARI (9 dosya) ━━━"
for page in muhasebe-centrum satinalma-centrum fabrika-centrum depo-centrum sube-centrum supervisor-centrum supbuddy-centrum personel-centrum yatirimci-centrum; do
  if [ -f "client/src/pages/${page}.tsx" ]; then
    LINES=$(wc -l < "client/src/pages/${page}.tsx")
    check "ok" "${page}.tsx — ${LINES} satır"
  else
    check "fail" "${page}.tsx — DOSYA YOK!"
  fi
done
echo ""

# ═══ 3. CENTRUMSHELL COMPONENT'LER ═══
echo "━━━ 3. CENTRUMSHELL v5 EXPORT'LAR (18 beklenen) ━━━"
SHELL_FILE="client/src/components/centrum/CentrumShell.tsx"
if [ -f "$SHELL_FILE" ]; then
  SHELL_LINES=$(wc -l < "$SHELL_FILE")
  EXPORT_COUNT=$(grep -c "^export " "$SHELL_FILE")
  echo "  Dosya: ${SHELL_LINES} satır, ${EXPORT_COUNT} export"
  
  for comp in KpiChip DobodySlot MiniStats ProgressWidget Widget ListItem CentrumShell TimeFilter EscalationBadge TopFlop DobodyTaskPlan FeedbackWidget LostFoundBanner QCStatusWidget ClickableWidget; do
    if grep -q "export function ${comp}" "$SHELL_FILE" || grep -q "export type ${comp}" "$SHELL_FILE"; then
      check "ok" "${comp}"
    else
      check "fail" "${comp} — EXPORT YOK!"
    fi
  done
  
  # DobodySlot 3-mod kontrolü
  if grep -q "DobodyMode" "$SHELL_FILE" && grep -q '"auto"\|"action"\|"info"' "$SHELL_FILE"; then
    check "ok" "DobodySlot 3-mod sistemi (auto/action/info)"
  else
    check "fail" "DobodySlot 3-mod eksik!"
  fi
else
  check "fail" "CentrumShell.tsx — DOSYA YOK!"
fi
echo ""

# ═══ 4. ROLE ROUTES ═══
echo "━━━ 4. ROLE ROUTES GÜNCELLEME ━━━"
ROUTES_FILE="client/src/lib/role-routes.ts"
if [ -f "$ROUTES_FILE" ]; then
  for path in ceo-command-center cgo-teknik-komuta coach-kontrol-merkezi trainer-egitim-merkezi muhasebe-centrum satinalma-centrum fabrika-centrum depo-centrum sube-centrum supervisor-centrum supbuddy-centrum personel-centrum yatirimci-centrum; do
    if grep -q "/${path}" "$ROUTES_FILE"; then
      check "ok" "/${path} — route tanımlı"
    else
      check "fail" "/${path} — route EKSİK!"
    fi
  done
  
  # Eski path'ler kaldırılmış mı?
  for old in "/hq-ozet" "/sube-ozet" "/benim-gunum" "/merkez-dashboard" "/franchise-ozet"; do
    if grep -q "'${old}'" "$ROUTES_FILE"; then
      check "warn" "Eski path hala var: ${old} (ROLE_CONTROL_PATH'den kaldırılmalı)"
    else
      check "ok" "Eski path kaldırılmış: ${old}"
    fi
  done
else
  check "fail" "role-routes.ts — DOSYA YOK!"
fi
echo ""

# ═══ 5. APP.TSX ROUTE'LAR ═══
echo "━━━ 5. APP.TSX ROUTE ENTEGRASYONU ━━━"
APP_FILE="client/src/App.tsx"
if [ -f "$APP_FILE" ]; then
  # Lazy import kontrolü
  for comp in MuhasebeCentrum SatinalmaCentrum FabrikaCentrum DepoCentrum SubeCentrum SupervisorCentrum SupBuddyCentrum PersonelCentrum YatirimciCentrum; do
    if grep -q "const ${comp}" "$APP_FILE"; then
      check "ok" "Lazy import: ${comp}"
    else
      check "fail" "Lazy import EKSİK: ${comp}"
    fi
  done
  
  # Route kontrolü
  for path in muhasebe-centrum satinalma-centrum fabrika-centrum depo-centrum sube-centrum supervisor-centrum supbuddy-centrum personel-centrum yatirimci-centrum; do
    if grep -q "\"/${path}\"" "$APP_FILE"; then
      check "ok" "Route: /${path}"
    else
      check "fail" "Route EKSİK: /${path}"
    fi
  done
else
  check "fail" "App.tsx — DOSYA YOK!"
fi
echo ""

# ═══ 6. DOKÜMANLAR ═══
echo "━━━ 6. DOKÜMANLAR ━━━"
for doc in "DOSPRESSO-Sprint-Plan-v5.md" "DOSPRESSO-Pilot-Analiz-v1.md" "skills/dospresso-control-centrum.md"; do
  if [ -f "$doc" ]; then
    LINES=$(wc -l < "$doc")
    check "ok" "${doc} — ${LINES} satır"
  else
    check "fail" "${doc} — DOSYA YOK!"
  fi
done
echo ""

# ═══ 7. BUILD TEST ═══
echo "━━━ 7. BUILD TEST ━━━"
echo "  Vite build başlatılıyor..."
BUILD_OUTPUT=$(npx vite build 2>&1)
BUILD_EXIT=$?
if [ $BUILD_EXIT -eq 0 ]; then
  BUNDLE_SIZE=$(echo "$BUILD_OUTPUT" | grep "dist/" | tail -1)
  check "ok" "Build BAŞARILI"
  echo "  $BUNDLE_SIZE"
else
  check "fail" "Build BAŞARISIZ!"
  echo "$BUILD_OUTPUT" | grep -i "error\|Error\|ERR" | head -10
fi
echo ""

# ═══ 8. IMPORT CHAIN KONTROLÜ ═══
echo "━━━ 8. IMPORT BAĞIMLILIKLARI ━━━"
for page in muhasebe-centrum satinalma-centrum fabrika-centrum depo-centrum sube-centrum supervisor-centrum supbuddy-centrum personel-centrum yatirimci-centrum; do
  FILE="client/src/pages/${page}.tsx"
  if [ -f "$FILE" ]; then
    # CentrumShell import var mı?
    if grep -q "CentrumShell" "$FILE"; then
      check "ok" "${page}: CentrumShell import ✓"
    else
      check "warn" "${page}: CentrumShell import YOK (alternatif layout?)"
    fi
    
    # useQuery import var mı?
    if grep -q "useQuery" "$FILE"; then
      QUERY_COUNT=$(grep -c "useQuery" "$FILE")
      check "ok" "${page}: ${QUERY_COUNT} useQuery hook"
    else
      check "warn" "${page}: useQuery yok (statik sayfa?)"
    fi
  fi
done
echo ""

# ═══ 9. API ENDPOINT TEST ═══
echo "━━━ 9. API ENDPOINT TEST (eğer sunucu çalışıyorsa) ━━━"
# Sunucu çalışıyor mu kontrol
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null | grep -q "200"; then
  echo "  Sunucu çalışıyor, endpoint test başlıyor..."
  
  # Test login (test kullanıcı gerekli)
  for endpoint in "/api/hq-summary" "/api/dashboard/finance" "/api/factory/qc/stats" "/api/lost-found/count" "/api/me/dashboard-briefing"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b cookies.txt "http://localhost:5000${endpoint}" 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
      check "ok" "GET ${endpoint} → ${STATUS}"
    elif [ "$STATUS" = "401" ]; then
      check "warn" "GET ${endpoint} → ${STATUS} (giriş gerekli)"
    else
      check "warn" "GET ${endpoint} → ${STATUS}"
    fi
  done
else
  echo "  Sunucu çalışmıyor — endpoint testleri atlandı"
  echo "  (Sunucuyu başlat ve tekrar çalıştır)"
fi
echo ""

# ═══ 10. SAYFA İÇERİK KONTROLÜ ━━━
echo "━━━ 10. SAYFA İÇERİK KONTROLÜ ━━━"

# Misafir GB widget kontrolü (şube rolleri)
for page in sube-centrum supervisor-centrum supbuddy-centrum personel-centrum yatirimci-centrum; do
  FILE="client/src/pages/${page}.tsx"
  if [ -f "$FILE" ] && grep -q "FeedbackWidget" "$FILE"; then
    check "ok" "${page}: FeedbackWidget (Misafir GB) ✓"
  elif [ -f "$FILE" ]; then
    check "warn" "${page}: FeedbackWidget yok"
  fi
done

# Lost&Found kontrolü (şube rolleri)
for page in sube-centrum supervisor-centrum supbuddy-centrum personel-centrum; do
  FILE="client/src/pages/${page}.tsx"
  if [ -f "$FILE" ] && grep -q "LostFoundBanner" "$FILE"; then
    check "ok" "${page}: LostFoundBanner ✓"
  elif [ -f "$FILE" ]; then
    check "warn" "${page}: LostFoundBanner yok"
  fi
done

# QC widget kontrolü (fabrika)
if grep -q "QCStatusWidget" "client/src/pages/fabrika-centrum.tsx" 2>/dev/null; then
  check "ok" "fabrika-centrum: QCStatusWidget ✓"
else
  check "fail" "fabrika-centrum: QCStatusWidget EKSİK!"
fi

# DobodySlot kontrolü (tüm sayfalar)
echo ""
echo "  DobodySlot kontrolü:"
for page in muhasebe-centrum satinalma-centrum fabrika-centrum depo-centrum sube-centrum supervisor-centrum supbuddy-centrum personel-centrum; do
  FILE="client/src/pages/${page}.tsx"
  if [ -f "$FILE" ] && grep -q "DobodySlot" "$FILE"; then
    check "ok" "${page}: DobodySlot ✓"
  elif [ -f "$FILE" ]; then
    check "warn" "${page}: DobodySlot yok"
  fi
done
echo ""

# ═══ SONUÇ ═══
echo "╔══════════════════════════════════════════════════════╗"
echo "║  SONUÇ                                              ║"
echo "╠══════════════════════════════════════════════════════╣"
TOTAL=$((PASS+FAIL+WARN))
echo "║  ✅ Başarılı: ${PASS}/${TOTAL}                              ║"
echo "║  ❌ Başarısız: ${FAIL}/${TOTAL}                             ║"
echo "║  ⚠️  Uyarı: ${WARN}/${TOTAL}                                ║"
echo "╠══════════════════════════════════════════════════════╣"
if [ $FAIL -eq 0 ]; then
  echo "║  🎉 Sprint 1+2 BAŞARILI — Pilot hazır!             ║"
else
  echo "║  🔴 ${FAIL} hata düzeltilmeli!                      ║"
fi
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Rapor tarihi: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Commit: $(git rev-parse --short HEAD) — $(git log --oneline -1)"
