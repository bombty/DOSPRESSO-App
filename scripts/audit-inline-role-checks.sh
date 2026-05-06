#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# DOSPRESSO Inline Role Check Audit (Sprint 10 P-9)
# ═══════════════════════════════════════════════════════════════════════════
#
# 135 inline role check pattern'i tespit edildi (Sprint 10 P-9, 6 May 2026).
# Bu script periyodik çalıştırılır:
#   - Pilot süresince: yeni kod inline check eklemiyor mu?
#   - Post-pilot: refactor ilerlemesini ölç
#
# Kullanım:
#   bash scripts/audit-inline-role-checks.sh
#   bash scripts/audit-inline-role-checks.sh --by-file    # dosya başına sayım
#   bash scripts/audit-inline-role-checks.sh --details    # her check'in line'ı
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Pattern: user?.role === 'admin', role === 'ceo', vs.
PATTERN='user\?\.role\s*===|role\s*===\s*['\''"]'

# Total sayım
TOTAL=$(grep -rE "$PATTERN" server/routes/ 2>/dev/null | wc -l | tr -d ' ')

# Baseline (Sprint 10 P-9, 6 May 2026)
BASELINE=135

echo -e "${GREEN}═══ DOSPRESSO Inline Role Check Audit ═══${NC}"
echo ""
echo -e "Tarih:      $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "Baseline:   ${BASELINE} (Sprint 10 P-9, 6 May 2026)"
echo -e "Şimdi:      ${TOTAL}"

DELTA=$((TOTAL - BASELINE))
if [ $DELTA -gt 0 ]; then
  echo -e "Değişim:    ${RED}+${DELTA} (artış — yeni inline check eklenmiş!)${NC}"
elif [ $DELTA -lt 0 ]; then
  echo -e "Değişim:    ${GREEN}${DELTA} (azalma — refactor ilerliyor!)${NC}"
else
  echo -e "Değişim:    ${YELLOW}0 (sabit)${NC}"
fi

echo ""

if [ "$1" = "--by-file" ]; then
  echo -e "${GREEN}═══ Dosya Bazında Sayım ═══${NC}"
  grep -rcE "$PATTERN" server/routes/ 2>/dev/null \
    | grep -v ":0" \
    | sort -t: -k2 -nr \
    | head -20 \
    | awk -F: '{ printf "  %3d  %s\n", $2, $1 }'
  echo ""
fi

if [ "$1" = "--details" ]; then
  echo -e "${GREEN}═══ Tüm Inline Check'ler ═══${NC}"
  grep -rnE "$PATTERN" server/routes/ 2>/dev/null \
    | head -50
  echo ""
  echo "(İlk 50 gösterildi, tümü için: grep -rnE \"$PATTERN\" server/routes/)"
  echo ""
fi

# Karar yardımcısı
if [ $DELTA -gt 5 ]; then
  echo -e "${RED}⚠️  UYARI: Inline check artışı baseline'dan +5'in üzerinde.${NC}"
  echo -e "${RED}   Yeni kodda \`hasModuleAccess()\` veya \`requireManifestAccess()\` kullanılmalı.${NC}"
  echo -e "${RED}   Detay: docs/ACCESS-MECHANISM-AUDIT.md${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Audit OK${NC}"
exit 0
