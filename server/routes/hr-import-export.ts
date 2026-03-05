import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { hasPermission } from "../permission-service";
import { createAuditEntry, getAuditContext } from "../audit";
import { eq, and, inArray, notInArray, isNull, desc, gte, lte } from "drizzle-orm";
import {
  isHQRole,
  isBranchRole,
  isFactoryFloorRole,
  users,
  branches,
  titles,
  importBatches,
  importResults,
  leaveRequests,
  employeeWarnings,
  employeeTerminations,
  type UserRoleType as UserRoleTypeSchema,
} from "@shared/schema";
import bcrypt from "bcrypt";
import multer from "multer";
import ExcelJS from "exceljs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".xlsx")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece Excel (.xlsx) dosyaları desteklenir."));
    }
  },
});

const router = Router();

const HQ_BRANCH_ID = 23;
const FACTORY_BRANCH_ID = 24;

const EXPORT_COLUMNS = [
  { header: "ID", key: "id", width: 36 },
  { header: "Kullanıcı Adı", key: "username", width: 18 },
  { header: "Ad", key: "firstName", width: 15 },
  { header: "Soyad", key: "lastName", width: 15 },
  { header: "E-posta", key: "email", width: 25 },
  { header: "Rol", key: "role", width: 18 },
  { header: "Şube ID", key: "branchId", width: 10 },
  { header: "Şube Adı", key: "branchName", width: 20 },
  { header: "TC Kimlik No", key: "tckn", width: 14 },
  { header: "Cinsiyet", key: "gender", width: 10 },
  { header: "Medeni Hal", key: "maritalStatus", width: 12 },
  { header: "İşe Giriş", key: "hireDate", width: 12 },
  { header: "Deneme Bitiş", key: "probationEndDate", width: 12 },
  { header: "Doğum Tarihi", key: "birthDate", width: 12 },
  { header: "Telefon", key: "phoneNumber", width: 15 },
  { header: "Ev Telefon", key: "homePhone", width: 15 },
  { header: "Acil Kişi", key: "emergencyContactName", width: 18 },
  { header: "Acil Telefon", key: "emergencyContactPhone", width: 15 },
  { header: "Adres", key: "address", width: 30 },
  { header: "Şehir", key: "city", width: 12 },
  { header: "Departman", key: "department", width: 15 },
  { header: "Çalışma Tipi", key: "employmentType", width: 12 },
  { header: "Haftalık Saat", key: "weeklyHours", width: 10 },
  { header: "Eğitim Seviye", key: "educationLevel", width: 15 },
  { header: "Eğitim Durum", key: "educationStatus", width: 12 },
  { header: "Eğitim Kurum", key: "educationInstitution", width: 20 },
  { header: "Askerlik", key: "militaryStatus", width: 12 },
  { header: "Sözleşme Tipi", key: "contractType", width: 12 },
  { header: "Çocuk Sayısı", key: "numChildren", width: 10 },
  { header: "Engel Durumu", key: "disabilityLevel", width: 12 },
  { header: "Net Maaş", key: "netSalary", width: 12 },
  { header: "Yemek Yardımı", key: "mealAllowance", width: 12 },
  { header: "Ulaşım Yardımı", key: "transportAllowance", width: 12 },
  { header: "Prim Matrah", key: "bonusBase", width: 12 },
  { header: "Ünvan", key: "titleName", width: 18 },
  { header: "Ünvan ID", key: "titleId", width: 10 },
  { header: "Kategori", key: "category", width: 12 },
  { header: "Durum", key: "isActive", width: 8 },
  { header: "Hesap Durum", key: "accountStatus", width: 12 },
  { header: "Notlar", key: "notes", width: 30 },
];

const IMPORT_FIELD_MAP: Record<string, string> = {
  "Kullanıcı Adı": "username",
  "Username": "username",
  "Ad": "firstName",
  "Soyad": "lastName",
  "E-posta": "email",
  "Email": "email",
  "Rol": "role",
  "Role": "role",
  "Şube ID": "branchId",
  "TC Kimlik No": "tckn",
  "TCKN": "tckn",
  "Cinsiyet": "gender",
  "Medeni Hal": "maritalStatus",
  "İşe Giriş": "hireDate",
  "Deneme Bitiş": "probationEndDate",
  "Doğum Tarihi": "birthDate",
  "Telefon": "phoneNumber",
  "Ev Telefon": "homePhone",
  "Acil Kişi": "emergencyContactName",
  "Acil Telefon": "emergencyContactPhone",
  "Adres": "address",
  "Şehir": "city",
  "Departman": "department",
  "Çalışma Tipi": "employmentType",
  "Haftalık Saat": "weeklyHours",
  "Eğitim Seviye": "educationLevel",
  "Eğitim Durum": "educationStatus",
  "Eğitim Kurum": "educationInstitution",
  "Askerlik": "militaryStatus",
  "Sözleşme Tipi": "contractType",
  "Çocuk Sayısı": "numChildren",
  "Engel Durumu": "disabilityLevel",
  "Net Maaş": "netSalary",
  "Yemek Yardımı": "mealAllowance",
  "Ulaşım Yardımı": "transportAllowance",
  "Prim Matrah": "bonusBase",
  "Notlar": "notes",
  "Şifre": "password",
  "ID": "id",
  "Ünvan": "titleName",
  "Ünvan ID": "titleId",
  "Title": "titleName",
  "Title ID": "titleId",
  "Kategori": "category",
  "Category": "category",
};

function isAdminUser(u: any): boolean {
  return u.role === "admin" || u.isSystemUser === true;
}

function validateRowData(row: Record<string, any>, rowNum: number): string[] {
  const errors: string[] = [];
  if (!row.firstName?.toString().trim()) errors.push(`Satır ${rowNum}: Ad zorunludur`);
  if (!row.lastName?.toString().trim()) errors.push(`Satır ${rowNum}: Soyad zorunludur`);
  if (!row.username?.toString().trim()) errors.push(`Satır ${rowNum}: Kullanıcı adı zorunludur`);
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.toString())) {
    errors.push(`Satır ${rowNum}: Geçersiz e-posta formatı`);
  }
  if (row.netSalary && isNaN(Number(row.netSalary))) {
    errors.push(`Satır ${rowNum}: Maaş sayısal olmalı`);
  }
  if (row.weeklyHours && isNaN(Number(row.weeklyHours))) {
    errors.push(`Satır ${rowNum}: Haftalık saat sayısal olmalı`);
  }
  return errors;
}

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  const s = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(s)) {
    const parts = s.split(/[./-]/);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return s;
}

// ─── EXPORT ──────────────────────────────────────────────

function getEmployeeCategory(emp: any): string {
  if (!emp.branchId || emp.branchId === HQ_BRANCH_ID) return "HQ";
  if (emp.branchId === FACTORY_BRANCH_ID) return "Fabrika";
  return "Şube";
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
}

router.post("/api/hr/employees/export", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Export yetkisi yok" });
    }

    const { scope, branchIds, roleFilter, statusFilter, hireDateFrom, hireDateTo, exportType, titleFilter } = req.body;

    let conditions: any[] = [isNull(users.deletedAt)];

    if (scope === "hq") {
      conditions.push(isNull(users.branchId));
    } else if (scope === "factory") {
      conditions.push(eq(users.branchId, FACTORY_BRANCH_ID));
    } else if (scope === "branch" && branchIds?.length) {
      conditions.push(inArray(users.branchId, branchIds.map(Number)));
    }

    if (roleFilter && roleFilter !== "all_roles") {
      conditions.push(eq(users.role, roleFilter));
    }
    if (statusFilter === "active") {
      conditions.push(eq(users.isActive, true));
    } else if (statusFilter === "inactive") {
      conditions.push(eq(users.isActive, false));
    }
    if (titleFilter && titleFilter !== "all_titles") {
      conditions.push(eq(users.titleId, parseInt(titleFilter)));
    }
    if (hireDateFrom) {
      conditions.push(gte(users.hireDate, hireDateFrom));
    }
    if (hireDateTo) {
      conditions.push(lte(users.hireDate, hireDateTo));
    }

    const allBranches = await db.select({ id: branches.id, name: branches.name }).from(branches);
    const branchMap = new Map(allBranches.map(b => [b.id, b.name]));

    const allTitles = await db.select({ id: titles.id, name: titles.name }).from(titles);
    const titleMap = new Map(allTitles.map(t => [t.id, t.name]));

    const employees = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(5000);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DOSPRESSO";
    workbook.created = new Date();

    const mainSheet = workbook.addWorksheet("Personeller");
    mainSheet.columns = EXPORT_COLUMNS;
    styleHeaderRow(mainSheet);

    for (const emp of employees) {
      mainSheet.addRow({
        ...emp,
        branchName: emp.branchId ? branchMap.get(emp.branchId) || "" : "HQ",
        titleName: emp.titleId ? titleMap.get(emp.titleId) || "" : "",
        category: getEmployeeCategory(emp),
        isActive: emp.isActive ? "Aktif" : "Pasif",
      });
    }

    if (exportType === "detailed") {
      const empIds = employees.map(e => e.id);

      // B) Employment Sheet
      const empSheet = workbook.addWorksheet("İstihdam");
      empSheet.columns = [
        { header: "Personel ID", key: "id", width: 36 },
        { header: "Ad Soyad", key: "fullName", width: 20 },
        { header: "İşe Giriş", key: "hireDate", width: 12 },
        { header: "Deneme Bitiş", key: "probationEndDate", width: 12 },
        { header: "Çalışma Tipi", key: "employmentType", width: 12 },
        { header: "Haftalık Saat", key: "weeklyHours", width: 10 },
        { header: "Sözleşme Tipi", key: "contractType", width: 12 },
        { header: "Durum", key: "isActive", width: 8 },
        { header: "Ayrılış Tarihi", key: "leaveStartDate", width: 12 },
        { header: "Ayrılış Nedeni", key: "leaveReason", width: 25 },
      ];
      styleHeaderRow(empSheet);
      for (const emp of employees) {
        empSheet.addRow({
          id: emp.id,
          fullName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          hireDate: emp.hireDate,
          probationEndDate: emp.probationEndDate,
          employmentType: emp.employmentType || "",
          weeklyHours: emp.weeklyHours || "",
          contractType: emp.contractType || "",
          isActive: emp.isActive ? "Aktif" : "Pasif",
          leaveStartDate: emp.leaveStartDate || "",
          leaveReason: emp.leaveReason || "",
        });
      }

      if (empIds.length > 0) {
        // C) Leave Sheet
        const leavesSheet = workbook.addWorksheet("İzinler");
        leavesSheet.columns = [
          { header: "Personel ID", key: "userId", width: 36 },
          { header: "İzin Tipi", key: "type", width: 15 },
          { header: "Başlangıç", key: "startDate", width: 12 },
          { header: "Bitiş", key: "endDate", width: 12 },
          { header: "Gün", key: "days", width: 8 },
          { header: "Durum", key: "status", width: 10 },
          { header: "Açıklama", key: "reason", width: 30 },
        ];
        styleHeaderRow(leavesSheet);

        const leaves = await db
          .select()
          .from(leaveRequests)
          .where(inArray(leaveRequests.userId, empIds))
          .limit(10000);

        for (const l of leaves) {
          leavesSheet.addRow(l);
        }

        // D) Payroll Sheet
        const payrollSheet = workbook.addWorksheet("Maaş");
        payrollSheet.columns = [
          { header: "Personel ID", key: "id", width: 36 },
          { header: "Ad Soyad", key: "fullName", width: 20 },
          { header: "Rol", key: "role", width: 15 },
          { header: "Şube", key: "branchName", width: 18 },
          { header: "Net Maaş", key: "netSalary", width: 12 },
          { header: "Yemek Yardımı", key: "mealAllowance", width: 12 },
          { header: "Ulaşım Yardımı", key: "transportAllowance", width: 12 },
          { header: "Prim Matrah", key: "bonusBase", width: 12 },
          { header: "Prim Tipi", key: "bonusType", width: 12 },
          { header: "Prim Oranı (%)", key: "bonusPercentage", width: 12 },
        ];
        styleHeaderRow(payrollSheet);
        for (const emp of employees) {
          payrollSheet.addRow({
            id: emp.id,
            fullName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            role: emp.role,
            branchName: emp.branchId ? branchMap.get(emp.branchId) || "" : "HQ",
            netSalary: emp.netSalary || "",
            mealAllowance: emp.mealAllowance || "",
            transportAllowance: emp.transportAllowance || "",
            bonusBase: emp.bonusBase || "",
            bonusType: emp.bonusType || "",
            bonusPercentage: emp.bonusPercentage || "",
          });
        }

        // E) Discipline Sheet
        const warningsSheet = workbook.addWorksheet("Disiplin");
        warningsSheet.columns = [
          { header: "Personel ID", key: "employeeId", width: 36 },
          { header: "Tip", key: "type", width: 15 },
          { header: "Açıklama", key: "description", width: 40 },
          { header: "Tarih", key: "date", width: 12 },
        ];
        styleHeaderRow(warningsSheet);

        const warnings = await db
          .select()
          .from(employeeWarnings)
          .where(inArray(employeeWarnings.userId, empIds))
          .limit(10000);

        for (const w of warnings) {
          warningsSheet.addRow(w);
        }

        // F) Documents/Özlük Sheet (metadata placeholders)
        const docsSheet = workbook.addWorksheet("Özlük Belgeleri");
        docsSheet.columns = [
          { header: "Personel ID", key: "employeeId", width: 36 },
          { header: "Ad Soyad", key: "fullName", width: 20 },
          { header: "TC Kimlik No", key: "tckn", width: 14 },
          { header: "Doğum Tarihi", key: "birthDate", width: 12 },
          { header: "Cinsiyet", key: "gender", width: 10 },
          { header: "Medeni Hal", key: "maritalStatus", width: 12 },
          { header: "Çocuk Sayısı", key: "numChildren", width: 10 },
          { header: "Eğitim Seviye", key: "educationLevel", width: 15 },
          { header: "Eğitim Kurum", key: "educationInstitution", width: 20 },
          { header: "Askerlik", key: "militaryStatus", width: 12 },
          { header: "Engel Durumu", key: "disabilityLevel", width: 12 },
          { header: "Adres", key: "address", width: 30 },
          { header: "Şehir", key: "city", width: 12 },
          { header: "Belge Türü", key: "docType", width: 15 },
          { header: "Belge URL", key: "docUrl", width: 30 },
        ];
        styleHeaderRow(docsSheet);
        for (const emp of employees) {
          docsSheet.addRow({
            employeeId: emp.id,
            fullName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            tckn: emp.tckn || "",
            birthDate: emp.birthDate || "",
            gender: emp.gender || "",
            maritalStatus: emp.maritalStatus || "",
            numChildren: emp.numChildren ?? "",
            educationLevel: emp.educationLevel || "",
            educationInstitution: emp.educationInstitution || "",
            militaryStatus: emp.militaryStatus || "",
            disabilityLevel: emp.disabilityLevel || "",
            address: emp.address || "",
            city: emp.city || "",
            docType: "",
            docUrl: "",
          });
        }

        // Terminations Sheet
        const termSheet = workbook.addWorksheet("Ayrılışlar");
        termSheet.columns = [
          { header: "Personel ID", key: "employeeId", width: 36 },
          { header: "Ayrılış Tarihi", key: "terminationDate", width: 12 },
          { header: "Ayrılış Tipi", key: "terminationType", width: 15 },
          { header: "Sebep", key: "reason", width: 30 },
        ];
        styleHeaderRow(termSheet);

        const terms = await db
          .select()
          .from(employeeTerminations)
          .where(inArray(employeeTerminations.userId, empIds))
          .limit(10000);

        for (const t of terms) {
          termSheet.addRow(t);
        }
      }
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=dospresso_personel_${new Date().toISOString().split("T")[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.export",
      action: "export",
      resource: "employees",
      details: { scope, count: employees.length, exportType, titleFilter, hireDateFrom, hireDateTo },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Export sırasında hata oluştu" });
  }
});

// ─── IMPORT DRY-RUN ──────────────────────────────────────

router.post("/api/hr/employees/import/dry-run", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Import yetkisi yok" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Dosya yüklenmedi" });
    }

    const mode = req.body.mode || "upsert";
    const matchKey = req.body.matchKey || "username";

    let customMapping: Record<string, string> | null = null;
    try {
      if (req.body.columnMapping) {
        customMapping = JSON.parse(req.body.columnMapping);
      }
    } catch {}

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return res.status(400).json({ message: "Excel dosyası boş veya başlık satırı eksik" });
    }

    const headerRow = sheet.getRow(1);
    const colMap: Record<number, string> = {};
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().trim() || "";
      if (customMapping && customMapping[header]) {
        const mapped = customMapping[header];
        if (mapped !== "__skip__") colMap[colNumber] = mapped;
      } else {
        colMap[colNumber] = IMPORT_FIELD_MAP[header] || header;
      }
    });

    const rows: { rowNumber: number; data: Record<string, any> }[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const data: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const field = colMap[colNumber];
        if (field) {
          data[field] = cell.value;
        }
      });
      if (Object.keys(data).length > 0) {
        rows.push({ rowNumber, data });
      }
    });

    const existingUsers = await db.select().from(users).where(isNull(users.deletedAt));
    const usernameMap = new Map(existingUsers.filter(u => u.username).map(u => [u.username!.toLocaleLowerCase('tr-TR'), u]));
    const emailMap = new Map(existingUsers.filter(u => u.email).map(u => [u.email!.toLocaleLowerCase('tr-TR'), u]));
    const idMap = new Map(existingUsers.map(u => [u.id, u]));

    const results: { rowNumber: number; status: string; message: string; employeeId?: string }[] = [];
    let toCreate = 0, toUpdate = 0, toSkip = 0, toError = 0;

    for (const { rowNumber, data } of rows) {
      const validationErrors = validateRowData(data, rowNumber);
      if (validationErrors.length > 0) {
        results.push({ rowNumber, status: "error", message: validationErrors.join("; ") });
        toError++;
        continue;
      }

      let existing: any = null;
      if (matchKey === "employeeId" && data.id) {
        existing = idMap.get(data.id);
      } else if (data.id && idMap.has(data.id)) {
        existing = idMap.get(data.id);
      } else if (matchKey === "email" && data.email) {
        existing = emailMap.get(data.email.toString().toLocaleLowerCase('tr-TR'));
      } else if (matchKey === "username" && data.username) {
        existing = usernameMap.get(data.username.toString().toLocaleLowerCase('tr-TR'));
      } else if (data.username) {
        existing = usernameMap.get(data.username.toString().toLocaleLowerCase('tr-TR'));
      }

      if (existing && isAdminUser(existing)) {
        results.push({
          rowNumber,
          status: "skip",
          message: "Admin kullanıcılar import ile değiştirilemez",
          employeeId: existing.id,
        });
        toSkip++;
        continue;
      }

      if (existing) {
        if (mode === "append") {
          results.push({
            rowNumber,
            status: "skip",
            message: `Mevcut kullanıcı (${existing.username}). Append modda güncelleme yapılmaz.`,
            employeeId: existing.id,
          });
          toSkip++;
        } else if (mode === "update" || mode === "upsert") {
          results.push({
            rowNumber,
            status: "update",
            message: `Mevcut kullanıcı güncellenecek: ${existing.username}`,
            employeeId: existing.id,
          });
          toUpdate++;
        }
      } else {
        if (mode === "update") {
          results.push({
            rowNumber,
            status: "skip",
            message: `Mevcut kullanıcı bulunamadı (${data.username || data.email || "?"}). Update modda yeni kayıt eklenmez.`,
          });
          toSkip++;
          continue;
        }
        if (!data.password && !data.hashedPassword) {
          results.push({ rowNumber, status: "error", message: "Yeni kullanıcı için şifre zorunlu (Şifre kolonu)" });
          toError++;
          continue;
        }
        results.push({
          rowNumber,
          status: "create",
          message: `Yeni kullanıcı oluşturulacak: ${data.username}`,
        });
        toCreate++;
      }
    }

    let toDeactivate = 0;
    let deactivateTargets: { id: string; username: string }[] = [];
    if (mode === "deactivate_missing") {
      const importedIds = new Set<string>();
      for (const { data } of rows) {
        let matched: any = null;
        if (matchKey === "employeeId" && data.id) matched = idMap.get(data.id);
        else if (matchKey === "email" && data.email) matched = emailMap.get(data.email.toString().toLocaleLowerCase('tr-TR'));
        else if (data.username) matched = usernameMap.get(data.username?.toString().toLocaleLowerCase('tr-TR'));
        if (matched) importedIds.add(matched.id);
      }
      for (const emp of existingUsers) {
        if (isAdminUser(emp)) continue;
        if (importedIds.has(emp.id)) continue;
        if (!emp.isActive) continue;
        deactivateTargets.push({ id: emp.id, username: emp.username || emp.id });
        toDeactivate++;
      }
    }

    const columnMapping = Object.entries(colMap).map(([colNum, field]) => ({
      column: parseInt(colNum),
      header: headerRow.getCell(parseInt(colNum)).value?.toString() || "",
      mappedTo: field,
    }));

    res.json({
      totalRows: rows.length,
      toCreate,
      toUpdate,
      toSkip,
      toError,
      toDeactivate,
      deactivateTargets: deactivateTargets.slice(0, 50),
      results,
      mode,
      matchKey,
      columnMapping,
      preview: rows.slice(0, 5).map(r => r.data),
    });
  } catch (error: any) {
    console.error("Import dry-run error:", error);
    res.status(500).json({ message: "Import simülasyonu sırasında hata oluştu" });
  }
});

// ─── IMPORT APPLY ────────────────────────────────────────

router.post("/api/hr/employees/import/apply", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Import yetkisi yok" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Dosya yüklenmedi" });
    }

    const mode = req.body.mode || "upsert";
    const matchKey = req.body.matchKey || "username";
    const continueWithValid = req.body.continueWithValid === "true" || req.body.continueWithValid === true;
    const deactivateConfirmation = req.body.deactivateConfirmation || "";

    if (mode === "deactivate_missing" && deactivateConfirmation !== "DEACTIVATE") {
      return res.status(400).json({ message: "DeactivateMissing modu için 'DEACTIVATE' onay metni zorunludur." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return res.status(400).json({ message: "Excel dosyası boş" });
    }

    let customMapping: Record<string, string> | null = null;
    try {
      if (req.body.columnMapping) {
        customMapping = JSON.parse(req.body.columnMapping);
      }
    } catch {}

    const headerRow = sheet.getRow(1);
    const colMap: Record<number, string> = {};
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().trim() || "";
      if (customMapping && customMapping[header]) {
        const mapped = customMapping[header];
        if (mapped !== "__skip__") colMap[colNumber] = mapped;
      } else {
        colMap[colNumber] = IMPORT_FIELD_MAP[header] || header;
      }
    });

    const rows: { rowNumber: number; data: Record<string, any> }[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const data: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const field = colMap[colNumber];
        if (field) data[field] = cell.value;
      });
      if (Object.keys(data).length > 0) rows.push({ rowNumber, data });
    });

    const existingUsers = await db.select().from(users).where(isNull(users.deletedAt));
    const usernameMap = new Map(existingUsers.filter(u => u.username).map(u => [u.username!.toLocaleLowerCase('tr-TR'), u]));
    const emailMap = new Map(existingUsers.filter(u => u.email).map(u => [u.email!.toLocaleLowerCase('tr-TR'), u]));
    const idMap = new Map(existingUsers.map(u => [u.id, u]));

    let createdCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0, deactivatedCount = 0;
    const resultRows: { rowNumber: number; status: string; employeeId?: string; message: string; beforeJson?: string; afterJson?: string }[] = [];

    const preValidationErrors: number[] = [];
    for (const { rowNumber, data } of rows) {
      const validationErrors = validateRowData(data, rowNumber);
      if (validationErrors.length > 0) {
        resultRows.push({ rowNumber, status: "error", message: validationErrors.join("; ") });
        errorCount++;
        preValidationErrors.push(rowNumber);
      }
    }

    if (errorCount > 0 && !continueWithValid) {
      return res.json({
        blocked: true,
        totalRows: rows.length,
        errorCount,
        message: `${errorCount} satırda hata bulundu. Geçerli satırlarla devam etmek için "Geçerli satırlarla devam et" seçeneğini işaretleyin.`,
        results: resultRows.map(r => ({ rowNumber: r.rowNumber, status: r.status, message: r.message })),
      });
    }

    const [batch] = await db.insert(importBatches).values({
      createdByUserId: user.id,
      mode,
      matchKey,
      scope: req.body.scope || "all",
      fileName: req.file.originalname,
      status: "processing",
      totalRows: rows.length,
    }).returning();

    try {
      await db.transaction(async (tx) => {
        for (const { rowNumber, data } of rows) {
          if (preValidationErrors.includes(rowNumber)) continue;

          try {
            let existing: any = null;
            if (matchKey === "employeeId" && data.id) {
              existing = idMap.get(data.id);
            } else if (data.id && idMap.has(data.id)) {
              existing = idMap.get(data.id);
            } else if (matchKey === "email" && data.email) {
              existing = emailMap.get(data.email.toString().toLocaleLowerCase('tr-TR'));
            } else if (matchKey === "username" && data.username) {
              existing = usernameMap.get(data.username.toString().toLocaleLowerCase('tr-TR'));
            } else if (data.username) {
              existing = usernameMap.get(data.username.toString().toLocaleLowerCase('tr-TR'));
            }

            if (existing && isAdminUser(existing)) {
              resultRows.push({
                rowNumber,
                status: "skip",
                employeeId: existing.id,
                message: "Admin koruması: atlandı",
              });
              skippedCount++;
              continue;
            }

            const dateFields = ["hireDate", "probationEndDate", "birthDate"];
            const numericFields = ["netSalary", "mealAllowance", "transportAllowance", "bonusBase", "weeklyHours", "numChildren", "branchId"];

            const cleanData: Record<string, any> = {};
            for (const [key, val] of Object.entries(data)) {
              if (key === "id" || key === "password" || key === "hashedPassword") continue;
              if (dateFields.includes(key)) {
                cleanData[key] = parseExcelDate(val);
              } else if (numericFields.includes(key)) {
                const n = Number(val);
                if (!isNaN(n)) cleanData[key] = n;
              } else if (key === "isActive") {
                cleanData[key] = val === true || val === "Aktif" || val === "true" || val === 1;
              } else {
                cleanData[key] = val?.toString().trim() || null;
              }
            }

            if (existing) {
              if (mode === "append") {
                resultRows.push({
                  rowNumber,
                  status: "skip",
                  employeeId: existing.id,
                  message: "Append modda mevcut kullanıcı atlandı",
                });
                skippedCount++;
                continue;
              }

              const beforeJson = JSON.stringify(existing);
              await tx.update(users).set({ ...cleanData, updatedAt: new Date() }).where(eq(users.id, existing.id));
              const [updatedUser] = await tx.select().from(users).where(eq(users.id, existing.id));

              resultRows.push({
                rowNumber,
                status: "update",
                employeeId: existing.id,
                message: `Güncellendi: ${existing.username}`,
                beforeJson,
                afterJson: JSON.stringify(updatedUser),
              });
              updatedCount++;
            } else {
              if (mode === "update") {
                resultRows.push({
                  rowNumber,
                  status: "skip",
                  message: `Mevcut kullanıcı bulunamadı. Update modda yeni kayıt eklenmez.`,
                });
                skippedCount++;
                continue;
              }
              if (!data.password) {
                resultRows.push({ rowNumber, status: "error", message: "Yeni kullanıcı için şifre zorunlu" });
                errorCount++;
                continue;
              }

              const hashedPassword = await bcrypt.hash(data.password.toString(), 10);
              const insertResult = await tx.insert(users).values({
                ...cleanData,
                username: data.username.toString().trim(),
                hashedPassword,
                accountStatus: "approved",
                isActive: true,
              } as any).returning();
              const newUser = (insertResult as any[])[0];

              resultRows.push({
                rowNumber,
                status: "create",
                employeeId: newUser.id,
                message: `Oluşturuldu: ${newUser.username}`,
                afterJson: JSON.stringify(newUser),
              });
              createdCount++;
            }
          } catch (rowError: any) {
            resultRows.push({ rowNumber, status: "error", message: rowError.message || "Bilinmeyen hata" });
            errorCount++;
          }
        }

        if (mode === "deactivate_missing") {
          const importedIds = new Set<string>();
          for (const { data } of rows) {
            let matched: any = null;
            if (matchKey === "employeeId" && data.id) matched = idMap.get(data.id);
            else if (matchKey === "email" && data.email) matched = emailMap.get(data.email.toString().toLocaleLowerCase('tr-TR'));
            else if (data.username) matched = usernameMap.get(data.username?.toString().toLocaleLowerCase('tr-TR'));
            if (matched) importedIds.add(matched.id);
          }

          for (const emp of existingUsers) {
            if (isAdminUser(emp)) continue;
            if (importedIds.has(emp.id)) continue;
            if (!emp.isActive) continue;

            const beforeJson = JSON.stringify(emp);
            await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, emp.id));

            resultRows.push({
              rowNumber: 0,
              status: "deactivate",
              employeeId: emp.id,
              message: `Deaktif edildi: ${emp.username || emp.id} (dosyada bulunamadı)`,
              beforeJson,
            });
            deactivatedCount++;
          }
        }
      });
    } catch (txError: any) {
      await db.update(importBatches).set({
        status: "failed",
        errorCount,
        summaryJson: JSON.stringify({ error: txError.message }),
      }).where(eq(importBatches.id, batch.id));

      return res.status(500).json({
        batchId: batch.id,
        message: "İşlem sırasında hata oluştu, tüm değişiklikler geri alındı.",
        error: txError.message,
      });
    }

    await db.update(importBatches).set({
      status: "completed",
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      deactivatedCount,
      summaryJson: JSON.stringify({ createdCount, updatedCount, skippedCount, errorCount, deactivatedCount, mode, matchKey }),
    }).where(eq(importBatches.id, batch.id));

    for (const r of resultRows) {
      await db.insert(importResults).values({
        batchId: batch.id,
        rowNumber: r.rowNumber,
        status: r.status,
        employeeId: r.employeeId || null,
        message: r.message,
        beforeJson: r.beforeJson || null,
        afterJson: r.afterJson || null,
      });
    }

    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.import",
      action: "import",
      resource: "employees",
      details: {
        batchId: batch.id,
        mode,
        matchKey,
        fileName: req.file.originalname,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        deactivatedCount,
        continueWithValid,
      },
    });

    res.json({
      batchId: batch.id,
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      deactivatedCount,
      results: resultRows.map(r => ({ rowNumber: r.rowNumber, status: r.status, message: r.message, employeeId: r.employeeId })),
    });
  } catch (error: any) {
    console.error("Import apply error:", error);
    res.status(500).json({ message: "Import sırasında hata oluştu" });
  }
});

// ─── ROLLBACK ────────────────────────────────────────────

router.post("/api/hr/employees/import/:batchId/rollback", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (user.role !== "admin" && !isHQRole(user.role as UserRoleTypeSchema)) {
      return res.status(403).json({ message: "Rollback yetkisi yok" });
    }

    const batchId = parseInt(req.params.batchId);
    const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId));

    if (!batch) {
      return res.status(404).json({ message: "Import batch bulunamadı" });
    }
    if (batch.rolledBackAt) {
      return res.status(400).json({ message: "Bu import zaten geri alınmış" });
    }

    const daysDiff = (Date.now() - new Date(batch.createdAt!).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      return res.status(400).json({ message: "Rollback sadece 7 gün içinde yapılabilir" });
    }

    const results = await db.select().from(importResults).where(eq(importResults.batchId, batchId));

    let rolledBack = 0;
    for (const r of results) {
      if (r.status === "create" && r.employeeId) {
        await db.update(users).set({ deletedAt: new Date(), isActive: false }).where(eq(users.id, r.employeeId));
        rolledBack++;
      } else if (r.status === "update" && r.employeeId && r.beforeJson) {
        try {
          const before = JSON.parse(r.beforeJson);
          const { id, createdAt, ...restoreData } = before;
          await db.update(users).set({ ...restoreData, updatedAt: new Date() }).where(eq(users.id, r.employeeId));
          rolledBack++;
        } catch {}
      } else if (r.status === "deactivate" && r.employeeId) {
        await db.update(users).set({ isActive: true, updatedAt: new Date() }).where(eq(users.id, r.employeeId));
        rolledBack++;
      }
    }

    await db.update(importBatches).set({
      rolledBackAt: new Date(),
      status: "rolled_back",
    }).where(eq(importBatches.id, batchId));

    const ctx = getAuditContext(req);
    await createAuditEntry(ctx, {
      eventType: "data.rollback",
      action: "rollback",
      resource: "employees",
      details: { batchId, rolledBack },
    });

    res.json({ message: `Rollback tamamlandı. ${rolledBack} kayıt geri alındı.`, rolledBack });
  } catch (error: any) {
    console.error("Rollback error:", error);
    res.status(500).json({ message: "Rollback sırasında hata oluştu" });
  }
});

// ─── BATCH HISTORY ───────────────────────────────────────

router.get("/api/hr/employees/import/batches", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Yetki yok" });
    }

    const batches = await db
      .select()
      .from(importBatches)
      .orderBy(desc(importBatches.createdAt))
      .limit(50);

    const enriched = await Promise.all(batches.map(async (b) => {
      const [creator] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, b.createdByUserId));
      return {
        ...b,
        createdByName: creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() : "Bilinmeyen",
      };
    }));

    res.json(enriched);
  } catch (error: any) {
    console.error("Batch history error:", error);
    res.status(500).json({ message: "Geçmiş yüklenirken hata oluştu" });
  }
});

// ─── BATCH DETAIL ────────────────────────────────────────

router.get("/api/hr/employees/import/batches/:batchId", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Yetki yok" });
    }

    const batchId = parseInt(req.params.batchId);
    const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId));
    if (!batch) return res.status(404).json({ message: "Batch bulunamadı" });

    const [creator] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, batch.createdByUserId));

    const results = await db
      .select()
      .from(importResults)
      .where(eq(importResults.batchId, batchId))
      .limit(500);

    res.json({
      batch: {
        ...batch,
        createdByName: creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() : "Bilinmeyen",
      },
      results,
    });
  } catch (error: any) {
    console.error("Batch detail error:", error);
    res.status(500).json({ message: "Batch detayı yüklenirken hata oluştu" });
  }
});

// ─── ERROR REPORT DOWNLOAD ──────────────────────────────

router.get("/api/hr/employees/import/batches/:batchId/error-report", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Yetki yok" });
    }

    const batchId = parseInt(req.params.batchId);
    const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId));
    if (!batch) return res.status(404).json({ message: "Batch bulunamadı" });

    const results = await db
      .select()
      .from(importResults)
      .where(eq(importResults.batchId, batchId))
      .limit(10000);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DOSPRESSO";

    const sheet = workbook.addWorksheet("Import Sonuçları");
    sheet.columns = [
      { header: "Satır No", key: "rowNumber", width: 10 },
      { header: "Durum", key: "status", width: 12 },
      { header: "Personel ID", key: "employeeId", width: 36 },
      { header: "Mesaj", key: "message", width: 60 },
    ];
    styleHeaderRow(sheet);

    for (const r of results) {
      const row = sheet.addRow({
        rowNumber: r.rowNumber,
        status: r.status === "error" ? "HATA" : r.status === "skip" ? "ATLANDI" : r.status === "create" ? "OLUŞTURULDU" : r.status === "update" ? "GÜNCELLENDİ" : r.status,
        employeeId: r.employeeId || "",
        message: r.message,
      });
      if (r.status === "error") {
        row.getCell("status").font = { bold: true, color: { argb: "FFFF0000" } };
      }
    }

    const errorsOnly = workbook.addWorksheet("Sadece Hatalar");
    errorsOnly.columns = [
      { header: "Satır No", key: "rowNumber", width: 10 },
      { header: "Hata Mesajı", key: "message", width: 80 },
    ];
    styleHeaderRow(errorsOnly);
    for (const r of results.filter(r => r.status === "error")) {
      errorsOnly.addRow({ rowNumber: r.rowNumber, message: r.message });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=import_hata_raporu_${batchId}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error report error:", error);
    res.status(500).json({ message: "Hata raporu oluşturulurken hata oluştu" });
  }
});

// ─── PRE-IMPORT VALIDATION ──────────────────────────────

const VALID_ROLES = Object.values({
  admin: "admin", ceo: "ceo", cgo: "cgo",
  muhasebe_ik: "muhasebe_ik", satinalma: "satinalma", coach: "coach",
  marketing: "marketing", trainer: "trainer", kalite_kontrol: "kalite_kontrol",
  gida_muhendisi: "gida_muhendisi", fabrika_mudur: "fabrika_mudur",
  muhasebe: "muhasebe", teknik: "teknik", destek: "destek",
  fabrika: "fabrika", yatirimci_hq: "yatirimci_hq",
  stajyer: "stajyer", bar_buddy: "bar_buddy", barista: "barista",
  supervisor_buddy: "supervisor_buddy", supervisor: "supervisor",
  mudur: "mudur", yatirimci_branch: "yatirimci_branch",
  fabrika_operator: "fabrika_operator", fabrika_sorumlu: "fabrika_sorumlu",
  fabrika_personel: "fabrika_personel",
});

function validateRowDetailed(row: Record<string, any>, rowNum: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.firstName?.toString().trim()) errors.push("Ad zorunludur");
  if (!row.lastName?.toString().trim()) errors.push("Soyad zorunludur");
  if (!row.username?.toString().trim()) {
    errors.push("Kullanıcı adı zorunludur");
  } else {
    const uname = row.username.toString().trim();
    if (!/^[a-zA-Z0-9._-]+$/.test(uname)) {
      errors.push("Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir");
    }
    if (uname.length < 3) errors.push("Kullanıcı adı en az 3 karakter olmalıdır");
  }

  if (row.email) {
    const email = row.email.toString().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Geçersiz e-posta formatı");
    }
  }

  if (row.phoneNumber) {
    const phone = row.phoneNumber.toString().replace(/[\s\-\(\)]/g, "");
    if (!/^(\+?90|0)?[0-9]{10}$/.test(phone) && !/^[0-9]{10,15}$/.test(phone)) {
      warnings.push("Telefon formatı doğrulanamadı");
    }
  }

  if (row.tckn) {
    const tckn = row.tckn.toString().trim();
    if (!/^\d{11}$/.test(tckn)) {
      errors.push("TC Kimlik No 11 haneli olmalıdır");
    }
  }

  if (row.role) {
    const role = row.role.toString().trim().toLocaleLowerCase('tr-TR');
    if (!VALID_ROLES.includes(role)) {
      errors.push(`Geçersiz rol: "${row.role}"`);
    }
  }

  if (row.netSalary && isNaN(Number(row.netSalary))) {
    errors.push("Net maaş sayısal olmalıdır");
  }
  if (row.weeklyHours && isNaN(Number(row.weeklyHours))) {
    errors.push("Haftalık saat sayısal olmalıdır");
  }

  const dateFields = ["hireDate", "probationEndDate", "birthDate"];
  for (const df of dateFields) {
    if (row[df]) {
      const parsed = parseExcelDate(row[df]);
      if (!parsed) {
        warnings.push(`${df} tarih formatı tanınamadı`);
      }
    }
  }

  return { errors, warnings };
}

router.post("/api/hr/employees/import/validate", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Import yetkisi yok" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Dosya yüklenmedi" });
    }

    let customMapping: Record<string, string> | null = null;
    try {
      if (req.body.columnMapping) {
        customMapping = JSON.parse(req.body.columnMapping);
      }
    } catch {}

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return res.status(400).json({ message: "Excel dosyası boş veya başlık satırı eksik" });
    }

    const headerRow = sheet.getRow(1);
    const colMap: Record<number, string> = {};
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().trim() || "";
      if (customMapping && customMapping[header]) {
        const mapped = customMapping[header];
        if (mapped !== "__skip__") colMap[colNumber] = mapped;
      } else {
        colMap[colNumber] = IMPORT_FIELD_MAP[header] || header;
      }
    });

    const allRows: { rowNumber: number; data: Record<string, any> }[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const data: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const field = colMap[colNumber];
        if (field) data[field] = cell.value;
      });
      if (Object.keys(data).length > 0) {
        allRows.push({ rowNumber, data });
      }
    });

    const existingUsers = await db.select().from(users).where(isNull(users.deletedAt));
    const usernameSet = new Map(existingUsers.filter(u => u.username).map(u => [u.username!.toLocaleLowerCase('tr-TR'), u]));
    const emailSet = new Map(existingUsers.filter(u => u.email).map(u => [u.email!.toLocaleLowerCase('tr-TR'), u]));
    const tcknSet = new Map(existingUsers.filter(u => (u as any).tckn).map(u => [(u as any).tckn?.toString(), u]));

    const existingBranches = await db.select({ id: branches.id }).from(branches);
    const branchIds = new Set(existingBranches.map(b => b.id));

    const inFileUsernames = new Map<string, number[]>();
    const inFileEmails = new Map<string, number[]>();
    const inFilePhones = new Map<string, number[]>();

    for (const { rowNumber, data } of allRows) {
      if (data.username) {
        const key = data.username.toString().trim().toLocaleLowerCase('tr-TR');
        if (!inFileUsernames.has(key)) inFileUsernames.set(key, []);
        inFileUsernames.get(key)!.push(rowNumber);
      }
      if (data.email) {
        const key = data.email.toString().trim().toLocaleLowerCase('tr-TR');
        if (!inFileEmails.has(key)) inFileEmails.set(key, []);
        inFileEmails.get(key)!.push(rowNumber);
      }
      if (data.phoneNumber) {
        const key = data.phoneNumber.toString().replace(/[\s\-\(\)]/g, "");
        if (!inFilePhones.has(key)) inFilePhones.set(key, []);
        inFilePhones.get(key)!.push(rowNumber);
      }
    }

    type RowResult = {
      rowNumber: number;
      data: Record<string, any>;
      status: "valid" | "error" | "warning" | "duplicate" | "conflict";
      errors: string[];
      warnings: string[];
      duplicateInfo?: string;
      conflictInfo?: string;
    };

    const results: RowResult[] = [];
    let totalValid = 0, totalErrors = 0, totalWarnings = 0, totalDuplicates = 0, totalConflicts = 0;

    for (const { rowNumber, data } of allRows) {
      const { errors, warnings } = validateRowDetailed(data, rowNumber);

      const duplicateMessages: string[] = [];
      if (data.username) {
        const key = data.username.toString().trim().toLocaleLowerCase('tr-TR');
        const rows = inFileUsernames.get(key);
        if (rows && rows.length > 1) {
          duplicateMessages.push(`Kullanıcı adı "${data.username}" satır ${rows.filter(r => r !== rowNumber).join(", ")} ile tekrar`);
        }
      }
      if (data.email) {
        const key = data.email.toString().trim().toLocaleLowerCase('tr-TR');
        const rows = inFileEmails.get(key);
        if (rows && rows.length > 1) {
          duplicateMessages.push(`E-posta "${data.email}" satır ${rows.filter(r => r !== rowNumber).join(", ")} ile tekrar`);
        }
      }

      if (data.phoneNumber) {
        const key = data.phoneNumber.toString().replace(/[\s\-\(\)]/g, "");
        const rows = inFilePhones.get(key);
        if (rows && rows.length > 1) {
          duplicateMessages.push(`Telefon "${data.phoneNumber}" satır ${rows.filter(r => r !== rowNumber).join(", ")} ile tekrar`);
        }
      }

      const conflictMessages: string[] = [];
      if (data.username) {
        const existing = usernameSet.get(data.username.toString().trim().toLocaleLowerCase('tr-TR'));
        if (existing) {
          conflictMessages.push(`Kullanıcı adı "${data.username}" mevcut (${existing.firstName || ""} ${existing.lastName || ""})`);
        }
      }
      if (data.email) {
        const existing = emailSet.get(data.email.toString().trim().toLocaleLowerCase('tr-TR'));
        if (existing) {
          conflictMessages.push(`E-posta "${data.email}" mevcut (${existing.username || ""})`);
        }
      }
      if (data.tckn) {
        const existing = tcknSet.get(data.tckn.toString());
        if (existing) {
          conflictMessages.push(`TC No "${data.tckn}" mevcut (${existing.username || ""})`);
        }
      }

      if (data.branchId) {
        const bid = Number(data.branchId);
        if (!isNaN(bid) && !branchIds.has(bid)) {
          errors.push(`Şube ID ${data.branchId} bulunamadı`);
        }
      }

      let status: RowResult["status"] = "valid";
      if (errors.length > 0) { status = "error"; totalErrors++; }
      else if (duplicateMessages.length > 0) { status = "duplicate"; totalDuplicates++; }
      else if (conflictMessages.length > 0) { status = "conflict"; totalConflicts++; }
      else if (warnings.length > 0) { status = "warning"; totalWarnings++; }
      else { totalValid++; }

      results.push({
        rowNumber,
        data,
        status,
        errors,
        warnings,
        duplicateInfo: duplicateMessages.length > 0 ? duplicateMessages.join("; ") : undefined,
        conflictInfo: conflictMessages.length > 0 ? conflictMessages.join("; ") : undefined,
      });
    }

    const previewRows = results.slice(0, 20);

    res.json({
      totalRows: allRows.length,
      summary: {
        valid: totalValid,
        errors: totalErrors,
        warnings: totalWarnings,
        duplicates: totalDuplicates,
        conflicts: totalConflicts,
      },
      previewRows,
      hasBlockingErrors: totalErrors > 0,
    });
  } catch (error: any) {
    console.error("Validate error:", error);
    res.status(500).json({ message: "Doğrulama sırasında hata oluştu" });
  }
});

// ─── FILE PREVIEW (column mapping) ──────────────────────

router.post("/api/hr/employees/import/preview", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const user = req.user!;
    if (!isHQRole(user.role as UserRoleTypeSchema) && user.role !== "admin") {
      return res.status(403).json({ message: "Import yetkisi yok" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Dosya yüklenmedi" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return res.status(400).json({ message: "Excel dosyası boş veya başlık satırı eksik" });
    }

    const headerRow = sheet.getRow(1);
    const headers: { column: number; header: string; mappedTo: string }[] = [];
    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().trim() || "";
      headers.push({
        column: colNumber,
        header,
        mappedTo: IMPORT_FIELD_MAP[header] || header,
      });
    });

    const previewRows: Record<string, any>[] = [];
    let count = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (count >= 5) return;
      const data: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const h = headers.find(h => h.column === colNumber);
        if (h) {
          data[h.header] = cell.value;
        }
      });
      previewRows.push(data);
      count++;
    });

    const validFields = Object.values(IMPORT_FIELD_MAP);
    const systemFields = Array.from(new Set(validFields));

    res.json({
      totalRows: sheet.rowCount - 1,
      headers,
      previewRows,
      systemFields,
    });
  } catch (error: any) {
    console.error("Preview error:", error);
    res.status(500).json({ message: "Dosya önizleme sırasında hata oluştu" });
  }
});

// ─── EXPORT TEMPLATE ─────────────────────────────────────

router.get("/api/hr/employees/import/template", isAuthenticated, async (req: any, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Import Şablonu");
    
    const templateColumns = EXPORT_COLUMNS.filter(c => c.key !== "id" && c.key !== "branchName" && c.key !== "isActive" && c.key !== "accountStatus");
    templateColumns.push({ header: "Şifre", key: "password", width: 15 });
    sheet.columns = templateColumns;

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    sheet.addRow({
      username: "ornek_kullanici",
      firstName: "Ahmet",
      lastName: "Yılmaz",
      email: "ahmet@ornek.com",
      role: "barista",
      branchId: 1,
      tckn: "12345678901",
      gender: "Erkek",
      hireDate: "2025-01-15",
      phoneNumber: "05551234567",
      employmentType: "fulltime",
      weeklyHours: 45,
      netSalary: 25000,
      password: "sifre123",
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=dospresso_import_sablonu.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Template error:", error);
    res.status(500).json({ message: "Şablon oluşturulurken hata oluştu" });
  }
});

export default router;
