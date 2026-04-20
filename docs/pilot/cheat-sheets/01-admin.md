# DOSPRESSO Cheat Sheet — Admin (adminhq)

**Hedef Kullanıcı**: Sistem yöneticisi (Aslan, IT)  
**Erişim**: Tüm modüller, tüm lokasyonlar

---

## 1. Login Adımları

1. Tarayıcıda `https://[your-domain]` aç
2. Kullanıcı adı: `adminhq`
3. Parola: **1Password "DOSPRESSO Pilot Vault"** (28 Nis 08:00 sonrası)
4. "Giriş Yap" → Mission Control dashboard yüklenir

---

## 2. Ana Ekran (Mission Control — Admin)

| Alan | İçerik |
|---|---|
| **Üst KPI Strip** | Aktif kullanıcı, açık task, bugünkü sipariş, hata oranı |
| **Sol Sidebar** | Tüm modüller (HR, Fabrika, CRM, Finans, Akademi, Ekipman) |
| **Ana Panel** | 8-12 widget (rol bazlı), her widget canlı veri |
| **Sağ Üst** | Bildirim çanı, profil, dark mode toggle |

**Hızlı Aksiyonlar**: Sidebar üstündeki "Yeni Görev", "Pilot Başlat", "Modül Yönet" butonları.

---

## 3. Günlük İş Akışı (3 Adım)

### Sabah (09:00)
- Mission Control → KPI'ları gözden geçir (login rate, hata oranı)
- Bildirim çanı → kritik notification varsa hemen müdahale

### Öğlen (13:00-14:00)
- `/admin/users` → yeni kullanıcı ekleme/parola sıfırlama (gerekirse)
- `/admin/branch-setup-status/:branchId` → şube onboarding ilerlemesi
- `/admin/audit-logs` → şüpheli aktivite kontrol

### Akşam (18:00)
- `/pilot-baslat` → Day-1 raporu (eğer pilot dönemiyse)
- `/admin/module-flags` → günün toggle gerekiyorsa uygula
- Son notification'ları temizle

---

## 4. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Kullanıcı login olamıyor | `/admin/users` → user seç → "Parola Sıfırla" → "0000" geçici |
| Modül 403 hatası | `/admin/module-flags` → flag durumunu kontrol et |
| Veri kayboldu | IT'ye WhatsApp KIRMIZI mesaj |
| Toplu bildirim spam'i | `/admin/notifications` → "Tümünü Arşivle" |

---

## 5. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (müdür / coach / HQ destek)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — HQ"
- Cheat sheet: `docs/pilot/cheat-sheets/01-admin.md`

---

## 6. Yapma! (Common Pitfalls)

❌ Aktif user'ı silme — **soft-delete (deaktive et) tercih et**  
❌ `/pilot-baslat` butonuna canlı saatte basma — verileri sıfırlar  
❌ adminhq parolasını WhatsApp/email'e yazma — sadece 1Password  
❌ `module_flags` toggle'ı saat başı yapma — kullanıcılar yarıda kalır
