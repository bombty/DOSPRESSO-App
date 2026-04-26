#!/usr/bin/env node
// DOSPRESSO 26 Rol Detaylı Rapor PDF Üretici
// Kullanım: node scripts/reports/generate-role-report-pdf.mjs
// Çıktı: docs/reports/dospresso-rol-raporu-2026-04-26.pdf
//        docs/reports/per-role/<rol>.pdf  (her rol ayrı)
//        docs/reports/dospresso-rol-raporu-per-role.zip

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import archiver from "archiver";
import { ROLES_CONTENT, ROLE_ORDER, CATEGORIES } from "./role-content.mjs";

// ----------------------------------------------------------------
// Konfigürasyon
// ----------------------------------------------------------------
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { top: 60, bottom: 60, left: 50, right: 50 };
const FONT_PATH_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_PATH_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const OUTPUT_DIR = "docs/reports";
const PER_ROLE_DIR = path.join(OUTPUT_DIR, "per-role");
const REPORT_DATE = "26 Nisan 2026";
const PILOT_DATE = "5 Mayıs 2026";

// ----------------------------------------------------------------
// DB veri okuma (önceden /tmp dosyalarına dump edilmiş)
// ----------------------------------------------------------------
async function loadDbData() {
  const data = {
    rolesUsers: new Map(),     // role -> { aktif, toplam, ornekIsimler[] }
    roleWidgets: new Map(),    // role -> [{key, order, defaultOpen, title, category}]
    rolePerms: new Map(),      // role -> [{module, actions[]}]
    rolesMeta: new Map(),      // role -> { displayName, description, isSystemRole }
  };

  // 1. roles_users.txt: role|aktif|toplam|isimler
  const rolesUsersTxt = await fs.readFile("/tmp/roles_users.txt", "utf-8");
  for (const line of rolesUsersTxt.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts.length < 4) continue;
    const [role, aktif, toplam, isimler] = parts;
    data.rolesUsers.set(role, {
      aktif: parseInt(aktif) || 0,
      toplam: parseInt(toplam) || 0,
      ornekIsimler: isimler ? isimler.split(", ").filter(Boolean) : [],
    });
  }

  // 2. role_widgets.txt: role|widget_key|order|default_open|title|category
  const widgetsTxt = await fs.readFile("/tmp/role_widgets.txt", "utf-8");
  for (const line of widgetsTxt.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts.length < 6) continue;
    const [role, widgetKey, order, defaultOpen, title, category] = parts;
    if (!data.roleWidgets.has(role)) data.roleWidgets.set(role, []);
    data.roleWidgets.get(role).push({
      key: widgetKey,
      order: parseInt(order) || 99,
      defaultOpen: defaultOpen === "t",
      title: title || widgetKey,
      category: category || "diger",
    });
  }
  // Order each role's widgets
  for (const arr of data.roleWidgets.values()) {
    arr.sort((a, b) => a.order - b.order);
  }

  // 3. role_perms.txt: role|module|actions(comma-sep)
  const permsTxt = await fs.readFile("/tmp/role_perms.txt", "utf-8");
  for (const line of permsTxt.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts.length < 3) continue;
    const [role, module, actions] = parts;
    if (!data.rolePerms.has(role)) data.rolePerms.set(role, []);
    data.rolePerms.get(role).push({
      module,
      actions: actions ? actions.split(",").filter(Boolean) : [],
    });
  }

  // 4. roles_meta.txt: name|display_name|description|is_system_role
  const metaTxt = await fs.readFile("/tmp/roles_meta.txt", "utf-8");
  for (const line of metaTxt.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts.length < 4) continue;
    const [name, displayName, description, isSystemRole] = parts;
    data.rolesMeta.set(name, {
      displayName,
      description,
      isSystemRole: isSystemRole === "t",
    });
  }

  return data;
}

// ----------------------------------------------------------------
// PDF Builder helper
// ----------------------------------------------------------------
class PdfBuilder {
  constructor() {
    this.doc = null;
    this.fontRegular = null;
    this.fontBold = null;
    this.currentPage = null;
    this.cursorY = 0;       // sayfa içinde aşağı doğru yazma için
    this.pageNumber = 0;
    this.pageHeader = null; // her sayfa üstünde basılan başlık
    this.pageFooterText = null;
    this.tocEntries = [];   // [{ title, pageNumber, level }]
  }

  async init() {
    this.doc = await PDFDocument.create();
    this.doc.registerFontkit(fontkit);
    const regBytes = await fs.readFile(FONT_PATH_REGULAR);
    const boldBytes = await fs.readFile(FONT_PATH_BOLD);
    this.fontRegular = await this.doc.embedFont(regBytes, { subset: true });
    this.fontBold = await this.doc.embedFont(boldBytes, { subset: true });
    this.doc.setTitle("DOSPRESSO Rol Detaylı Raporu");
    this.doc.setAuthor("DOSPRESSO HQ + Replit Asistan");
    this.doc.setSubject("26 aktif rolün detaylı analizi, perspektifler ve öneriler");
    this.doc.setKeywords(["DOSPRESSO", "rol", "yetki", "pilot", "5 May 2026"]);
    this.doc.setProducer("pdf-lib + DejaVu Sans");
    this.doc.setCreationDate(new Date());
  }

  newPage(headerText = null) {
    if (this.currentPage) this._drawFooter();
    this.currentPage = this.doc.addPage([A4.width, A4.height]);
    this.pageNumber += 1;
    this.cursorY = A4.height - MARGIN.top;
    if (headerText !== null) this.pageHeader = headerText;
    if (this.pageHeader) this._drawHeader();
    return this.currentPage;
  }

  _drawHeader() {
    if (!this.pageHeader) return;
    const text = this.pageHeader;
    this.currentPage.drawText(text, {
      x: MARGIN.left,
      y: A4.height - 35,
      size: 9,
      font: this.fontRegular,
      color: rgb(0.45, 0.45, 0.50),
    });
    // Right side: report date
    const dateText = `${REPORT_DATE} • Pilot ${PILOT_DATE}`;
    const dateWidth = this.fontRegular.widthOfTextAtSize(dateText, 9);
    this.currentPage.drawText(dateText, {
      x: A4.width - MARGIN.right - dateWidth,
      y: A4.height - 35,
      size: 9,
      font: this.fontRegular,
      color: rgb(0.45, 0.45, 0.50),
    });
    // Underline
    this.currentPage.drawLine({
      start: { x: MARGIN.left, y: A4.height - 45 },
      end: { x: A4.width - MARGIN.right, y: A4.height - 45 },
      thickness: 0.4,
      color: rgb(0.75, 0.75, 0.78),
    });
  }

  _drawFooter() {
    if (!this.currentPage) return;
    const txt = `Sayfa ${this.pageNumber}`;
    const w = this.fontRegular.widthOfTextAtSize(txt, 9);
    this.currentPage.drawText(txt, {
      x: (A4.width - w) / 2,
      y: 30,
      size: 9,
      font: this.fontRegular,
      color: rgb(0.55, 0.55, 0.58),
    });
    if (this.pageFooterText) {
      this.currentPage.drawText(this.pageFooterText, {
        x: MARGIN.left,
        y: 30,
        size: 8,
        font: this.fontRegular,
        color: rgb(0.55, 0.55, 0.58),
      });
    }
    // Top line above footer
    this.currentPage.drawLine({
      start: { x: MARGIN.left, y: 45 },
      end: { x: A4.width - MARGIN.right, y: 45 },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.88),
    });
  }

  finalize() {
    if (this.currentPage) this._drawFooter();
  }

  // Ensure space for given height; if not, new page
  ensureSpace(height) {
    if (this.cursorY - height < MARGIN.bottom + 20) {
      this.newPage();
    }
  }

  // Heading helpers
  drawSectionTitle(text, color = [0.10, 0.20, 0.40], size = 18) {
    this.ensureSpace(size + 12);
    this.cursorY -= size + 4;
    this.currentPage.drawText(text, {
      x: MARGIN.left,
      y: this.cursorY,
      size,
      font: this.fontBold,
      color: rgb(color[0], color[1], color[2]),
    });
    // Underline
    this.currentPage.drawLine({
      start: { x: MARGIN.left, y: this.cursorY - 4 },
      end: { x: A4.width - MARGIN.right, y: this.cursorY - 4 },
      thickness: 0.7,
      color: rgb(color[0], color[1], color[2]),
    });
    this.cursorY -= 12;
  }

  drawSubheading(text, color = [0.18, 0.25, 0.35], size = 12) {
    this.ensureSpace(size + 8);
    this.cursorY -= size + 2;
    this.currentPage.drawText(text, {
      x: MARGIN.left,
      y: this.cursorY,
      size,
      font: this.fontBold,
      color: rgb(color[0], color[1], color[2]),
    });
    this.cursorY -= 6;
  }

  drawLabelValue(label, value, labelColor = [0.40, 0.40, 0.45]) {
    const labelText = label + ":";
    const labelW = this.fontBold.widthOfTextAtSize(labelText, 10);
    this.ensureSpace(14);
    this.cursorY -= 12;
    this.currentPage.drawText(labelText, {
      x: MARGIN.left,
      y: this.cursorY,
      size: 10,
      font: this.fontBold,
      color: rgb(labelColor[0], labelColor[1], labelColor[2]),
    });
    // Wrap value next to label
    const valueX = MARGIN.left + labelW + 6;
    const valueWidth = A4.width - MARGIN.right - valueX;
    const lines = this._wrapText(value || "—", this.fontRegular, 10, valueWidth);
    if (lines.length === 0) lines.push("");
    this.currentPage.drawText(lines[0], {
      x: valueX,
      y: this.cursorY,
      size: 10,
      font: this.fontRegular,
      color: rgb(0.18, 0.18, 0.22),
    });
    for (let i = 1; i < lines.length; i++) {
      this.cursorY -= 12;
      this.ensureSpace(14);
      this.currentPage.drawText(lines[i], {
        x: valueX,
        y: this.cursorY,
        size: 10,
        font: this.fontRegular,
        color: rgb(0.18, 0.18, 0.22),
      });
    }
    this.cursorY -= 2;
  }

  // Body text wrap
  drawParagraph(text, opts = {}) {
    const size = opts.size || 10;
    const color = opts.color || [0.18, 0.18, 0.22];
    const indent = opts.indent || 0;
    const font = opts.bold ? this.fontBold : this.fontRegular;
    const x = MARGIN.left + indent;
    const width = A4.width - MARGIN.right - x;
    const lines = this._wrapText(text, font, size, width);
    for (const line of lines) {
      this.ensureSpace(size + 4);
      this.cursorY -= size + 2;
      this.currentPage.drawText(line, {
        x,
        y: this.cursorY,
        size,
        font,
        color: rgb(color[0], color[1], color[2]),
      });
    }
    this.cursorY -= 2;
  }

  drawBullets(items, opts = {}) {
    const size = opts.size || 10;
    const color = opts.color || [0.18, 0.18, 0.22];
    for (const item of items) {
      this.ensureSpace(size + 6);
      this.cursorY -= size + 2;
      // bullet
      this.currentPage.drawText("•", {
        x: MARGIN.left + 4,
        y: this.cursorY,
        size,
        font: this.fontBold,
        color: rgb(0.30, 0.40, 0.55),
      });
      // text wrapped
      const x = MARGIN.left + 16;
      const width = A4.width - MARGIN.right - x;
      const lines = this._wrapText(item, this.fontRegular, size, width);
      this.currentPage.drawText(lines[0] || "", {
        x,
        y: this.cursorY,
        size,
        font: this.fontRegular,
        color: rgb(color[0], color[1], color[2]),
      });
      for (let i = 1; i < lines.length; i++) {
        this.cursorY -= size + 2;
        this.ensureSpace(size + 4);
        this.currentPage.drawText(lines[i], {
          x,
          y: this.cursorY,
          size,
          font: this.fontRegular,
          color: rgb(color[0], color[1], color[2]),
        });
      }
      this.cursorY -= 1;
    }
  }

  drawCallout(title, body, accentColor = [0.20, 0.40, 0.60]) {
    // box-style note. Calculate height.
    const titleSize = 11;
    const bodySize = 10;
    const padding = 8;
    const innerWidth = A4.width - MARGIN.left - MARGIN.right - padding * 2;
    const titleLines = this._wrapText(title, this.fontBold, titleSize, innerWidth);
    const bodyLines = this._wrapText(body, this.fontRegular, bodySize, innerWidth);
    const totalH =
      padding * 2 +
      titleLines.length * (titleSize + 2) +
      bodyLines.length * (bodySize + 3) +
      6;
    this.ensureSpace(totalH + 4);
    this.cursorY -= totalH;
    const top = this.cursorY + totalH;
    // bg
    this.currentPage.drawRectangle({
      x: MARGIN.left,
      y: this.cursorY,
      width: A4.width - MARGIN.left - MARGIN.right,
      height: totalH,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(accentColor[0], accentColor[1], accentColor[2]),
      borderWidth: 0.6,
    });
    // accent stripe left
    this.currentPage.drawRectangle({
      x: MARGIN.left,
      y: this.cursorY,
      width: 3,
      height: totalH,
      color: rgb(accentColor[0], accentColor[1], accentColor[2]),
    });
    let y = top - padding - titleSize;
    for (const line of titleLines) {
      this.currentPage.drawText(line, {
        x: MARGIN.left + padding,
        y,
        size: titleSize,
        font: this.fontBold,
        color: rgb(accentColor[0], accentColor[1], accentColor[2]),
      });
      y -= titleSize + 2;
    }
    y -= 2;
    for (const line of bodyLines) {
      this.currentPage.drawText(line, {
        x: MARGIN.left + padding,
        y,
        size: bodySize,
        font: this.fontRegular,
        color: rgb(0.18, 0.18, 0.22),
      });
      y -= bodySize + 3;
    }
    this.cursorY -= 6;
  }

  drawTable(rows, opts = {}) {
    // rows: array of arrays of strings
    // opts.headerRow: bool
    const size = opts.size || 9;
    const padX = 6;
    const padY = 4;
    const tableWidth = A4.width - MARGIN.left - MARGIN.right;
    const numCols = rows[0].length;
    const colWidths = opts.colWidths || Array(numCols).fill(tableWidth / numCols);

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      // calc row height
      let rowH = 0;
      const wrappedCells = row.map((cell, idx) => {
        const innerW = colWidths[idx] - padX * 2;
        const lines = this._wrapText(String(cell), this.fontRegular, size, innerW);
        const cellH = padY * 2 + lines.length * (size + 2);
        rowH = Math.max(rowH, cellH);
        return lines;
      });
      this.ensureSpace(rowH + 1);
      this.cursorY -= rowH;
      let xCursor = MARGIN.left;
      // bg for header
      if (opts.headerRow && r === 0) {
        this.currentPage.drawRectangle({
          x: MARGIN.left,
          y: this.cursorY,
          width: tableWidth,
          height: rowH,
          color: rgb(0.92, 0.94, 0.97),
        });
      }
      for (let c = 0; c < numCols; c++) {
        // border
        this.currentPage.drawRectangle({
          x: xCursor,
          y: this.cursorY,
          width: colWidths[c],
          height: rowH,
          borderColor: rgb(0.78, 0.80, 0.83),
          borderWidth: 0.4,
          color: undefined,
        });
        // text
        const lines = wrappedCells[c];
        let yLine = this.cursorY + rowH - padY - size;
        const font = (opts.headerRow && r === 0) ? this.fontBold : this.fontRegular;
        for (const line of lines) {
          this.currentPage.drawText(line, {
            x: xCursor + padX,
            y: yLine,
            size,
            font,
            color: rgb(0.18, 0.18, 0.22),
          });
          yLine -= size + 2;
        }
        xCursor += colWidths[c];
      }
    }
    this.cursorY -= 6;
  }

  drawSpacer(h = 8) {
    this.cursorY -= h;
  }

  // Word wrap helper
  _wrapText(text, font, size, maxWidth) {
    if (!text) return [""];
    const result = [];
    const paragraphs = String(text).split("\n");
    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      let current = "";
      for (const word of words) {
        const test = current ? current + " " + word : word;
        const w = font.widthOfTextAtSize(test, size);
        if (w <= maxWidth) {
          current = test;
        } else {
          if (current) result.push(current);
          // word might still be too long; chunk it
          if (font.widthOfTextAtSize(word, size) > maxWidth) {
            let chunk = "";
            for (const ch of word) {
              if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
                result.push(chunk);
                chunk = ch;
              } else {
                chunk += ch;
              }
            }
            current = chunk;
          } else {
            current = word;
          }
        }
      }
      if (current) result.push(current);
      if (paragraphs.length > 1 && para !== paragraphs[paragraphs.length - 1]) {
        result.push(""); // paragraph break
      }
    }
    return result;
  }

  recordToc(title, level = 1) {
    this.tocEntries.push({ title, pageNumber: this.pageNumber, level });
  }

  async save(outPath) {
    this.finalize();
    const bytes = await this.doc.save();
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, bytes);
    return outPath;
  }
}

// ----------------------------------------------------------------
// Sayfa şablonları
// ----------------------------------------------------------------
function drawCoverPage(b, opts) {
  b.newPage(null);  // no header on cover
  // Dark band on top
  b.currentPage.drawRectangle({
    x: 0,
    y: A4.height - 240,
    width: A4.width,
    height: 240,
    color: rgb(0.08, 0.16, 0.32),
  });
  b.currentPage.drawText("DOSPRESSO", {
    x: MARGIN.left,
    y: A4.height - 110,
    size: 36,
    font: b.fontBold,
    color: rgb(1, 1, 1),
  });
  b.currentPage.drawText("Rol Detaylı Raporu", {
    x: MARGIN.left,
    y: A4.height - 145,
    size: 22,
    font: b.fontRegular,
    color: rgb(0.85, 0.90, 0.98),
  });
  b.currentPage.drawText("26 Aktif Rol • Çoklu Perspektif • Öneriler", {
    x: MARGIN.left,
    y: A4.height - 170,
    size: 12,
    font: b.fontRegular,
    color: rgb(0.78, 0.82, 0.92),
  });
  b.currentPage.drawText(`Pilot Day-1: ${PILOT_DATE}`, {
    x: MARGIN.left,
    y: A4.height - 200,
    size: 11,
    font: b.fontBold,
    color: rgb(0.88, 0.92, 1.0),
  });

  // Body
  let y = A4.height - 290;
  const lines = [
    `Üretim tarihi: ${REPORT_DATE}`,
    `Kapsam: DB'de aktif 26 rol`,
    `Toplam kullanıcı: 373 (aktif: ${opts.toplamAktif || "—"})`,
    `Pilot şube: 4 (Işıklar, Antalya Lara, HQ, Fabrika)`,
    `Hazırlık şubesi: 16 (onboarding wizard ile aktivasyon)`,
  ];
  for (const line of lines) {
    b.currentPage.drawText(line, {
      x: MARGIN.left,
      y,
      size: 11,
      font: b.fontRegular,
      color: rgb(0.20, 0.20, 0.25),
    });
    y -= 18;
  }

  y -= 10;
  b.currentPage.drawText("İçindekiler", {
    x: MARGIN.left,
    y,
    size: 14,
    font: b.fontBold,
    color: rgb(0.10, 0.20, 0.40),
  });
  y -= 22;
  const tocBrief = [
    "1. Yönetici Özeti",
    "2. 26 Rolün Kategori Bazlı Listesi",
    "3. Her Rol için Detaylı Bölüm:",
    "    – Tanım, Güncel Durum, Sorumluluklar",
    "    – Günlük İş Akışı",
    "    – Çoklu Perspektifler (operasyonel / stratejik / veri / İK / risk)",
    "    – Modül Yetkileri (DB)",
    "    – Dashboard Widget'ları (DB)",
    "    – Hiyerarşi, Pilot Notu, Bilinen Sorunlar",
    "    – Replit Asistan Önerileri (eksik görev/akış)",
    "4. Genel Sistemik Öneriler",
    "5. Pilot Day-1 Risk Haritası",
  ];
  for (const line of tocBrief) {
    b.currentPage.drawText(line, {
      x: MARGIN.left,
      y,
      size: 10,
      font: b.fontRegular,
      color: rgb(0.25, 0.27, 0.32),
    });
    y -= 14;
  }

  // Footer band
  b.currentPage.drawRectangle({
    x: 0,
    y: 0,
    width: A4.width,
    height: 50,
    color: rgb(0.08, 0.16, 0.32),
  });
  b.currentPage.drawText(
    "Hazırlayan: DOSPRESSO HQ + Replit Asistan",
    { x: MARGIN.left, y: 22, size: 10, font: b.fontRegular, color: rgb(0.85, 0.90, 0.98) }
  );
  b.currentPage.drawText(
    "Confidential — sadece yetkili kullanıcılar için",
    { x: MARGIN.left, y: 8, size: 8, font: b.fontRegular, color: rgb(0.65, 0.72, 0.85) }
  );
}

function drawExecutiveSummary(b, opts) {
  b.pageHeader = "Yönetici Özeti";
  b.newPage();
  b.drawSectionTitle("1. Yönetici Özeti", [0.08, 0.16, 0.32], 20);
  b.drawSpacer(4);

  b.drawParagraph(
    "Bu rapor, DOSPRESSO franchise yönetim platformundaki 26 aktif rolün kapsamlı bir analizidir. " +
    `Pilot Day-1 (${PILOT_DATE}) öncesi 9 günlük bir aralıkta hazırlanmış olup şu üç katmanı içerir:`,
    { size: 10 }
  );
  b.drawSpacer(2);
  b.drawBullets([
    "Mevcut Durum — DB'den canlı çekilmiş kullanıcı sayıları, modül yetkileri, dashboard widget atamaları.",
    "Çoklu Perspektifler — her rol için 5 farklı bakış açısı: operasyonel etkisi, stratejik değeri, veri erişimi, İK perspektifi, risk profili.",
    "Replit Asistan Önerileri — sahanın gözünden eksik görüldüğü tespit edilen görevler, iş akışı iyileştirmeleri ve risk azaltma adımları.",
  ]);
  b.drawSpacer(6);

  b.drawSubheading("Hızlı Resim — DB Snapshot'ı");
  b.drawTable([
    ["Metrik", "Değer", "Yorum"],
    ["DB'de tanımlı toplam rol", "25", "kalite_kontrol legacy (Ümran ayrıldı)"],
    ["Aktif kullanıcısı olan rol", "26", "test/legacy hesaplar dahil"],
    ["Toplam aktif kullanıcı (deleted_at IS NULL)", String(opts.toplamAktif || "—"), "26 rol arasında dağılım"],
    ["Pilot kapsamı (Day-1)", "4 şube + Fabrika", "Işıklar, Antalya Lara, HQ #23, Fabrika #24"],
    ["Hazırlık modu şubesi", "16", "Onboarding wizard ile aktivasyon"],
    ["DB rol→modül yetki kaydı", "1727", "role_module_permissions tablosu"],
    ["DB dashboard widget ataması", "184", "dashboard_role_widgets"],
  ], { headerRow: true, colWidths: [200, 90, 205] });
  b.drawSpacer(8);

  b.drawCallout(
    "Pilot Day-1 için en kritik 5 açık iş",
    "1) Trainer rolü boş (Ece coach'a geçti) — 9 günde tayin veya rol birleştirme şart.\n" +
    "2) CGO Utku'da kalite CRUD eksik — checklist+complaints+product_complaints yetki ekleme.\n" +
    "3) Lara müdür+supervisor generic isim — gerçek franchise sahibinden bilgi.\n" +
    "4) Fabrika depocu pozisyonu boş (test_depocu) — gerçek atama veya Eren çift rol.\n" +
    "5) Recete_gm yedeklemesi yok — Sema yokken reçete CRUD durur.",
    [0.80, 0.30, 0.20]
  );
  b.drawSpacer(6);

  b.drawSubheading("Raporun Okunma Akışı");
  b.drawParagraph(
    "Her rol bölümü 11 zorunlu alan içerir: Tanım, Kapsam, Güncel Durum, Sorumluluklar, Günlük İş Akışı, " +
    "5 boyutlu Perspektif Analizi, Modül Yetkileri (DB), Dashboard Widget'ları (DB), Hiyerarşi, Pilot Notu, " +
    "Bilinen Sorunlar ve Replit Asistan Önerileri. Roller, hızlı erişim için 7 kategoriye ayrılmıştır.",
    { size: 10 }
  );
  b.drawSpacer(4);
  b.drawCallout(
    "Bu raporun mahiyeti",
    "Kuru bir yetki listesi değildir. Her rol için 'sahada nasıl çalışır', 'stratejik değeri nedir', 'risk profili nedir', " +
    "'hangi görevler ya da akışlar eksik' sorularına cevap vermeye çalışır. Replit Asistan Önerileri bölümleri zorunlu değil — " +
    "tartışma açma amaçlıdır. Kabul edilen öneriler R-6 sprintlerine alınabilir.",
    [0.20, 0.45, 0.65]
  );
}

function drawCategoryDivider(b, categoryKey) {
  const cat = CATEGORIES[categoryKey];
  b.pageHeader = `Kategori — ${cat.title}`;
  b.newPage();
  // Big colored band
  b.currentPage.drawRectangle({
    x: 0,
    y: A4.height / 2 - 60,
    width: A4.width,
    height: 120,
    color: rgb(cat.color[0], cat.color[1], cat.color[2]),
  });
  // Title
  const title = `Kategori: ${cat.title}`;
  const titleW = b.fontBold.widthOfTextAtSize(title, 28);
  b.currentPage.drawText(title, {
    x: (A4.width - titleW) / 2,
    y: A4.height / 2 - 5,
    size: 28,
    font: b.fontBold,
    color: rgb(1, 1, 1),
  });
  // Subtitle: which roles in this category
  const rolesInCat = ROLE_ORDER.filter(
    r => ROLES_CONTENT[r] && ROLES_CONTENT[r].category === categoryKey
  );
  const subtitle = rolesInCat.map(r => ROLES_CONTENT[r].displayName).join(" • ");
  const subLines = b._wrapText(subtitle, b.fontRegular, 12, A4.width - 80);
  let y = A4.height / 2 - 35;
  for (const line of subLines) {
    const w = b.fontRegular.widthOfTextAtSize(line, 12);
    b.currentPage.drawText(line, {
      x: (A4.width - w) / 2,
      y,
      size: 12,
      font: b.fontRegular,
      color: rgb(1, 1, 1),
    });
    y -= 16;
  }
  b.cursorY = MARGIN.bottom + 10; // skip rest
}

function drawRoleSection(b, roleKey, dbData) {
  const content = ROLES_CONTENT[roleKey];
  if (!content) return;
  const dbMeta = dbData.rolesMeta.get(roleKey);
  const userInfo = dbData.rolesUsers.get(roleKey) || { aktif: 0, toplam: 0, ornekIsimler: [] };
  const widgets = dbData.roleWidgets.get(roleKey) || [];
  const perms = dbData.rolePerms.get(roleKey) || [];
  const cat = CATEGORIES[content.category] || CATEGORIES.sistem;

  b.pageHeader = `${content.displayName} (${roleKey})`;
  b.newPage();
  b.recordToc(content.displayName, 2);

  // Title block
  b.drawSectionTitle(content.displayName, cat.color, 22);
  b.cursorY -= 4;
  b.drawParagraph(`Rol kodu: ${roleKey}  •  Kategori: ${cat.title}`, {
    size: 9,
    color: [0.45, 0.45, 0.50],
  });
  b.drawSpacer(4);

  // Short purpose callout
  b.drawCallout("Rolün Varlık Sebebi", content.shortPurpose || "—", cat.color);
  b.drawSpacer(2);

  // Basic facts
  b.drawSubheading("Temel Bilgiler");
  b.drawLabelValue("Yetki Kapsamı", content.scope);
  b.drawLabelValue("DB Açıklaması (roles tablosu)", dbMeta ? dbMeta.description : "—");
  b.drawLabelValue("Aktif kullanıcı sayısı", `${userInfo.aktif} (toplam: ${userInfo.toplam})`);
  if (userInfo.ornekIsimler.length > 0) {
    const sample = userInfo.ornekIsimler.slice(0, 6).join(", ") +
      (userInfo.ornekIsimler.length > 6 ? `, ... (+${userInfo.ornekIsimler.length - 6} kişi)` : "");
    b.drawLabelValue("Örnek aktif kullanıcılar", sample);
  }
  b.drawSpacer(4);

  // Description
  b.drawSubheading("Rolün Detaylı Açıklaması");
  b.drawParagraph(content.description);
  b.drawSpacer(2);

  // Current Status
  b.drawCallout("Güncel Durum (26 Apr 2026)", content.currentStatus, [0.30, 0.50, 0.30]);
  b.drawSpacer(4);

  // Responsibilities
  b.drawSubheading("Ana Sorumluluklar");
  b.drawBullets(content.responsibilities);
  b.drawSpacer(4);

  // Daily Flow
  b.drawSubheading("Günlük / Olay Bazlı İş Akışı");
  if (content.dailyFlow) {
    b.drawTable([
      ["Zaman", "Aktivite"],
      ["Sabah (08:00–11:00)", content.dailyFlow.sabah || "—"],
      ["Öğlen (11:00–17:00)", content.dailyFlow.oglen || "—"],
      ["Akşam (17:00–22:00)", content.dailyFlow.aksam || "—"],
    ], { headerRow: true, colWidths: [120, 375] });
  } else if (content.eventDriven) {
    b.drawParagraph("Bu rol sabit günlük akışa sahip değildir; olay-bazlı çalışır:", {
      size: 10, color: [0.40, 0.40, 0.45],
    });
    b.drawBullets(content.eventDriven);
  } else {
    b.drawParagraph("—", { size: 10 });
  }
  b.drawSpacer(6);

  // Multi-perspective analysis
  b.drawSubheading("Çoklu Perspektifler", [0.50, 0.30, 0.10]);
  b.drawSpacer(2);
  const perspLabels = {
    operasyonel: "Operasyonel (sahada nasıl çalışır)",
    stratejik: "Stratejik (şirkete uzun vadeli değeri)",
    veri: "Veri / Analitik (hangi veriye, ne kadar)",
    ik: "İnsan Kaynakları (yetiştirme, yedekleme)",
    risk: "Risk Profili (yokluğunda ne olur)",
  };
  const perspColors = {
    operasyonel: [0.20, 0.45, 0.55],
    stratejik: [0.45, 0.30, 0.65],
    veri: [0.20, 0.55, 0.40],
    ik: [0.55, 0.45, 0.20],
    risk: [0.70, 0.25, 0.20],
  };
  for (const [k, label] of Object.entries(perspLabels)) {
    const text = content.perspectives && content.perspectives[k] ? content.perspectives[k] : "—";
    b.drawCallout(label, text, perspColors[k]);
    b.drawSpacer(1);
  }
  b.drawSpacer(4);

  // Module Permissions (DB)
  b.drawSubheading(`Modül Yetkileri (DB: role_module_permissions, ${perms.length} satır)`);
  if (perms.length === 0) {
    b.drawParagraph("Bu rol için DB'de aktif yetki tanımı bulunmuyor.", { size: 10 });
  } else {
    // group by action level for readability
    const fullAccess = perms.filter(p => p.actions.includes("delete") || p.actions.length >= 3);
    const editAccess = perms.filter(p => !fullAccess.includes(p) && (p.actions.includes("edit") || p.actions.includes("create")));
    const viewOnly = perms.filter(p => !fullAccess.includes(p) && !editAccess.includes(p));

    if (fullAccess.length > 0) {
      b.drawParagraph(`Tam yetki (CRUD): ${fullAccess.length} modül`, {
        size: 10, bold: true, color: [0.55, 0.20, 0.20],
      });
      b.drawParagraph(
        fullAccess.map(p => `${p.module}{${p.actions.join(",")}}`).join(", "),
        { size: 9, color: [0.30, 0.30, 0.35] }
      );
      b.drawSpacer(2);
    }
    if (editAccess.length > 0) {
      b.drawParagraph(`Düzenleme yetkisi (view+create veya edit): ${editAccess.length} modül`, {
        size: 10, bold: true, color: [0.50, 0.40, 0.20],
      });
      b.drawParagraph(
        editAccess.map(p => `${p.module}{${p.actions.join(",")}}`).join(", "),
        { size: 9, color: [0.30, 0.30, 0.35] }
      );
      b.drawSpacer(2);
    }
    if (viewOnly.length > 0) {
      b.drawParagraph(`Sadece görüntüleme: ${viewOnly.length} modül`, {
        size: 10, bold: true, color: [0.20, 0.40, 0.55],
      });
      b.drawParagraph(
        viewOnly.map(p => p.module).join(", "),
        { size: 9, color: [0.30, 0.30, 0.35] }
      );
      b.drawSpacer(2);
    }
  }
  b.drawSpacer(4);

  // Dashboard widgets
  b.drawSubheading(`Dashboard Widget'ları (DB: dashboard_role_widgets, ${widgets.length} adet)`);
  if (widgets.length === 0) {
    b.drawParagraph("Bu rol için dashboard widget ataması yok (genel görünüm kullanır).", { size: 10 });
  } else {
    const rows = [["Sıra", "Widget Anahtarı", "Başlık", "Kategori", "Açık?"]];
    for (const w of widgets) {
      rows.push([
        String(w.order),
        w.key,
        w.title,
        w.category,
        w.defaultOpen ? "✓ Açık" : "Kapalı",
      ]);
    }
    b.drawTable(rows, { headerRow: true, colWidths: [40, 120, 175, 80, 80] });
  }
  b.drawSpacer(6);

  // Hierarchy
  b.drawSubheading("Hiyerarşi ve Pilot Notu");
  b.drawLabelValue("Kime rapor verir", content.hierarchy ? content.hierarchy.reportsTo : "—");
  b.drawLabelValue("Kimleri yönetir", content.hierarchy ? content.hierarchy.manages : "—");
  b.drawSpacer(2);
  b.drawCallout("Pilot Day-1 Notu", content.pilotNote || "—", [0.30, 0.40, 0.60]);
  b.drawSpacer(4);

  // Known issues
  b.drawSubheading("Bilinen Sorunlar (R-6 Backlog ve Tespitler)");
  if (content.knownIssues && content.knownIssues.length > 0) {
    b.drawBullets(content.knownIssues);
  } else {
    b.drawParagraph("Şu an bilinen kritik sorun yok.", { size: 10 });
  }
  b.drawSpacer(6);

  // Replit Asistan recommendations
  b.drawSubheading("Replit Asistan Önerileri (eksik görevler ve akış iyileştirme)", [0.60, 0.30, 0.50]);
  if (content.recommendations && content.recommendations.length > 0) {
    b.drawBullets(content.recommendations);
  } else {
    b.drawParagraph("Şu an ek öneri tespit edilmedi.", { size: 10 });
  }
  b.drawSpacer(8);
}

function drawSystemicRecommendations(b) {
  b.pageHeader = "Genel Sistemik Öneriler";
  b.newPage();
  b.drawSectionTitle("4. Genel Sistemik Öneriler", [0.08, 0.16, 0.32], 20);
  b.drawSpacer(4);

  b.drawParagraph(
    "Aşağıdaki öneriler tek role bağlı değildir; sistemin tamamına etki eder. Pilot başarısını artıracak ve R-6 öncesi konuşulması gereken konulardır.",
    { size: 10 }
  );
  b.drawSpacer(4);

  b.drawSubheading("4.1 Yedekleme ve Tek Nokta Arıza (TNA) Riski");
  b.drawParagraph(
    "Sistemin kritik rollerinde tek operasyonel kişi var: trainer (boş!), recete_gm (Sema), gida_muhendisi (Sema), satınalma (Samet), muhasebe_ik (Mahmut), destek (Ayşe), teknik (Murat), fabrika_mudur (Eren), uretim_sefi (Ümit). Bu kişilerden biri 7+ gün izinli/raporlu olduğunda sistemin o yetenek alanı durur."
  );
  b.drawCallout(
    "Öneri: 'Acting Role' Mekanizması",
    "Her kritik role 'acting' (geçici yetki devri) bayrağı eklenebilir. Örneğin Sema 7+ gün yokken otomatik admin'e bildirim → admin onaylı olarak başka kullanıcı geçici recete_gm yetkisi alır. user_role_assignments tablosu (mevcut user_role single field değişimi yerine) ile yapılır.",
    [0.55, 0.30, 0.25]
  );
  b.drawSpacer(4);

  b.drawSubheading("4.2 Eğitim Açığı — Pilot Day-1 Hazırlığı");
  b.drawParagraph(
    "Trainer rolü boş (Ece coach'a geçti, devir tam değil). Pilot Day-1'de 270 hedef kullanıcının sistemi nasıl kullanacağı eğitim seti hazır değil. Akademi modülü altyapısı var, içerik üretimi eksik."
  );
  b.drawCallout(
    "Öneri: 9 Günlük 'Pilot Eğitim Sprinti'",
    "1) Aslan ses kaydı ile 5 dakikalık 10 modül (PDKS, vardiya, izin, sipariş, görev, akademi). 2) Her role özel 1-2 modül. 3) Mr. Dobody pilot Day-1 ilk login'de bu modülleri zorunlu açar. 4) Tamamlama sertifikası → 'Pilot Hazır' rozeti.",
    [0.20, 0.55, 0.35]
  );
  b.drawSpacer(4);

  b.drawSubheading("4.3 Çoklu Hesap (Duplicate) Konsolidasyonu");
  b.drawParagraph(
    "Sema (sema + RGM) ve Ümit (Umit + umit) kişileri iki ayrı hesap kullanıyor — manuel login değişimi gerekiyor. Bu hem yorgunluk hem hata riski."
  );
  b.drawCallout(
    "Öneri: user_roles many-to-many",
    "Mevcut users.role tek değer. user_roles (user_id, role) çoklu tablosu eklenirse, Sema tek hesapla iki yetki taşıyabilir. Login'den sonra rol seçici (üst menüde) ile bağlamı değiştirir. Audit log'da hangi rolde hangi işlem yapıldı net görünür.",
    [0.55, 0.30, 0.45]
  );
  b.drawSpacer(4);

  b.drawSubheading("4.4 Mr. Dobody Çoklu Skill Genişletmesi");
  b.drawParagraph(
    "Mr. Dobody şu an late_arrival_tracker skill'i ile günlük geç gelme takibi yapıyor. Diğer kritik roller için benzer skill eklenebilir."
  );
  b.drawBullets([
    "investor_monthly_report (yatırımcı): aylık otomatik PDF + mail",
    "factory_capacity_alert (fabrika_mudur): kapasite %80 üzerine çıkınca uyarı",
    "recipe_cost_drift (recete_gm): 7 gün içinde maliyet %5+ değişen reçeteler",
    "ticket_sla_breach (destek): SLA dışına çıkan ticket'lar Aslan'a eskalasyon",
    "supervisor_promotion_ready (mudur+coach): supervisor terfi kriterlerini karşılayan kişiler",
    "barista_academy_overdue (mudur): 14 gün akademi ilerletmemiş baristalar",
  ]);
  b.drawSpacer(4);

  b.drawSubheading("4.5 Audit ve Şeffaflık");
  b.drawParagraph(
    "permission_audit_logs ve audit_logs tabloları DB'de mevcut ama UI'da bunları gösteren ekran yok. Pilot süresince 'kim ne yaptı' sorusunun cevabı tek bir yerden gelmeli."
  );
  b.drawCallout(
    "Öneri: 'Sistem Olayları' Sayfası",
    "ayarlar.tsx altına yeni sekme: 'Sistem Olayları'. Filtre: kullanıcı, modül, tarih aralığı, eylem (login, edit, delete, lock-aşma). Admin rolüne özel. Pilot süresince günlük 'şüpheli aktivite' raporu otomatik üretilir.",
    [0.20, 0.30, 0.55]
  );
  b.drawSpacer(4);

  b.drawSubheading("4.6 Bildirim ve Eskalasyon");
  b.drawParagraph(
    "4-katmanlı notification sistemi (operasyonel/tactical/strategic/personal) var ama eskalasyon kuralları statik. Pilot süresince dinamik kurallara ihtiyaç doğacak."
  );
  b.drawBullets([
    "Kritik bildirim 30 dakika okunmazsa → bir üst seviyeye kopyala (örn. mudur→coach→cgo)",
    "Tekrarlayan bildirim (3 günde 3+ kez) → otomatik dosyalama veya ek aksiyon önerisi",
    "Pilot Day-1'de 'sessiz mod' (gece 23:00-07:00) — sadece kritik geçer",
    "Bildirim sayısı dashboard widget'ı (kim ne kadar bildirim aldı, okudu, uyguladı)",
  ]);
  b.drawSpacer(4);

  b.drawSubheading("4.7 Pilot Sonrası Ders Çıkarma");
  b.drawParagraph(
    "Pilot 5 May 2026 sonrası 30 günlük 'lessons learned' çalışması yapılmalı. Bu raporun 2. versiyonu pilot verisi ile zenginleştirilebilir."
  );
}

function drawRiskMatrix(b) {
  b.pageHeader = "Pilot Day-1 Risk Haritası";
  b.newPage();
  b.drawSectionTitle("5. Pilot Day-1 Risk Haritası", [0.08, 0.16, 0.32], 20);
  b.drawSpacer(4);

  b.drawParagraph(
    "Pilot Day-1'e 9 gün kala, raporun bütününden çıkarılan en yüksek risk faktörleri ve önerilen aksiyon planı:",
    { size: 10 }
  );
  b.drawSpacer(4);

  b.drawTable([
    ["Risk", "Etki", "Öncelik", "Önerilen Aksiyon"],
    ["Trainer rolü boş (eğitim sahibi)", "Yüksek", "P0", "Ece coach+trainer çift rol veya yeni atama (5 gün içinde)"],
    ["CGO kalite CRUD eksik", "Yüksek", "P0", "checklist+complaints+product_complaints yetkisi SQL ile ekle"],
    ["Lara müdür/supervisor generic", "Orta", "P1", "Franchise sahibi ile gerçek isim koordinasyonu"],
    ["Fabrika depo pozisyonu boş", "Yüksek", "P0", "Gerçek depocu atama veya Eren çift rol kararı"],
    ["Recete_gm yedek yok (Sema)", "Yüksek", "P1", "recete_gm_yardimcisi rolü tanımı (lock yetkisi olmadan)"],
    ["Pilot kullanıcı eğitim seti yok", "Yüksek", "P0", "9 gün sprint: Aslan + coach 10 modül üret"],
    ["Ayşe destek tek nokta arıza", "Orta", "P1", "Pilot 1. hafta için ek destek personeli"],
    ["Sema duplicate hesap", "Düşük", "P2", "R-6'da user_roles M2M çözümü"],
    ["Ümit duplicate hesap", "Düşük", "P2", "R-6'da konsolidasyon"],
    ["Test hesapları aktif (test_hq_all, test_depocu)", "Düşük", "P1", "Pilot öncesi is_active=false (1 SQL)"],
    ["Müdür yedek devri yok", "Orta", "P1", "Supervisor 'acting mudur' kuralı"],
    ["Akademi tamamlama oranı düşük (barista)", "Yüksek", "P0", "9 gün hedef: %80 tamamlama push"],
  ], { headerRow: true, colWidths: [180, 60, 50, 205] });
  b.drawSpacer(8);

  b.drawCallout(
    "Pilot Day-1 'Go / No-Go' Eşikleri (önerilen)",
    "GO: Tüm P0 riskler kapanmış, P1'lerin %80'i çözüm yolunda, eğitim tamamlama %75+, kiosk donanımı 22/22 hazır.\n" +
    "NO-GO: P0'lardan biri açık (özellikle eğitim seti veya trainer atama), kiosk hazır şube < 18, kritik personel SLA tanımsız.",
    [0.70, 0.25, 0.20]
  );
  b.drawSpacer(6);

  b.drawSubheading("Pilot Sonrası Tekrar Değerlendirme");
  b.drawParagraph(
    "Bu rapor 30 gün sonrası yenilenmeli (Haziran 2026). Pilot verisiyle zenginleştirilen 2. versiyonda gerçek aktivite bazlı KPI'lar yer alacak (kim ne kadar login, hangi modülü kullandı, hangi rolün eğitim açığı kapandı)."
  );
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
async function main() {
  console.log("=> DB verilerini yüklüyorum...");
  const dbData = await loadDbData();

  // toplam aktif user
  let toplamAktif = 0;
  for (const u of dbData.rolesUsers.values()) toplamAktif += u.aktif;
  console.log(`   ${dbData.rolesUsers.size} rol, ${toplamAktif} aktif kullanıcı.`);

  // ============================================================
  // 1. MASTER PDF
  // ============================================================
  console.log("\n=> Master PDF üretiliyor...");
  const master = new PdfBuilder();
  await master.init();
  drawCoverPage(master, { toplamAktif });
  drawExecutiveSummary(master, { toplamAktif });

  // Roles by category, with category divider page
  const categoriesUsed = [];
  for (const r of ROLE_ORDER) {
    if (ROLES_CONTENT[r] && !categoriesUsed.includes(ROLES_CONTENT[r].category)) {
      categoriesUsed.push(ROLES_CONTENT[r].category);
    }
  }

  let roleIdx = 0;
  for (const catKey of categoriesUsed) {
    drawCategoryDivider(master, catKey);
    for (const r of ROLE_ORDER) {
      const c = ROLES_CONTENT[r];
      if (!c || c.category !== catKey) continue;
      roleIdx += 1;
      console.log(`   [${roleIdx}/${ROLE_ORDER.length}] ${c.displayName} (${r}) işleniyor...`);
      drawRoleSection(master, r, dbData);
    }
  }

  drawSystemicRecommendations(master);
  drawRiskMatrix(master);

  const masterPath = path.join(OUTPUT_DIR, "dospresso-rol-raporu-2026-04-26.pdf");
  await master.save(masterPath);
  console.log(`   ✓ ${masterPath} (${master.pageNumber} sayfa)`);

  // ============================================================
  // 2. PER-ROLE PDFs
  // ============================================================
  console.log("\n=> Her rol için ayrı PDF üretiliyor...");
  await fs.mkdir(PER_ROLE_DIR, { recursive: true });
  const perRolePaths = [];
  for (let i = 0; i < ROLE_ORDER.length; i++) {
    const r = ROLE_ORDER[i];
    const c = ROLES_CONTENT[r];
    if (!c) continue;
    const single = new PdfBuilder();
    await single.init();
    // mini cover
    single.newPage(null);
    const cat = CATEGORIES[c.category] || CATEGORIES.sistem;
    single.currentPage.drawRectangle({
      x: 0, y: A4.height - 200, width: A4.width, height: 200,
      color: rgb(cat.color[0], cat.color[1], cat.color[2]),
    });
    single.currentPage.drawText("DOSPRESSO • Rol Detayı", {
      x: MARGIN.left, y: A4.height - 80, size: 14,
      font: single.fontRegular, color: rgb(1, 1, 1),
    });
    single.currentPage.drawText(c.displayName, {
      x: MARGIN.left, y: A4.height - 130, size: 32,
      font: single.fontBold, color: rgb(1, 1, 1),
    });
    single.currentPage.drawText(`${r}  •  ${cat.title}`, {
      x: MARGIN.left, y: A4.height - 160, size: 11,
      font: single.fontRegular, color: rgb(0.92, 0.95, 1.0),
    });
    single.currentPage.drawText(`${REPORT_DATE}  •  Pilot ${PILOT_DATE}`, {
      x: MARGIN.left, y: A4.height - 180, size: 10,
      font: single.fontRegular, color: rgb(0.85, 0.90, 0.98),
    });
    single.cursorY = A4.height - 230;

    drawRoleSection(single, r, dbData);

    const out = path.join(PER_ROLE_DIR, `${String(i + 1).padStart(2, "0")}-${r}.pdf`);
    await single.save(out);
    perRolePaths.push(out);
    console.log(`   ✓ ${out}`);
  }

  // ============================================================
  // 3. ZIP
  // ============================================================
  console.log("\n=> ZIP arşivi oluşturuluyor...");
  const zipPath = path.join(OUTPUT_DIR, "dospresso-rol-raporu-per-role.zip");
  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    for (const p of perRolePaths) {
      archive.file(p, { name: path.basename(p) });
    }
    archive.finalize();
  });
  const zipStat = await fs.stat(zipPath);
  console.log(`   ✓ ${zipPath} (${(zipStat.size / 1024).toFixed(1)} KB)`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n========================================");
  console.log(`Master PDF:    ${masterPath} (${master.pageNumber} sayfa)`);
  console.log(`Per-role PDFs: ${perRolePaths.length} adet → ${PER_ROLE_DIR}/`);
  console.log(`ZIP:           ${zipPath}`);
  console.log("========================================");
}

main().catch(err => {
  console.error("HATA:", err);
  process.exit(1);
});
