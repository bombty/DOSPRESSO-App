#!/usr/bin/env bash
# scripts/git-cleanup-subrepl-remotes.sh
#
# Sadece `subrepl-*` ile başlayan git remote'larını siler.
# `origin`, `gitsafe-backup`, `main-repl` ASLA silinmez.
#
# Task #329 — Replit Agent tarafından üretildi (2026-05-03).
# UYARI: Çalıştırmadan önce docs/audit/git-sync-diagnosis-2026-05-03.md oku.
# Bu remote'lar Replit platformunun iç sync altyapısına ait olabilir;
# silmek workspace ↔ git senkronizasyonunu bozabilir.
# Önce Replit Support'a sormak şiddetle tavsiye edilir.

set -euo pipefail

# Yedekli başla
BACKUP_DIR="/tmp/git-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "→ .git/config yedekleniyor: $BACKUP_DIR/config.bak"
cp .git/config "$BACKUP_DIR/config.bak"

echo "→ Local main bundle'ı: $BACKUP_DIR/main.bundle"
git bundle create "$BACKUP_DIR/main.bundle" main

# Korunacak remote'lar
PROTECTED=("origin" "gitsafe-backup" "main-repl")

# subrepl-* listesini topla
mapfile -t TARGETS < <(git remote | grep -E '^subrepl-' || true)

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  echo "✓ Silinecek subrepl-* remote bulunamadı."
  exit 0
fi

echo
echo "Silinecek ${#TARGETS[@]} adet subrepl-* remote bulundu:"
printf '  - %s\n' "${TARGETS[@]:0:5}"
[[ ${#TARGETS[@]} -gt 5 ]] && echo "  ... ve $((${#TARGETS[@]} - 5)) tane daha"
echo
echo "Korunacaklar: ${PROTECTED[*]}"
echo

read -r -p "Devam edilsin mi? (yes/HAYIR): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "İptal edildi."
  exit 1
fi

# Silme döngüsü
FAILED=0
for r in "${TARGETS[@]}"; do
  # Çift güvenlik: korumalı listede mi?
  for p in "${PROTECTED[@]}"; do
    if [[ "$r" == "$p" ]]; then
      echo "⚠ $r korumalı — atlanıyor"
      continue 2
    fi
  done
  # subrepl- prefix kontrolü
  if [[ "$r" != subrepl-* ]]; then
    echo "⚠ $r 'subrepl-' ile başlamıyor — atlanıyor"
    continue
  fi
  if git remote remove "$r" 2>/dev/null; then
    echo "✓ silindi: $r"
  else
    echo "✗ silinemedi: $r"
    FAILED=$((FAILED + 1))
  fi
done

echo
echo "─── Sonuç ───"
echo "Kalan remote sayısı: $(git remote | wc -l)"
git remote -v
echo
echo ".git/config boyutu: $(du -h .git/config | cut -f1)"
echo "Yedek: $BACKUP_DIR"
echo
if [[ $FAILED -gt 0 ]]; then
  echo "⚠ $FAILED remote silinemedi. .git/config'i manuel kontrol et."
  exit 1
fi
echo "✓ Tamamlandı."
