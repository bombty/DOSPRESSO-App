import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

const DOSPRESSO_LOGO_PATH = "/dospresso-logo.jpeg";
const ROBOTO_REGULAR_PATH = "/fonts/Roboto-Regular.ttf";
const ROBOTO_BOLD_PATH = "/fonts/Roboto-Bold.ttf";

const COLORS = {
  navy: { r: 30, g: 58, b: 95 },
  brown: { r: 139, g: 43, b: 35 },
  darkGray: { r: 44, g: 62, b: 80 },
  gray: { r: 100, g: 100, b: 100 },
  lightGray: { r: 200, g: 200, b: 200 },
  mutedGray: { r: 120, g: 120, b: 120 },
};

export interface PDFOptions {
  title: string;
  subtitle?: string;
  branchName?: string;
  reportDate?: Date;
  orientation?: "portrait" | "landscape";
}

export interface TableOptions {
  head: string[][];
  body: RowInput[];
  startY?: number;
  theme?: "striped" | "grid" | "plain";
}

let fontsLoaded = false;
let fontLoadPromise: Promise<void> | null = null;
let robotoRegularBase64: string | null = null;
let robotoBoldBase64: string | null = null;

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

async function loadFonts(doc: jsPDF): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  if (fontsLoaded && robotoRegularBase64 && robotoBoldBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoRegularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto");
    return;
  }

  if (fontLoadPromise) {
    await fontLoadPromise;
    if (fontsLoaded && robotoRegularBase64 && robotoBoldBase64) {
      doc.addFileToVFS("Roboto-Regular.ttf", robotoRegularBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      doc.setFont("Roboto");
    }
    return;
  }

  fontLoadPromise = (async () => {
    try {
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(ROBOTO_REGULAR_PATH),
        fetch(ROBOTO_BOLD_PATH),
      ]);

      if (!regularResponse.ok || !boldResponse.ok) {
        console.warn("Font dosyaları yüklenemedi, varsayılan font kullanılacak");
        return;
      }

      const [regularBuffer, boldBuffer] = await Promise.all([
        regularResponse.arrayBuffer(),
        boldResponse.arrayBuffer(),
      ]);

      robotoRegularBase64 = await arrayBufferToBase64(regularBuffer);
      robotoBoldBase64 = await arrayBufferToBase64(boldBuffer);

      fontsLoaded = true;
    } catch (error) {
      console.warn("Font yükleme hatası:", error);
    }
  })();

  await fontLoadPromise;

  if (fontsLoaded && robotoRegularBase64 && robotoBoldBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoRegularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto");
  }
}

export async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 3000);
    img.src = DOSPRESSO_LOGO_PATH;
  });
}

export async function createPDFWithHeader(options: PDFOptions): Promise<{ doc: jsPDF; yPos: number }> {
  const { title, subtitle, branchName, reportDate, orientation = "portrait" } = options;
  const doc = new jsPDF({ orientation });
  
  await loadFonts(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  const logo = await loadLogo();
  if (logo) {
    const logoWidth = 50;
    const logoHeight = 20;
    doc.addImage(logo, "JPEG", pageWidth / 2 - logoWidth / 2, yPos, logoWidth, logoHeight);
    yPos += logoHeight + 8;
  } else {
    doc.setFontSize(22);
    doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
    doc.text("DOSPRESSO", pageWidth / 2, yPos + 8, { align: "center" });
    yPos += 16;
  }

  doc.setFontSize(11);
  doc.setTextColor(COLORS.navy.r, COLORS.navy.g, COLORS.navy.b);
  doc.text("Donut Coffee", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setDrawColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  if (subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
  }

  if (branchName) {
    doc.setFontSize(11);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(`Şube: ${branchName}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
  }

  const date = reportDate || new Date();
  doc.setFontSize(10);
  doc.setTextColor(COLORS.mutedGray.r, COLORS.mutedGray.g, COLORS.mutedGray.b);
  const dateStr = date.toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Rapor Tarihi: ${dateStr}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.3);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  return { doc, yPos };
}

export function addTable(doc: jsPDF, options: TableOptions, startY: number): number {
  const { head, body, theme = "striped" } = options;

  autoTable(doc, {
    head,
    body,
    startY,
    theme,
    headStyles: {
      fillColor: [COLORS.navy.r, COLORS.navy.g, COLORS.navy.b],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      font: "Roboto",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
      font: "Roboto",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    styles: {
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      font: "Roboto",
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable?.finalY || startY + 50;
}

export function addSection(doc: jsPDF, title: string, yPos: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(13);
  doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  if (fontsLoaded) {
    doc.setFont("Roboto", "bold");
  }
  doc.text(title, 20, yPos);
  if (fontsLoaded) {
    doc.setFont("Roboto", "normal");
  }
  yPos += 3;
  
  doc.setDrawColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  doc.setLineWidth(0.3);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  return yPos;
}

export function addKeyValue(doc: jsPDF, key: string, value: string, yPos: number, xOffset = 20): number {
  doc.setFontSize(10);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text(`${key}:`, xOffset, yPos);
  
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text(value, xOffset + 50, yPos);
  
  return yPos + 6;
}

export function addParagraph(doc: jsPDF, text: string, yPos: number, maxWidth?: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = maxWidth || pageWidth - 40;
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, 20, yPos);
  
  return yPos + lines.length * 5 + 5;
}

export function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    
    doc.setFontSize(8);
    doc.setTextColor(COLORS.mutedGray.r, COLORS.mutedGray.g, COLORS.mutedGray.b);
    doc.text("DOSPRESSO Donut Coffee - Gizli Belge", 20, pageHeight - 12);
    doc.text(`Sayfa ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 12, { align: "right" });
  }
}

export function checkPageBreak(doc: jsPDF, yPos: number, neededSpace: number = 40): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (yPos + neededSpace > pageHeight - 30) {
    doc.addPage();
    return 20;
  }
  
  return yPos;
}

export function savePDF(doc: jsPDF, filename: string): void {
  addFooter(doc);
  doc.save(filename);
}

export function sanitizeText(text: string): string {
  if (!text) return "";
  return text;
}
