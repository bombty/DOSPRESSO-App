# DOSPRESSO UI/Layout Kapsamlı Denetim Raporu

**Tarih:** 2026-03-15  
**Analiz Edilen Dosyalar:** App.tsx, app-header.tsx, bottom-nav.tsx, tailwind.config.ts, index.css, admin/yetkilendirme.tsx, iletisim-merkezi/, crm-mega.tsx

---

## 1. RESPONSIVE / BREAKPOINT SİSTEMİ

### 1.1 Tailwind Breakpoint Yapılandırması

`tailwind.config.ts` dosyasında **özel breakpoint tanımı bulunmuyor**. Tailwind'in varsayılan breakpoint'leri geçerli:

| Prefix | Min Width | Tanım    |
|--------|-----------|----------|
| `sm`   | 640px     | Tablet   |
| `md`   | 768px     | Tablet+  |
| `lg`   | 1024px    | Desktop  |
| `xl`   | 1280px    | Geniş    |
| `2xl`  | 1536px    | Çok geniş|

**Dosya:** `tailwind.config.ts:6-104` — `theme.extend` bölümünde `screens` key'i yok.

### 1.2 Layout Değişimi (Mobile / Tablet / Desktop)

Ana layout **TEK bir kolon** olarak çalışır, herhangi bir breakpoint'te değişmiyor:

```
App.tsx:546-582
┌────────────────────────────┐
│ OfflineBanner              │
│ AppHeader (sticky top)     │
│ BreadcrumbNavigation       │
│ ┌────────────────────────┐ │
│ │ main (flex-1)          │ │
│ │   max-w-[1600px]       │ │
│ │   mx-auto              │ │
│ │   Router               │ │
│ │   pb-20 (bottom space) │ │
│ └────────────────────────┘ │
│ DobodyMiniBar              │
│ BottomNav (fixed bottom)   │
│ GlobalSearch               │
│ GlobalAIAssistant          │
└────────────────────────────┘
```

**Yapı:** `flex flex-col min-h-screen bg-background` → **Sabit tek kolon**, tüm boyutlarda aynı. _(App.tsx:547)_

**Sonuç:**
- **Ayrı mobile/desktop layout YOK** — tek layout tüm cihazlara uygulanıyor
- **Sol sidebar / icon rail YOK** — hiçbir breakpoint'te sol navigasyon oluşmuyor
- **Max-width:** `1600px` ile sınırlandırılmış (App.tsx:565)
- **Layout tamamen dikey (vertical)** — mobil öncelikli tasarım

### 1.3 Header Responsive Davranışı

**`app-header.tsx:84-175`**

- Yapı: `sticky top-0 z-50` → tüm boyutlarda sabit üstte
- Hamburger menü: Küçük roller (`stajyer`, `bar_buddy`, `barista`, `yatirimci_branch/hq`, `fabrika_operator/personel`) için `hidden md:block` → mobil'de gizli, md+ göster _(app-header.tsx:88)_
- Kullanıcı adı alanı: `max-w-[120px] sm:max-w-[180px]` → mobilde dar, sm+ geniş _(app-header.tsx:98)_
- Sağ butonlar (inbox, help, theme, QR): Her boyutta görünür, `h-8 w-8` sabit boyut _(app-header.tsx:139-172)_
- Logo: Mutlak ortalanmış `absolute left-1/2 transform -translate-x-1/2` _(app-header.tsx:125)_

**Sonuç:** Header'da **minimal responsive fark** var, temelde aynı yapı.

### 1.4 Bottom Nav Responsive Davranışı

**`bottom-nav.tsx:262-347`**

- Container: `fixed left-0 right-0 sm:left-3 sm:right-3 z-[60]` _(bottom-nav.tsx:264)_
  - Mobilde tam genişlik, sm+ kenarlardan 3 birim boşluk
- İç container: `sm:max-w-md mx-auto sm:rounded-2xl rounded-none sm:border sm:shadow-xl` _(bottom-nav.tsx:271)_
  - Mobilde köşesiz, sm+ yuvarlak köşeli "floating" bar
- Label text: `hidden sm:inline` (inactive items) → mobilde sadece icon, sm+ label göster _(bottom-nav.tsx:289, 309, 340)_
- Maks 5 item: `navKeys.slice(0, 5)` _(bottom-nav.tsx:244)_

**Sonuç:** Bottom nav **HER ZAMAN görünür** — tüm ekran boyutlarında. Gizlenmesi için herhangi bir `md:hidden` veya `lg:hidden` breakpoint'i **YOK**.

### 1.5 Hardcoded Pixel Width Sorunları

| Dosya | Satır | Değer | Risk |
|-------|-------|-------|------|
| app-header.tsx | 98 | `max-w-[120px]` / `max-w-[180px]` | Düşük (truncate var) |
| app-header.tsx | 85 | `bg-[#1e3a5f]` | Renk sabit kodlu |
| app-header.tsx | 139-172 | `h-8 w-8` butonlar | Düşük (icon butonlar) |
| App.tsx | 565 | `max-w-[1600px]` | Sorun yok (max container) |
| bottom-nav.tsx | 271 | `h-14` nav bar yüksekliği | Sorun yok (sabit nav) |
| App.tsx | 564 | `pb-20` | bottom nav alanı için gerekli |

### 1.6 Minimum Desteklenen Viewport

- **Tasarım hedefi:** Mobile-first (320px+), ancak açıkça tanımlanmamış
- **Bottom nav:** 5 item × flex-1 → ~280px minimum
- **Header:** Logo + butonlar → ~320px minimum
- **Tahmini minimum:** **320px** (iPhone SE boyutu)

---

## 2. HEADER RENK (CI Sprint)

### 2.1 Mevcut Arka Plan Rengi

**Dosya:** `client/src/components/app-header.tsx`  
**Satır:** 85

```tsx
<div className="px-3 py-2 border-b bg-[#1e3a5f] dark:bg-[#1e3a5f] flex items-center gap-3 relative">
```

| Özellik | Değer |
|---------|-------|
| **Tailwind class** | `bg-[#1e3a5f]` |
| **Hex değeri** | `#1e3a5f` |
| **Renk adı** | Koyu lacivert (Navy Blue) |
| **Dark mode** | `dark:bg-[#1e3a5f]` — aynı renk |
| **Satır numarası** | **85** |

**Not:** Bu renk `index.css`'deki `--dospresso-navy: 220 60% 18%` ile uyumlu (`hsl(220, 60%, 18%)` ≈ `#123660`). Ancak header doğrudan `#1e3a5f` hex kullanıyor — CSS değişkeni **kullanmıyor**.

### 2.2 İlişkili CSS Değişkenleri (index.css)

| Değişken | HSL | Satır |
|----------|-----|-------|
| `--dospresso-navy` | `220 60% 18%` | 33 |
| `--dospresso-navy-light` | `220 55% 35%` | 34 |
| `--sidebar` | `220 60% 15%` | 69 |

---

## 3. SOL RAIL / SIDEBAR

### 3.1 Mevcut Durum

**`App.tsx:546-582`** — Ana layout wrapper:

```tsx
// App.tsx:547
<div className="flex flex-col min-h-screen bg-background">
```

**Sol sidebar/icon rail MEVCUT DEĞİL.** Layout tamamen dikey (flex-col):

- Satır 547: `flex flex-col` → dikey yönlendirme
- `flex-row` kullanımı **yok**
- `<Sidebar>` veya `<SidebarProvider>` bileşeni **yok**
- Sol panel/rail **hiçbir breakpoint'te** oluşmuyor

### 3.2 Layout Yapısı Özeti

```
App.tsx:602-622 (App wrapper)
  └── ErrorBoundary
      └── QueryClientProvider
          └── ThemeProvider
              └── NetworkStatusProvider
                  └── TooltipProvider
                      └── DobodyFlowProvider
                          └── BreadcrumbProvider
                              └── AppContent (App.tsx:546-582)

AppContent layout (546-582):
  flex flex-col min-h-screen bg-background
  ├── OfflineBanner
  ├── AppHeader (sticky top-0 z-50)
  ├── BreadcrumbNavigation (px-2 pt-1)
  ├── main (flex-1 overflow-auto pb-20)
  │   └── div (max-w-[1600px] mx-auto w-full)
  │       └── Router
  ├── DobodyMiniBar
  ├── BottomNav (fixed bottom z-[60])
  ├── GlobalSearch
  └── GlobalAIAssistant
```

### 3.3 Navigasyon Sistemi

- **Birincil:** Bottom Nav (5 role-based item, her zaman görünür)
- **İkincil:** Hamburger menü (sol slide-in drawer, role bazlı)
- **Üçüncül:** Breadcrumb navigasyon
- **Desktop sidebar:** YOK

---

## 4. ADMIN MODÜL DÜZENLEME (Mega Modül)

### 4.1 Dosya Yolu

**`client/src/pages/admin/yetkilendirme.tsx`** (2162 satır)

Alt-route: Admin Mega Module → "Modüller" sekmesi  
URL: `/admin?tab=modules` (admin-mega.tsx içinde `yetkilendirme` tab olarak yüklenir)

### 4.2 Mevcut Özellikler

**Modüller sekmesi (satır ~1990-2070):**

- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` ile modülleri mega modüller arasında sürükle-bırak _(satır 17-33)_
- **Mega Modül Başlık Düzenleme:** Her mega modülün başlığı inline düzenlenebilir _(satır 430-550, `DroppableMegaModule` bileşeni)_
- **Modül Ekleme:** Yeni modül oluşturma dialog'u — moduleKey, label, megaModuleId _(satır 1598-1662)_
- **Modül Label Düzenleme:** Özel etiket atama _(satır 1280-1300)_
- **Sıralama:** Drag ile mega modül içi sıralama _(satır 1322-1395)_
- **Sıfırlama:** Varsayılana döndürme _(satır 1400-1420)_

### 4.3 Alt Konu (Subtopic) Desteği

**HAYIR — Alt konu/subtopic desteği MEVCUT DEĞİL.**

Mevcut veri yapısı **düz (flat) liste**:

```typescript
// yetkilendirme.tsx:1136-1138
const { data: megaModuleData } = useQuery<{
  configs: Array<{ megaModuleId: string; megaModuleName: string; megaModuleNameTr: string }>;
  items: Array<{ megaModuleId: string; subModuleId: string; subModuleName: string; subModuleNameTr: string }>;
}>
```

**Yapı:**
```
Mega Module (ör: "Operasyon")
├── Modül A (düz bağlantı: subModuleId → megaModuleId)
├── Modül B
└── Modül C
```

**Eksik olanlar:**
- Alt modül / subtopic hiyerarşisi yok
- İç içe (nested) yapı yok
- Sadece `megaModuleId → subModuleId` eşleşmesi (düz ilişki)
- Her modül sadece bir mega modüle atanabilir

### 4.4 API Endpoint'leri

| Endpoint | Method | Amaç |
|----------|--------|------|
| `/api/admin/mega-modules` | GET | Tüm config + item listesi |
| `/api/admin/mega-modules/config` | POST | Mega modül başlık güncelle |
| `/api/admin/mega-modules/items` | POST | Modül-mega modül eşleşmesi |
| `/api/admin/mega-modules/add-module` | POST | Yeni modül ekle |

---

## 5. CRM / İLETİŞİM MERKEZİ LAYOUT

### 5.1 Dosya Yolları

İki ayrı CRM modülü mevcut:

| Modül | Dosya | URL | Amaç |
|-------|-------|-----|------|
| **İletişim Merkezi** | `client/src/pages/iletisim-merkezi/index.tsx` (160 satır) | `/iletisim-merkezi` | Şube Talepleri, HQ Görevler, Duyurular |
| **CRM Mega Module** | `client/src/pages/crm-mega.tsx` (197 satır) | `/crm/*` | Dashboard, Kampanyalar, Ticket, Analizler, Ayarlar |

**Route tanımları:**
- `App.tsx:462` → `/iletisim-merkezi` → `IletisimMerkezi`
- `App.tsx` → `/crm/*` → CRM mega module (ayrı route'lar)

### 5.2 İletişim Merkezi Layout

**`iletisim-merkezi/index.tsx:98-158`**

```tsx
<div className="max-w-5xl mx-auto px-4 py-6">
  ├── Header (flex, justify-between, flex-wrap)
  │   ├── Başlık + Alt metin
  │   └── "Yeni Ticket" butonu
  └── Tabs (Shadcn Tabs)
      ├── TabsList (border-b, flex-wrap)
      │   ├── Dashboard
      │   ├── Şube Talepleri (badge)
      │   ├── HQ Görevler (badge, HQ only)
      │   └── Duyurular (HQ only)
      └── TabsContent
          ├── DashboardTab (lazy)
          ├── TicketsTab (lazy)
          ├── HqTasksTab (lazy, HQ only)
          └── BroadcastTab (lazy, HQ only)
```

**Layout özellikleri:**
- **Tek kolon** layout: `max-w-5xl mx-auto` (1024px max)
- **Sol menü + content area HAYIR** — tab bazlı tek kolon
- **Split panel (list + detail) HAYIR** — tab değiştirme ile tam sayfa içerik
- **Responsive:** `flex-wrap` header'da, `h-auto flex-wrap` TabsList'te

### 5.3 CRM Mega Module Layout

**`crm-mega.tsx`**

- Aynı tab-bazlı yapı
- 5 sekme: Dashboard, Kampanyalar, Ticket/Talepler, Analizler, Ayarlar
- Tek kolon, split panel yok
- Horizontal ScrollArea tab listesi

---

## ÖZET TABLOSU

| Konu | Mevcut Durum | Not |
|------|-------------|-----|
| **Breakpoints** | Varsayılan Tailwind (sm/md/lg/xl) | Özel ekleme yok |
| **Mobile ↔ Desktop geçişi** | Minimal (sadece bottom-nav stil) | Ayrı layout yok |
| **Sol sidebar/rail** | YOK | Tamamen dikey layout |
| **Header rengi** | `#1e3a5f` (hardcoded hex) | CSS değişkeni kullanmıyor |
| **Header satır** | `app-header.tsx:85` | Light+Dark aynı |
| **Bottom nav gizleme** | HİÇBİR breakpoint'te gizlenmiyor | Her yerde görünür |
| **Admin modül subtopics** | YOK | Düz (flat) liste yapısı |
| **CRM layout** | Tek kolon, tab-based | Split panel yok |
| **Min viewport** | ~320px (tahmini) | Açıkça tanımlı değil |
