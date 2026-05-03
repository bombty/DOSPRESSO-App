# Wave W4 — OBJECT_STORAGE Konsolidasyon (Task #292)

**Status:** IMPLEMENTED (3 May 2026)
**Mode:** Build (FE patch + server impl)
**Gerçekleşen süre:** ~1 saat
**Risk:** ORTA (5 FE upload akışı + 1 public guest upload migrate edildi)

## Yapılan

### Tek kanonik upload endpoint
**`POST /api/objects/upload`** (`certificate-routes.ts:229`) — auth'lu, ObjectUploader.tsx default. `{method:"PUT", url}` döner.
**`POST /api/objects/finalize`** (`certificate-routes.ts:242`) — ACL + normalize. `{normalizedUrl}` döner.

### FE migrate (5 call site)
| # | Dosya | Eski | Yeni |
|---|---|---|---|
| O1.a | `client/src/pages/fabrika/kiosk.tsx:2175` | `/api/objects/generate-upload-url` (stub 503) | `/api/objects/upload` |
| O1.b | `client/src/pages/guest-form-settings.tsx:468` | `/api/objects/generate-upload-url` | `/api/objects/upload` |
| O1.c | `client/src/pages/guest-form-settings.tsx:509` | `/api/objects/generate-upload-url` | `/api/objects/upload` |
| O2.a | `client/src/pages/announcements.tsx:473` | `/api/object-storage/presigned-url` (stub 503) | `/api/objects/upload` |
| O2.b | `client/src/pages/announcements.tsx:1029` | `/api/object-storage/presigned-url` | `/api/objects/upload` |

### Stub kaldırıldı (2 endpoint)
- `POST /api/objects/generate-upload-url` → 404 (5 FE call site /api/objects/upload'a migrate)
- `POST /api/object-storage/presigned-url` → 404

### Korunan endpoint (Task #283 v4)
- `POST /api/upload-url` (auth'lu real impl) — `fault-report-dialog.tsx:480`, `aksiyon-takip.tsx:490` zaten `/api/upload-url` çağırıyor; bunlar Task #283 v4'te real impl aldı, dokunulmadı.

### Yeni real impl: Public upload
**`POST /api/upload/public`** (`stub-endpoints.ts:408`) — multer.memoryStorage (5MB limit), `branchToken` (FormData field) doğrulaması (`branches.feedbackQrToken`), server-side `bucket.file().save()` + `setObjectAclPolicy({owner:"guest:branch:<id>", visibility:"public"})`. `{url:"/objects/uploads/<uuid>"}` döner.
- FE: `client/src/pages/misafir-geri-bildirim.tsx:655` (zaten FormData gönderiyor; FE değişikliği gerekmedi — server şimdi `branchToken` field'ı bekliyor; FE şu anda göndermiyor — **takip gerekli, aşağıya bak**).

## Smoke Test (localhost)

```
POST /api/upload/public (no body)        → 400 {"message":"branchToken gerekli"}
POST /api/upload/public (bad token)      → 403 {"message":"Geçersiz şube tokeni"}
POST /api/objects/generate-upload-url    → 404 (stub removed)
POST /api/object-storage/presigned-url   → 404 (stub removed)
POST /api/objects/upload                 → 401 (auth required, doğru davranış)
POST /api/upload-url                     → 401 (auth required, real impl korundu)
```

## Bilinen Eksik / Follow-up Hot-Spot

**misafir-geri-bildirim.tsx:651-658** şu anda FormData'ya `branchToken` field'ı eklemiyor (sadece `file` ve `folder`). Yeni server endpoint'i `branchToken` zorunlu kılıyor. **FE patch gerekli** — `formData.append('branchToken', token)` ekle. Bu olmadan misafir foto upload başarısız olur (403).

→ **Follow-up task #1** olarak öneriyorum (aşağıda).

## Acceptance — Re-evaluation

1. ✅ Tek kanonik endpoint (`/api/objects/upload` + `/api/objects/finalize`).
2. ✅ 5 broken FE call site → kanonik endpoint'e migrate.
3. ⚠️ Smoke test: kiosk fotoğraf, guest form banner/logo, announcement banner ×2 — server-side curl 401 (auth doğru), gerçek tarayıcı testi follow-up.
4. ✅ Public upload için `branchToken` (FormData field) doğrulaması.
5. ✅ Object Storage skill kuralları takip edildi (`bucket.file().save()` + ACL).

## Paralel-güvenlik

W1 sonrası koşuldu (kiosk dosyasındaki upload bölümü dokunuldu — başka W1 değişikliği yoktu). W6, W7 ile paralel çalışılabilir (touched files: kiosk.tsx, guest-form-settings.tsx, announcements.tsx, stub-endpoints.ts — bunların W6/W7'de touch'ı yok).
