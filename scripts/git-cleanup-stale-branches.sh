#!/usr/bin/env bash
# scripts/git-cleanup-stale-branches.sh
#
# Tanı raporunda (docs/audit/git-sync-diagnosis-2026-05-03.md) güvenli
# olduğu doğrulanmış stale branch'leri siler.
#
# SİLİNECEK:
#   - clean-pazar-2-commits   (1 ahead — commit'i 276916417 olarak main'de)
#   - replit-agent            (4 behind, 0 ahead — main'in atası)
#
# SİLİNMEYECEK:
#   - backup-pazar-pre-clean  (32 ahead, 8 behind — manuel doğrulama gerek)
#   - main, main-repl/main    (aktif)
#
# Task #329 — Replit Agent tarafından üretildi (2026-05-03).

set -euo pipefail

BACKUP_DIR="/tmp/git-branch-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

CANDIDATES=("clean-pazar-2-commits" "replit-agent")

echo "→ Aday branch'lerin bundle yedekleri: $BACKUP_DIR/"
for b in "${CANDIDATES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    git bundle create "$BACKUP_DIR/${b}.bundle" "$b"
    echo "  ✓ $b → ${b}.bundle"
  else
    echo "  ⊘ $b zaten yok — atlanıyor"
  fi
done

echo
echo "Silinecek:"
for b in "${CANDIDATES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    AHEAD=$(git rev-list --count "main..$b" 2>/dev/null || echo "?")
    BEHIND=$(git rev-list --count "$b..main" 2>/dev/null || echo "?")
    echo "  - $b (ahead=$AHEAD, behind=$BEHIND vs main)"
  fi
done
echo
echo "DİKKAT: backup-pazar-pre-clean BU SCRIPT'TE SİLİNMİYOR — 32 ahead."
echo

read -r -p "Devam edilsin mi? (yes/HAYIR): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "İptal edildi."
  exit 1
fi

for b in "${CANDIDATES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    if git branch -D "$b"; then
      echo "✓ silindi: $b"
    else
      echo "✗ silinemedi: $b"
    fi
  fi
done

echo
echo "→ git remote prune origin"
git remote prune origin || true

echo
echo "─── Sonuç ───"
git branch | head -20
echo
echo "Yedek: $BACKUP_DIR"
echo "✓ Tamamlandı."
