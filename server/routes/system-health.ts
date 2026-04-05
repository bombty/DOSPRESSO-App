import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { sql } from "drizzle-orm";

const router = Router();

// Her rolün test edeceği kritik endpoint'ler
const ROLE_ENDPOINTS: Record<string, { path: string; name: string; module: string }[]> = {
  barista: [
    { path: "/api/me/dashboard-briefing", name: "Benim Günüm", module: "Dashboard" },
    { path: "/api/shifts?my=true", name: "Vardiyam", module: "Vardiya" },
    { path: "/api/checklists/my-daily", name: "Checklist", module: "Checklist" },
    { path: "/api/leave-requests?my=true", name: "İzin Talepleri", module: "İK" },
    { path: "/api/overtime-requests?my=true", name: "Mesai Talepleri", module: "İK" },
    { path: "/api/equipment?branchId=", name: "Ekipman Listesi", module: "Ekipman" },
    { path: "/api/v3/academy/dashboard", name: "Akademi", module: "Eğitim" },
    { path: "/api/dobody/proposals", name: "Dobody Önerileri", module: "Dobody" },
  ],
  supervisor: [
    { path: "/api/me/dashboard-briefing", name: "Dashboard", module: "Dashboard" },
    { path: "/api/shifts", name: "Vardiya Planlama", module: "Vardiya" },
    { path: "/api/checklists", name: "Checklist Yönetimi", module: "Checklist" },
    { path: "/api/equipment?branchId=", name: "Ekipman", module: "Ekipman" },
    { path: "/api/faults?branchId=", name: "Arızalar", module: "Ekipman" },
    { path: "/api/leave-requests", name: "İzin Yönetimi", module: "İK" },
    { path: "/api/dobody/proposals", name: "Dobody Önerileri", module: "Dobody" },
  ],
  coach: [
    { path: "/api/v2/audit-templates", name: "Denetim Şablonları", module: "Denetim" },
    { path: "/api/v2/audits", name: "Denetim Listesi", module: "Denetim" },
    { path: "/api/branches", name: "Şube Listesi", module: "Şube" },
    { path: "/api/v3/academy/dashboard", name: "Akademi", module: "Eğitim" },
    { path: "/api/projects", name: "Projeler", module: "Proje" },
    { path: "/api/dobody/proposals", name: "Dobody Önerileri", module: "Dobody" },
  ],
  ceo: [
    { path: "/api/branches", name: "Şubeler", module: "Şube" },
    { path: "/api/projects", name: "Projeler", module: "Proje" },
    { path: "/api/v2/audits", name: "Denetimler", module: "Denetim" },
    { path: "/api/equipment", name: "Ekipman", module: "Ekipman" },
    { path: "/api/dobody/proposals", name: "Dobody", module: "Dobody" },
    { path: "/api/dobody/confidence", name: "Güven Skorları", module: "Dobody" },
  ],
  muhasebe_ik: [
    { path: "/api/hr/payroll-summary", name: "Bordro Özeti", module: "Bordro" },
    { path: "/api/shifts", name: "Vardiyalar", module: "Vardiya" },
    { path: "/api/leave-requests", name: "İzin Talepleri", module: "İK" },
  ],
  fabrika_mudur: [
    { path: "/api/factory/dashboard", name: "Fabrika Dashboard", module: "Fabrika" },
    { path: "/api/factory/production-plans", name: "Üretim Planı", module: "Üretim" },
    { path: "/api/equipment", name: "Ekipman", module: "Ekipman" },
  ],
};

// GET /api/system/health-check — Tüm rollerin endpoint sağlık durumu
router.get('/api/system/health-check', isAuthenticated, async (req, res) => {
  try {
    // DB bağlantı testi
    let dbOk = false;
    try {
      await db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch (e) { /* db bağlantı hatası */ }

    // Tablo sayısı
    const tableCount = await db.execute(sql`
      SELECT count(*)::int as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    // Kritik tabloların varlık kontrolü
    const criticalTables = ['users','branches','shifts','equipment','audits_v2',
      'audit_templates_v2','projects','dobody_proposals','dobody_scopes','notifications'];
    
    const tableChecks: Record<string, boolean> = {};
    for (const t of criticalTables) {
      try {
        await db.execute(sql.raw(`SELECT 1 FROM ${t} LIMIT 1`));
        tableChecks[t] = true;
      } catch {
        tableChecks[t] = false;
      }
    }

    // Endpoint listesi (test edilecek)
    const endpointMap: Record<string, { name: string; module: string; path: string }[]> = {};
    for (const [role, endpoints] of Object.entries(ROLE_ENDPOINTS)) {
      endpointMap[role] = endpoints;
    }

    res.json({
      timestamp: new Date().toISOString(),
      database: { connected: dbOk, tableCount: Number((tableCount as any).rows?.[0]?.count || 0) },
      criticalTables: tableChecks,
      roleEndpoints: endpointMap,
      roles: Object.keys(ROLE_ENDPOINTS),
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({ message: "Sağlık kontrolü başarısız" });
  }
});

// POST /api/system/test-endpoint — Tek endpoint test et
router.post('/api/system/test-endpoint', isAuthenticated, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ message: "Path gerekli" });

    const startTime = Date.now();
    try {
      // İç istek gönder (aynı session ile)
      const cookies = req.headers.cookie || '';
      const host = req.headers.host || 'localhost:5000';
      const protocol = req.protocol || 'http';
      
      const response = await fetch(`${protocol}://${host}${path}`, {
        headers: { 'Cookie': cookies },
      });
      
      const elapsed = Date.now() - startTime;
      const body = await response.text();
      let dataLength = 0;
      try { dataLength = JSON.parse(body)?.length || Object.keys(JSON.parse(body)).length || 0; } catch {}

      res.json({
        path,
        status: response.status,
        ok: response.ok,
        elapsed,
        dataLength,
        error: response.ok ? null : body.slice(0, 200),
      });
    } catch (fetchError: any) {
      res.json({
        path,
        status: 0,
        ok: false,
        elapsed: Date.now() - startTime,
        error: fetchError.message,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Test başarısız" });
  }
});

// POST /api/system/crash-report — Frontend crash raporla (Dobody Admin bildirimi)
router.post('/api/system/crash-report', async (req, res) => {
  try {
    const { error, componentStack, url, role, userId } = req.body;
    if (!error) return res.status(400).json({ message: "Error message gerekli" });

    // Dobody'ye sistem sağlık event'i gönder
    try {
      const { fireEvent } = await import("../lib/dobody-workflow-engine");
      await fireEvent('system_health_issue', 'frontend', 'crash', 0, {
        issueType: 'Frontend Sayfa Crash',
        description: `Sayfa: ${url || 'bilinmiyor'} | Rol: ${role || '?'} | Hata: ${(error || '').slice(0, 300)}`,
        severity: 'critical',
        affectedModule: 'frontend',
        affectedEndpoint: url,
      });
    } catch (e) { /* dobody unavailable */ }

    console.error(`[CRASH REPORT] ${url} | ${role} | ${error?.slice(0, 200)}`);
    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ message: "Rapor alınamadı" });
  }
});

export default router;
