import type { CanvasBackground, TextElement } from "./hooks/useCanvas";

// ─── Gradient Presets ────────────────────────────────────────────

export interface GradientPreset {
  id: string;
  name: string;
  from: string;
  to: string;
  category: "signature" | "seasonal" | "corporate";
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  // DOSPRESSO Signature
  { id: "espresso-dark", name: "Espresso Dark", from: "#1a0f0a", to: "#3d2314", category: "signature" },
  { id: "latte-warm", name: "Latte Warm", from: "#e8d5b7", to: "#8b6914", category: "signature" },
  { id: "mocha-blend", name: "Mocha Blend", from: "#3a1f0d", to: "#c69c6d", category: "signature" },
  { id: "cream-coffee", name: "Cream & Coffee", from: "#faf3e8", to: "#6b4226", category: "signature" },

  // Mevsimsel
  { id: "summer-fresh", name: "Yaz Ferahlığı", from: "#ff6b35", to: "#ffd700", category: "seasonal" },
  { id: "winter-cozy", name: "Kış Sıcaklığı", from: "#2c1810", to: "#1a0f0a", category: "seasonal" },
  { id: "spring-bloom", name: "Bahar Esintisi", from: "#ff9a9e", to: "#ffecd2", category: "seasonal" },
  { id: "autumn-leaves", name: "Sonbahar Yaprakları", from: "#8B4513", to: "#DAA520", category: "seasonal" },

  // Kurumsal
  { id: "dospresso-red", name: "DOSPRESSO Kırmızı", from: "#cc1f1f", to: "#4a0a0a", category: "corporate" },
  { id: "navy-elegance", name: "Lacivert Şık", from: "#192838", to: "#1a2f45", category: "corporate" },
  { id: "clean-white", name: "Temiz Beyaz", from: "#ffffff", to: "#e8e8e8", category: "corporate" },
  { id: "charcoal-gold", name: "Antrasit & Altın", from: "#2d2d2d", to: "#b8860b", category: "corporate" },
];

export const GRADIENT_CATEGORIES = [
  { key: "signature", label: "DOSPRESSO" },
  { key: "seasonal", label: "Mevsimsel" },
  { key: "corporate", label: "Kurumsal" },
] as const;

// ─── Solid Colors ────────────────────────────────────────────────

export const SOLID_COLORS = [
  { name: "Espresso", color: "#1a0f0a" },
  { name: "Kahve", color: "#4a2c2a" },
  { name: "Karamel", color: "#d4a574" },
  { name: "Krem", color: "#faf3e8" },
  { name: "Beyaz", color: "#ffffff" },
  { name: "Kırmızı", color: "#cc1f1f" },
  { name: "Lacivert", color: "#192838" },
  { name: "Antrasit", color: "#2d2d2d" },
  { name: "Mint", color: "#98d4bb" },
  { name: "Gül", color: "#ffccd5" },
  { name: "Altın", color: "#b8860b" },
  { name: "Gökyüzü", color: "#87ceeb" },
];

// ─── Pattern Presets ─────────────────────────────────────────────

export const PATTERN_PRESETS = [
  { id: "stripes", name: "Çizgili" },
  { id: "dots", name: "Noktalı" },
  { id: "grid", name: "Grid" },
  { id: "wave", name: "Dalga" },
  { id: "coffee-beans", name: "Kahve Çekirdeği" },
];

// ─── Font Options ────────────────────────────────────────────────

export interface FontOption {
  name: string;
  value: string;
  googleFontName: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { name: "Poppins", value: "'Poppins', sans-serif", googleFontName: "Poppins" },
  { name: "Playfair", value: "'Playfair Display', serif", googleFontName: "Playfair+Display" },
  { name: "Montserrat", value: "'Montserrat', sans-serif", googleFontName: "Montserrat" },
  { name: "Lora", value: "'Lora', serif", googleFontName: "Lora" },
  { name: "Raleway", value: "'Raleway', sans-serif", googleFontName: "Raleway" },
  { name: "Oswald", value: "'Oswald', sans-serif", googleFontName: "Oswald" },
  { name: "Inter", value: "Inter, sans-serif", googleFontName: "Inter" },
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName: string) {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

// ─── Templates ───────────────────────────────────────────────────

export interface StudioTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  background: Partial<CanvasBackground>;
  texts: Partial<TextElement>[];
  icons?: string[];
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "new-product",
    name: "Yeni Ürün Lansmanı",
    icon: "🚀",
    description: "Ürün fotoğrafı + fiyat etiketi",
    background: {
      type: "linear",
      gradientFrom: "#1a0f0a",
      gradientTo: "#3d2314",
      gradientDirection: "to-br",
    },
    texts: [
      { text: "YENİ ÜRÜN", x: 40, y: 30, fontSize: 20, color: "#d4a574", fontWeight: "bold" },
      { text: "Ürün Adı", x: 40, y: 70, fontSize: 40, color: "#ffffff", fontWeight: "bold" },
      { text: "₺ 00.00", x: 40, y: 130, fontSize: 28, color: "#ffd700", fontWeight: "bold" },
    ],
    icons: ["☕"],
  },
  {
    id: "recipe-change",
    name: "Reçete Değişikliği",
    icon: "📋",
    description: "Kırmızı uyarı + detay alanı",
    background: {
      type: "linear",
      gradientFrom: "#cc1f1f",
      gradientTo: "#4a0a0a",
      gradientDirection: "to-b",
    },
    texts: [
      { text: "⚠️ REÇETE GÜNCELLEMESİ", x: 40, y: 30, fontSize: 22, color: "#ffd700", fontWeight: "bold" },
      { text: "Ürün Adı", x: 40, y: 70, fontSize: 36, color: "#ffffff", fontWeight: "bold" },
      { text: "Değişiklik detaylarını buraya yazın", x: 40, y: 120, fontSize: 16, color: "#ffcccc", fontWeight: "normal" },
    ],
  },
  {
    id: "campaign",
    name: "Kampanya",
    icon: "🎉",
    description: "Büyük başlık + CTA",
    background: {
      type: "linear",
      gradientFrom: "#ff6b35",
      gradientTo: "#ffd700",
      gradientDirection: "to-r",
    },
    texts: [
      { text: "KAMPANYA", x: 40, y: 25, fontSize: 18, color: "#1a0f0a", fontWeight: "bold" },
      { text: "Başlık Metni", x: 40, y: 60, fontSize: 42, color: "#1a0f0a", fontWeight: "bold" },
      { text: "Detay açıklaması buraya", x: 40, y: 120, fontSize: 18, color: "#3d2314", fontWeight: "normal" },
    ],
    icons: ["🎉", "☕"],
  },
  {
    id: "training",
    name: "Eğitim Duyurusu",
    icon: "📚",
    description: "Eğitim bilgisi + tarih/saat",
    background: {
      type: "linear",
      gradientFrom: "#192838",
      gradientTo: "#1a2f45",
      gradientDirection: "to-br",
    },
    texts: [
      { text: "📚 EĞİTİM", x: 40, y: 30, fontSize: 20, color: "#87ceeb", fontWeight: "bold" },
      { text: "Eğitim Başlığı", x: 40, y: 70, fontSize: 34, color: "#ffffff", fontWeight: "bold" },
      { text: "Tarih: __ / __ / ____  •  Saat: __:__", x: 40, y: 120, fontSize: 16, color: "#98d4bb", fontWeight: "normal" },
    ],
  },
  {
    id: "policy",
    name: "Kanuni / Politika",
    icon: "📜",
    description: "Ciddi ton, zorunlu okuma",
    background: {
      type: "linear",
      gradientFrom: "#2d2d2d",
      gradientTo: "#1a1a1a",
      gradientDirection: "to-b",
    },
    texts: [
      { text: "⚖️ ZORUNLU OKUMA", x: 40, y: 30, fontSize: 18, color: "#cc1f1f", fontWeight: "bold" },
      { text: "Politika Başlığı", x: 40, y: 70, fontSize: 32, color: "#ffffff", fontWeight: "bold" },
      { text: "Yürürlük Tarihi: __ / __ / ____", x: 40, y: 120, fontSize: 16, color: "#999999", fontWeight: "normal" },
    ],
  },
];
