import { Router, Request, Response } from "express";
import { db } from "../db";
import { workshopNotes, insertWorkshopNoteSchema, updateWorkshopNoteSchema } from "@shared/schema";
import { ALL_MODULES } from "@shared/module-manifest";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const ALLOWED_ROLES = new Set(["admin", "ceo", "cgo", "coach", "trainer"]);

const router = Router();

function isAllowed(req: Request): boolean {
  const user = req.user as any;
  return ALLOWED_ROLES.has(user?.role);
}

// GET /api/sistem-atolyesi/metadata — Canlı sistem verisi
router.get("/api/sistem-atolyesi/metadata", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Erişim yok" });
  try {
    // 1. Kullanıcı rol dağılımı
    const roleCountsRaw = await db.execute(sql`
      SELECT role, count(*)::int as count FROM users 
      WHERE is_active = true GROUP BY role ORDER BY count DESC
    `);
    const roleCounts = ((roleCountsRaw as any).rows || []).reduce((acc: any, r: any) => {
      acc[r.role] = r.count;
      return acc;
    }, {});

    // 2. Şube sayısı
    const branchCountRaw = await db.execute(sql`SELECT count(*)::int as count FROM branches WHERE is_active = true`);
    const branchCount = ((branchCountRaw as any).rows || [])[0]?.count || 0;

    // 3. Tablo sayısı
    const tableCountRaw = await db.execute(sql`
      SELECT count(*)::int as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = ((tableCountRaw as any).rows || [])[0]?.count || 0;

    // 4. Modül manifest (canlı)
    const modules = ALL_MODULES.map(m => ({
      id: m.id,
      name: m.name,
      flagKey: m.flagKey,
      subModuleCount: m.subModules.length,
      subModules: m.subModules.map(sm => ({
        id: sm.id,
        name: sm.name,
        path: sm.path,
        canDisable: sm.canDisable,
      })),
      roles: Object.entries(m.roles).map(([role, access]) => ({
        role,
        view: (access as any).view,
        create: (access as any).create,
        edit: (access as any).edit,
        delete: (access as any).delete,
        approve: (access as any).approve,
        scope: (access as any).scope,
      })),
    }));

    res.json({
      modules,
      roleCounts,
      branchCount,
      tableCount,
      totalModules: ALL_MODULES.length,
      totalSubModules: ALL_MODULES.reduce((s, m) => s + m.subModules.length, 0),
      totalRoles: Object.keys(roleCounts).length,
      health: {
        orphanPages: [
          { file: "academy-landing", lines: 1109, apis: 8, status: "link", recommendation: "Akademi ana giriş sayfası. Zengin içerik: günlük öneri, haftalık ilerleme, AI dashboard. /akademi yerine bu kullanılmalı.", roles: ["barista","stajyer","supervisor"], category: "Akademi" },
          { file: "academy-content-management", lines: 440, apis: 5, status: "link", recommendation: "HQ eğitim içerik yönetimi. Modül oluşturma/düzenleme. Trainer ve admin için bağlanmalı.", roles: ["trainer","admin"], category: "Akademi" },
          { file: "academy-webinars", lines: 942, apis: 15, status: "link", recommendation: "Tam webinar sistemi (oluştur/katıl/kayıt). Çok gelişmiş, bağlanmalı.", roles: ["trainer","admin","coach"], category: "Akademi" },
          { file: "academy-ai-panel", lines: 690, apis: 4, status: "link", recommendation: "Akademi AI yönetim paneli. Quiz/içerik otomatik oluşturma.", roles: ["trainer","admin"], category: "Akademi" },
          { file: "academy-explore", lines: 390, apis: 4, status: "duplicate", recommendation: "Akademi keşfet görünümü. academy-landing ile örtüşüyor, birleştirilebilir.", roles: [], category: "Akademi" },
          { file: "academy-my-path", lines: 931, apis: 9, status: "link", recommendation: "Kişisel öğrenme yolu. Her personel kendi eğitim ilerlemesini görmeli.", roles: ["barista","stajyer","supervisor"], category: "Akademi" },
          { file: "announcements", lines: 1034, apis: 12, status: "link", recommendation: "Tam duyuru sistemi (oluştur/düzenle/sil/pin). Kullanıcı tarafı eksik — admin/duyurular sadece admin panelinde.", roles: ["admin","ceo","cgo","coach"], category: "İletişim" },
          { file: "mesajlar", lines: 933, apis: 9, status: "link", recommendation: "İç mesajlaşma sistemi. Çok gelişmiş (933 satır). Tüm roller için /mesajlar olarak bağlanmalı.", roles: ["tüm roller"], category: "İletişim" },
          { file: "admin-employee-types", lines: 908, apis: 15, status: "link", recommendation: "Personel tip/pozisyon yönetimi + organizasyon ataması. Admin İK bölümüne bağlanmalı.", roles: ["admin","muhasebe_ik"], category: "İK" },
          { file: "personel-onboarding", lines: 884, apis: 15, status: "link", recommendation: "Yeni personel onboarding akışı. Çok detaylı (884 satır). İK modülüne bağlanmalı.", roles: ["muhasebe_ik","admin","mudur"], category: "İK" },
          { file: "ekipman-katalog", lines: 838, apis: 8, status: "link", recommendation: "Ekipman katalog yönetimi (marka/model/spesifikasyon). CGO/Operasyon bölümüne bağlanmalı.", roles: ["cgo","admin","teknik"], category: "Ekipman" },
          { file: "guest-form-settings", lines: 881, apis: 16, status: "link", recommendation: "Misafir geri bildirim formu ayarları. QR kod + form yapılandırma. Marketing/admin'e bağlanmalı.", roles: ["marketing","admin"], category: "CRM" },
          { file: "kampanya-yonetimi", lines: 319, apis: 5, status: "link", recommendation: "Kampanya oluşturma/yönetim. Marketing rolüne bağlanmalı.", roles: ["marketing","admin","ceo"], category: "CRM" },
          { file: "coach-onboarding-studio", lines: 761, apis: 14, status: "link", recommendation: "Onboarding program oluşturucu (studio). Coach/trainer için güçlü araç.", roles: ["coach","trainer"], category: "Eğitim" },
          { file: "aksiyon-takip", lines: 538, apis: 7, status: "link", recommendation: "Denetim aksiyon takip paneli. Coach denetim sonrası aksiyonları takip eder.", roles: ["coach","ceo","cgo"], category: "Denetim" },
          { file: "coach-kpi-signals", lines: 160, apis: 5, status: "link", recommendation: "KPI sinyal dashboard. Şube performans uyarıları.", roles: ["coach","ceo"], category: "Denetim" },
          { file: "coach-team-progress", lines: 284, apis: 2, status: "link", recommendation: "Takım ilerleme özeti. Coach'un şube personelini takip etmesi.", roles: ["coach","trainer"], category: "Denetim" },
          { file: "capa-raporlari", lines: 301, apis: 3, status: "link", recommendation: "Düzeltici/Önleyici Faaliyet (CAPA) raporları. Kalite yönetimi.", roles: ["coach","cgo","admin"], category: "Raporlar" },
          { file: "raporlar-finansal", lines: 271, apis: 6, status: "merge", recommendation: "Finansal raporlar. Raporlar mega modülüne tab olarak eklenmeli (ayrı sayfa değil).", roles: ["ceo","muhasebe_ik"], category: "Raporlar" },
          { file: "raporlar-insight", lines: 186, apis: 5, status: "merge", recommendation: "Insight raporları. Raporlar mega modülüne tab olarak eklenmeli.", roles: ["ceo","cgo","coach"], category: "Raporlar" },
          { file: "supervisor-onboarding", lines: 333, apis: 5, status: "link", recommendation: "Supervisor onboarding akışı. Yeni supervisor eğitim süreci.", roles: ["supervisor","coach","trainer"], category: "Eğitim" },
          { file: "onboarding-programlar", lines: 535, apis: 8, status: "duplicate", recommendation: "Onboarding program listesi. coach-onboarding-studio ile örtüşüyor, birleştirilebilir.", roles: [], category: "Eğitim" },
          { file: "fabrika", lines: 844, apis: 10, status: "deprecated", recommendation: "ESKİ fabrika sayfası. fabrika-centrum.tsx yeni tasarım. Bu dosya silinebilir veya arşivlenebilir.", roles: [], category: "Fabrika" },
          { file: "guest-complaints", lines: 438, apis: 11, status: "duplicate", recommendation: "Misafir şikayet sayfası. sikayetler.tsx (398L) ile ÇOK BENZİR. Birleştirilmeli.", roles: [], category: "CRM" },
          { file: "sikayetler", lines: 398, apis: 5, status: "duplicate", recommendation: "Şikayetler sayfası. guest-complaints.tsx ile birleştirilmeli → tek CRM şikayet sayfası.", roles: [], category: "CRM" },
          { file: "misafir-memnuniyeti-modul", lines: 538, apis: 3, status: "deprecated", recommendation: "ESKİ misafir memnuniyet modülü. CRM mega modülü bu işlevi karşılıyor. Silinebilir.", roles: [], category: "CRM" },
          { file: "coach-content-library", lines: 165, apis: 4, status: "merge", recommendation: "Coach içerik kütüphanesi. academy-content-management ile birleştirilebilir.", roles: [], category: "Akademi" },
          { file: "coach-gate-management", lines: 122, apis: 4, status: "link", recommendation: "Geçit/kontrol noktası yönetimi. Eğitim ilerlemesi kapı sistemi.", roles: ["coach","trainer"], category: "Eğitim" },
          { file: "ai-assistant", lines: 171, apis: 2, status: "merge", recommendation: "Bağımsız AI asistan sayfası. Bottom nav'daki AI Asistan ile birleşik. Ayrı sayfa gereksiz olabilir.", roles: [], category: "Sistem" },
          { file: "admin-seed", lines: 154, apis: 1, status: "delete", recommendation: "Test/geliştirme aracı. Production'da kullanılmaz. SİLİNEBİLİR.", roles: [], category: "Sistem" },
        ],
        unguardedRoutes: [
          "/sube-centrum", "/supervisor-centrum", "/supbuddy-centrum",
          "/yatirimci-centrum", "/personel-centrum", "/bilgi-bankasi",
          "/egitim/:id", "/izin-talepleri", "/mesai-talepleri",
          "/kayip-esya", "/destek", "/kullanim-kilavuzu",
        ],
        totalPages: 194,
        totalRoutes: 203,
        guardedRoutes: 148,
        totalEndpoints: 956,
        usedEndpoints: 549,
      },
    });
  } catch (err) {
    console.error("[SistemAtolyesi] metadata error:", err);
    res.status(500).json({ error: "Sistem verisi alınamadı" });
  }
});

router.get("/api/sistem-atolyesi/notlar", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  try {
    const notes = await db
      .select()
      .from(workshopNotes)
      .where(eq(workshopNotes.userId, user.id))
      .orderBy(desc(workshopNotes.createdAt));
    res.json(notes);
  } catch (err) {
    console.error("[SistemAtolyesi] GET notlar error:", err);
    res.status(500).json({ error: "Notlar yüklenirken hata oluştu." });
  }
});

router.post("/api/sistem-atolyesi/notlar", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  const parsed = insertWorkshopNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [note] = await db
      .insert(workshopNotes)
      .values({ ...parsed.data, userId: user.id })
      .returning();
    res.status(201).json(note);
  } catch (err) {
    console.error("[SistemAtolyesi] POST notlar error:", err);
    res.status(500).json({ error: "Not oluşturulurken hata oluştu." });
  }
});

router.patch("/api/sistem-atolyesi/notlar/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID." });
  const parsed = updateWorkshopNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [note] = await db
      .update(workshopNotes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(workshopNotes.id, id), eq(workshopNotes.userId, user.id)))
      .returning();
    if (!note) return res.status(404).json({ error: "Not bulunamadı." });
    res.json(note);
  } catch (err) {
    console.error("[SistemAtolyesi] PATCH notlar error:", err);
    res.status(500).json({ error: "Not güncellenirken hata oluştu." });
  }
});

router.delete("/api/sistem-atolyesi/notlar/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!isAllowed(req)) return res.status(403).json({ error: "Bu sayfaya erişim yetkiniz yok." });
  const user = req.user as any;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID." });
  try {
    const [deleted] = await db
      .delete(workshopNotes)
      .where(and(eq(workshopNotes.id, id), eq(workshopNotes.userId, user.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not bulunamadı." });
    res.json({ success: true });
  } catch (err) {
    console.error("[SistemAtolyesi] DELETE notlar error:", err);
    res.status(500).json({ error: "Not silinirken hata oluştu." });
  }
});

export default router;
