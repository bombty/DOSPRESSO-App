#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# DOSPRESSO Git Hooks Kurulum Script'i
# ═══════════════════════════════════════════════════════════════════════════
#
# Bu script git hooks'ları DOSPRESSO repo'sunda aktif eder.
# Yeni clone yapan herkes BİR KEZ çalıştırmalı:
#
#   bash scripts/install-git-hooks.sh
#
# Sonrası: git commit yapıldığında scripts/git-hooks/pre-commit otomatik
# çalışır (marker + token + secret detection).
#
# Bypass: git commit --no-verify (sadece acil durum)
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/scripts/git-hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ scripts/git-hooks dizini bulunamadı. Repo kök dizininde misin?"
  exit 1
fi

# Tüm hook dosyalarını executable yap
chmod +x "$HOOKS_DIR"/*

# Git'e hooks path'ini söyle
git config core.hooksPath scripts/git-hooks

echo -e "${GREEN}✅ Git hooks kuruldu.${NC}"
echo ""
echo "Aktif hook'lar:"
ls -1 "$HOOKS_DIR" | sed 's/^/  - /'
echo ""
echo -e "${YELLOW}Test et:${NC} marker'lı bir dosya oluştur, commit dene → engellenmeli."
echo -e "${YELLOW}Bypass:${NC} git commit --no-verify (sadece acil durum)"
