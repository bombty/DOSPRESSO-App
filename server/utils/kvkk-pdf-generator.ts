/**
 * KVKK Denetim PDF Üreticisi
 *
 * 3 PDF TÜRÜ:
 * 1. Tek kişilik onay sertifikası (devlet denetiminde sunulan)
 * 2. Toplu rapor (tüm onaylar)
 * 3. Onaylanmamış kullanıcılar raporu (eksiklik denetimi)
 *
 * Aslan 10 May 2026 talebi.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export interface KvkkUserApprovalData {
  approvalId: number;
  userId: string;
  userName: string;
  userRole: string;
  branchName?: string;
  policyVersion: string;
  policyTitle: string;
  policyContent: string;
  approvedAt: Date;
  ipAddress: string;
  userAgent: string;
  approvalMethod: string;
}

export interface KvkkSummaryData {
  generatedAt: Date;
  totalUsers: number;
  approvedCount: number;
  notApprovedCount: number;
  activePolicy: {
    version: string;
    publishedAt: Date;
  };
  approvals: Array<{
    userName: string;
    userRole: string;
    branchName?: string;
    approvedAt: Date;
    policyVersion: string;
  }>;
  notApprovedUsers?: Array<{
    userName: string;
    userRole: string;
    branchName?: string;
  }>;
}

const DOSPRESSO_RED = rgb(0.753, 0.224, 0.169); // #C0392B
const DOSPRESSO_NAVY = rgb(0.098, 0.157, 0.220); // #192838
const GRAY_TEXT = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.9, 0.9, 0.9);

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;

// ═══════════════════════════════════════════════════════════════════
// Helper: Türkçe karakter düzeltme (pdf-lib WinAnsi sorunu)
// ═══════════════════════════════════════════════════════════════════
function tr(text: string): string {
  return text
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: Header çiz
// ═══════════════════════════════════════════════════════════════════
function drawHeader(
  page: PDFPage,
  boldFont: PDFFont,
  font: PDFFont,
  subtitle: string
): number {
  // DOSPRESSO header
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 80,
    width: PAGE_WIDTH,
    height: 80,
    color: DOSPRESSO_NAVY,
  });

  page.drawText("DOSPRESSO", {
    x: MARGIN,
    y: PAGE_HEIGHT - 35,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("KVKK Denetim Belgesi", {
    x: MARGIN,
    y: PAGE_HEIGHT - 55,
    size: 12,
    font: font,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText(tr(subtitle), {
    x: MARGIN,
    y: PAGE_HEIGHT - 72,
    size: 9,
    font: font,
    color: rgb(0.8, 0.8, 0.8),
  });

  return PAGE_HEIGHT - 100; // Başlık altı Y
}

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: Footer (legal disclaimer)
// ═══════════════════════════════════════════════════════════════════
function drawFooter(page: PDFPage, font: PDFFont, pageNum: number): void {
  const footerY = 30;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 15 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY + 15 },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });

  page.drawText(
    tr("6698 sayili KVKK + Aydinlatma Yukumlulugu Tebligi gereği duzenlenmistir."),
    {
      x: MARGIN,
      y: footerY,
      size: 7,
      font: font,
      color: GRAY_TEXT,
    }
  );

  page.drawText(`Sayfa ${pageNum}`, {
    x: PAGE_WIDTH - MARGIN - 30,
    y: footerY,
    size: 7,
    font: font,
    color: GRAY_TEXT,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: Çok satırlı metin
// ═══════════════════════════════════════════════════════════════════
function drawMultilineText(
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  lineHeight: number = 14
): number {
  const lines: string[] = [];
  const words = text.split(" ");
  let currentLine = "";

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  let currentY = startY;
  for (const line of lines) {
    page.drawText(tr(line), {
      x,
      y: currentY,
      size,
      font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;
  }

  return currentY;
}

// ═══════════════════════════════════════════════════════════════════
// 1. TEK KİŞİLİK ONAY SERTİFİKASI
// ═══════════════════════════════════════════════════════════════════

export async function generateUserApprovalCertificatePDF(
  data: KvkkUserApprovalData
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = drawHeader(page, boldFont, font, "Kisisel Veri Aydinlatma Onay Sertifikasi");

  // Sertifika başlığı
  page.drawText("AYDINLATMA METNI ONAY SERTIFIKASI", {
    x: MARGIN,
    y: y - 20,
    size: 14,
    font: boldFont,
    color: DOSPRESSO_RED,
  });
  y -= 60;

  // Kullanıcı bilgileri tablosu
  const rowHeight = 25;
  const labelX = MARGIN;
  const valueX = MARGIN + 150;

  const rows = [
    ["Calisan Adi:", data.userName],
    ["Calisan ID:", data.userId],
    ["Gorev:", data.userRole],
    ["Sube:", data.branchName || "Belirtilmemis"],
    ["Onay Tarihi:", formatDate(data.approvedAt)],
    ["Onay Yontemi:", data.approvalMethod],
    ["Politika Versiyonu:", data.policyVersion],
    ["IP Adresi:", data.ipAddress],
    ["Cihaz:", (data.userAgent || "").substring(0, 50) + "..."],
    ["Onay ID:", String(data.approvalId)],
  ];

  for (const [label, value] of rows) {
    page.drawText(tr(label), {
      x: labelX,
      y,
      size: 10,
      font: boldFont,
      color: DOSPRESSO_NAVY,
    });
    page.drawText(tr(value), {
      x: valueX,
      y,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= rowHeight;
  }

  // Beyan metni
  y -= 20;
  page.drawRectangle({
    x: MARGIN,
    y: y - 80,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: 80,
    borderColor: DOSPRESSO_RED,
    borderWidth: 1,
  });

  page.drawText("BEYAN", {
    x: MARGIN + 10,
    y: y - 15,
    size: 11,
    font: boldFont,
    color: DOSPRESSO_RED,
  });

  const beyanText = `Yukarida adi gecen calisan, ${data.policyVersion} versiyonu kisisel veri aydinlatma metnini okudugunu ve anladigini elektronik ortamda beyan etmistir. Bu beyan IP adresi, zaman damgasi ve cihaz parmak izi ile sistemde kayit altina alinmistir.`;

  drawMultilineText(
    page,
    beyanText,
    MARGIN + 10,
    y - 35,
    font,
    9,
    PAGE_WIDTH - 2 * MARGIN - 20,
    12
  );

  y -= 110;

  // İmza alanı
  page.drawText(tr("Calisan Imzasi:"), {
    x: MARGIN,
    y,
    size: 10,
    font: boldFont,
    color: DOSPRESSO_NAVY,
  });
  page.drawLine({
    start: { x: MARGIN + 100, y: y - 2 },
    end: { x: MARGIN + 300, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText(tr("Tarih: ___________________"), {
    x: MARGIN + 320,
    y,
    size: 9,
    font: font,
    color: GRAY_TEXT,
  });

  y -= 40;

  page.drawText(tr("Veri Sorumlusu (Isveren):"), {
    x: MARGIN,
    y,
    size: 10,
    font: boldFont,
    color: DOSPRESSO_NAVY,
  });
  page.drawLine({
    start: { x: MARGIN + 150, y: y - 2 },
    end: { x: MARGIN + 350, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 50;

  // Yasal not
  page.drawRectangle({
    x: MARGIN,
    y: y - 100,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: 100,
    color: rgb(0.96, 0.96, 0.96),
  });

  page.drawText("YASAL NOTLAR", {
    x: MARGIN + 10,
    y: y - 15,
    size: 10,
    font: boldFont,
    color: DOSPRESSO_NAVY,
  });

  const yasalNotlar = [
    "1. Bu sertifika 6698 sayili KVKK m.10 (Aydinlatma Yukumlulugu) geregi olusturulmustur.",
    "2. Veri isleme dayanagi: KVKK m.5/2-c (Sozlesmenin kurulmasi ve ifasi)",
    "3. Saklama suresi: 10 yil (SGK Kanunu m.86 + Is K. m.75)",
    "4. Calisan haklari: KVKK m.11 (basvurabilir: kvkk@dospresso.com)",
    "5. Versiyonu degisirse calisan yeniden bilgilendirilir.",
  ];

  let notY = y - 30;
  for (const not of yasalNotlar) {
    page.drawText(tr(not), {
      x: MARGIN + 10,
      y: notY,
      size: 8,
      font: font,
      color: rgb(0, 0, 0),
    });
    notY -= 13;
  }

  drawFooter(page, font, 1);

  // ─────────────── 2. SAYFA: Aydınlatma metni tam ───────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = drawHeader(page, boldFont, font, "Onaylanan Aydinlatma Metni Tam Hali");

  page.drawText(`KVKK Aydinlatma Metni ${data.policyVersion}`, {
    x: MARGIN,
    y: y - 20,
    size: 14,
    font: boldFont,
    color: DOSPRESSO_RED,
  });

  y -= 50;

  // Plain text olarak yaz (markdown'ı temizle)
  const plainText = data.policyContent
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^-\s+/gm, "  • ")
    .replace(/^---+$/gm, "________________________________");

  const lines = plainText.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    if (y < 80) {
      drawFooter(page, font, 2);
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = drawHeader(page, boldFont, font, "Aydinlatma Metni (devam)");
      y -= 30;
    }

    const isHeading = line.length < 60 && !line.includes(":") && line === line.toUpperCase();
    const fontUsed = isHeading ? boldFont : font;
    const size = isHeading ? 11 : 9;

    y = drawMultilineText(
      page,
      line,
      MARGIN,
      y,
      fontUsed,
      size,
      PAGE_WIDTH - 2 * MARGIN,
      size + 3
    );
    y -= 5;
  }

  drawFooter(page, font, 2);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ═══════════════════════════════════════════════════════════════════
// 2. TOPLU RAPOR (TÜM ONAYLAR)
// ═══════════════════════════════════════════════════════════════════

export async function generateKvkkSummaryReportPDF(
  data: KvkkSummaryData
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let pageNum = 1;
  let y = drawHeader(page, boldFont, font, `Olusturma Tarihi: ${formatDate(data.generatedAt)}`);

  // Başlık
  page.drawText("KVKK ONAY DURUM RAPORU", {
    x: MARGIN,
    y: y - 20,
    size: 16,
    font: boldFont,
    color: DOSPRESSO_RED,
  });

  y -= 60;

  // Özet kutusu
  page.drawRectangle({
    x: MARGIN,
    y: y - 80,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: 80,
    color: rgb(0.96, 0.96, 0.96),
  });

  page.drawText("OZET", {
    x: MARGIN + 10,
    y: y - 15,
    size: 11,
    font: boldFont,
    color: DOSPRESSO_NAVY,
  });

  page.drawText(`Toplam Calisan: ${data.totalUsers}`, {
    x: MARGIN + 10,
    y: y - 35,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Onayli: ${data.approvedCount}`, {
    x: MARGIN + 150,
    y: y - 35,
    size: 10,
    font: boldFont,
    color: rgb(0, 0.6, 0),
  });

  page.drawText(`Onaysiz: ${data.notApprovedCount}`, {
    x: MARGIN + 280,
    y: y - 35,
    size: 10,
    font: boldFont,
    color: rgb(0.8, 0, 0),
  });

  const percent =
    data.totalUsers > 0
      ? Math.round((data.approvedCount / data.totalUsers) * 100)
      : 0;
  page.drawText(`Onaylanma Orani: %${percent}`, {
    x: MARGIN + 10,
    y: y - 55,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    `Aktif Politika: ${data.activePolicy.version} (${formatDate(data.activePolicy.publishedAt)})`,
    {
      x: MARGIN + 10,
      y: y - 70,
      size: 9,
      font: font,
      color: GRAY_TEXT,
    }
  );

  y -= 110;

  // Onaylar tablosu
  page.drawText(tr("ONAYLAYAN CALISANLAR"), {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: DOSPRESSO_NAVY,
  });

  y -= 20;

  // Tablo başlık
  const colX = {
    name: MARGIN,
    role: MARGIN + 150,
    branch: MARGIN + 240,
    date: MARGIN + 340,
    version: MARGIN + 460,
  };

  page.drawRectangle({
    x: MARGIN,
    y: y - 5,
    width: PAGE_WIDTH - 2 * MARGIN,
    height: 18,
    color: DOSPRESSO_NAVY,
  });

  for (const [label, x] of [
    ["Ad Soyad", colX.name],
    ["Gorev", colX.role],
    ["Sube", colX.branch],
    ["Onay Tarihi", colX.date],
    ["Versiyon", colX.version],
  ] as Array<[string, number]>) {
    page.drawText(tr(label), {
      x: x + 3,
      y: y + 2,
      size: 9,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
  }
  y -= 18;

  // Tablo satırları
  let rowIndex = 0;
  for (const approval of data.approvals) {
    if (y < 60) {
      drawFooter(page, font, pageNum++);
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = drawHeader(page, boldFont, font, "Onaylar (devam)");
      y -= 30;
    }

    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 3,
        width: PAGE_WIDTH - 2 * MARGIN,
        height: 14,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    page.drawText(tr(approval.userName.substring(0, 25)), {
      x: colX.name + 3,
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(tr(approval.userRole.substring(0, 15)), {
      x: colX.role + 3,
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(tr((approval.branchName || "-").substring(0, 18)), {
      x: colX.branch + 3,
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(formatDate(approval.approvedAt).substring(0, 19), {
      x: colX.date + 3,
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(approval.policyVersion, {
      x: colX.version + 3,
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 14;
    rowIndex++;
  }

  // Eksikler
  if (data.notApprovedUsers && data.notApprovedUsers.length > 0) {
    if (y < 100) {
      drawFooter(page, font, pageNum++);
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = drawHeader(page, boldFont, font, "Eksik Onaylar");
      y -= 30;
    } else {
      y -= 30;
    }

    page.drawText(tr("ONAYLANMAMIS CALISANLAR (EKSIKLIK)"), {
      x: MARGIN,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0.8, 0, 0),
    });

    y -= 20;

    for (const user of data.notApprovedUsers) {
      if (y < 60) {
        drawFooter(page, font, pageNum++);
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = drawHeader(page, boldFont, font, "Eksik Onaylar (devam)");
        y -= 30;
      }

      page.drawText(
        tr(
          `• ${user.userName} (${user.userRole}, ${user.branchName || "Belirtilmemis"})`
        ),
        {
          x: MARGIN + 10,
          y,
          size: 9,
          font,
          color: rgb(0, 0, 0),
        }
      );
      y -= 14;
    }
  }

  drawFooter(page, font, pageNum);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
