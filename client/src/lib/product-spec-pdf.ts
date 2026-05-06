/**
 * DOSPRESSO Ürün Spesifikasyonu PDF Üretici
 *
 * Aslan 7 May 2026 — Pages dosyalarındaki resmi format sisteme entegre edildi.
 * Format: 11 bölümlük resmi spesifikasyon belgesi (5 sayfa).
 *
 * Örnek dosyalar incelendi:
 *   - SD-01 Almond Donut, SD-02 Caramella, SD-03 Black & White, SD-04 Cheesecake,
 *   - SD-05 Black Jack, SD-06 Chococino, SD-07 Classic, SD-08 Elmo Monster,
 *   - SD-09 Cocoblack, SD-10 Green Mile, SD-11 Cookie Monster, SD-12 Happy Face,
 *   - SD-13 Hypnos, SD-14 Nut Corner, SD-16 Nut on White, SD-17 Macchiato,
 *   - SD-19 Pink Lady, SD-21 Rainbow, SD-22 Unicorn, SD-23 Rihanna
 *
 * Belge yapısı:
 *   1. KAPSAM — TGK referans yönetmelik listesi (12 yönetmelik)
 *   2. MENŞE BİLGİSİ
 *   3. FİZİKSEL VE KİMYASAL ÖZELLİKLER
 *   4. BİYOLOJİK ÖZELLİKLER (TGK Mikrobiyolojik Kriterler)
 *   5. AMBALAJLAMA
 *   6. DEPOLAMA/SEVKİYAT (Koşullar, Raf ömrü, Sevkiyat, Hazırlama)
 *   7. GMO, ALERJEN VE KATKI MADDESİ DURUMU
 *   8. TÜKETİCİ GRUBU
 *   9. ETİKETTE BULUNAN BİLGİLER
 *   10. ENERJİ BESİN DEĞERİ HESAPLAMASI
 *   11. GÖRSEL KULLANIMI
 *
 * Header: ÜRÜN ADI, ÜRÜN SPESİFİKASYONU, Doküman no, Revizyon no, Tarihler
 * Footer: HAZIRLAYAN (Yönetim Temsilcisi), ONAYLAYAN (Genel Müdür), Sayfa N/M
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ProductSpecData {
  // Header
  productName: string;            // "ALMOND DONUT"
  documentNo: string;             // "SD-01"
  revisionNo: string;             // "00"
  revisionDate: string;           // "-"
  effectiveDate: string;          // "01.02.2026"

  // 2. Menşe
  origin?: string;

  // 3. Fiziksel/Kimyasal özellikler
  physicalChemicalProperties?: Array<{ property: string; value: string; method?: string }>;

  // 4. Biyolojik özellikler (TGK Mikrobiyolojik Kriterler)
  biologicalProperties?: Array<{ microorganism: string; n: string; c: string; m: string; M: string }>;
  productCategory?: string;       // "Hafif Fırıncılık Ürünleri (1.6.9.1)"

  // 5. Ambalajlama
  packaging?: string;
  packagingMaterial?: string;
  netWeight?: string;             // "70 g/adet"

  // 6. Depolama/Sevkiyat
  storageConditions: string;      // "-18 °C"
  shelfLife: string;              // "6 ay"
  shipping: string;               // "Soğuk zincir, kapalı araçlar"
  preparationInfo?: string;       // "+4°C 60 dk çöz, +16-25°C 48 saat tüket"

  // 7. GMO/Alerjen/Katkı
  gmoStatus: string;              // "GMO içermemektedir"
  allergens: string[];            // ["Buğday unu (gluten)", "süt", "yumurta", "soya", "badem"]
  crossContamination?: string[];  // ["yer fıstığı", "susam", "sülfit"]
  foodAdditives?: Array<{ category: string; additive: string; eCode: string; limit: string }>;

  // 8. Tüketici grubu
  consumerWarning?: string;

  // 9. Etiket bilgileri
  labelInfo?: string;
  thawWarning?: boolean;          // "Çözündürüldükten sonra tekrar dondurulmaz"

  // 10. Besin değerleri (zaten reçeteden geliyor)
  nutritionFacts?: {
    energyKcal: number;
    energyKj?: number;
    fat: number;
    saturatedFat: number;
    carbohydrate: number;
    sugar: number;
    protein: number;
    salt: number;
    fiber?: number;
  };
  servingSizeG?: number;          // 70

  // 11. Görsel/ambalaj kuralları
  visualRules?: string;

  // Onay
  preparedBy?: string;            // "Yönetim Temsilcisi"
  approvedBy?: string;            // "Genel Müdür"

  generatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════
// TGK Yönetmelik Referansları (sabit liste — Aslan'ın belgesindeki)
// ═══════════════════════════════════════════════════════════════════
const TGK_REGULATIONS = [
  "Türk Gıda Kodeksi Mikrobiyolojik Kriterler Yönetmeliği",
  "Türk Gıda Kodeksi Buğday Unu Tebliği",
  "Türk Gıda Kodeksi Yumurta Tebliği",
  "Türk Gıda Kodeksi Kakao ve Çikolata Ürünleri Tebliği",
  "Türk Gıda Kodeksi Gıda ile Temas Eden Plastik Madde ve Malzemeler Yönetmeliği",
  "Türk Gıda Kodeksi Gıda Etiketleme ve Tüketicileri Bilgilendirme Yönetmeliği",
  "Türk Gıda Kodeksi Gıda Katkı Maddeleri Yönetmeliği",
  "Türk Gıda Kodeksi Aroma Vericiler ve Aroma Verme Özelliği Taşıyan Gıda Bileşenleri Yönetmeliği",
  "Türk Gıda Kodeksi Bulaşanlar Yönetmeliği",
  "Türk Gıda Kodeksi Şeker Tebliği",
  "Türk Gıda Kodeksi Pestisitlerin Maksimum Kalıntı Limitleri Yönetmeliği",
  "Sanayi ve Teknoloji Bakanlığı'nın kontrolleri kapsamındaki Hazır Ambalajlı Mamullerin Ağırlık ve Hacim Esasına göre Net Miktar Tespitine Dair Yönetmeliği",
  "Türk Gıda Kodeksi Gıda Enzimleri Yönetmeliği",
];

// TGK Mikrobiyolojik Kriterler — Hafif Fırıncılık (1.6.9.1) varsayılanları
const DEFAULT_BIOLOGICAL_LIMITS = [
  { microorganism: "Salmonella", n: "5", c: "0", m: "Yok / 25g", M: "Yok / 25g" },
  { microorganism: "L. monocytogenes", n: "5", c: "0", m: "Yok / 25g", M: "Yok / 25g" },
  { microorganism: "E. coli", n: "5", c: "2", m: "10 cfu/g", M: "100 cfu/g" },
  { microorganism: "B. cereus", n: "5", c: "1", m: "100 cfu/g", M: "1000 cfu/g" },
  { microorganism: "Koliform", n: "5", c: "2", m: "10 cfu/g", M: "100 cfu/g" },
  { microorganism: "Maya/Küf", n: "5", c: "2", m: "100 cfu/g", M: "10000 cfu/g" },
];

export function generateProductSpecPDF(data: ProductSpecData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;
  let currentPage = 1;
  const totalPages = 5; // Sabit (Aslan'ın belgesindeki gibi)

  // Header her sayfa için
  const drawHeader = () => {
    // DOSPRESSO logosu yerine isim placeholder (sol üst)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DOSPRESSO', margin, 12);

    // Ürün adı (orta üst)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.productName.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

    // Alt başlık
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('ÜRÜN SPESİFİKASYONU', pageWidth / 2, 17, { align: 'center' });

    // Sağ üst — döküman bilgileri
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const docInfo = [
      `Doküman no: ${data.documentNo}`,
      `Revizyon no: ${data.revisionNo}`,
      `Revizyon Tarihi: ${data.revisionDate}`,
      `Yürürlülük Tarihi: ${data.effectiveDate}`,
    ];
    docInfo.forEach((line, i) => {
      doc.text(line, pageWidth - margin, 8 + i * 3.5, { align: 'right' });
    });

    // Header alt çizgi
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, 24, pageWidth - margin, 24);

    y = 30;
  };

  const drawFooter = (page: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const footerY = pageHeight - 12;

    doc.text('HAZIRLAYAN', margin + 20, footerY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy || 'Yönetim Temsilcisi', margin + 20, footerY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.text('ONAYLAYAN', pageWidth - margin - 35, footerY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.approvedBy || 'Genel Müdür', pageWidth - margin - 35, footerY + 3.5);

    // Sayfa numarası
    doc.setFont('helvetica', 'normal');
    doc.text(`${page}/${totalPages}`, pageWidth / 2, footerY + 3.5, { align: 'center' });

    // Footer üst çizgi
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);
  };

  const newPage = () => {
    drawFooter(currentPage);
    doc.addPage();
    currentPage++;
    drawHeader();
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 25) {
      newPage();
    }
  };

  const sectionTitle = (title: string) => {
    checkPageBreak(15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 6;
  };

  const bodyText = (text: string, options?: { bold?: boolean; small?: boolean }) => {
    checkPageBreak(8);
    doc.setFontSize(options?.small ? 7 : 8.5);
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += options?.small ? 3 : 4;
    });
    y += 1;
  };

  // ═══════════════════════════════════════════════════════════════
  // SAYFA 1 — KAPAK + 1. KAPSAM
  // ═══════════════════════════════════════════════════════════════
  drawHeader();

  // Boş alan kapak için
  y = 80;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.productName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('ÜRÜN SPESİFİKASYONU', pageWidth / 2, y, { align: 'center' });
  y += 30;

  doc.setFontSize(10);
  const coverInfo = [
    `Doküman no: ${data.documentNo}`,
    `Revizyon no: ${data.revisionNo}`,
    `Revizyon Tarihi: ${data.revisionDate}`,
    `Yürürlülük Tarihi: ${data.effectiveDate}`,
  ];
  coverInfo.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 6;
  });

  // Sayfa 2
  newPage();

  // 1. KAPSAM
  sectionTitle('1. KAPSAM');
  bodyText('Bu belgede ilgili ürün bilgilerine ve fiziksel, kimyasal ve biyolojik özelliklerine yer verilmiştir.');
  y += 2;
  TGK_REGULATIONS.forEach(reg => {
    bodyText(`• ${reg}'ne göre hazırlanmıştır.`);
  });

  // 2. MENŞE BİLGİSİ
  y += 3;
  sectionTitle('2. MENŞE BİLGİSİ');
  bodyText(data.origin || 'Türkiye Cumhuriyeti — DOSPRESSO Fabrika');

  // 3. FİZİKSEL VE KİMYASAL ÖZELLİKLER
  y += 3;
  sectionTitle('3. FİZİKSEL VE KİMYASAL ÖZELLİKLER');
  if (data.physicalChemicalProperties && data.physicalChemicalProperties.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Özellik', 'Değer', 'Yöntem']],
      body: data.physicalChemicalProperties.map(p => [p.property, p.value, p.method || '-']),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  } else {
    bodyText('Renk, koku, tat ve görünüş ürüne özgüdür. Ürün taze ve doğal halinde fiziksel-kimyasal özelliklere uygun olmalıdır.');
  }

  // Sayfa 3 — 4. BİYOLOJİK ÖZELLİKLER
  newPage();
  sectionTitle('4. BİYOLOJİK ÖZELLİKLER');
  bodyText(`Ürün "${data.productCategory || 'Hafif Fırıncılık Ürünleri (1.6.9.1) ve Tüketime Hazır Gıda (EK-3)'}" kapsamındadır.`);
  y += 2;
  const bioData = data.biologicalProperties && data.biologicalProperties.length > 0 ? data.biologicalProperties : DEFAULT_BIOLOGICAL_LIMITS;
  autoTable(doc, {
    startY: y,
    head: [['Mikroorganizma', 'n', 'c', 'm', 'M']],
    body: bioData.map(b => [b.microorganism, b.n, b.c, b.m, b.M]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  bodyText('• n (Numune Sayısı): Partiyi temsil eden ve analize alınması gereken birim sayısıdır.', { small: true });
  bodyText('• c (Kabul Edilebilir Sayı): Sonuçların m ile M arasında olmasına izin verilen maksimum numune sayısı.', { small: true });
  bodyText('• m (Alt Limit): Kabul edilebilir mikroorganizma sayısı.', { small: true });
  bodyText('• M (Üst Limit): Kabul edilemez en yüksek değer.', { small: true });
  y += 2;
  bodyText('Önemli Not: Salmonella, L. monocytogenes ve E. coli için c=0 olması, bu mikroorganizmaların 25g\'da kesinlikle tespit edilmemesi gerektiğini zorunlu kılar.', { small: true });

  // 5. AMBALAJLAMA
  y += 3;
  sectionTitle('5. AMBALAJLAMA');
  if (data.packaging) bodyText(data.packaging);
  if (data.packagingMaterial) bodyText(`Ambalaj malzemesi: ${data.packagingMaterial}`);
  if (data.netWeight) bodyText(`Net miktar: ${data.netWeight}`);
  if (!data.packaging && !data.packagingMaterial && !data.netWeight) {
    bodyText('Ürünler gıda ile temas eden plastik veya karton ambalajlarda paketlenir. Net miktar her birim için belirtilir.');
  }

  // Sayfa 4 — 6, 7, 8, 9
  newPage();

  // 6. DEPOLAMA/SEVKİYAT
  sectionTitle('6. DEPOLAMA/SEVKİYAT');
  bodyText('6.1 Koşullar', { bold: true });
  bodyText(data.storageConditions);
  bodyText('6.2 Raf ömrü', { bold: true });
  bodyText(`${data.storageConditions} kuru ve kokusuz ortamda ürünün raf ömrü ${data.shelfLife}.`);
  bodyText('6.3 Sevkiyat', { bold: true });
  bodyText(data.shipping);
  bodyText('6.4 Hazırlama ve kullanım bilgisi', { bold: true });
  if (data.preparationInfo) {
    bodyText(data.preparationInfo);
  } else {
    bodyText('Tüketileceği gün +4 °C dolapta 60 dk çözünmelidir. Çözündükten sonra +16 °C ile +25 °C arasındaki ortamda saklanmalı ve 48 saat içinde tüketilmelidir.');
  }

  // 7. GMO, ALERJEN VE KATKI MADDESİ
  y += 3;
  sectionTitle('7. GMO, ALERJEN VE KATKI MADDESİ DURUMU');
  bodyText(data.gmoStatus);
  if (data.allergens && data.allergens.length > 0) {
    bodyText(`İçerir: ${data.allergens.join(', ')}.`);
  }
  if (data.crossContamination && data.crossContamination.length > 0) {
    bodyText(`Eser miktarda ${data.crossContamination.join(', ')} içerebilir.`);
  }

  if (data.foodAdditives && data.foodAdditives.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [['Kategori', 'Katkı', 'E-Kodu', 'Limit']],
      body: data.foodAdditives.map(a => [a.category, a.additive, a.eCode, a.limit]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // 8. TÜKETİCİ GRUBU
  y += 2;
  sectionTitle('8. TÜKETİCİ GRUBU');
  if (data.consumerWarning) {
    bodyText(data.consumerWarning);
  } else if (data.allergens && data.allergens.length > 0) {
    bodyText(`${data.allergens.join(', ')} alerjisi olan tüketici grubu tüketmemelidir.`);
  }

  // 9. ETİKETTE BULUNAN BİLGİLER
  y += 2;
  sectionTitle('9. ETİKETTE BULUNAN BİLGİLER');
  bodyText('Etiket üzerinde ürünün ismi, içindekiler, menşe, depolama koşulları, hazırlama ve kullanım bilgisi, son tüketim tarihi (STT) ve parti numarası ile net ağırlık belirtilir.');
  if (data.thawWarning !== false) {
    bodyText('"Çözündürüldükten sonra tekrar dondurulmaz." ifadesi yer alır.');
  }
  if (data.labelInfo) bodyText(data.labelInfo);

  // Sayfa 5 — 10, 11
  newPage();

  // 10. ENERJİ BESİN DEĞERİ HESAPLAMASI
  sectionTitle('10. ENERJİ BESİN DEĞERİ HESAPLAMASI');
  bodyText('Beslenme bildirim tablosu hazırlanırken bileşenlerin kendi beslenme bildirim tabloları, ürün içindeki yüzdeleriyle çarpılmış; beslenme bildirimi olmayanların değerleri ise genel kabul görmüş veri tabanlarından elde edilmiş ve hesaplama yapılmıştır.', { small: true });
  y += 2;

  if (data.nutritionFacts) {
    const nf = data.nutritionFacts;
    const sg = data.servingSizeG || 100;
    const factor = sg / 100;
    autoTable(doc, {
      startY: y,
      head: [['Besin Değeri', '100g başına', `Porsiyon (${sg}g) başına`]],
      body: [
        ['Enerji', `${Math.round(nf.energyKcal)} kcal`, `${Math.round(nf.energyKcal * factor)} kcal`],
        ['Yağ', `${nf.fat.toFixed(1)} g`, `${(nf.fat * factor).toFixed(1)} g`],
        ['  Doymuş yağ', `${nf.saturatedFat.toFixed(1)} g`, `${(nf.saturatedFat * factor).toFixed(1)} g`],
        ['Karbonhidrat', `${nf.carbohydrate.toFixed(1)} g`, `${(nf.carbohydrate * factor).toFixed(1)} g`],
        ['  Şeker', `${nf.sugar.toFixed(1)} g`, `${(nf.sugar * factor).toFixed(1)} g`],
        ['Protein', `${nf.protein.toFixed(1)} g`, `${(nf.protein * factor).toFixed(1)} g`],
        ['Tuz', `${nf.salt.toFixed(2)} g`, `${(nf.salt * factor).toFixed(2)} g`],
        ...(nf.fiber !== undefined ? [['Lif', `${nf.fiber.toFixed(1)} g`, `${(nf.fiber * factor).toFixed(1)} g`]] : []),
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  bodyText('Enerji değerinin hesaplanmasında kullanılan çevrim faktörleri:', { bold: true, small: true });
  bodyText('  • Karbonhidrat (polioller hariç): 17 kJ/g — 4 kcal/g', { small: true });
  bodyText('  • Protein: 17 kJ/g — 4 kcal/g', { small: true });
  bodyText('  • Yağ: 37 kJ/g — 9 kcal/g', { small: true });
  bodyText('  • Lif: 8 kJ/g — 2 kcal/g', { small: true });
  bodyText('  • Polioller (eritritol hariç): 10 kJ/g — 2,4 kcal/g', { small: true });
  y += 1;
  bodyText('Tuz miktarı: Toplam Sodyum (mg) × 2,5 (sofra tuzu, katkı maddeleri ve doğal sodyum dahil).', { small: true });
  bodyText('Yuvarlama kuralları: Enerji en yakın 1 kJ/kcal, makro besinler (10g+) için en yakın 1 g, tuz için 0,1 g.', { small: true });

  // 11. GÖRSEL KULLANIMI
  y += 3;
  sectionTitle('11. GÖRSEL KULLANIMI');
  if (data.visualRules) {
    bodyText(data.visualRules);
  } else {
    bodyText('Gıda adını oluşturan kelimeler ambalaj üzerinde aynı büyüklükte, aynı yazı tipinde ve stilde yer almalıdır. Aroma ve kategori ifadeleri açıkça belirtilir.');
  }

  // Son footer
  drawFooter(currentPage);

  return doc;
}

/**
 * Yardımcı: Reçete verisinden spesifikasyon datası türet
 */
export function recipeToSpecData(recipe: any): ProductSpecData {
  // Alerjen array → Türkçe etiketler
  const allergenLabels: Record<string, string> = {
    'gluten': 'Buğday unu (gluten)',
    'sut': 'süt ve süt ürünleri',
    'süt': 'süt ve süt ürünleri',
    'yumurta': 'yumurta',
    'soya': 'soya',
    'fındık': 'sert kabuklu meyveler',
    'sert_kabuklu': 'sert kabuklu meyveler',
    'yer fıstığı': 'yer fıstığı',
    'sülfit': 'sülfit',
    'susam': 'susam',
  };

  const allergens = Array.isArray(recipe.allergens)
    ? recipe.allergens.map((a: any) => {
        const key = typeof a === 'string' ? a : (a.name || a.label || '');
        return allergenLabels[key.toLowerCase()] || key;
      }).filter(Boolean)
    : [];

  const cross = Array.isArray(recipe.mayContainAllergens)
    ? recipe.mayContainAllergens.map((a: string) => allergenLabels[a.toLowerCase()] || a)
    : [];

  return {
    productName: recipe.name || 'Bilinmeyen Ürün',
    documentNo: recipe.specCode || `SD-${String(recipe.id).padStart(2, '0')}`,
    revisionNo: recipe.specRevision || '00',
    revisionDate: recipe.specRevisionDate || '-',
    effectiveDate: recipe.specEffectiveDate || new Date().toLocaleDateString('tr-TR'),

    origin: 'Türkiye Cumhuriyeti — DOSPRESSO Fabrika (Antalya)',

    storageConditions: recipe.storageConditions || '-18 °C muhafaza edilmelidir.',
    shelfLife: recipe.shelfLife || '6 aydır',
    shipping: recipe.shipping || 'Soğuk zincir ile temiz, kokusuz, kapalı araçlarla sevk edilir.',
    preparationInfo: recipe.preparationInfo,

    netWeight: recipe.expectedUnitWeight ? `${recipe.expectedUnitWeight} g/adet` : undefined,

    gmoStatus: 'GMO içermemektedir.',
    allergens,
    crossContamination: cross,

    productCategory: recipe.productCategory || 'Hafif Fırıncılık Ürünleri (1.6.9.1) ve Tüketime Hazır Gıda (EK-3)',

    nutritionFacts: recipe.nutritionFacts ? {
      energyKcal: parseFloat(recipe.nutritionFacts.energy_kcal) || 0,
      fat: parseFloat(recipe.nutritionFacts.fat_g) || 0,
      saturatedFat: parseFloat(recipe.nutritionFacts.saturated_fat_g) || 0,
      carbohydrate: parseFloat(recipe.nutritionFacts.carbohydrate_g) || 0,
      sugar: parseFloat(recipe.nutritionFacts.sugar_g) || 0,
      protein: parseFloat(recipe.nutritionFacts.protein_g) || 0,
      salt: parseFloat(recipe.nutritionFacts.salt_g) || 0,
      fiber: recipe.nutritionFacts.fiber_g ? parseFloat(recipe.nutritionFacts.fiber_g) : undefined,
    } : undefined,
    servingSizeG: recipe.expectedUnitWeight ? Number(recipe.expectedUnitWeight) : 100,

    generatedAt: new Date(),
  };
}

/**
 * Reçeteden direkt PDF indir
 */
export function downloadProductSpecPDF(recipe: any) {
  const data = recipeToSpecData(recipe);
  const pdf = generateProductSpecPDF(data);
  const filename = `${data.documentNo}_${data.productName.replace(/[^a-zA-Z0-9-]/g, '_')}_Spesifikasyonu.pdf`;
  pdf.save(filename);
}
