import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100);
}

function formatMoneyTL(amount: number): string {
  return formatMoney(amount) + ' TL';
}

export interface PayslipData {
  firstName: string;
  lastName: string;
  position: string;
  branch: string;
  month: number;
  year: number;
  baseSalary: number;
  overtimePay: number;
  offDayPay: number;
  holidayPay: number;
  totalBonuses: number;
  grossTotal: number;
  deficitDeduction: number;
  sgkEmployee: number;
  unemploymentEmployee: number;
  incomeTax: number;
  stampTax: number;
  totalDeductions: number;
  agi: number;
  netSalary: number;
  sgkEmployer: number;
  unemploymentEmployer: number;
  totalEmployerCost: number;
}

export interface PayrollSummaryData {
  month: number;
  year: number;
  employees: PayslipData[];
  totalGross: number;
  totalNet: number;
  totalEmployerCost: number;
}

const MONTHS_TR = [
  '', 'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'
];

export async function generatePayrollPDF(data: PayrollSummaryData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595, 842]);
  const { height } = page.getSize();

  page.drawText('DOSPRESSO - Bordro Raporu', { x: 50, y: height - 50, size: 16, font: boldFont });
  page.drawText(`${MONTHS_TR[data.month]} ${data.year}`, { x: 50, y: height - 70, size: 12, font });

  let y = height - 110;
  page.drawText(`Toplam Calisan: ${data.employees.length}`, { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText(`Toplam Brut: ${formatMoneyTL(data.totalGross)}`, { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText(`Toplam Net: ${formatMoneyTL(data.totalNet)}`, { x: 50, y, size: 10, font });
  y -= 20;
  page.drawText(`Toplam Isveren Maliyeti: ${formatMoneyTL(data.totalEmployerCost)}`, { x: 50, y, size: 10, font });

  y -= 40;
  page.drawText('CALISAN LISTESI', { x: 50, y, size: 12, font: boldFont });
  y -= 20;

  page.drawText('Ad Soyad', { x: 50, y, size: 8, font: boldFont });
  page.drawText('Pozisyon', { x: 180, y, size: 8, font: boldFont });
  page.drawText('Brut', { x: 310, y, size: 8, font: boldFont });
  page.drawText('Kesintiler', { x: 390, y, size: 8, font: boldFont });
  page.drawText('Net', { x: 470, y, size: 8, font: boldFont });
  y -= 15;

  for (const emp of data.employees) {
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = height - 50;
    }
    page.drawText(`${emp.firstName} ${emp.lastName}`, { x: 50, y, size: 8, font });
    page.drawText(emp.position, { x: 180, y, size: 8, font });
    page.drawText(formatMoneyTL(emp.grossTotal), { x: 310, y, size: 8, font });
    page.drawText(formatMoneyTL(emp.totalDeductions), { x: 390, y, size: 8, font });
    page.drawText(formatMoneyTL(emp.netSalary), { x: 470, y, size: 8, font });
    y -= 14;
  }

  for (const emp of data.employees) {
    page = doc.addPage([595, 842]);
    y = height - 50;
    page.drawText(`${emp.firstName} ${emp.lastName}`, { x: 50, y, size: 14, font: boldFont });
    y -= 20;
    page.drawText(`${emp.position} - ${emp.branch}`, { x: 50, y, size: 10, font });
    y -= 15;
    page.drawText(`${MONTHS_TR[data.month]} ${data.year}`, { x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 30;

    page.drawText('KAZANCLAR', { x: 50, y, size: 10, font: boldFont });
    y -= 18;
    const earnings = [
      ['Taban Maas', emp.baseSalary],
      ['Fazla Mesai', emp.overtimePay],
      ['OFF Gun Calismasi', emp.offDayPay],
      ['Resmi Tatil', emp.holidayPay],
      ['Primler', emp.totalBonuses],
    ] as const;

    for (const [label, val] of earnings) {
      if (val > 0 || label === 'Taban Maas') {
        page.drawText(`${label}:`, { x: 60, y, size: 9, font });
        page.drawText(formatMoneyTL(val as number), { x: 250, y, size: 9, font });
        y -= 15;
      }
    }

    if (emp.deficitDeduction > 0) {
      page.drawText('Devamsizlik Kesintisi:', { x: 60, y, size: 9, font, color: rgb(0.8, 0, 0) });
      page.drawText(`-${formatMoneyTL(emp.deficitDeduction)}`, { x: 250, y, size: 9, font, color: rgb(0.8, 0, 0) });
      y -= 15;
    }

    page.drawText('BRUT TOPLAM:', { x: 60, y, size: 10, font: boldFont });
    page.drawText(formatMoneyTL(emp.grossTotal), { x: 250, y, size: 10, font: boldFont });
    y -= 25;

    page.drawText('KESINTILER', { x: 50, y, size: 10, font: boldFont });
    y -= 18;
    const deductions = [
      ['SGK Isci (%14)', emp.sgkEmployee],
      ['Issizlik (%1)', emp.unemploymentEmployee],
      ['Gelir Vergisi', emp.incomeTax],
      ['Damga Vergisi', emp.stampTax],
    ] as const;

    for (const [label, val] of deductions) {
      page.drawText(`${label}:`, { x: 60, y, size: 9, font });
      page.drawText(formatMoneyTL(val as number), { x: 250, y, size: 9, font });
      y -= 15;
    }

    page.drawText('TOPLAM KESINTI:', { x: 60, y, size: 10, font: boldFont });
    page.drawText(formatMoneyTL(emp.totalDeductions), { x: 250, y, size: 10, font: boldFont });
    y -= 25;

    if (emp.agi > 0) {
      page.drawText('AGI:', { x: 60, y, size: 9, font, color: rgb(0, 0.5, 0) });
      page.drawText(`+${formatMoneyTL(emp.agi)}`, { x: 250, y, size: 9, font, color: rgb(0, 0.5, 0) });
      y -= 20;
    }

    page.drawText('NET MAAS:', { x: 50, y, size: 14, font: boldFont });
    page.drawText(formatMoneyTL(emp.netSalary), { x: 250, y, size: 14, font: boldFont });
    y -= 30;

    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 15;

    page.drawText('ISVEREN MALIYETI', { x: 50, y, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
    y -= 15;
    page.drawText(`SGK Isveren: ${formatMoneyTL(emp.sgkEmployer)}`, { x: 60, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
    page.drawText(`Issizlik Isveren: ${formatMoneyTL(emp.unemploymentEmployer)}`, { x: 60, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
    page.drawText(`Toplam Maliyet: ${formatMoneyTL(emp.totalEmployerCost)}`, { x: 60, y, size: 8, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
  }

  return Buffer.from(await doc.save());
}

export async function generateIndividualPayslipPDF(emp: PayslipData, month: number, year: number): Promise<Buffer> {
  const summary: PayrollSummaryData = {
    month,
    year,
    employees: [emp],
    totalGross: emp.grossTotal,
    totalNet: emp.netSalary,
    totalEmployerCost: emp.totalEmployerCost,
  };
  return generatePayrollPDF(summary);
}
