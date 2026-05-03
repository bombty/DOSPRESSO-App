# Wave W4 — OBJECT_STORAGE Konsolidasyon (Task #283.4) — **HIGH PRIORITY**

**Status:** PENDING (öncelikli)
**Mode:** Build (yeni hook + FE refactor)
**Tahmini süre:** ~6 saat
**Risk:** YÜKSEK (upload akışı kırılırsa kiosk + guest-form + arıza + announcement etkilenir)

## Kapsam (4 path + konsolidasyon)

### 4 farklı upload endpoint naming → tek hook
| # | Method+Path | FE dosya | Karar |
|---|---|---|---|
| O1 | `POST /api/objects/generate-upload-url` | `fabrika/kiosk.tsx:2175`, `guest-form-settings.tsx:468,509` | **Tek hook** |
| O2 | `POST /api/object-storage/presigned-url` | `announcements.tsx:473,1029` | **Tek hook** |
| O3 | `POST /api/upload-url` | `fault-report-dialog.tsx:480`, `aksiyon-takip.tsx:490` | **Tek hook** |
| O4 | `POST /api/upload/public` | `misafir-geri-bildirim.tsx:655` | **Tek hook + public guard** |

**Mevcut çalışan:** `POST /api/objects/upload` ve `POST /api/objects/finalize` (`certificate-routes.ts:229,242`).

## Plan

1. Yeni `client/src/lib/object-upload.ts` hook (`useObjectUpload`):
   - Internal: `getUploadUrl()` → `/api/objects/upload`
   - `finalizeUpload()` → `/api/objects/finalize`
   - Public variant flag (guest form için)
2. 6 FE çağrı sitesini hook kullanacak şekilde refactor.
3. Eski 4 endpoint naming kaldırılır (server'da zaten yok).

## Acceptance

1. Yeni hook `useObjectUpload` üretildi.
2. 4 farklı naming → tek hook ile değiştirildi.
3. Smoke test: kiosk fotoğraf upload, guest form ek, announcement banner, arıza ek, aksiyon ek, public misafir geri bildirim ek.
4. Public upload için `:branchToken` veya benzer guard.
5. Object Storage skill kuralları takip edilir (`integrations/object-storage`).

## Paralel-güvenlik

**KISMEN:** W1, W6, W7 ile sıralı (W4 onlar tarafından dokunulan dosyalara yazıyor: `fabrika/kiosk.tsx`, `fault-report-dialog.tsx`, `aksiyon-takip.tsx`). W2, W3, W5 ile paralel.

## Bağımlılık

W1 sonrası koşulmalı (kiosk dosyasında çakışma).
