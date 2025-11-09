# DOSPRESSO Franchise Management WebApp - Design Guidelines

## Design System - Figma Implementation

**Visual Design**: Based on provided Figma mockups with DOSPRESSO branding
**Approach**: Material Design 3 principles with custom color palette and Turkish language support

**Key Principles**:
- Clarity over decoration
- Information hierarchy through typography and spacing
- Consistent patterns across all modules
- Mobile-responsive layouts for field operations
- Red primary color for active states and CTAs
- Dark navy sidebar for contrast

---

## Color Palette (Figma-based)

### Primary Colors
- **Primary Red**: `#EF4444` (HSL: 0 91% 62%)
  - Usage: Active menu items, primary buttons, selected tabs, important actions, active sidebar indicator
  - Foreground: White text on red background
  - Example: Active menu item in sidebar, "Yeni Çizelge Ekle" button

- **Sidebar Dark Navy**: `#0F172A` (HSL: 222 47% 11%)
  - Usage: Left sidebar background
  - Foreground: White text
  - Example: Main navigation sidebar

### Status Colors
- **Success Green**: `#22C55E` (HSL: 142 71% 45%)
  - Usage: Completed tasks, "Tamamlanan" badges, positive states
  - Badge: Green background with white text
  - Example: Task status "Tamamlanan"

- **Warning Yellow/Orange**: `#FCD34D` / `#FB923C` (HSL: 48 96% 59% / 25 91% 61%)
  - Usage: Pending/incomplete tasks, "Beklemede" badges
  - Badge: Yellow background with dark text
  - Example: Task status "Tamamlanmayan"

- **Info Blue**: `#3B82F6` (HSL: 221 83% 60%)
  - Usage: In progress tasks, "Devam Ediyor" badges, AI features, checkboxes
  - Badge: Blue background with white text
  - Example: Task status "Devam Ediyor", AI analysis button

### Neutral Colors
- **Background**: `#FAFAF9` (HSL: 24 33% 97%)
  - Main page background with subtle warm beige tone

- **Card White**: `#FFFFFF` (HSL: 0 0% 100%)
  - Card backgrounds, elevated surfaces, white containers

- **Text Dark**: `#0F172A` / `#1F2937`
  - Primary text color, headings

- **Text Secondary**: `#6B7280`
  - Secondary text, metadata, timestamps

### Semantic Color Mapping
```css
--primary: 0 91% 62% (Red #EF4444)
--sidebar: 222 47% 11% (Dark Navy #0F172A)
--background: 24 33% 97% (Warm Beige #FAFAF9)
--card: 0 0% 100% (White)
--success: 142 71% 45% (Green #22C55E)
--warning: 48 96% 59% (Yellow #FCD34D)
--info: 221 83% 60% (Blue #3B82F6)
```

---

## Typography System

**Font Family**: Inter (Google Fonts) for UI, Roboto for data/numbers
- **Headings**: Inter Semi-bold (600)
  - H1: 2rem (Module titles)
  - H2: 1.5rem (Section headers)
  - H3: 1.25rem (Card headers)
  - H4: 1.125rem (Subsections)
- **Body**: Inter Regular (400)
  - Base: 1rem (Primary content)
  - Small: 0.875rem (Secondary text, labels)
  - Caption: 0.75rem (Metadata, timestamps)
- **Data/Metrics**: Roboto Medium (500) for KPI numbers and statistics
- **Turkish Language**: Ensure proper character support (ğ, ı, ş, ü, ö, ç)

---

## Layout System

**Spacing Primitives**: Tailwind units - **2, 4, 6, 8** (0.5rem, 1rem, 1.5rem, 2rem)
- Component padding: p-4, p-6
- Section spacing: py-6, py-8
- Card gaps: gap-4
- Form field spacing: space-y-4
- Grid gaps: gap-6

**Grid System**:
- Dashboard: 12-column grid with responsive breakpoints
- Mobile (base): Single column stacking
- Tablet (md:): 2-column for cards, side-by-side forms
- Desktop (lg:): 3-4 column dashboards, 2-column detail views

**Container Strategy**:
- App shell: Full width with max-w-7xl inner container
- Content sections: max-w-6xl for reading comfort
- Forms: max-w-2xl centered for focus

---

## Component Library

### Navigation & Shell
**Sidebar Navigation** (Desktop):
- Fixed left sidebar (w-64) with module icons and Turkish labels
- Collapsible to icon-only mode (w-16)
- Active state indication with subtle background treatment
- User profile section at bottom with role badge

**Top Bar**:
- Breadcrumb navigation (Görevler > Açılış Checklist)
- Notifications bell with badge counter
- User dropdown (profile, ayarlar, çıkış)
- Branch selector for HQ users

**Mobile Navigation**:
- Bottom tab bar with 4-5 primary modules
- Hamburger menu for additional options
- Sticky header with current page title

### Dashboard Components
**KPI Cards**:
- Grid layout (3-4 columns on desktop, 1-2 on mobile)
- Large metric number (text-3xl) with label below
- Icon in top-right corner
- Trend indicator (arrow + percentage)
- Subtle card elevation

**Data Tables**:
- Sticky header row
- Alternating row backgrounds for readability
- Action column (overflow menu)
- Responsive: Stack to cards on mobile
- Pagination at bottom

**Task/Checklist Items**:
- Checkbox on left, task description, status badge on right
- Expandable rows for photo upload/verification
- Timestamp and assigned user metadata
- Swipe actions on mobile

### Forms & Inputs
**Form Layout**:
- Vertical stacking with clear labels above fields
- Required field indicators (*)
- Inline validation messages
- Action buttons right-aligned at bottom

**Photo Upload**:
- Large dropzone with camera icon
- Preview thumbnails in grid
- Delete button on hover
- AI analysis results displayed below upload

**Input Fields**:
- Outlined style with floating labels
- Focus state with border emphasis
- Helper text below field
- Error states with icon and message

### Data Visualization
**Charts** (for KPI dashboards):
- Line charts for trends (görev tamamlama over time)
- Bar charts for comparisons (şube performansı)
- Donut charts for percentages (eğitim başarı)
- Minimal grid lines, clear legends

**Status Indicators**:
- Badge components for task status (Tamamlandı, Beklemede, Gecikmiş)
- Dot indicators for equipment status (Çalışıyor, Arızalı)
- Progress bars for completion rates

### Modals & Overlays
**Modal Pattern**:
- Center overlay with backdrop
- Close button top-right
- Primary action bottom-right
- Mobile: Full-screen takeover

**Toast Notifications**:
- Top-right positioning
- Auto-dismiss (4 seconds)
- Success, error, warning, info variants
- Action button option (Göster, Geri Al)

---

## Images

**Dashboard Module Icons**: Use Heroicons (CDN) for navigation and UI elements
- Outline style for inactive states
- Solid style for active states
- 24px size standard

**Photo Verification Displays**:
- Grid layout for uploaded task photos (2-3 columns)
- Lightbox on click for full-screen view
- AI analysis overlay with annotation markers
- Before/after comparison slider for calibration photos

**User Avatars**: Circular, 40px default size, initials fallback

**Equipment Images**: Product photos for fault reporting, stored in knowledge base
- Thumbnail view in lists
- Detail view in equipment profiles

**Hero Section**: NOT applicable - enterprise dashboard has no hero section. Start with navigation and primary dashboard content immediately.

---

## Responsive Behavior

**Mobile-First Priorities**:
- Bottom navigation for primary modules
- Single-column card stacking
- Larger touch targets (min 44px)
- Simplified tables → card views
- Collapsible sections with accordions

**Tablet Adaptations**:
- Two-column layouts where appropriate
- Persistent sidebar option
- Side-by-side form fields

**Desktop Enhancements**:
- Three-column dashboards
- Fixed sidebar navigation
- Data table expansions
- Multi-panel views (list + detail)

---

## Turkish Language Considerations

All UI text in Turkish:
- Button labels: "Kaydet", "İptal", "Sil", "Düzenle"
- Form labels: "Görev Adı", "Açıklama", "Durum"
- Validation: "Bu alan zorunludur"
- Success messages: "Başarıyla kaydedildi"
- Timestamps: "2 saat önce", "Dün 14:30"

Ensure proper text wrapping for longer Turkish words and prevent awkward line breaks.

---

## Accessibility Standards

- WCAG AA compliance
- Keyboard navigation for all interactive elements
- Focus indicators on all inputs
- Aria labels in Turkish
- Screen reader support for status updates
- Sufficient contrast ratios (minimum 4.5:1 for text)