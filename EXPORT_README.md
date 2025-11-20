# 📦 DOSPRESSO Export Package

## ✅ İçerik Listesi

Bu export paketi aşağıdaki dosyaları içerir:

### 1. **Uygulama Kodu**
- `client/` - React frontend
- `server/` - Express backend  
- `shared/` - Paylaşılan tipler ve schema
- `package.json` - NPM dependencies
- `tsconfig.json` - TypeScript yapılandırması
- `vite.config.ts` - Vite build yapılandırması
- `tailwind.config.ts` - Tailwind CSS ayarları

### 2. **Veritabanı**
- ✅ `dospresso_backup.sql` - **96,064 satır** PostgreSQL dump
  - Tüm tablolar (users, branches, tasks, audits, equipment, vb.)
  - Tüm data (kullanıcılar, şubeler, görevler, denetimler)
  - Tüm constraints ve indexes

### 3. **Deployment Dosyaları**
- ✅ `.env.example` - Environment variables template
- ✅ `DEPLOYMENT.md` - **Detaylı deployment rehberi**
- ✅ `EXPORT_README.md` - Bu dosya

### 4. **Object Storage (Yüklenen Dosyalar)**
⚠️ **ÖNEMLİ:** Object storage'daki dosyalar (fotoğraflar, upload'lar) bu ZIP'te **YOK**.
- Bunlar AWS S3 veya Replit Object Storage'da bulunuyor
- Yeni deployment'ta yeni storage ayarlamanız gerekecek
- Veya mevcut dosyaları manuel olarak indirip yeni storage'a yüklemelisiniz

---

## 🚀 Hızlı Başlangıç

### 1️⃣ ZIP'i İndir ve Aç
```bash
unzip dospresso-export.zip
cd dospresso-webapp
```

### 2️⃣ Dependencies Yükle
```bash
npm install
```

### 3️⃣ Environment Variables Ayarla
```bash
cp .env.example .env
# .env dosyasını düzenle ve değerleri doldur
```

### 4️⃣ Veritabanını Restore Et
```bash
# Yeni PostgreSQL database oluştur
createdb dospresso

# Backup'ı restore et
psql postgresql://user:pass@host/dospresso < dospresso_backup.sql
```

### 5️⃣ Uygulamayı Başlat
```bash
npm run dev
```

Uygulama şurada çalışacak: **http://localhost:5000**

---

## 📋 Gereksinimler

- **Node.js:** 18 veya üstü
- **PostgreSQL:** 14 veya üstü
- **SMTP Server:** Email gönderimi için (IONOS, Gmail, vb.)
- **Object Storage:** (Opsiyonel) AWS S3 veya uyumlu servis

---

## 🔐 Güvenlik Notları

### ⚠️ Mutlaka Yapılması Gerekenler:

1. **SESSION_SECRET değiştir:**
   ```bash
   # Güvenli random secret oluştur
   openssl rand -hex 32
   ```
   Çıkan değeri `.env` dosyasına yapıştır.

2. **Database password:**
   - Güçlü bir şifre kullan
   - Production'da SSL enable et

3. **SMTP credentials:**
   - Gerçek email servis bilgilerinizi kullanın
   - Test modunda SendGrid, Mailgun vb. kullanabilirsiniz

4. **NODE_ENV:**
   - Production'da `NODE_ENV=production` olmalı

---

## 📊 Veritabanı İçeriği

**dospresso_backup.sql** şunları içerir:

- ✅ **13 farklı rol** (Admin, HQ Manager, Branch Manager, vb.)
- ✅ **Şubeler** ve şube konfigürasyonları
- ✅ **Kullanıcılar** (hashlenmiş şifreler ile)
- ✅ **Görevler** ve checklist'ler
- ✅ **Denetim şablonları** ve tamamlanmış denetimler
- ✅ **Ekipman** kayıtları ve arıza bildirimleri
- ✅ **Bilgi Bankası** makaleleri
- ✅ **Vardiya** ve devam kayıtları
- ✅ **Performans** metrikleri
- ✅ **Müşteri şikayetleri** ve SLA takibi
- ✅ **Mesai talepleri**
- ✅ **Tüm permissions ve RBAC** yapılandırması

---

## 🆘 Sorun Giderme

### Port zaten kullanımda
```bash
PORT=3000 npm start
```

### Database bağlantı hatası
```bash
# Bağlantıyı test et
psql $DATABASE_URL -c "SELECT version();"
```

### Dependencies hatası
```bash
rm -rf node_modules package-lock.json
npm install
```

### SMTP email gönderilmiyor
- SMTP credentials'ı kontrol edin
- Port 587 veya 465 açık mı?
- Firewall kurallarını kontrol edin

---

## 📁 Deployment Platformları

### DigitalOcean (Önerilen)
- **App Platform:** Otomatik deploy, database dahil
- **Maliyet:** ~$12/ay (Basic plan)
- **PostgreSQL:** Managed database ~$15/ay

### Railway
- Kolay setup, GitHub entegrasyonu
- Free tier mevcut
- Auto-scaling

### AWS EC2
- En esnek seçenek
- Kendi sunucunuzu yönetin
- PM2 ile process management

### Render
- Free tier var (sınırlı)
- Kolay deployment
- Managed PostgreSQL

---

## 📞 Destek

Detaylı deployment adımları için: **DEPLOYMENT.md** dosyasına bakın.

---

## ✨ Özellikler

DOSPRESSO franchise management platform:

- ✅ 13-rol RBAC sistemi
- ✅ Görev yönetimi + AI fotoğraf analizi
- ✅ Personel ve şube denetimleri (çoktan seçmeli testler)
- ✅ Ekipman takibi + QR kod sistemi
- ✅ Vardiya yönetimi (QR check-in/out)
- ✅ Müşteri şikayetleri + SLA otomasyonu
- ✅ Performans dashboard'ları
- ✅ Bilgi Bankası (RAG + AI)
- ✅ Eğitim Akademisi
- ✅ Mesajlaşma sistemi
- ✅ Email bildirimleri (SMTP)
- ✅ Türkçe lokalizasyon

---

**Son Güncelleme:** 2025-11-20  
**Versiyon:** 1.0.0  
**Database Satır Sayısı:** 96,064
