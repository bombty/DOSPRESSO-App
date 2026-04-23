import jsPDF from "jspdf";
import { sanitizeText, loadLogo } from "./pdfHelper";

export interface EtiketNutrition {
  energy_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
  carbohydrate_g: number;
  sugar_g: number;
  fiber_g: number;
  protein_g: number;
  salt_g: number;
}

export interface EtiketPDFOptions {
  name: string;
  code: string;
  category?: string | null;
  expectedUnitWeight?: number | null;
  per100g: EtiketNutrition;
  perPortion?: EtiketNutrition | null;
  allergens: string[];
  ingredients: Array<{ name: string; matched: boolean; allergens: string[] }>;
  grammageApproved: boolean;
  grammageApprovalUserName?: string | null;
  grammageApprovalDate?: string | null;
  isDraft?: boolean;
  draftReason?: string;
}

const COLORS = {
  navy: { r: 30, g: 58, b: 95 },
  brown: { r: 139, g: 43, b: 35 },
  darkGray: { r: 44, g: 62, b: 80 },
  gray: { r: 100, g: 100, b: 100 },
  lightGray: { r: 200, g: 200, b: 200 },
  approved: { r: 22, g: 101, b: 52 },
  draft: { r: 180, g: 83, b: 9 },
  white: { r: 255, g: 255, b: 255 },
};

const NUTRITION_LABELS: Array<[keyof EtiketNutrition, string, string]> = [
  ["energy_kcal", "Enerji", "kcal"],
  ["fat_g", "Yağ", "g"],
  ["saturated_fat_g", "  Doymuş yağ", "g"],
  ["carbohydrate_g", "Karbonhidrat", "g"],
  ["sugar_g", "  Şeker", "g"],
  ["fiber_g", "Lif", "g"],
  ["protein_g", "Protein", "g"],
  ["salt_g", "Tuz", "g"],
];

function drawApprovedStamp(doc: jsPDF, x: number, y: number, userName?: string | null, dateStr?: string | null) {
  const w = 70;
  const h = 28;
  doc.saveGraphicsState();
  doc.setDrawColor(COLORS.approved.r, COLORS.approved.g, COLORS.approved.b);
  doc.setLineWidth(1.2);
  doc.roundedRect(x, y, w, h, 3, 3, "S");
  doc.setLineWidth(0.5);
  doc.roundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 2, 2, "S");

  doc.setTextColor(COLORS.approved.r, COLORS.approved.g, COLORS.approved.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(sanitizeText("GIDA MUHENDISI"), x + w / 2, y + 9, { align: "center" });
  doc.setFontSize(13);
  doc.text(sanitizeText("ONAYLI"), x + w / 2, y + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  if (userName) {
    doc.text(sanitizeText(userName), x + w / 2, y + 21, { align: "center" });
  }
  if (dateStr) {
    doc.text(sanitizeText(dateStr), x + w / 2, y + 25, { align: "center" });
  }
  doc.restoreGraphicsState();
}

function drawDraftStamp(doc: jsPDF, x: number, y: number, reason?: string) {
  const w = 80;
  const h = 28;
  doc.saveGraphicsState();
  doc.setDrawColor(COLORS.draft.r, COLORS.draft.g, COLORS.draft.b);
  doc.setLineWidth(1.2);
  doc.roundedRect(x, y, w, h, 3, 3, "S");
  doc.setTextColor(COLORS.draft.r, COLORS.draft.g, COLORS.draft.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TASLAK", x + w / 2, y + 11, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(sanitizeText("Gida Muh. onayi bekliyor"), x + w / 2, y + 18, { align: "center" });
  if (reason) {
    doc.setFontSize(6);
    doc.text(sanitizeText(reason), x + w / 2, y + 24, { align: "center" });
  }
  doc.restoreGraphicsState();
}

function drawDraftWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  // @ts-ignore - GState exists at runtime in jspdf
  if (typeof (doc as any).GState === "function" && typeof (doc as any).setGState === "function") {
    // @ts-ignore
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.18 }));
  }
  doc.setTextColor(COLORS.draft.r, COLORS.draft.g, COLORS.draft.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(110);
  doc.text("TASLAK", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35,
  });
  doc.restoreGraphicsState();
  // Reset opacity
  // @ts-ignore
  if (typeof (doc as any).GState === "function" && typeof (doc as any).setGState === "function") {
    // @ts-ignore
    (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  }
}

export async function generateEtiketPDF(opts: EtiketPDFOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // ── Header
  let yPos = margin;
  const logo = await loadLogo();
  if (logo) {
    doc.addImage(logo, "JPEG", margin, yPos, 30, 12);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text("DOSPRESSO Donut Coffee", pageWidth - margin, yPos + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(sanitizeText("Urun Etiketi / Alerjen & Besin Tablosu"), pageWidth - margin, yPos + 9, { align: "right" });
  yPos += 18;

  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // ── Product name + code
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(COLORS.navy.r, COLORS.navy.g, COLORS.navy.b);
  doc.text(sanitizeText(opts.name), margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  const subParts: string[] = [`Kod: ${opts.code}`];
  if (opts.category) subParts.push(opts.category);
  if (opts.expectedUnitWeight) subParts.push(`${opts.expectedUnitWeight} gr/porsiyon`);
  doc.text(sanitizeText(subParts.join("  ·  ")), margin, yPos);
  yPos += 8;

  // ── Stamp (top right area)
  const stampX = pageWidth - margin - 80;
  const stampY = margin + 20;
  if (opts.isDraft || !opts.grammageApproved) {
    drawDraftStamp(doc, stampX, stampY, opts.draftReason);
  } else {
    drawApprovedStamp(doc, stampX + 10, stampY, opts.grammageApprovalUserName, opts.grammageApprovalDate);
  }

  // ── Allergens
  yPos += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  doc.text(sanitizeText("Alerjenler"), margin, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  if (opts.allergens.length > 0) {
    const allergenText = opts.allergens.map(a => a.toUpperCase()).join(", ");
    const lines = doc.splitTextToSize(sanitizeText(allergenText), pageWidth - margin * 2);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + 3;
  } else {
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(sanitizeText("Bilinen alerjen yok"), margin, yPos);
    yPos += 8;
  }

  // ── Nutrition table
  yPos += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  doc.text(sanitizeText("Besin Degerleri"), margin, yPos);
  yPos += 5;

  // Header row
  const tableX = margin;
  const tableW = pageWidth - margin * 2;
  const col1 = tableX;
  const col2 = tableX + tableW * 0.55;
  const col3 = tableX + tableW * 0.78;

  doc.setFillColor(COLORS.navy.r, COLORS.navy.g, COLORS.navy.b);
  doc.rect(tableX, yPos, tableW, 7, "F");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(sanitizeText("Besin Ogesi"), col1 + 2, yPos + 5);
  doc.text("100 g", col2 + 2, yPos + 5);
  if (opts.perPortion && opts.expectedUnitWeight) {
    doc.text(sanitizeText(`Porsiyon (${opts.expectedUnitWeight} g)`), col3 + 2, yPos + 5);
  }
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  let alt = false;
  for (const [key, label, unit] of NUTRITION_LABELS) {
    if (alt) {
      doc.setFillColor(245, 245, 245);
      doc.rect(tableX, yPos, tableW, 6, "F");
    }
    alt = !alt;
    doc.text(sanitizeText(label), col1 + 2, yPos + 4.2);
    doc.text(`${opts.per100g[key]} ${unit}`, col2 + 2, yPos + 4.2);
    if (opts.perPortion) {
      doc.text(`${opts.perPortion[key]} ${unit}`, col3 + 2, yPos + 4.2);
    }
    yPos += 6;
  }
  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.3);
  doc.rect(tableX, yPos - NUTRITION_LABELS.length * 6 - 7, tableW, NUTRITION_LABELS.length * 6 + 7, "S");

  // ── Ingredients
  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  doc.text(sanitizeText("Icindekiler"), margin, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  const ingText = opts.ingredients
    .map(i => {
      const allergenSuffix = i.allergens.length > 0 ? ` [${i.allergens.join(", ").toUpperCase()}]` : "";
      return `${i.name}${allergenSuffix}`;
    })
    .join(", ");
  const ingLines = doc.splitTextToSize(sanitizeText(ingText || "Tanimsiz"), pageWidth - margin * 2);
  doc.text(ingLines, margin, yPos);
  yPos += ingLines.length * 4.5 + 6;

  // ── Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text(
    sanitizeText(
      "Besin degerleri 100 gr urun basina hesaplanmistir ve fabrika recetesindeki malzemelerden agirlik orani ile turetilmistir. AB/TR yonetmeligi uyarinca 14 majör alerjen takip edilir.",
    ),
    margin,
    pageHeight - 17,
    { maxWidth: pageWidth - margin * 2 },
  );
  const printDate = new Date().toLocaleString("tr-TR");
  doc.text(sanitizeText(`Basim: ${printDate}`), margin, pageHeight - 8);
  doc.text(sanitizeText(`Belge: ${opts.code}`), pageWidth - margin, pageHeight - 8, { align: "right" });

  // ── Watermark on top of everything if draft
  if (opts.isDraft || !opts.grammageApproved) {
    drawDraftWatermark(doc);
  }

  return doc;
}

export async function downloadEtiketPDF(opts: EtiketPDFOptions): Promise<void> {
  const doc = await generateEtiketPDF(opts);
  const safeName = sanitizeText(opts.name).replace(/[^a-zA-Z0-9]+/g, "_");
  const suffix = opts.isDraft || !opts.grammageApproved ? "_TASLAK" : "";
  doc.save(`Etiket_${safeName}_${opts.code}${suffix}.pdf`);
}
