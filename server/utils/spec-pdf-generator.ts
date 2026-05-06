/**
 * Ürün Spesifikasyon PDF Üretici (SD-XX Format)
 *
 * Aslan'ın 21 Pages dosyasından (SD-01..SD-23) çıkardığım format:
 * - Kapak: Ürün adı, doküman no, revizyon, yürürlülük
 * - 1. KAPSAM: TGK ve diğer mevzuat referansları (14 yönetmelik)
 * - 2. MENŞE BİLGİSİ
 * - 3. FİZİKSEL VE KİMYASAL ÖZELLİKLER
 * - 4. BİYOLOJİK ÖZELLİKLER (Mikrobiyolojik kriterler tablosu)
 * - 5. AMBALAJLAMA
 * - 6. DEPOLAMA/SEVKİYAT (Koşullar, raf ömrü, sevkiyat, hazırlama)
 * - 7. GMO, ALERJEN VE KATKI MADDESİ DURUMU
 *
 * Reçete verisinden otomatik doldurulur.
 *
 * Tarih: 7 May 2026
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

// Türkçe karakter desteği için Roboto (public/fonts/'ta var)
const ROBOTO_REGULAR = path.resolve(process.cwd(), 'public/fonts/Roboto-Regular.ttf');
const ROBOTO_BOLD = path.resolve(process.cwd(), 'public/fonts/Roboto-Bold.ttf');

export interface SpecificationData {
  // Reçete bilgileri
  recipeId: number;
  recipeCode: string;          // SD-XX
  productName: string;         // Almond Donut
  productNameUpper: string;    // ALMOND DONUT
  
  // Doküman bilgileri
  documentNo: string;          // SD-01
  revisionNo: string;          // 00
  revisionDate: string;        // -
  effectiveDate: string;       // 01.02.2026
  
  // Hazırlayan/Onaylayan
  preparedBy: string;          // Yönetim Temsilcisi
  approvedBy: string;          // Genel Müdür
  
  // 2. MENŞE
  origin?: string;             // Türkiye
  
  // 3. FİZİKSEL/KİMYASAL
  physicalProperties?: Array<{ property: string; value: string; }>;
  // Örn: [{ property: "Renk", value: "Altın sarısı" }, { property: "Görünüm", value: "Halka şeklinde" }]
  
  // 4. BİYOLOJİK (Mikrobiyolojik kriterler)
  microbiology?: Array<{ organism: string; n: string; c: string; m: string; M: string; }>;
  productCategory?: string;    // "Hafif Fırıncılık Ürünleri (1.6.9.1)"
  
  // 5. AMBALAJLAMA
  packaging?: string;          // Karton kutu, gıda ile temaslı plastik
  
  // 6. DEPOLAMA/SEVKİYAT
  storageTemp?: string;        // -18°C
  shelfLifeDays?: number;      // 180
  shelfLifeNote?: string;      // -18°C kuru ve kokusuz ortamda 6 ay
  shippingNote?: string;       // Soğuk zincir ile temiz, kokusuz, kapalı araç
  preparationInstructions?: string;
  
  // 7. ALERJEN
  containsAllergens?: string[];        // [Buğday unu (gluten), süt, yumurta, soya]
  mayContainAllergens?: string[];      // [Yer fıstığı, susam, sülfit]
  gmoStatus?: string;                  // "GMO içermemektedir"
  
  // Etiket logo URL (opsiyonel)
  companyLogoUrl?: string;
  
  // Üretici (footer)
  manufacturerName?: string;           // DOSPRESSO Gıda
  manufacturerAddress?: string;
}

// Standart 14 mevzuat (tüm spesifikasyonlarda ortak)
const STANDARD_REGULATIONS = [
  "Türk Gıda Kodeksi Mikrobiyolojik Kriterler Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Buğday Unu Tebliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Yumurta Tebliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Kakao ve Çikolata Ürünleri Tebliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Gıda ile Temas Eden Plastik Madde ve Malzemeler Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Gıda Etiketleme ve Tüketicileri Bilgilendirme Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Gıda Katkı Maddeleri Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Aroma Vericiler ve Aroma Verme Özelliği Taşıyan Gıda Bileşenleri Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Bulaşanlar Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Şeker Tebliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Pestisitlerin Maksimum Kalıntı Limitleri Yönetmeliği'ne göre hazırlanmıştır.",
  "Sanayi ve Teknoloji Bakanlığının kontrolleri kapsamındaki Hazır Ambalajlı Mamullerin Ağırlık ve Hacim Esasına göre Net Miktar Tespitine Dair Yönetmeliği'ne göre hazırlanmıştır.",
  "Türk Gıda Kodeksi Gıda Enzimleri Yönetmeliği'ne göre hazırlanmıştır.",
];

const PAGE_W = 595.28;  // A4 width
const PAGE_H = 841.89;  // A4 height
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

interface DrawContext {
  doc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  page: PDFPage;
  y: number;
  pageNum: number;
  totalPages: number;
  spec: SpecificationData;
}

function newPage(ctx: DrawContext): DrawContext {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
  ctx.pageNum++;
  drawHeader(ctx);
  return ctx;
}

function ensureSpace(ctx: DrawContext, needed: number): DrawContext {
  if (ctx.y - needed < 80) { // footer için yer bırak
    drawFooter(ctx);
    return newPage(ctx);
  }
  return ctx;
}

function drawHeader(ctx: DrawContext) {
  const { page, font, boldFont, spec } = ctx;
  
  // Sol üstte logo placeholder (kutu)
  page.drawRectangle({
    x: MARGIN, y: PAGE_H - MARGIN - 50,
    width: 70, height: 50,
    borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1,
  });
  page.drawText('LOGO', {
    x: MARGIN + 18, y: PAGE_H - MARGIN - 30,
    size: 10, font, color: rgb(0.5, 0.5, 0.5),
  });
  
  // Orta: Ürün adı + spesifikasyon
  page.drawText(spec.productNameUpper, {
    x: MARGIN + 90, y: PAGE_H - MARGIN - 20,
    size: 14, font: boldFont, color: rgb(0, 0, 0),
  });
  page.drawText('ÜRÜN SPESİFİKASYONU', {
    x: MARGIN + 90, y: PAGE_H - MARGIN - 38,
    size: 11, font: boldFont, color: rgb(0.3, 0.3, 0.3),
  });
  
  // Sağ üst: Doküman bilgileri
  const rightX = PAGE_W - MARGIN - 180;
  const lines = [
    `Doküman no: ${spec.documentNo}`,
    `Revizyon no: ${spec.revisionNo}`,
    `Revizyon Tarihi: ${spec.revisionDate}`,
    `Yürürlülük Tarihi: ${spec.effectiveDate}`,
  ];
  lines.forEach((line, i) => {
    page.drawText(line, {
      x: rightX, y: PAGE_H - MARGIN - 5 - (i * 11),
      size: 8, font, color: rgb(0, 0, 0),
    });
  });
  
  // Header çizgisi
  page.drawLine({
    start: { x: MARGIN, y: PAGE_H - MARGIN - 60 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN - 60 },
    thickness: 0.5, color: rgb(0, 0, 0),
  });
  
  ctx.y = PAGE_H - MARGIN - 80;
}

function drawFooter(ctx: DrawContext) {
  const { page, font, boldFont, spec } = ctx;
  const footerY = 50;
  
  page.drawLine({
    start: { x: MARGIN, y: footerY + 30 },
    end: { x: PAGE_W - MARGIN, y: footerY + 30 },
    thickness: 0.5, color: rgb(0, 0, 0),
  });
  
  // Hazırlayan
  page.drawText('HAZIRLAYAN', {
    x: MARGIN, y: footerY + 18,
    size: 9, font: boldFont, color: rgb(0, 0, 0),
  });
  page.drawText(spec.preparedBy, {
    x: MARGIN, y: footerY + 6,
    size: 8, font, color: rgb(0.3, 0.3, 0.3),
  });
  
  // Onaylayan (orta)
  page.drawText('ONAYLAYAN', {
    x: PAGE_W / 2 - 30, y: footerY + 18,
    size: 9, font: boldFont, color: rgb(0, 0, 0),
  });
  page.drawText(spec.approvedBy, {
    x: PAGE_W / 2 - 30, y: footerY + 6,
    size: 8, font, color: rgb(0.3, 0.3, 0.3),
  });
  
  // Sayfa numarası
  page.drawText(`${ctx.pageNum}/${ctx.totalPages}`, {
    x: PAGE_W - MARGIN - 30, y: footerY + 12,
    size: 9, font, color: rgb(0, 0, 0),
  });
}

function drawSection(ctx: DrawContext, num: number, title: string): DrawContext {
  ctx = ensureSpace(ctx, 30);
  ctx.page.drawText(`${num}. ${title}`, {
    x: MARGIN, y: ctx.y,
    size: 11, font: ctx.boldFont, color: rgb(0, 0, 0),
  });
  ctx.y -= 18;
  return ctx;
}

function drawWrappedText(ctx: DrawContext, text: string, opts: { size?: number; bold?: boolean; indent?: number } = {}): DrawContext {
  const size = opts.size || 9;
  const useFont = opts.bold ? ctx.boldFont : ctx.font;
  const indent = opts.indent || 0;
  const maxWidth = CONTENT_W - indent;
  
  // Basit word-wrap
  const words = text.split(/\s+/);
  let line = '';
  
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const lineWidth = useFont.widthOfTextAtSize(testLine, size);
    
    if (lineWidth > maxWidth && line) {
      ctx = ensureSpace(ctx, size + 4);
      ctx.page.drawText(line, {
        x: MARGIN + indent, y: ctx.y,
        size, font: useFont, color: rgb(0, 0, 0),
      });
      ctx.y -= size + 3;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx = ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, {
      x: MARGIN + indent, y: ctx.y,
      size, font: useFont, color: rgb(0, 0, 0),
    });
    ctx.y -= size + 3;
  }
  return ctx;
}

function drawTable(ctx: DrawContext, headers: string[], rows: string[][], colWidths?: number[]): DrawContext {
  const totalW = CONTENT_W;
  const widths = colWidths || headers.map(() => totalW / headers.length);
  const rowH = 20;
  
  ctx = ensureSpace(ctx, rowH * (rows.length + 1) + 10);
  
  // Header bg
  ctx.page.drawRectangle({
    x: MARGIN, y: ctx.y - rowH + 2,
    width: totalW, height: rowH,
    color: rgb(0.9, 0.9, 0.9),
  });
  
  let xCursor = MARGIN;
  headers.forEach((h, i) => {
    ctx.page.drawText(h, {
      x: xCursor + 5, y: ctx.y - 12,
      size: 8, font: ctx.boldFont, color: rgb(0, 0, 0),
    });
    xCursor += widths[i];
  });
  
  // Header alt çizgi
  ctx.y -= rowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + totalW, y: ctx.y },
    thickness: 0.3, color: rgb(0, 0, 0),
  });
  
  // Rows
  rows.forEach(row => {
    xCursor = MARGIN;
    row.forEach((cell, i) => {
      ctx.page.drawText(String(cell || '-').slice(0, 50), {
        x: xCursor + 5, y: ctx.y - 12,
        size: 8, font: ctx.font, color: rgb(0, 0, 0),
      });
      xCursor += widths[i];
    });
    ctx.y -= rowH;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: MARGIN + totalW, y: ctx.y },
      thickness: 0.2, color: rgb(0.7, 0.7, 0.7),
    });
  });
  
  ctx.y -= 8;
  return ctx;
}

/**
 * Ana üretici fonksiyon
 */
export async function generateSpecificationPDF(spec: SpecificationData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  
  // Türkçe karakter destekli font yükle
  let font: PDFFont, boldFont: PDFFont;
  try {
    if (fs.existsSync(ROBOTO_REGULAR) && fs.existsSync(ROBOTO_BOLD)) {
      const regularBytes = fs.readFileSync(ROBOTO_REGULAR);
      const boldBytes = fs.readFileSync(ROBOTO_BOLD);
      font = await doc.embedFont(regularBytes);
      boldFont = await doc.embedFont(boldBytes);
    } else {
      // Fallback: Helvetica (Türkçe karakter olmayabilir)
      font = await doc.embedFont(StandardFonts.Helvetica);
      boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    }
  } catch {
    font = await doc.embedFont(StandardFonts.Helvetica);
    boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  
  let ctx: DrawContext = {
    doc, font, boldFont,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: 0, pageNum: 1, totalPages: 5, spec,
  };
  drawHeader(ctx);
  
  // ═══════════════════════════════════════════════════════════
  // KAPAK SAYFASI (genel hatlar)
  // ═══════════════════════════════════════════════════════════
  
  // Boş alan + büyük başlık
  ctx.y -= 100;
  ctx.page.drawText(spec.productNameUpper, {
    x: MARGIN, y: ctx.y,
    size: 28, font: boldFont, color: rgb(0, 0, 0),
  });
  ctx.y -= 35;
  ctx.page.drawText('ÜRÜN SPESİFİKASYONU', {
    x: MARGIN, y: ctx.y,
    size: 18, font: boldFont, color: rgb(0.3, 0.3, 0.3),
  });
  ctx.y -= 60;
  ctx = drawWrappedText(ctx, 
    `Bu doküman, ${spec.productName} ürününün fiziksel, kimyasal, biyolojik özelliklerini, alerjen ve katkı maddesi durumunu, ambalajlama, depolama ve sevkiyat koşullarını içermektedir.`,
    { size: 10 }
  );
  ctx.y -= 30;
  
  // Doküman özeti
  const summary = [
    ['Doküman no', spec.documentNo],
    ['Revizyon no', spec.revisionNo],
    ['Revizyon Tarihi', spec.revisionDate],
    ['Yürürlülük Tarihi', spec.effectiveDate],
  ];
  summary.forEach(([k, v]) => {
    ctx = ensureSpace(ctx, 14);
    ctx.page.drawText(String(k) + ':', { x: MARGIN, y: ctx.y, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    ctx.page.drawText(String(v ?? '-'), { x: MARGIN + 130, y: ctx.y, size: 10, font, color: rgb(0, 0, 0) });
    ctx.y -= 14;
  });
  
  drawFooter(ctx);
  
  // ═══════════════════════════════════════════════════════════
  // SAYFA 2: 1. KAPSAM + 2. MENŞE
  // ═══════════════════════════════════════════════════════════
  ctx = newPage(ctx);
  
  ctx = drawSection(ctx, 1, 'KAPSAM');
  ctx = drawWrappedText(ctx, 
    'Bu belgede ilgili ürün bilgilerine ve fiziksel, kimyasal ve biyolojik özelliklerine yer verilmiştir.',
    { size: 9 }
  );
  ctx.y -= 4;
  STANDARD_REGULATIONS.forEach(reg => {
    ctx = drawWrappedText(ctx, '• ' + reg, { size: 8, indent: 10 });
  });
  ctx.y -= 10;
  
  ctx = drawSection(ctx, 2, 'MENŞE BİLGİSİ');
  ctx = drawWrappedText(ctx, spec.origin || 'Türkiye', { size: 9 });
  
  drawFooter(ctx);
  
  // ═══════════════════════════════════════════════════════════
  // SAYFA 3: 3. FİZİKSEL/KİMYASAL + 4. BİYOLOJİK
  // ═══════════════════════════════════════════════════════════
  ctx = newPage(ctx);
  
  ctx = drawSection(ctx, 3, 'FİZİKSEL VE KİMYASAL ÖZELLİKLER');
  if (spec.physicalProperties && spec.physicalProperties.length > 0) {
    ctx = drawTable(ctx, ['Özellik', 'Değer'],
      spec.physicalProperties.map(p => [p.property, p.value]),
      [200, CONTENT_W - 200]
    );
  } else {
    ctx = drawWrappedText(ctx, '(Reçete onayında tamamlanacak)', { size: 8 });
  }
  ctx.y -= 10;
  
  ctx = drawSection(ctx, 4, 'BİYOLOJİK ÖZELLİKLER');
  ctx = drawWrappedText(ctx, 
    spec.productCategory 
      ? `"${spec.productCategory}" ve "Tüketime Hazır Gıda" (EK-3) kapsamındadır:`
      : '"Hafif Fırıncılık Ürünleri" (1.6.9.1) ve "Tüketime Hazır Gıda" (EK-3) kapsamındadır:',
    { size: 9 }
  );
  ctx.y -= 4;
  
  // Mikrobiyolojik kriterler tablosu
  if (spec.microbiology && spec.microbiology.length > 0) {
    ctx = drawTable(ctx, ['Mikroorganizma', 'n', 'c', 'm', 'M'],
      spec.microbiology.map(m => [m.organism, m.n, m.c, m.m, m.M]),
      [200, 50, 50, 90, 90]
    );
  } else {
    // Default: TGK Mikrobiyolojik Kriterler — Hafif Fırıncılık
    ctx = drawTable(ctx, ['Mikroorganizma', 'n', 'c', 'm', 'M'], [
      ['Salmonella spp.', '5', '0', '0/25g', '0/25g'],
      ['L. monocytogenes', '5', '0', '0/25g', '0/25g'],
      ['E. coli', '5', '0', '<10 cfu/g', '100 cfu/g'],
      ['Bacillus cereus', '5', '2', '10² cfu/g', '10⁴ cfu/g'],
    ], [200, 50, 50, 90, 90]);
  }
  
  ctx = drawWrappedText(ctx, 
    'n: Numune sayısı (analiz edilmesi gereken birim).  c: Kabul edilebilir maksimum numune sayısı (m-M arası).  m: Alt limit.  M: Üst limit.',
    { size: 7 }
  );
  ctx.y -= 4;
  ctx = drawWrappedText(ctx,
    'Önemli Not: Salmonella, L. monocytogenes ve E. coli için c=0 olması, bu mikroorganizmaların belirtilen limitlerin üzerinde (veya patojenler için 25g\'da) kesinlikle tespit edilmemesi gerektiğini zorunlu kılar.',
    { size: 7 }
  );
  
  drawFooter(ctx);
  
  // ═══════════════════════════════════════════════════════════
  // SAYFA 4: 5. AMBALAJLAMA + 6. DEPOLAMA/SEVKİYAT
  // ═══════════════════════════════════════════════════════════
  ctx = newPage(ctx);
  
  ctx = drawSection(ctx, 5, 'AMBALAJLAMA');
  ctx = drawWrappedText(ctx, 
    spec.packaging || 'Gıda ile temas eden plastik madde ve malzemelerle ambalajlanır. TGK Gıda ile Temas Eden Plastik Madde ve Malzemeler Yönetmeliği\'ne uygun.',
    { size: 9 }
  );
  ctx.y -= 12;
  
  ctx = drawSection(ctx, 6, 'DEPOLAMA / SEVKİYAT');
  
  ctx = drawWrappedText(ctx, '6.1 Koşullar', { size: 10, bold: true });
  ctx = drawWrappedText(ctx, `${spec.storageTemp || '-18°C'} muhafaza edilmelidir.`, { size: 9, indent: 10 });
  ctx.y -= 4;
  
  ctx = drawWrappedText(ctx, '6.2 Raf ömrü', { size: 10, bold: true });
  ctx = drawWrappedText(ctx, 
    spec.shelfLifeNote || `${spec.storageTemp || '-18°C'} kuru ve kokusuz ortamda ürünün raf ömrü ${spec.shelfLifeDays ? Math.round(spec.shelfLifeDays / 30) : 6} aydır.`,
    { size: 9, indent: 10 }
  );
  ctx.y -= 4;
  
  ctx = drawWrappedText(ctx, '6.3 Sevkiyat', { size: 10, bold: true });
  ctx = drawWrappedText(ctx, 
    spec.shippingNote || 'Soğuk zincir ile temiz, kokusuz, kapalı araçlarla sevk edilir.',
    { size: 9, indent: 10 }
  );
  ctx.y -= 4;
  
  ctx = drawWrappedText(ctx, '6.4 Hazırlama ve kullanım bilgisi', { size: 10, bold: true });
  ctx = drawWrappedText(ctx,
    spec.preparationInstructions || 'Tüketileceği gün +4°C dolapta 60 dk çözünmelidir. Çözündükten sonra +16°C ile +25°C arasındaki ortamda saklanmalı ve 48 saat içinde tüketilmelidir.',
    { size: 9, indent: 10 }
  );
  
  drawFooter(ctx);
  
  // ═══════════════════════════════════════════════════════════
  // SAYFA 5: 7. GMO, ALERJEN VE KATKI MADDESİ DURUMU
  // ═══════════════════════════════════════════════════════════
  ctx = newPage(ctx);
  
  ctx = drawSection(ctx, 7, 'GMO, ALERJEN VE KATKI MADDESİ DURUMU');
  
  ctx = drawWrappedText(ctx, 
    spec.gmoStatus || 'GMO içermemektedir.',
    { size: 10, bold: true }
  );
  ctx.y -= 6;
  
  // İçerdikleri alerjenler
  if (spec.containsAllergens && spec.containsAllergens.length > 0) {
    ctx = drawWrappedText(ctx, 
      `İçerir: ${spec.containsAllergens.join(', ')}.`,
      { size: 9 }
    );
  } else {
    ctx = drawWrappedText(ctx, 'Allerjen tespit edilmemiştir.', { size: 9 });
  }
  ctx.y -= 4;
  
  // Eser miktarda
  if (spec.mayContainAllergens && spec.mayContainAllergens.length > 0) {
    ctx = drawWrappedText(ctx, 
      `Eser miktarda ${spec.mayContainAllergens.join(', ')} içerebilir.`,
      { size: 9 }
    );
  }
  
  ctx.y -= 12;
  ctx = drawWrappedText(ctx, 
    '"07.2 Hafif Fırıncılık Ürünleri" ve "05.4 Süslemeler, Kaplamalar ve Dolgular" kategorileri altındaki yasal limitlerine göre tablo halinde sunulmuştur.',
    { size: 8 }
  );
  
  drawFooter(ctx);
  
  // PDF üret
  const pdfBytes = await doc.save();
  return pdfBytes;
}

/**
 * Reçete kaydından SpecificationData üret (otomatik mapping)
 */
export function recipeToSpec(recipe: any, options: {
  documentNo?: string;
  revisionNo?: string;
  effectiveDate?: string;
} = {}): SpecificationData {
  const allergens = Array.isArray(recipe.allergens) ? recipe.allergens : [];
  const mayContain = Array.isArray(recipe.mayContainAllergens) ? recipe.mayContainAllergens : [];
  
  return {
    recipeId: recipe.id,
    recipeCode: String(recipe.code ?? ''),
    productName: String(recipe.name ?? ''),
    productNameUpper: String(recipe.name ?? '').toUpperCase().replace(/İ/g, 'İ'),
    documentNo: String(options.documentNo || `SD-${String(recipe.id).padStart(2, '0')}`),
    revisionNo: String(options.revisionNo ?? recipe.version ?? '00'),  // BUG FIX: recipe.version integer olabilir
    revisionDate: '-',
    effectiveDate: String(options.effectiveDate || (recipe.gramajApprovedAt
      ? new Date(recipe.gramajApprovedAt).toLocaleDateString('tr-TR')
      : new Date().toLocaleDateString('tr-TR'))),
    preparedBy: 'Yönetim Temsilcisi',
    approvedBy: 'Genel Müdür',
    origin: 'Türkiye',
    productCategory: recipe.category === 'donut' ? 'Hafif Fırıncılık Ürünleri (1.6.9.1)' :
                     recipe.category === 'cookie' ? 'Hafif Fırıncılık Ürünleri (1.6.9.1)' :
                     'Hafif Fırıncılık Ürünleri (1.6.9.1)',
    storageTemp: '-18°C',
    shelfLifeDays: 180,
    containsAllergens: allergens.map((a: any) => typeof a === 'string' ? a : String(a.name || a.label || '')),
    mayContainAllergens: mayContain.map((a: any) => typeof a === 'string' ? a : String(a.name || a.label || '')),
    gmoStatus: 'GMO içermemektedir.',
    physicalProperties: recipe.expectedUnitWeight ? [
      { property: 'Net miktar', value: `${recipe.expectedUnitWeight} g` },
      { property: 'Batch çıktı', value: `${recipe.baseBatchOutput ?? '-'} ${recipe.outputUnit || 'adet'}` },
    ] : undefined,
  };
}
