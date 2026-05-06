#!/bin/bash
# DOSPRESSO Pre-commit Hook Installer
# Kurulum: bash scripts/install-git-hooks.sh
# Kaynak: dospresso-git-safety SKILL.md — L4/L5 kuralları

set -e

HOOKS_DIR=".git/hooks"
PRE_COMMIT="$HOOKS_DIR/pre-commit"

echo "=== DOSPRESSO Git Hook Kurulumu ==="

if [ ! -d "$HOOKS_DIR" ]; then
  echo "HATA: .git/hooks dizini bulunamadı. Git repo'su değil mi?"
  exit 1
fi

cat > "$PRE_COMMIT" << 'HOOK'
#!/bin/bash
# DOSPRESSO pre-commit hook
# Conflict marker + token sızıntısı kontrolü
# dospresso-git-safety SKILL.md — L4/L5

ERRORS=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "--- DOSPRESSO pre-commit kontrol ---"

# 1. Conflict marker kontrolü
MARKER_FILES=$(git diff --cached --name-only | xargs grep -l '^<<<<<<<\|^=======\|^>>>>>>>' 2>/dev/null || true)
if [ -n "$MARKER_FILES" ]; then
  echo -e "${RED}🚨 CONFLICT MARKER BULUNDU — commit ENGELLENDI${NC}"
  echo "   Dosyalar:"
  echo "$MARKER_FILES" | sed 's/^/     /'
  echo -e "${YELLOW}   Çözüm: Replit Resolve UI veya git checkout <hash> -- <file>${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ Conflict marker yok${NC}"
fi

# 2. Token sızıntısı kontrolü (GitHub PAT, OAuth token)
TOKEN_FILES=$(git diff --cached --name-only | xargs grep -lE '(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{10,}' 2>/dev/null || true)
if [ -n "$TOKEN_FILES" ]; then
  echo -e "${RED}🚨 TOKEN SIZMA RİSKİ — commit ENGELLENDI${NC}"
  echo "   Dosyalar:"
  echo "$TOKEN_FILES" | sed 's/^/     /'
  echo -e "${YELLOW}   Çözüm: Token'ı dosyadan kaldır, env var veya secret kullan${NC}"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ Token sızıntısı yok${NC}"
fi

# 3. .env dosyası commit edilmeye çalışılıyor mu?
ENV_FILES=$(git diff --cached --name-only | grep -E '^\.env(\.|$)' || true)
if [ -n "$ENV_FILES" ]; then
  echo -e "${RED}🚨 .env DOSYASI STAGED — commit ENGELLENDI${NC}"
  echo "   Dosyalar: $ENV_FILES"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}✅ .env staged değil${NC}"
fi

echo "------------------------------------"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}❌ $ERRORS kontrol başarısız — commit iptal edildi${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Tüm kontroller geçti — commit devam ediyor${NC}"
exit 0
HOOK

chmod +x "$PRE_COMMIT"

echo ""
echo "✅ Pre-commit hook kuruldu: $PRE_COMMIT"
echo ""
echo "Kontroller:"
echo "  1. Conflict marker (<<<<<<< / ======= / >>>>>>>)"
echo "  2. GitHub token sızıntısı (ghp_ / gho_ / github_pat_)"
echo "  3. .env dosyası commit engeli"
echo ""
echo "Test: git commit ile deneyebilirsiniz."
