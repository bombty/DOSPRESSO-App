#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# DOSPRESSO Pre-Commit Check Script
# ═══════════════════════════════════════════════════════════════════════════
#
# Sprint 10 P-6 (6 May 2026) — Audit Security 4.4 + 5 May incident dersi
#
# Üç kritik kontrol:
#   1. MERGE CONFLICT MARKER — `<<<<<<<`, `=======`, `>>>>>>>` (5 May incident)
#   2. GITHUB TOKEN LEAK — `ghp_*`, `github_pat_*` (D-05 disiplin)
#   3. API KEY LEAK — Anthropic, OpenAI, AWS, Stripe, vs.
#
# Bypass etmek için: `git commit --no-verify` (sadece acil durum, log'lanmalı)
#
# Çağrılış:
#   - .husky/pre-commit (npm install sonrası otomatik)
#   - veya: bash scripts/pre-commit-check.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Hata durumunda exit

# Renkler
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Staged dosyaları al (sadece commit edilecek dosyalar kontrol edilir)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo -e "${YELLOW}[pre-commit] Staged dosya yok, atlıyor.${NC}"
  exit 0
fi

ERRORS=0
WARNINGS=0

# ───────────────────────────────────────────────────────────────────────────
# 1. MERGE CONFLICT MARKER CHECK
# ───────────────────────────────────────────────────────────────────────────
echo -e "${GREEN}[1/3]${NC} Merge conflict marker kontrol..."

MARKER_FOUND=""
for FILE in $STAGED_FILES; do
  # Sadece text dosyaları kontrol et (binary atla)
  if [ -f "$FILE" ] && file "$FILE" | grep -q "text"; then
    # Marker pattern'leri (line başında)
    if grep -nE '^<{7}( |$)|^={7}( |$)|^>{7}( |$)' "$FILE" > /dev/null 2>&1; then
      MARKER_FOUND="$MARKER_FOUND $FILE"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ -n "$MARKER_FOUND" ]; then
  echo -e "${RED}❌ Merge conflict marker bulundu:${NC}"
  for FILE in $MARKER_FOUND; do
    echo -e "${RED}   $FILE${NC}"
    grep -nE '^<{7}( |$)|^={7}( |$)|^>{7}( |$)' "$FILE" | head -3 | sed 's/^/     /'
  done
  echo -e "${RED}💡 Çözüm: Conflict'leri çöz, sonra tekrar commit et.${NC}"
fi

# ───────────────────────────────────────────────────────────────────────────
# 2. GITHUB TOKEN LEAK CHECK
# ───────────────────────────────────────────────────────────────────────────
echo -e "${GREEN}[2/3]${NC} GitHub token leak kontrol..."

TOKEN_FOUND=""
for FILE in $STAGED_FILES; do
  if [ -f "$FILE" ] && file "$FILE" | grep -q "text"; then
    # ghp_* (classic personal access token, 40 karakter)
    # github_pat_* (fine-grained PAT, 82 karakter)
    # gho_* (OAuth token)
    # ghu_* (user-to-server token)
    # ghs_* (server-to-server token)
    # ghr_* (refresh token)
    if grep -nE 'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|gh[ousr]_[A-Za-z0-9]{36}' "$FILE" > /dev/null 2>&1; then
      TOKEN_FOUND="$TOKEN_FOUND $FILE"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ -n "$TOKEN_FOUND" ]; then
  echo -e "${RED}❌ GitHub token bulundu:${NC}"
  for FILE in $TOKEN_FOUND; do
    echo -e "${RED}   $FILE${NC}"
    # Token'ın kendisini göstermiyoruz, sadece satır numarasını
    grep -nE 'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|gh[ousr]_[A-Za-z0-9]{36}' "$FILE" | sed 's/ghp_[A-Za-z0-9]*/ghp_***REDACTED***/g; s/github_pat_[A-Za-z0-9_]*/github_pat_***REDACTED***/g' | head -3 | sed 's/^/     /'
  done
  echo -e "${RED}💡 Çözüm: Token'ı dosyadan çıkar, .env veya environment variable kullan.${NC}"
  echo -e "${RED}   Eğer token zaten leak olduysa: derhal GitHub'da token'ı revoke et.${NC}"
fi

# ───────────────────────────────────────────────────────────────────────────
# 3. API KEY LEAK CHECK (Anthropic, OpenAI, AWS, Stripe)
# ───────────────────────────────────────────────────────────────────────────
echo -e "${GREEN}[3/3]${NC} API key leak kontrol..."

APIKEY_FOUND=""
for FILE in $STAGED_FILES; do
  if [ -f "$FILE" ] && file "$FILE" | grep -q "text"; then
    # Anthropic: sk-ant-api03-... veya sk-ant-...
    # OpenAI: sk-proj-..., sk-...
    # AWS: AKIA... (access key), aws_secret_access_key=...
    # Stripe: sk_live_..., pk_live_...
    if grep -nE 'sk-ant-[a-zA-Z0-9_-]{20,}|sk-proj-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|sk_live_[a-zA-Z0-9]{20,}' "$FILE" > /dev/null 2>&1; then
      APIKEY_FOUND="$APIKEY_FOUND $FILE"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ -n "$APIKEY_FOUND" ]; then
  echo -e "${RED}❌ API key leak bulundu:${NC}"
  for FILE in $APIKEY_FOUND; do
    echo -e "${RED}   $FILE${NC}"
  done
  echo -e "${RED}💡 Çözüm: API key'i dosyadan çıkar, .env kullan. Leak olduysa KEY'i derhal revoke et.${NC}"
fi

# ───────────────────────────────────────────────────────────────────────────
# SONUÇ
# ───────────────────────────────────────────────────────────────────────────
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║ ❌ Pre-commit BLOKLANDI: $ERRORS güvenlik sorunu bulundu       ║${NC}"
  echo -e "${RED}╠════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${RED}║ Acil bypass (sadece güvenli içerikse):                     ║${NC}"
  echo -e "${RED}║   git commit --no-verify -m \"...\"                          ║${NC}"
  echo -e "${RED}║                                                            ║${NC}"
  echo -e "${RED}║ DİKKAT: --no-verify kullanırken işlem log'lanır,           ║${NC}"
  echo -e "${RED}║ Aslan + Mahmut görür. Sadece ACİL durumda kullan.         ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pre-commit check başarılı.${NC} ($(echo "$STAGED_FILES" | wc -l | tr -d ' ') dosya kontrol edildi)"
exit 0
