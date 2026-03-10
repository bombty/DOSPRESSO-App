import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import html2canvas from "html2canvas";

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
  // Use default Helvetica font - custom fonts have unicode cmap issues
  doc.setFont("helvetica");
  fontsLoaded = false;
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
  doc.text(sanitizeText(title), pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  if (subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(sanitizeText(subtitle), pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
  }

  if (branchName) {
    doc.setFontSize(11);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(sanitizeText(`Şube: ${branchName}`), pageWidth / 2, yPos, { align: "center" });
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
  doc.text(`Rapor Tarihi: ${sanitizeText(dateStr)}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.3);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  return { doc, yPos };
}

export function addTable(doc: jsPDF, options: TableOptions, startY: number): number {
  const { head, body, theme = "striped" } = options;

  // Sanitize all text content in head and body
  const sanitizedHead = head.map(row => row.map(cell => sanitizeText(String(cell))));
  const sanitizedBody = body.map(row => {
    if (Array.isArray(row)) {
      return row.map(cell => sanitizeText(String(cell)));
    }
    return row;
  });

  autoTable(doc, {
    head: sanitizedHead,
    body: sanitizedBody,
    startY,
    theme,
    headStyles: {
      fillColor: [COLORS.navy.r, COLORS.navy.g, COLORS.navy.b],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    styles: {
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable?.finalY || startY + 50;
}

export function addSection(doc: jsPDF, title: string, yPos: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(13);
  doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
  doc.setFont("helvetica", "bold");
  doc.text(sanitizeText(title), 20, yPos);
  doc.setFont("helvetica", "normal");
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
  doc.text(`${sanitizeText(key)}:`, xOffset, yPos);
  
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text(sanitizeText(value), xOffset + 50, yPos);
  
  return yPos + 6;
}

export function addParagraph(doc: jsPDF, text: string, yPos: number, maxWidth?: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = maxWidth || pageWidth - 40;
  
  doc.setFontSize(10);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  
  const lines = doc.splitTextToSize(sanitizeText(text), width);
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
  // Convert Turkish characters to ASCII equivalents for PDF compatibility
  const turkishMap: Record<string, string> = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, char => turkishMap[char] || char);
}

/**
 * Wait for charts to render completely by checking for canvas/svg elements
 * @param element - The DOM element containing the chart
 * @param timeout - Maximum wait time in ms (default 2000)
 */
export async function waitForChartRender(element: HTMLElement, timeout: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkRender = () => {
      // Check for Recharts SVG elements
      const svgElements = element.querySelectorAll('svg');
      const hasVisibleChart = Array.from(svgElements).some(svg => {
        const rect = svg.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      if (hasVisibleChart || Date.now() - startTime >= timeout) {
        // Give extra time for animations to complete
        setTimeout(resolve, 300);
      } else {
        requestAnimationFrame(checkRender);
      }
    };
    
    checkRender();
  });
}

/**
 * Capture a DOM element as canvas using html2canvas
 * @param element - The DOM element to capture
 * @param options - html2canvas options
 */
export async function captureElementAsCanvas(
  element: HTMLElement,
  options: Partial<{
    backgroundColor: string;
    scale: number;
    useCORS: boolean;
    logging: boolean;
  }> = {}
): Promise<HTMLCanvasElement | null> {
  try {
    // Wait for chart render first
    await waitForChartRender(element);
    
    const canvas = await html2canvas(element, {
      backgroundColor: options.backgroundColor || '#ffffff',
      scale: options.scale || 2,
      useCORS: options.useCORS !== false,
      logging: options.logging || false,
      allowTaint: true,
    });
    
    return canvas;
  } catch (error) {
    console.error('Grafik yakalama hatası:', error);
    return null;
  }
}

/**
 * Add a chart image to PDF document
 * @param doc - jsPDF document instance
 * @param chartElement - The DOM element containing the chart
 * @param yPos - Current Y position in PDF
 * @param options - Image placement options
 */
export async function addChartToPDF(
  doc: jsPDF,
  chartElement: HTMLElement,
  yPos: number,
  options: {
    title?: string;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  // Add title if provided
  if (options.title) {
    yPos = checkPageBreak(doc, yPos, 50);
    doc.setFontSize(12);
    doc.setTextColor(COLORS.brown.r, COLORS.brown.g, COLORS.brown.b);
    doc.text(options.title, margin, yPos);
    yPos += 8;
  }
  
  // Capture chart
  const canvas = await captureElementAsCanvas(chartElement);
  if (!canvas) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text('Grafik yüklenemedi', margin, yPos);
    return yPos + 10;
  }
  
  // Calculate image dimensions
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = options.maxWidth || pageWidth - margin * 2;
  const aspectRatio = canvas.height / canvas.width;
  let imgHeight = imgWidth * aspectRatio;
  
  // Limit height if needed
  const maxH = options.maxHeight || (pageHeight - yPos - 40);
  if (imgHeight > maxH) {
    imgHeight = maxH;
  }
  
  // Check if we need a new page
  yPos = checkPageBreak(doc, yPos, imgHeight + 10);
  
  // Add image to PDF
  doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
  
  return yPos + imgHeight + 10;
}

/**
 * Capture multiple chart elements and add them to PDF
 * @param doc - jsPDF document
 * @param charts - Array of { element, title } objects
 * @param startY - Starting Y position
 */
export async function addMultipleChartsToPDF(
  doc: jsPDF,
  charts: Array<{ element: HTMLElement; title: string }>,
  startY: number
): Promise<number> {
  let yPos = startY;
  
  for (const chart of charts) {
    yPos = await addChartToPDF(doc, chart.element, yPos, { title: chart.title });
  }
  
  return yPos;
}

export interface CertificateOptions {
  employeeName: string;
  branchName: string;
  monthYear: string;
  score: number;
  awardDate: Date;
  certificateNo?: string;
}

/**
 * Generate Employee of Month certificate PDF
 */
export async function generateEmployeeOfMonthCertificate(options: CertificateOptions): Promise<jsPDF> {
  const { employeeName, branchName, monthYear, score, awardDate, certificateNo } = options;
  
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Gold gradient background effect (simulated with rectangles)
  doc.setFillColor(255, 248, 220); // Light gold background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Border decoration
  doc.setDrawColor(218, 165, 32); // Gold color
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');
  
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30, 'S');
  
  // Corner decorations
  doc.setFillColor(218, 165, 32);
  const cornerSize = 15;
  // Top left
  doc.triangle(10, 10, 10 + cornerSize, 10, 10, 10 + cornerSize, 'F');
  // Top right
  doc.triangle(pageWidth - 10, 10, pageWidth - 10 - cornerSize, 10, pageWidth - 10, 10 + cornerSize, 'F');
  // Bottom left
  doc.triangle(10, pageHeight - 10, 10 + cornerSize, pageHeight - 10, 10, pageHeight - 10 - cornerSize, 'F');
  // Bottom right
  doc.triangle(pageWidth - 10, pageHeight - 10, pageWidth - 10 - cornerSize, pageHeight - 10, pageWidth - 10, pageHeight - 10 - cornerSize, 'F');
  
  let yPos = 40;
  
  // Logo or brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(139, 43, 35); // Brown
  doc.text("DOSPRESSO", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("Donut Coffee", pageWidth / 2, yPos, { align: "center" });
  yPos += 25;
  
  // Certificate title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(30, 58, 95); // Navy
  doc.text(sanitizeText("BAŞARI SERTİFİKASI"), pageWidth / 2, yPos, { align: "center" });
  yPos += 18;
  
  // Star decoration
  doc.setFontSize(40);
  doc.setTextColor(218, 165, 32);
  doc.text("*", pageWidth / 2, yPos, { align: "center" });
  yPos += 20;
  
  // Award type
  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.setTextColor(139, 43, 35);
  doc.text(sanitizeText("AYIN ELEMANI"), pageWidth / 2, yPos, { align: "center" });
  yPos += 18;
  
  // Period
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text(sanitizeText(monthYear), pageWidth / 2, yPos, { align: "center" });
  yPos += 22;
  
  // Recipient name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(30, 58, 95);
  doc.text(sanitizeText(employeeName.toLocaleUpperCase('tr-TR')), pageWidth / 2, yPos, { align: "center" });
  yPos += 15;
  
  // Branch name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(sanitizeText(branchName + " Şubesi"), pageWidth / 2, yPos, { align: "center" });
  yPos += 18;
  
  // Description
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  const description = "Göstermiş olduğunuz üstün performans, özverili çalışma ve takım ruhu ile";
  const description2 = "bu başarıyı hak ettiniz. Tebrik eder, başarılarınızın devamını dileriz.";
  doc.text(description, pageWidth / 2, yPos, { align: "center" });
  yPos += 7;
  doc.text(description2, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;
  
  // Score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(46, 125, 50); // Green
  doc.text(sanitizeText(`Performans Puanı: ${score.toFixed(1)}/100`), pageWidth / 2, yPos, { align: "center" });
  yPos += 25;
  
  // Bottom section - Date and signature
  const bottomY = pageHeight - 40;
  
  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const dateStr = awardDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(sanitizeText(dateStr), 50, bottomY, { align: "center" });
  doc.setFontSize(9);
  doc.text("Tarih", 50, bottomY + 6, { align: "center" });
  
  // Signature line
  doc.setDrawColor(100, 100, 100);
  doc.line(pageWidth / 2 - 40, bottomY - 2, pageWidth / 2 + 40, bottomY - 2);
  doc.setFontSize(11);
  doc.text("DOSPRESSO Yönetimi", pageWidth / 2, bottomY + 5, { align: "center" });
  doc.setFontSize(9);
  doc.text("İmza", pageWidth / 2, bottomY + 11, { align: "center" });
  
  // Certificate number
  if (certificateNo) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Sertifika No: ${certificateNo}`, pageWidth - 50, bottomY + 6, { align: "center" });
  }
  
  return doc;
}

/**
 * Download Employee of Month certificate
 */
export async function downloadEmployeeOfMonthCertificate(options: CertificateOptions): Promise<void> {
  const doc = await generateEmployeeOfMonthCertificate(options);
  const fileName = `DOSPRESSO_Ayin_Elemani_${sanitizeText(options.employeeName.replace(/\s+/g, '_'))}_${sanitizeText(options.monthYear.replace(/\s+/g, '_'))}.pdf`;
  doc.save(fileName);
}
