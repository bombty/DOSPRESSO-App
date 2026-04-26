import { Express, Response, RequestHandler } from "express";
import { db } from "./db";
import { 
  branches, users, tasks, equipment, equipmentFaults, 
  checklists, checklistAssignments, announcements, shifts,
  leaveRequests, inventory, suppliers, purchaseOrders,
  trainingModules, userTrainingProgress, notifications,
  equipmentMaintenanceLogs, performanceMetrics
} from "@shared/schema";
import { desc } from "drizzle-orm";
import archiver from "archiver";
import { isAuthenticated } from "./localAuth";

const EXPORT_ROLES = ["admin", "ceo", "cgo"];

const requireExportRole: RequestHandler = (req: any, res, next) => {
  const role = req.user?.role;
  if (!role || !EXPORT_ROLES.includes(role)) {
    return res.status(403).json({ message: "Yetkisiz erişim" });
  }
  next();
};

function convertToCSV(data: any[], tableName: string): string {
  if (!data || data.length === 0) {
    return "";
  }
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];
  
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        return "";
      }
      if (typeof val === "object") {
        val = JSON.stringify(val);
      }
      val = String(val).replace(/"/g, '""');
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(","));
  }
  
  return csvRows.join("\n");
}

function sendCSV(res: Response, data: any[], filename: string) {
  const csv = convertToCSV(data, filename);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  res.send("\ufeff" + csv);
}

export function registerExportRoutes(app: Express) {

  app.get("/api/export/branches", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(branches);
      sendCSV(res, data, "subeler");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/users", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        branchId: users.branchId,
        phone: users.phone,
        employeeId: users.employeeId,
        employmentType: users.employmentType,
        isActive: users.isActive,
        createdAt: users.createdAt
      }).from(users);
      sendCSV(res, data, "kullanicilar");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/tasks", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
      sendCSV(res, data, "gorevler");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/equipment", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(equipment);
      sendCSV(res, data, "ekipmanlar");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/faults", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(equipmentFaults).orderBy(desc(equipmentFaults.createdAt));
      sendCSV(res, data, "arizalar");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/checklists", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(checklists);
      sendCSV(res, data, "checklistler");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/checklist-assignments", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(checklistAssignments).orderBy(desc(checklistAssignments.createdAt));
      sendCSV(res, data, "checklist_atamalari");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/announcements", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
      sendCSV(res, data, "duyurular");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/shifts", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(shifts).orderBy(desc(shifts.shiftDate));
      sendCSV(res, data, "vardiyalar");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/leave-requests", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
      sendCSV(res, data, "izin_talepleri");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/inventory", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(inventory);
      sendCSV(res, data, "stok");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/suppliers", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(suppliers);
      sendCSV(res, data, "tedarikciler");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/purchase-orders", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
      sendCSV(res, data, "siparisler");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/training-modules", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(trainingModules);
      sendCSV(res, data, "egitim_modulleri");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/training-progress", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(userTrainingProgress);
      sendCSV(res, data, "egitim_ilerlemesi");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/notifications", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
      sendCSV(res, data, "bildirimler");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/maintenance-logs", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(equipmentMaintenanceLogs).orderBy(desc(equipmentMaintenanceLogs.createdAt));
      sendCSV(res, data, "bakim_kayitlari");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/performance-metrics", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      const data = await db.select().from(performanceMetrics).orderBy(desc(performanceMetrics.date));
      sendCSV(res, data, "performans_metrikleri");
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });

  app.get("/api/export/all", isAuthenticated, requireExportRole, async (_req, res) => {
    try {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="dospresso_veriler.zip"');

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      const tables = [
        { name: "subeler", query: db.select().from(branches) },
        { name: "kullanicilar", query: db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
          phone: users.phone,
          employeeId: users.employeeId,
          employmentType: users.employmentType,
          isActive: users.isActive,
          createdAt: users.createdAt
        }).from(users) },
        { name: "gorevler", query: db.select().from(tasks) },
        { name: "ekipmanlar", query: db.select().from(equipment) },
        { name: "arizalar", query: db.select().from(equipmentFaults) },
        { name: "checklistler", query: db.select().from(checklists) },
        { name: "checklist_atamalari", query: db.select().from(checklistAssignments) },
        { name: "duyurular", query: db.select().from(announcements) },
        { name: "vardiyalar", query: db.select().from(shifts) },
        { name: "izin_talepleri", query: db.select().from(leaveRequests) },
        { name: "stok", query: db.select().from(inventory) },
        { name: "tedarikciler", query: db.select().from(suppliers) },
        { name: "siparisler", query: db.select().from(purchaseOrders) },
        { name: "egitim_modulleri", query: db.select().from(trainingModules) },
        { name: "egitim_ilerlemesi", query: db.select().from(userTrainingProgress) },
        { name: "bildirimler", query: db.select().from(notifications) },
        { name: "bakim_kayitlari", query: db.select().from(equipmentMaintenanceLogs) },
        { name: "performans_metrikleri", query: db.select().from(performanceMetrics) }
      ];

      for (const table of tables) {
        try {
          const data = await table.query;
          if (data && data.length > 0) {
            const csv = "\ufeff" + convertToCSV(data, table.name);
            archive.append(csv, { name: `${table.name}.csv` });
          }
        } catch (e) {
          console.error(`Error exporting ${table.name}:`, e);
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error("Export all error:", error);
      res.status(500).json({ message: "Dışa aktarma hatası" });
    }
  });
}
