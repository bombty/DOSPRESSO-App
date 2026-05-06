/**
 * Sprint 7 (5 May 2026) - TGK 2017/2284 Etiket PDF Üreteci
 * 
 * Türkiye Gıda Kodeksi - Gıda Etiketleme ve Tüketicileri
 * Bilgilendirme Yönetmeliği uyumlu PDF etiket
 * 
 * Zorunlu alanlar (TGK Madde 9):
 *   1. Gıda adı
 *   2. İçindekiler listesi (alerjenler kalın+altçizgi)
 *   3. Net miktar
 *   4. Son kullanma / tavsiye edilen tüketim tarihi
 *   5. Saklama koşulları
 *   6. Üretici/ithalatçı bilgisi
 *   7. Menşei
 *   8. Besin değeri tablosu (TGK Ek-13)
 *   9. Çapraz bulaşma uyarısı
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LabelData {
  productName: string;
  ingredientsText: string;
  allergenWarning?: string;
  crossContaminationWarning?: string;
  netQuantityG?: number;
  servingSizeG?: number;
  storageConditions?: string;
  shelfLifeDays?: number;
  bestBeforeDate?: string;
  manufacturerName?: string;
  manufacturerAddress?: string;
  countryOfOrigin?: string;
  // Besin değerleri (100g başına)
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  carbohydrate?: number;
  sugar?: number;
  protein?: number;
  salt?: number;
  fiber?: number;
  // Versiyon
  version?: number;
  approvedBy?: string;
  approvedAt?: string;
  // Sprint 14 Phase 9 (7 May 2026): TGK m.9/k Lot/Parti + üretim tarihi
  lotNumber?: string;
  productionDate?: string;
}

// TGK Madde 9 - 14 büyük alerjen
const ALLERGENS_TR = [
  'gluten', 'kabuklular', 'yumurta', 'balık', 'yer fıstığı', 
  'soya', 'süt', 'sert kabuklu yemiş', 'kereviz', 'hardal',
  'susam', 'sülfit', 'yaban fasulyesi', 'yumuşakça'
];

/**
 * Alerjenleri içerikten tespit et ve KALIN yap
 */
function highlightAllergens(text: string): { text: string; spans: Array<{start: number; end: number}> } {
  const spans: Array<{start: number; end: number}> = [];
  const lowerText = text.toLowerCase();
  
  for (const allergen of ALLERGENS_TR) {
    let idx = 0;
    while ((idx = lowerText.indexOf(allergen.toLowerCase(), idx)) !== -1) {
      spans.push({ start: idx, end: idx + allergen.length });
      idx += allergen.length;
    }
  }
  
  return { text, spans };
}

export function generateTGKLabelPDF(data: LabelData): jsPDF {
  // A6 boyut (105 × 148 mm) — etiket için ideal
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [105, 148],
  });

  let y = 8;
  const margin = 6;
  const pageWidth = 105;
  const contentWidth = pageWidth - 2 * margin;

  // ═══ BAŞLIK: ÜRÜN ADI ═══
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(192, 57, 43); // DOSPRESSO kırmızı
  const titleLines = doc.splitTextToSize(data.productName, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 5 + 1;

  // Çizgi
  doc.setDrawColor(192, 57, 43);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // ═══ İÇİNDEKİLER ═══
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text('İÇİNDEKİLER:', margin, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const ingredientsText = data.ingredientsText || 'İçindekiler tanımlanmamış.';
  const ingredientLines = doc.splitTextToSize(ingredientsText, contentWidth);
  doc.text(ingredientLines, margin, y);
  y += ingredientLines.length * 3 + 1;

  // ═══ ALERJEN UYARISI ═══
  if (data.allergenWarning) {
    doc.setFillColor(255, 243, 224); // Açık turuncu
    const allergenLines = doc.splitTextToSize(`⚠ ALERJEN: ${data.allergenWarning}`, contentWidth - 4);
    const boxHeight = allergenLines.length * 3 + 4;
    doc.rect(margin, y, contentWidth, boxHeight, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(192, 57, 43);
    doc.text(allergenLines, margin + 2, y + 3);
    y += boxHeight + 2;
  }

  if (data.crossContaminationWarning) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(80);
    const crossLines = doc.splitTextToSize(`* Çapraz bulaşma: ${data.crossContaminationWarning}`, contentWidth);
    doc.text(crossLines, margin, y);
    y += crossLines.length * 2.5 + 2;
  }

  // ═══ BESİN DEĞERLERİ TABLOSU (TGK Ek-13) ═══
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text('BESİN DEĞERLERİ (100g)', margin, y);
  y += 1;

  const tableData: Array<[string, string, string]> = [];
  if (data.energyKcal !== undefined && data.energyKcal !== null) {
    const kj = data.energyKj || (Number(data.energyKcal) * 4.184);
    tableData.push(['Enerji', `${Number(data.energyKcal).toFixed(0)} kcal`, `${Number(kj).toFixed(0)} kJ`]);
  }
  if (data.fat !== undefined && data.fat !== null) tableData.push(['Yağ', `${Number(data.fat).toFixed(1)} g`, '']);
  if (data.saturatedFat !== undefined && data.saturatedFat !== null) tableData.push(['  doymuş yağ', `${Number(data.saturatedFat).toFixed(1)} g`, '']);
  if (data.carbohydrate !== undefined && data.carbohydrate !== null) tableData.push(['Karbonhidrat', `${Number(data.carbohydrate).toFixed(1)} g`, '']);
  if (data.sugar !== undefined && data.sugar !== null) tableData.push(['  şeker', `${Number(data.sugar).toFixed(1)} g`, '']);
  if (data.fiber !== undefined && data.fiber !== null) tableData.push(['Lif', `${Number(data.fiber).toFixed(1)} g`, '']);
  if (data.protein !== undefined && data.protein !== null) tableData.push(['Protein', `${Number(data.protein).toFixed(1)} g`, '']);
  if (data.salt !== undefined && data.salt !== null) tableData.push(['Tuz', `${Number(data.salt).toFixed(2)} g`, '']);

  autoTable(doc, {
    startY: y + 1,
    head: [],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 6.5, cellPadding: 0.8, lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 22, halign: 'right', textColor: [120, 120, 120] },
    },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ═══ NET MIKTAR / SAKLAMA ═══
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0);
  
  if (data.netQuantityG) {
    doc.text(`Net: ${data.netQuantityG} g`, margin, y);
    y += 3;
  }
  if (data.storageConditions) {
    const stoLines = doc.splitTextToSize(`Saklama: ${data.storageConditions}`, contentWidth);
    doc.text(stoLines, margin, y);
    y += stoLines.length * 2.5 + 1;
  }
  if (data.shelfLifeDays) {
    doc.text(`Raf ömrü: ${data.shelfLifeDays} gün`, margin, y);
    y += 3;
  }
  if (data.bestBeforeDate) {
    doc.text(`SKT: ${data.bestBeforeDate}`, margin, y);
    y += 3;
  }

  // ═══ FOOTER: Üretici ═══
  doc.setLineWidth(0.3);
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, 135, pageWidth - margin, 135);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(25, 40, 56); // DOSPRESSO navy
  doc.text(data.manufacturerName || 'DOSPRESSO Coffee & Donut', margin, 138);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(80);
  doc.text(data.manufacturerAddress || 'Antalya, Türkiye', margin, 141);
  if (data.countryOfOrigin) {
    doc.text(`Menşei: ${data.countryOfOrigin}`, margin, 143.5);
  }

  // Sprint 14 Phase 9 (7 May 2026): Lot/Parti + Üretim tarihi (TGK m.9/k zorunlu)
  if (data.lotNumber || data.productionDate) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    let lotY = 146;
    if (data.lotNumber) {
      doc.text(`Lot/Parti: ${data.lotNumber}`, margin, lotY);
      lotY += 2.5;
    }
    if (data.productionDate) {
      const prodDate = new Date(data.productionDate);
      doc.text(`Üretim: ${prodDate.toLocaleDateString('tr-TR')}`, margin, lotY);
    }
    doc.setFont('helvetica', 'normal');
  }

  // Versiyon ve onay
  if (data.version || data.approvedBy) {
    const verText = `v${data.version || 1} ${data.approvedBy ? '✓ ' + data.approvedBy : ''}`;
    doc.text(verText, pageWidth - margin, 143.5, { align: 'right' });
  }

  return doc;
}

/**
 * PDF indirme yardımcı
 */
export function downloadTGKLabel(data: LabelData) {
  const doc = generateTGKLabelPDF(data);
  const filename = `etiket_${data.productName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_v${data.version || 1}.pdf`;
  doc.save(filename);
}

/**
 * PDF blob olarak döndür (preview için)
 */
export function getTGKLabelBlob(data: LabelData): Blob {
  const doc = generateTGKLabelPDF(data);
  return doc.output('blob');
}

/**
 * Base64 string olarak döndür (API için)
 */
export function getTGKLabelBase64(data: LabelData): string {
  const doc = generateTGKLabelPDF(data);
  return doc.output('datauristring');
}
