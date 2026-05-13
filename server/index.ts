import express, { type Request, Response, NextFunction } from "express";

// Sprint 10 P-8 (6 May 2026) — Audit Security 4.3
// Logger initialization MUST be before any other import that might log.
// 3241 mevcut console.* çağrısı otomatik structured log'a çevrilir.
import { installConsoleOverride, logger } from "./lib/logger";
installConsoleOverride();

import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { initReminderSystem, runReminderTick, startSLACheckSystem, startPhotoCleanupSystem, startFeedbackSlaCheckSystem, startFeedbackPatternAnalysisSystem, startStockAlertSystem, startOnboardingCompletionSystem, startStaleQuoteReminderSystem, startNotificationArchiveSystem, stopAllReminderSystems, checkOnboardingCompletions, checkAndArchiveIfTime, checkLowStockNotifications, checkFeedbackSlaBreaches } from "./reminders";
import { seedRolePermissions } from "./seed-role-permissions";
import { seedPermissionModules } from "./seed-permission-modules";
import { seedRoleTemplates } from "./seed-role-templates";
import { seedAdminMenu } from "./seed-admin-menu";
import { seedServiceRequests } from "./seed-service-requests";
import { seedDospressoRecipes } from "./seed-dospresso-recipes";
import { seedDefaultAuditTemplate } from "./seed-audit-template";
import { seedSlaRules } from "./seed-sla-rules";
import { seedModuleFlags } from "./seed-module-flags";
import { seedBranchTasks } from "./seed-branch-tasks";
import { generateDailyTaskInstances, markOverdueInstances } from "./services/branch-task-scheduler";
import coworkRoutes from "./routes/cowork-routes";
import { migrateCrmTaskTables } from "./services/crm-task-migration";
import { migrateEscalationTables, startFranchiseEscalationScheduler } from "./services/franchise-escalation";
import { migrateCriticalLogsTable, critLog } from "./lib/crit-log";
import { trDateString, trTimeString } from "./lib/datetime";
import { seedRoles } from "./seed-roles";
import { seedAcademyCategories } from "./seed-academy-categories";
import { seedAllKioskAccounts } from "./lib/kiosk-accounts";
import { seedPdksSprintA } from "./seed-pdks-sprint-a";
import { startPdksDailySummarySyncScheduler } from "./services/pdks-daily-summary-sync";
import { startDailyBriefScheduler } from "./services/daily-brief-generator";  // Sprint 48 (Aslan 13 May 2026)
import { startAiAlertScheduler } from "./services/ai-alert-generator";  // Sprint 49 (Aslan 13 May 2026)
import { cleanupExpiredKioskSessions } from "./localAuth";
import { startWeeklyBackupScheduler, stopBackupScheduler, performHealthCheck, startDailyPgDumpScheduler } from "./backup";
import { startTrackingCleanup, stopTrackingCleanup } from "./tracking";
import { startAgentScheduler, stopAgentScheduler } from "./services/agent-scheduler";
import { calculateAndSaveDailyScores, calculateAndSaveWeeklyScores, backfillNullScores, closeOrphanedBreakLogs, cleanupStaleShiftSessions } from "./services/factory-scoring-service";
import { calculateMonthlySnapshots, calculateFactorySnapshot } from "./services/monthly-snapshot-service";
import { cache, aiRateLimiter } from "./cache";
import { schedulerManager } from "./scheduler-manager";
import { startHqKioskPinAuditScheduler } from "./scheduler/hq-kiosk-pin-audit";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, productionLots, tasks, notifications as notificationsTable, branches, branchKioskSettings, factoryKioskConfig, factoryShiftSessions, factoryBreakLogs, kioskSessions, pdksRecords, branchShiftSessions, hqShiftSessions, scheduledOffs, branchWeeklyAttendanceSummary, shifts } from "@shared/schema";
import { eq, lt, sql, count, and, lte, gte, ne, inArray, isNotNull, isNull } from "drizzle-orm";
import crypto from "crypto";

// Patch: @neondatabase/serverless tries to set ErrorEvent.message which is read-only
// in Node.js 18+ — make it writable to prevent startup crash on transient DB errors
if (typeof globalThis.ErrorEvent !== 'undefined') {
  try {
    const desc = Object.getOwnPropertyDescriptor(globalThis.ErrorEvent.prototype, 'message');
    if (desc && !desc.writable && !desc.set) {
      Object.defineProperty(globalThis.ErrorEvent.prototype, 'message', {
        ...desc,
        writable: true,
        configurable: true,
      });
    }
  } catch (_) { /* ignore */ }
}

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[UnhandledRejection] Unhandled promise rejection:', reason);
  console.error('[UnhandledRejection] Promise:', promise);
});

let httpServer: import('http').Server | null = null;

process.on('uncaughtException', (error: Error) => {
  // Neon serverless WebSocket bağlantı hatası — sunucu devam edebilir
  if (error instanceof TypeError && error.message?.includes('only a getter')) {
    console.warn('[UncaughtException] Transient Neon DB connection error (non-fatal), server continues:', error.message);
    return;
  }
  console.error('[UncaughtException] Uncaught exception:', error);
  console.error('[UncaughtException] Initiating graceful shutdown...');
  if (httpServer) {
    httpServer.close(() => {
      console.error('[UncaughtException] Server closed, exiting...');
      process.exit(1);
    });
  }
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

const app = express();

// Trust proxy - required for session cookies behind reverse proxy
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  limit: '20mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  httpServer = server;

  app.use("/api", (req: Request, res: Response) => {
    res.status(404).json({
      error: "API endpoint not found",
      path: req.originalUrl,
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; statusCode?: number; message?: string; code?: string };
    if (e?.code === "AI_BUDGET_EXCEEDED") {
      const ae = err as { message?: string; monthToDateCost?: number; monthlyBudget?: number };
      res.status(503).json({
        message: ae.message || "AI aylık bütçe tavanı aşıldı",
        code: "AI_BUDGET_EXCEEDED",
        monthToDateCost: ae.monthToDateCost,
        monthlyBudget: ae.monthlyBudget,
      });
      console.error("[GlobalErrorHandler] AI_BUDGET_EXCEEDED");
      return;
    }
    const status = e?.status || e?.statusCode || 500;
    const message = e?.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("[GlobalErrorHandler]", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 1000;
  let attempt = 0;
  let listening = false;

  function tryListen() {
    attempt++;
    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attempt < MAX_RETRIES) {
        log(`⚠️  Port ${port} busy, retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt}/${MAX_RETRIES})...`);
        server.close(() => {
          setTimeout(tryListen, RETRY_DELAY_MS);
        });
      } else {
        console.error(`❌ Fatal: Cannot bind to port ${port} after ${attempt} attempts:`, err.message);
        process.exit(1);
      }
    };
    server.once('error', onError);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      listening = true;
      server.removeListener('error', onError);
      log(`serving on port ${port}`);
      onServerReady();
    });
  }

  // NOT: kiosk_sessions tablosu ve şema değişiklikleri artık
  // migrations/task-255-startup-ddl.sql üzerinden versiyonlanır.
  // Burada sadece run-time veri migration'ı (parola hashleme) yapılır.
  async function migrateKioskPasswords() {
    let branchCount = 0;
    try {
      const allBranches = await db.select({
        id: branches.id,
        kioskPassword: branches.kioskPassword,
      }).from(branches);

      for (const branch of allBranches) {
        if (branch.kioskPassword && !branch.kioskPassword.startsWith('$2b$') && !branch.kioskPassword.startsWith('$2a$') && !branch.kioskPassword.startsWith('$2y$')) {
          const hashed = await bcrypt.hash(branch.kioskPassword, 10);
          await db.update(branches).set({ kioskPassword: hashed }).where(eq(branches.id, branch.id));
          branchCount++;
        }
      }
    } catch (error) {
      console.error("[KioskMigration] Error hashing branches.kioskPassword:", error);
    }

    let settingsCount = 0;
    try {
      const allKioskSettings = await db.select({
        id: branchKioskSettings.id,
        kioskPassword: branchKioskSettings.kioskPassword,
      }).from(branchKioskSettings);

      for (const setting of allKioskSettings) {
        if (setting.kioskPassword && !setting.kioskPassword.startsWith('$2b$') && !setting.kioskPassword.startsWith('$2a$') && !setting.kioskPassword.startsWith('$2y$')) {
          const hashed = await bcrypt.hash(setting.kioskPassword, 10);
          await db.update(branchKioskSettings).set({ kioskPassword: hashed }).where(eq(branchKioskSettings.id, setting.id));
          settingsCount++;
        }
      }
    } catch (error) {
      console.error("[KioskMigration] Error hashing branch_kiosk_settings.kioskPassword:", error);
    }

    let factoryCount = 0;
    try {
      const [factoryPwConfig] = await db.select().from(factoryKioskConfig)
        .where(eq(factoryKioskConfig.configKey, 'device_password'))
        .limit(1);

      if (factoryPwConfig && factoryPwConfig.configValue && !factoryPwConfig.configValue.startsWith('$2b$') && !factoryPwConfig.configValue.startsWith('$2a$') && !factoryPwConfig.configValue.startsWith('$2y$')) {
        const hashed = await bcrypt.hash(factoryPwConfig.configValue, 10);
        await db.update(factoryKioskConfig).set({ configValue: hashed, updatedAt: new Date() }).where(eq(factoryKioskConfig.configKey, 'device_password'));
        factoryCount = 1;
      }
    } catch (error) {
      console.error("[KioskMigration] Error hashing factory_kiosk_config.device_password:", error);
    }

    if (branchCount > 0 || settingsCount > 0 || factoryCount > 0) {
      log(`[KioskMigration] Hashed plaintext passwords: ${branchCount} branches, ${settingsCount} kiosk_settings, ${factoryCount} factory_config`);
    } else {
      log(`[KioskMigration] All kiosk passwords already hashed`);
    }
  }

  async function seedKioskAccounts() {
    try {
      const results = await seedAllKioskAccounts();
      const created = results.filter(r => r.status === 'created').length;
      const updated = results.filter(r => r.status === 'updated').length;
      log(`[KioskSeed] Kiosk accounts: ${created} created, ${updated} updated (total: ${results.length})`);
    } catch (error) {
      console.error('[KioskSeed] Error seeding kiosk accounts:', error);
    }
  }

  async function onServerReady() {
    const startupTime = Date.now();

    // NOT: branches.setup_complete, users.onboarding_complete,
    // branch_kiosk_settings.allow_pin/allow_qr, kiosk_sessions tablosu vb.
    // şema değişiklikleri artık migrations/task-255-startup-ddl.sql
    // üzerinden uygulanır (Task #255).
    await logDbDiagnostics();
    await bootstrapAdminUser();
    await resetNonAdminPasswords();
    await rotatePilotDefaultPasswords();
    await ensureAdminUserApproved();
    await migrateKioskPasswords();
    await seedKioskAccounts();

    const roleChain = async () => {
      await seedRoles();
      await seedPermissionModules();
      await seedRolePermissions();
      await seedRoleTemplates();
    };

    const allSeedResults = await Promise.allSettled([
      roleChain(),
      seedAdminMenu(),
      seedServiceRequests(),
      seedDospressoRecipes(),
      seedAcademyCategories(),
      seedDefaultAuditTemplate(),
      seedSlaRules(),
      seedModuleFlags(),
      seedBranchTasks(),
      seedPdksSprintA(),
    ]);

    const seedNames = ['roleChain', 'adminMenu', 'serviceRequests', 'recipes', 'academyCategories', 'auditTemplate', 'slaRules', 'moduleFlags', 'branchTasks', 'pdksSprintA'];
    allSeedResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Error seeding ${seedNames[i]}:`, result.reason);
      }
    });
    
    const seedDuration = Date.now() - startupTime;
    log(`Seeds completed in ${seedDuration}ms`);
    
    try {
      const backfillCheck = await db.execute(sql`SELECT value FROM site_settings WHERE key = 'setup_complete_backfilled'`);
      if (!backfillCheck.rows || backfillCheck.rows.length === 0) {
        await db.execute(sql`UPDATE branches SET setup_complete = true WHERE is_active = true`);
        await db.execute(sql`INSERT INTO site_settings (key, value, type, category, description) VALUES ('setup_complete_backfilled', 'true', 'boolean', 'system', 'One-time backfill of setup_complete for existing active branches') ON CONFLICT (key) DO NOTHING`);
        log("[Migration] Backfilled setup_complete=true for existing active branches");
      }
    } catch (e) { console.error("Error backfilling setup_complete:", e); }

    try {
      const onboardingBackfill = await db.execute(sql`SELECT value FROM site_settings WHERE key = 'onboarding_complete_backfilled'`);
      if (!onboardingBackfill.rows || onboardingBackfill.rows.length === 0) {
        await db.execute(sql`UPDATE users SET onboarding_complete = true WHERE is_active = true`);
        await db.execute(sql`INSERT INTO site_settings (key, value, type, category, description) VALUES ('onboarding_complete_backfilled', 'true', 'boolean', 'system', 'One-time backfill of onboarding_complete for existing active users') ON CONFLICT (key) DO NOTHING`);
        log("[Migration] Backfilled onboarding_complete=true for existing active users");
      }
    } catch (e) { console.error("Error backfilling onboarding_complete:", e); }

    try {
      const { eq } = await import("drizzle-orm");
      const { users, siteSettings } = await import("@shared/schema");
      const [pilotFlag] = await db.select().from(siteSettings).where(eq(siteSettings.key, "pilot_launched"));
      if (!pilotFlag || pilotFlag.value !== "true") {
        const resetResult = await db.update(users)
          .set({ mustChangePassword: false })
          .where(eq(users.mustChangePassword, true))
          .returning({ id: users.id });
        if (resetResult.length > 0) {
          log(`[Pre-Pilot] ${resetResult.length} users' mustChangePassword flag cleared`);
        }
      }
    } catch (e) { console.error("Error clearing mustChangePassword flags:", e); }

    try {
      const cleaned = await cleanupExpiredKioskSessions();
      if (cleaned > 0) log(`[Kiosk] Startup cleanup: removed ${cleaned} expired sessions`);
    } catch (e) { console.error("Error in startup kiosk cleanup:", e); }

    log("Schedulers will start in 30 seconds (lazy init)...");
    schedulerManager.registerTimeout('scheduler-lazy-init', () => {
      initReminderSystem();
      startOnboardingCompletionSystem();
      startNotificationArchiveSystem();
      startMaster10MinTick();
      
      startSktExpiryCheckJob();
      startScheduledTaskDeliveryJob();
      startSLACheckSystem();
      startPhotoCleanupSystem();
      startFeedbackPatternAnalysisSystem();
      startStaleQuoteReminderSystem();
      
      startFeedbackSlaCheckSystem();
      startStockAlertSystem();
      startConsolidatedHourlyJobs();
      
      startAgentScheduler();
      startDailyGapDetection();
      
      startWeeklyBackupScheduler();
      void startDailyPgDumpScheduler(); // Wave A-2 / B16: günlük pg_dump → Object Storage (03:00 UTC)
      startTrackingCleanup();
      startNotificationCleanupJob();
      startFactoryScoringScheduler();
      startHqKioskPinAuditScheduler();

      // Franchise eskalasyon tablolarını oluştur ve 5-kademe sistemi başlat
      migrateEscalationTables().catch(e => console.error("[Escalation] Migration error:", e));
      migrateCrmTaskTables().catch(e => console.error("[CRMTask] Migration error:", e));
      migrateCriticalLogsTable().catch(e => console.error("[CritLog] Migration error:", e));
      startFranchiseEscalationScheduler();

      generateDailyTaskInstances().catch(e => console.error("[BranchTasks] Startup generation error:", e));
      markOverdueInstances().catch(e => console.error("[BranchTasks] Startup overdue check error:", e));

      closeOrphanedBreakLogs().catch(e => console.error("[Factory Scoring] Startup orphan break cleanup error:", e));
      backfillNullScores().catch(e => console.error("[Factory Scoring] Startup backfill error:", e));
      cleanupStaleShiftSessions().catch(e => console.error("[Factory Kiosk] Startup stale shift cleanup error:", e));
      // Şube stale session cleanup — 14 saatten eski aktif session'ları abandoned yap
      db.execute(sql`
        UPDATE branch_shift_sessions 
        SET status = 'abandoned', notes = COALESCE(notes, '') || ' [Otomatik kapatıldı — 14 saatten eski]'
        WHERE status IN ('active','on_break') AND check_in_time < NOW() - INTERVAL '14 hours'
      `).catch(e => console.error("[Branch Kiosk] Stale session cleanup error:", e));

      scheduleFactoryAutoCheckout();
      scheduleBranchAutoCheckout();
      scheduleHQAutoCheckout();

      startPdksAutoWeekendScheduler();
      startPdksWeeklySummaryScheduler();
      startPdksDailyAbsenceScheduler();
      startPdksMonthlyPayrollScheduler();
      startPdksMonthlyAttendanceSummaryScheduler();
      startPdksDailySummarySyncScheduler();

      // Sprint 48 (Aslan 13 May 2026): Daily AI Brief — her sabah 09:00 TR time
      startDailyBriefScheduler();

      // Sprint 49 (Aslan 13 May 2026): AI Alert System — günde 2 kez (08:00 ve 16:00 TR)
      startAiAlertScheduler();

      schedulerManager.start();
      log(`All schedulers initialized (${schedulerManager.getJobCount()} jobs, total startup: ${Date.now() - startupTime}ms)`);
      
      performHealthCheck().then(health => {
        log(`System health: ${health.status.toUpperCase()}`);
        health.details.forEach(d => log(`   ${d}`));
      }).catch(err => {
        console.error('Health check error:', err);
      });
    }, 30_000);
  }

  tryListen();
})();

// Self-healing function to ensure admin user is always approved and active
async function logDbDiagnostics() {
  try {
    const result = await db.select({ total: count() }).from(users);
    const userCount = result[0]?.total || 0;

    log(`🔌 DB diagnostics: connected=true, NODE_ENV=${process.env.NODE_ENV || 'undefined'}, users=${userCount}`);
    return userCount;
  } catch (error) {
    console.error("❌ DB diagnostics failed:", error);
    return -1;
  }
}

async function bootstrapAdminUser() {
  try {
    if (!process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      console.error(`❌ ADMIN_BOOTSTRAP_PASSWORD env variable is not set. Cannot start without a secure admin password.`);
      console.error(`   Set ADMIN_BOOTSTRAP_PASSWORD in Replit Secrets before starting the application.`);
      process.exit(1);
    }
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD.trim();

    const existingAdmin = await storage.getUserByUsername('admin');
    if (existingAdmin) {
      // Always force-write a fresh hash so production is guaranteed to be in sync
      log(`🔐 Admin bootstrap: pw_len=${password.length}, existing_hash_len=${existingAdmin.hashedPassword?.length ?? 0}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.update(users)
        .set({ hashedPassword, accountStatus: 'approved', isActive: true, mustChangePassword: false })
        .where(eq(users.id, existingAdmin.id));
      // Immediately verify the written hash simulates a real login
      const verify = await db.select({ hp: users.hashedPassword }).from(users).where(eq(users.id, existingAdmin.id));
      const loginSim = verify[0]?.hp ? await bcrypt.compare(password, verify[0].hp) : false;
      log(`✅ Admin password force-reset (id=${existingAdmin.id}): login_sim=${loginSim ? '✅ OK' : '❌ FAIL'}`);
      if (!loginSim) {
        log(`❌ CRITICAL: login simulation failed after writing hash — check DB column type or encoding`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newAdmin] = await db.insert(users).values({
      username: 'admin',
      hashedPassword,
      email: 'admin@dospresso.com',
      firstName: 'Admin',
      lastName: 'Yönetici',
      role: 'admin',
      branchId: null,
      phoneNumber: '0312 500 5000',
      hireDate: new Date(2023, 0, 1).toISOString().split('T')[0],
      isActive: true,
      accountStatus: 'approved',
    }).returning({ id: users.id });

    log(`🔐 Admin user created (id=${newAdmin.id}). Password source: ADMIN_BOOTSTRAP_PASSWORD env`);
  } catch (error) {
    console.error("❌ Admin bootstrap failed:", error);
  }
}

/**
 * [Task #274 / Audit Issue #10]
 * Pilot bittikten sonra (pilot_launched=true), startup'ta tüm aktif personelin
 * parolasını "0000"a sıfırlayan rutin KALICI olarak devre dışı bırakıldı.
 *
 * Sadece dev ortamında ve ALLOW_PILOT_PASSWORD_RESET=1 env'i açıkça verildiğinde
 * çalışır. Üretimde hiçbir koşulda toplu sıfırlama yapılmaz; bireysel/şube bazlı
 * sıfırlama için server/routes/admin-password.ts kullanılır.
 */
async function resetNonAdminPasswords() {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowReset = process.env.ALLOW_PILOT_PASSWORD_RESET === "1";
    if (!isDev || !allowReset) {
      return;
    }

    const { siteSettings } = await import("@shared/schema");
    const [pilotFlag] = await db.select().from(siteSettings).where(eq(siteSettings.key, "pilot_launched"));
    if (pilotFlag && pilotFlag.value === "true") {
      log(`🔑 Pilot launched — skipping non-admin password reset`);
      return;
    }
    const defaultPassword = "0000";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const result = await db.update(users)
      .set({ hashedPassword })
      .where(and(ne(users.username, 'admin'), eq(users.isActive, true)))
      .returning({ id: users.id, username: users.username });
    log(`🔑 [DEV] Reset passwords for ${result.length} non-admin active users to "0000"`);
  } catch (error) {
    console.error("❌ Non-admin password reset failed:", error);
  }
}

/**
 * [Task #274 / Audit Issue #10]
 * Pilot süresince "0000" parolası ile çalışan tüm aktif personel için
 * mustChangePassword=true zorunlu hale getirilir; ilk girişte parola değişimi
 * istenir (ForcePasswordChangeDialog client/src/App.tsx içinde).
 *
 * Idempotent: site_settings.pilot_default_passwords_rotated=true olduğunda
 * tekrar çalıştırılmaz. Yalnızca bcrypt hash'i "0000" ile eşleşen kullanıcılar
 * etkilenir; özel parola belirleyenler dokunulmaz.
 */
async function rotatePilotDefaultPasswords() {
  try {
    const { siteSettings } = await import("@shared/schema");
    const ROTATED_KEY = "pilot_default_passwords_rotated";

    const [rotatedFlag] = await db.select().from(siteSettings).where(eq(siteSettings.key, ROTATED_KEY));
    if (rotatedFlag && rotatedFlag.value === "true") {
      return;
    }

    const [pilotFlag] = await db.select().from(siteSettings).where(eq(siteSettings.key, "pilot_launched"));
    if (!pilotFlag || pilotFlag.value !== "true") {
      // Pilot henüz başlamamış, rotasyona gerek yok
      return;
    }

    const candidates = await db.select({
      id: users.id,
      username: users.username,
      hashedPassword: users.hashedPassword,
      mustChangePassword: users.mustChangePassword,
    }).from(users).where(and(ne(users.username, 'admin'), eq(users.isActive, true)));

    let affected = 0;
    let errors = 0;
    for (const u of candidates) {
      if (!u.hashedPassword) continue;
      try {
        const isDefault = await bcrypt.compare("0000", u.hashedPassword);
        if (isDefault && !u.mustChangePassword) {
          await db.update(users)
            .set({ mustChangePassword: true })
            .where(eq(users.id, u.id));
          affected++;
        }
      } catch (cmpErr) {
        errors++;
        console.error(`[Task#274] bcrypt.compare failed for user ${u.username}:`, cmpErr);
      }
    }

    // Marker yalnızca taramanın tüm kullanıcıları hatasız işlediği durumda
    // yazılır. Aksi halde bir sonraki başlangıçta tekrar denenir, böylece
    // güvenlik durumu garanti altına alınmadan "tamamlandı" işareti
    // konmaz. (Kod review feedback'i Task #274.)
    if (errors === 0) {
      await db.insert(siteSettings).values({
        key: ROTATED_KEY,
        value: "true",
        type: "boolean",
        category: "security",
        description: "Task #274 — Pilot sonrası '0000' parola sahiplerine mustChangePassword=true uygulandı",
      }).onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: "true", updatedAt: new Date() },
      });
      log(`🔐 [Task#274] Pilot default password rotation complete — ${affected} user(s) flagged mustChangePassword=true`);
    } else {
      log(`⚠️ [Task#274] Rotation finished with ${errors} error(s); marker NOT set, will retry on next startup. Affected so far: ${affected}`);
    }
  } catch (error) {
    console.error("❌ [Task#274] rotatePilotDefaultPasswords failed:", error);
  }
}

async function ensureAdminUserApproved() {
  try {
    const adminUser = await storage.getUserByUsername('admin');
    if (adminUser && (adminUser.accountStatus !== 'approved' || !adminUser.isActive)) {
      log(`⚠️  Admin user found with accountStatus=${adminUser.accountStatus}, isActive=${adminUser.isActive}`);
      log(`🔧 Auto-fixing admin user credentials...`);
      await storage.updateUser(adminUser.id, {
        accountStatus: 'approved',
        isActive: true,
      });
      log(`✅ Admin user auto-fixed: accountStatus=approved, isActive=true`);
    } else if (adminUser) {
      log(`✅ Admin user verified: accountStatus=approved, isActive=true`);
    }
  } catch (error) {
    console.error("Error ensuring admin user approved:", error);
  }
}

function startMaster10MinTick() {
  storage.sendShiftReminders().catch((error: Error | unknown) => {
    console.error("Error sending shift reminders:", error);
  });

  schedulerManager.registerInterval('master-tick-10min', async () => {
    try { runReminderTick(); } catch (e) { console.error("Error in reminder tick:", e); }
    try { await storage.sendShiftReminders(); } catch (e) { console.error("Error in shift reminder:", e); }
    try { await checkOnboardingCompletions(); } catch (e) { console.error("Error in onboarding check:", e); }
    try { await checkAndArchiveIfTime(); } catch (e) { console.error("Error in notification archive:", e); }
    try { const { checkWebinarReminders } = await import("./routes/academy-v3"); await checkWebinarReminders(); } catch (e) { console.error("Error in webinar reminder:", e); }

    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

    if (nowTR.getHours() === 0 && nowTR.getMinutes() < 10) {
      try {
        const gen = await generateDailyTaskInstances();
        const marked = await markOverdueInstances();
        log(`[BranchTasks] Daily: ${gen} generated, ${marked} marked overdue`);
      } catch (e) { console.error("[BranchTasks] Daily generation error:", e); }
    }

    if (nowTR.getHours() === 3 && nowTR.getMinutes() < 10) {
      try {
        const result = await storage.runAllCompositeScoreUpdates();
        log(`Composite score update: ${result.processed} users, ${result.dangerCount} danger, ${result.warningCount} warning`);
      } catch (e) { console.error("Error in composite score update:", e); }
    }

    if (nowTR.getHours() === 8 && nowTR.getMinutes() < 10) {
      try {
        const { generateTasksForAllActiveUsers } = await import("./services/task-trigger-service");
        const result = await generateTasksForAllActiveUsers();
        log(`[TaskTrigger] Daily: ${result.usersProcessed} users, ${result.totalCreated} created, ${result.totalSkipped} skipped`);
      } catch (e) { console.error("[TaskTrigger] Daily generation error:", e); }
    }
  }, 10 * 60 * 1000);

  log("Master 10-min tick started (reminders + shift + onboarding + archive + webinar-reminder + composite@03:00 + task-trigger@08:00)");
}

function startConsolidatedHourlyJobs() {
  schedulerManager.registerInterval('tick-1hr', async () => {
    try { await checkLowStockNotifications(); } catch (e) { console.error("Error in stock alert:", e); }
    try { await checkFeedbackSlaBreaches(); } catch (e) { console.error("Error in feedback SLA:", e); }
    try {
      const cleaned = await cleanupExpiredKioskSessions();
      if (cleaned > 0) log(`[Kiosk] Cleaned up ${cleaned} expired sessions`);
    } catch (e) { console.error("Error in kiosk session cleanup:", e); }
    try {
      await cleanupStaleShiftSessions();
    } catch (e) { console.error("Error in stale shift cleanup:", e); }
    // Dobody periyodik kontroller (saatlik)
    try {
      const { runPeriodicChecks } = await import("./lib/dobody-workflow-engine");
      const result = await runPeriodicChecks();
      if (result.total > 0) log(`[Dobody] Periodic checks: ${result.total} proposals (shifts:${result.shifts} data:${result.dataQuality} sys:${result.system} biz:${result.business})`);
    } catch (e) { console.error("Error in Dobody periodic checks:", e); }

    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 0) {
      try {
        const result = await storage.runAllDangerZoneChecks();
        log(`Danger zone check: ${result.processed} processed, ${result.warnings} warnings, ${result.demotions} demotions`);
      } catch (e) { console.error("Error in danger zone check:", e); }
    }

    if (now.getDate() === 1 && now.getHours() === 2) {
      try {
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const results = await calculateMonthlySnapshots(prevMonth, prevYear);
        await calculateFactorySnapshot(prevMonth, prevYear);
        log(`Monthly snapshots calculated: ${results.filter(r => r.status === "ok").length}/${results.length} branches`);
      } catch (e) { console.error("Error in monthly snapshot calculation:", e); }
    }
  }, 60 * 60 * 1000);
  log("Consolidated hourly tick started (stock-alert + feedback-sla + danger-zone@1st + snapshots@1st-02:00)");
}

function startFactoryScoringScheduler() {
  schedulerManager.registerInterval('factory-scoring-daily', async () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() < 10) {
      try {
        await closeOrphanedBreakLogs();
        const result = await calculateAndSaveDailyScores();
        log(`[Factory Scoring] Daily scores: ${result.calculated} calculated, ${result.saved} saved`);
      } catch (e) { console.error("[Factory Scoring] Daily calculation error:", e); }
    }
    if (now.getDay() === 1 && now.getHours() === 3 && now.getMinutes() < 10) {
      try {
        const result = await calculateAndSaveWeeklyScores();
        log(`[Factory Scoring] Weekly scores: ${result.calculated} calculated, ${result.saved} saved`);
      } catch (e) { console.error("[Factory Scoring] Weekly calculation error:", e); }
    }
  }, 10 * 60 * 1000);
  log("Factory scoring scheduler started (daily@02:00, weekly@Mon 03:00)");
}

async function forceCloseAllFactoryShifts() {
  try {
    const activeShifts = await db.select()
      .from(factoryShiftSessions)
      .where(eq(factoryShiftSessions.status, 'active'));

    if (activeShifts.length === 0) return;

    const now = new Date();

    for (const shift of activeShifts) {
      await db.update(factoryShiftSessions)
        .set({
          status: 'completed',
          checkOutTime: now,
          notes: '[Otomatik kapatıldı — 20:30 çıkış unutuldu]',
        })
        .where(eq(factoryShiftSessions.id, shift.id));

      try {
        const [worker] = await db.select({ branchId: users.branchId }).from(users).where(eq(users.id, shift.userId)).limit(1);
        if (worker?.branchId) {
          await db.insert(pdksRecords).values({
            userId: shift.userId,
            branchId: worker.branchId,
            recordDate: trDateString(now),
            recordTime: trTimeString(now),
            recordType: 'cikis',
            source: 'kiosk',
            deviceInfo: 'auto_checkout_2030',
          });
        }
      } catch (e) {
        // Sprint E migrate (Task #117): silent console.error → critLog
        critLog("AUTO-CLOSE", "Factory auto-checkout 20:30: pdks_records yazılamadı (factory_session.completed yazıldı)", { userId: shift.userId, sessionId: shift.id, error: e instanceof Error ? e.message : String(e) }, "index.ts:680").catch(() => {});
      }

      try {
        await db.update(factoryBreakLogs)
          .set({
            endedAt: now,
            durationMinutes: 15,
            notes: '[Otomatik kapatıldı]',
          })
          .where(and(
            eq(factoryBreakLogs.userId, shift.userId),
            isNull(factoryBreakLogs.endedAt)
          ));
      } catch (e) {}

      try {
        await db.delete(kioskSessions)
          .where(eq(kioskSessions.userId, shift.userId));
      } catch (e) {}
    }

    log(`[Factory] Auto-checkout: ${activeShifts.length} shifts force-closed at 20:30`);
  } catch (error) {
    console.error('[Factory] Auto-checkout failed:', error);
  }
}

function scheduleFactoryAutoCheckout() {
  const checkAndSchedule = () => {
    const now = new Date();
    const istanbul = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

    const target = new Date(istanbul);
    target.setHours(20, 30, 0, 0);
    if (istanbul >= target) {
      target.setDate(target.getDate() + 1);
    }

    const msUntil = target.getTime() - istanbul.getTime();

    setTimeout(async () => {
      await forceCloseAllFactoryShifts();
      checkAndSchedule();
    }, msUntil);

    log(`[Factory] Auto-checkout scheduled for 20:30 (in ${Math.round(msUntil / 60000)} min)`);
  };

  checkAndSchedule();
}

async function forceCloseAllBranchShifts() {
  try {
    const now = new Date();
    const istanbulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const currentTimeStr = `${String(istanbulNow.getHours()).padStart(2, '0')}:${String(istanbulNow.getMinutes()).padStart(2, '0')}`;

    // Fetch per-branch auto_close_time settings from DB
    const settingsRows = await db.select({
      branchId: branchKioskSettings.branchId,
      autoCloseTime: branchKioskSettings.autoCloseTime,
    }).from(branchKioskSettings);
    const settingsMap = new Map<number, string>();
    for (const s of settingsRows) {
      settingsMap.set(s.branchId, s.autoCloseTime ?? '22:00');
    }

    const activeSessions = await db.select()
      .from(branchShiftSessions)
      .where(eq(branchShiftSessions.status, 'active'));

    if (activeSessions.length === 0) return;

    let closedCount = 0;
    for (const session of activeSessions) {
      const branchCloseTime = settingsMap.get(session.branchId) ?? '22:00';
      // Only close sessions whose branch auto-close time has been reached
      if (currentTimeStr < branchCloseTime) continue;

      const workMinutes = Math.round((now.getTime() - new Date(session.checkInTime).getTime()) / 60000);
      await db.update(branchShiftSessions)
        .set({
          status: 'completed',
          checkOutTime: now,
          workMinutes,
          notes: `[Otomatik kapatıldı — ${branchCloseTime} çıkış unutuldu]`,
        })
        .where(eq(branchShiftSessions.id, session.id));

      try {
        await db.insert(pdksRecords).values({
          userId: session.userId,
          branchId: session.branchId,
          recordDate: trDateString(now),
          recordTime: trTimeString(now),
          recordType: 'cikis',
          source: 'auto_close',
          deviceInfo: `auto_checkout_${branchCloseTime.replace(':', '')}`,
        });
      } catch (e) {
        // Sprint E migrate (Task #117): silent console.error → critLog
        critLog("AUTO-CLOSE", `Branch auto-checkout ${branchCloseTime}: pdks_records yazılamadı (branch_session.completed yazıldı)`, { userId: session.userId, branchId: session.branchId, sessionId: session.id, error: e instanceof Error ? e.message : String(e) }, "index.ts:781").catch(() => {});
      }
      closedCount++;
    }

    if (closedCount > 0) {
      log(`[Branch] Auto-checkout: ${closedCount} sessions force-closed at ${currentTimeStr}`);
    }
  } catch (error) {
    console.error('[Branch] Auto-checkout failed:', error);
  }
}

function scheduleBranchAutoCheckout() {
  // Run once per hour to pick up any per-branch close times that have passed
  const runAndReschedule = async () => {
    await forceCloseAllBranchShifts();
    // Schedule next run at the top of the next hour
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
    setTimeout(runAndReschedule, msUntilNextHour);
  };

  // Start at top of next hour
  const now = new Date();
  const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
  setTimeout(runAndReschedule, msUntilNextHour);
  log(`[Branch] Auto-checkout scheduler started (checks per-branch settings, next run in ${Math.round(msUntilNextHour / 60000)} min)`);
}

async function forceCloseAllHQShifts() {
  try {
    const HQ_BRANCH_ID = 23;
    // Read auto_close_time from settings for HQ branch
    const [hqSettings] = await db.select({ autoCloseTime: branchKioskSettings.autoCloseTime })
      .from(branchKioskSettings)
      .where(eq(branchKioskSettings.branchId, HQ_BRANCH_ID));
    const hqCloseTime = hqSettings?.autoCloseTime ?? '21:00';

    const now = new Date();
    const istanbulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const currentTimeStr = `${String(istanbulNow.getHours()).padStart(2, '0')}:${String(istanbulNow.getMinutes()).padStart(2, '0')}`;

    if (currentTimeStr < hqCloseTime) {
      log(`[HQ] Auto-checkout: current time ${currentTimeStr} < configured close time ${hqCloseTime}, skipping`);
      return;
    }

    // Close all open HQ sessions (active, on_break, outside) — any ongoing state
    const openSessions = await db.select()
      .from(hqShiftSessions)
      .where(inArray(hqShiftSessions.status, ['active', 'on_break', 'outside']));

    if (openSessions.length === 0) return;

    for (const session of openSessions) {
      const totalMinutes = Math.round((now.getTime() - new Date(session.checkInTime).getTime()) / 60000);
      const breakMins = session.breakMinutes || 0;
      const outsideMins = session.outsideMinutes || 0;
      const netMins = Math.max(0, totalMinutes - breakMins - outsideMins);

      await db.update(hqShiftSessions)
        .set({
          status: 'completed',
          checkOutTime: now,
          workMinutes: totalMinutes,
          netWorkMinutes: netMins,
          notes: `[Otomatik kapatıldı — ${hqCloseTime} çıkış unutuldu]`,
        })
        .where(eq(hqShiftSessions.id, session.id));

      try {
        await db.insert(pdksRecords).values({
          userId: session.userId,
          branchId: HQ_BRANCH_ID,
          recordDate: trDateString(now),
          recordTime: trTimeString(now),
          recordType: 'cikis',
          source: 'auto_close',
          deviceInfo: `auto_checkout_${hqCloseTime.replace(':', '')}`,
        });
      } catch (e) {
        // Sprint E migrate (Task #117): silent console.error → critLog
        critLog("AUTO-CLOSE", `HQ auto-checkout ${hqCloseTime}: pdks_records yazılamadı (hq_session.completed yazıldı)`, { userId: session.userId, sessionId: session.id, error: e instanceof Error ? e.message : String(e) }, "index.ts:863").catch(() => {});
      }
    }

    log(`[HQ] Auto-checkout: ${openSessions.length} sessions force-closed at ${hqCloseTime}`);
  } catch (error) {
    console.error('[HQ] Auto-checkout failed:', error);
  }
}

function scheduleHQAutoCheckout() {
  // Run once per hour to pick up DB-configured HQ close time
  const runAndReschedule = async () => {
    await forceCloseAllHQShifts();
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
    setTimeout(runAndReschedule, msUntilNextHour);
  };

  const now = new Date();
  const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
  setTimeout(runAndReschedule, msUntilNextHour);
  log(`[HQ] Auto-checkout scheduler started (reads DB-configured close time, next run in ${Math.round(msUntilNextHour / 60000)} min)`);
}

function startScheduledTaskDeliveryJob() {
  (async () => {
    try {
      const now = new Date();
      const scheduledTasks = await db.select().from(tasks)
        .where(and(
          eq(tasks.isDelivered, false),
          lte(tasks.scheduledDeliveryAt, now),
          eq(tasks.status, 'zamanlanmis')
        ));
      for (const task of scheduledTasks) {
        await storage.updateTask(task.id, { isDelivered: true, status: 'beklemede' });
        if (task.assignedToId && task.assignedById) {
          const assigner = await storage.getUser(task.assignedById);
          const assignerName = assigner?.firstName && assigner?.lastName
            ? `${assigner.firstName} ${assigner.lastName}` : 'Bir yonetici';
          await storage.createNotification({
            userId: task.assignedToId, type: 'task_assigned', title: 'Yeni Gorev Atandi',
            message: `${assignerName} size yeni bir gorev atadi: "${task.description?.substring(0, 50)}..."`,
            link: `/gorevler?taskId=${task.id}`, branchId: task.branchId,
          });
        }
      }
    } catch (error: unknown) { console.error("Scheduled task delivery initial run error:", error); }
  })();

  schedulerManager.registerInterval('task-delivery', async () => {
    try {
      const now = new Date();
      const scheduledTasks = await db.select().from(tasks)
        .where(and(
          eq(tasks.isDelivered, false),
          lte(tasks.scheduledDeliveryAt, now),
          eq(tasks.status, 'zamanlanmis')
        ));

      for (const task of scheduledTasks) {
        await storage.updateTask(task.id, {
          isDelivered: true,
          status: 'beklemede',
        });

        if (task.assignedToId && task.assignedById) {
          const assigner = await storage.getUser(task.assignedById);
          const assignerName = assigner?.firstName && assigner?.lastName
            ? `${assigner.firstName} ${assigner.lastName}`
            : 'Bir yonetici';

          await storage.createNotification({
            userId: task.assignedToId,
            type: 'task_assigned',
            title: 'Yeni Gorev Atandi',
            message: `${assignerName} size yeni bir gorev atadi: "${task.description?.substring(0, 50)}..."`,
            link: `/gorevler?taskId=${task.id}`,
            branchId: task.branchId,
          });
        }
      }

      if (scheduledTasks.length > 0) {
      }
    } catch (error: unknown) {
      console.error("Scheduled task delivery error:", error);
    }
  }, 5 * 60 * 1000);

  log("Scheduled task delivery job started (runs every 5 minutes)");
}

function startSktExpiryCheckJob() {
  schedulerManager.registerInterval('skt-expiry', async () => {
    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().slice(0, 10);

      const expiringLots = await db.select().from(productionLots)
        .where(and(
          isNotNull(productionLots.expiryDate),
          lte(productionLots.expiryDate, sevenDaysLater),
          ne(productionLots.status, 'iptal'),
          ne(productionLots.status, 'expired'),
        ))
        .limit(500);

      if (expiringLots.length === 0) return;

      const targetUsers = await db.select({ id: users.id }).from(users)
        .where(sql`${users.role} IN ('gida_muhendisi', 'fabrika_mudur', 'admin')`);

      const expiredIds: number[] = [];
      const notifValues: { userId: string; type: string; title: string; message: string }[] = [];

      const existingNotifs = await db.select({
        type: notificationsTable.type,
        message: notificationsTable.message,
      }).from(notificationsTable)
        .where(and(
          sql`${notificationsTable.type} IN ('skt_expired', 'skt_warning')`,
          gte(notificationsTable.createdAt, new Date(todayStr)),
        ));

      const existingSet = new Set(existingNotifs.map(n => `${n.type}:${n.message}`));

      for (const lot of expiringLots) {
        const isExpired = lot.expiryDate && new Date(lot.expiryDate) < now;
        const notifType = isExpired ? 'skt_expired' : 'skt_warning';
        const message = isExpired
          ? `LOT ${lot.lotNumber} son kullanma tarihi gecmis! Acil mudahale gerekli.`
          : `LOT ${lot.lotNumber} son kullanma tarihi 7 gun icinde dolacak.`;

        if (isExpired) {
          expiredIds.push(lot.id);
        }

        const alreadySent = existingSet.has(`${notifType}:${message}`);
        if (!alreadySent) {
          for (const u of targetUsers) {
            notifValues.push({ userId: u.id, type: notifType, title: isExpired ? 'SKT Suresi Dolmus!' : 'SKT Uyarisi', message });
          }
        }
      }

      if (expiredIds.length > 0) {
        await db.update(productionLots)
          .set({ status: 'expired' })
          .where(inArray(productionLots.id, expiredIds));
      }

      if (notifValues.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < notifValues.length; i += BATCH_SIZE) {
          await db.insert(notificationsTable).values(notifValues.slice(i, i + BATCH_SIZE));
        }
      }

      log(`[SKT] Checked: ${expiringLots.length} lots, expired: ${expiredIds.length}, notifications: ${notifValues.length}`);
    } catch (error) {
      console.error("[SKT] Expiry check error:", error);
    }
  }, 6 * 60 * 60 * 1000);

  log("SKT expiry check job started (runs every 6 hours)");
}

async function cleanupOldNotifications() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.isRead, true),
          lt(notificationsTable.createdAt, cutoff)
        )
      );

    log(`[Cleanup] Deleted old read notifications older than 90 days`);
  } catch (err) {
    console.error('[Cleanup] Notification cleanup failed:', err);
  }
}

function startDailyGapDetection() {
  schedulerManager.registerTimeout('gap-detection-init', async () => {
    try {
      const { detectSystemGaps } = await import("./services/system-completeness-service");
      const gaps = await detectSystemGaps();
      const criticalGaps = gaps.filter(g => g.severity === "critical");

      if (criticalGaps.length > 0) {
        const roleGaps = new Map<string, typeof criticalGaps>();
        for (const gap of criticalGaps) {
          for (const role of gap.targetRoles) {
            if (!roleGaps.has(role)) roleGaps.set(role, []);
            roleGaps.get(role)!.push(gap);
          }
        }

        for (const [role, items] of roleGaps) {
          const targetUsers = await db.select({ id: users.id }).from(users)
            .where(and(eq(users.role, role), eq(users.isActive, true)));

          for (const targetUser of targetUsers) {
            try {
              await storage.createNotification({
                userId: targetUser.id,
                type: "agent_guidance",
                title: `Mr. Dobody: ${items.length} kritik eksiklik tespit edildi`,
                message: items.map(i => `• ${i.title}`).join("\n"),
                link: "/",
              });
            } catch (e) { console.error("[Agent Guidance] Notification failed:", e); }
          }
        }
      }
      log(`[Agent Guidance] Gap detection: ${gaps.length} total, ${criticalGaps.length} critical`);
    } catch (error) {
      console.error("[Agent Guidance] Gap detection failed:", error);
    }
  }, 2 * 60 * 1000);

  schedulerManager.registerInterval('gap-detection-daily', async () => {
    try {
      const { detectSystemGaps } = await import("./services/system-completeness-service");
      const gaps = await detectSystemGaps();
      const criticalGaps = gaps.filter(g => g.severity === "critical");

      if (criticalGaps.length > 0) {
        const roleGaps = new Map<string, typeof criticalGaps>();
        for (const gap of criticalGaps) {
          for (const role of gap.targetRoles) {
            if (!roleGaps.has(role)) roleGaps.set(role, []);
            roleGaps.get(role)!.push(gap);
          }
        }

        for (const [role, items] of roleGaps) {
          const targetUsers = await db.select({ id: users.id }).from(users)
            .where(and(eq(users.role, role), eq(users.isActive, true)));

          for (const targetUser of targetUsers) {
            try {
              await storage.createNotification({
                userId: targetUser.id,
                type: "agent_guidance",
                title: `Mr. Dobody: ${items.length} kritik eksiklik tespit edildi`,
                message: items.map(i => `• ${i.title}`).join("\n"),
                link: "/",
              });
            } catch (e) { console.error("[Agent Guidance] Daily notification failed:", e); }
          }
        }
      }
    } catch (error) {
      console.error("[Agent Guidance] Daily check failed:", error);
    }
  }, 24 * 60 * 60 * 1000);

  log("Daily gap detection started (first run in 2min, then every 24h)");
}

function startNotificationCleanupJob() {
  schedulerManager.registerTimeout('notification-cleanup-init', () => {
    cleanupOldNotifications();
  }, 5 * 60 * 1000);

  schedulerManager.registerInterval('notification-cleanup-daily', async () => {
    await cleanupOldNotifications();
  }, 24 * 60 * 60 * 1000);

  log("Notification cleanup job started (runs daily, first run in 5 minutes)");
}

// ═══════════════════════════════════════════════════════════════
// PDKS SPRİNT B: SCHEDULER'LAR
// ═══════════════════════════════════════════════════════════════

const HQ_BRANCH_IDS = [5, 23, 24]; // Işıklar + Merkez Ofis + Fabrika

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function generateAutoWeekendOffs() {
  try {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const targetMonth = now.getMonth() + 1;
    const targetYear = now.getFullYear();
    if (targetMonth > 12) return;

    const staff = await db.select({ id: users.id, branchId: users.branchId })
      .from(users)
      .where(and(
        inArray(users.branchId, HQ_BRANCH_IDS),
        eq(users.isActive, true),
        ne(users.role, 'sube_kiosk')
      ));

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const weekendDays: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(targetYear, targetMonth - 1, d);
      if (date.getDay() === 0 || date.getDay() === 6) {
        weekendDays.push(`${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }

    let created = 0;
    for (const user of staff) {
      for (const day of weekendDays) {
        try {
          await db.insert(scheduledOffs).values({
            userId: user.id,
            branchId: user.branchId,
            offDate: day,
            offType: 'program_off',
          }).onConflictDoNothing();
          created++;
        } catch (e: any) {
          if (e.code === '23505') continue;
        }
      }
    }

    log(`[PDKS-B1] Auto weekend offs: ${staff.length} personel × ${weekendDays.length} gün (${targetMonth}/${targetYear}), ${created} kayıt`);
  } catch (error) {
    console.error("[PDKS-B1] Auto weekend offs error:", error);
  }
}

function startPdksAutoWeekendScheduler() {
  generateAutoWeekendOffs().catch(e => console.error("[PDKS-B1] Initial weekend offs error:", e));

  schedulerManager.registerInterval('pdks-auto-weekend-offs', async () => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 1 && now.getMinutes() < 10) {
      await generateAutoWeekendOffs();
    }
  }, 10 * 60 * 1000);

  log("[PDKS-B1] Auto weekend off scheduler started (runs on 1st of month 01:00)");
}

async function calculateWeeklySummaries(weekEndDate?: Date) {
  try {
    // weekEndDate verilmezse DÜN (geriye uyumlu: scheduler Pazar 23:00'da dünü işler)
    // Verilirse o tarih weekEnd kabul edilir (Sprint B.2 catch-up için)
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const weekEnd = weekEndDate
      ? new Date(weekEndDate)
      : (() => { const d = new Date(now); d.setDate(now.getDate() - 1); return d; })();
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);

    const isoYear = weekEnd.getFullYear();
    const startOfYear = new Date(isoYear, 0, 1);
    const dayOfYear = Math.floor((weekEnd.getTime() - startOfYear.getTime()) / 86400000);
    const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

    const allStaff = await db.select({
      id: users.id,
      branchId: users.branchId,
      weeklyHours: users.weeklyHours,
    }).from(users).where(and(
      eq(users.isActive, true),
      ne(users.role, 'sube_kiosk'),
      isNotNull(users.branchId)
    ));

    let processed = 0;
    for (const user of allStaff) {
      try {
        const records = await db.select({
          recordDate: pdksRecords.recordDate,
          recordTime: pdksRecords.recordTime,
          recordType: pdksRecords.recordType,
        }).from(pdksRecords).where(and(
          eq(pdksRecords.userId, user.id),
          gte(pdksRecords.recordDate, weekStartStr),
          lte(pdksRecords.recordDate, weekEndStr)
        )).orderBy(pdksRecords.recordDate, pdksRecords.recordTime);

        let totalMinutes = 0;
        let workDays = new Set<string>();
        let lateDays = 0;

        const byDate: Record<string, { time: string; type: string }[]> = {};
        for (const r of records) {
          if (!byDate[r.recordDate]) byDate[r.recordDate] = [];
          byDate[r.recordDate].push({ time: r.recordTime, type: r.recordType });
        }

        for (const [dateStr, dayRecs] of Object.entries(byDate)) {
          const sorted = [...dayRecs].sort((a, b) => a.time.localeCompare(b.time));
          let dayMinutes = 0;
          let i = 0;
          while (i < sorted.length) {
            if (sorted[i].type === 'giris') {
              const exitIdx = sorted.findIndex((r, j) => j > i && r.type === 'cikis');
              if (exitIdx !== -1) {
                const [h1, m1] = sorted[i].time.split(':').map(Number);
                const [h2, m2] = sorted[exitIdx].time.split(':').map(Number);
                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (diff > 0) dayMinutes += diff;
                i = exitIdx + 1;
              } else break;
            } else i++;
          }
          if (dayMinutes > 0) {
            totalMinutes += dayMinutes;
            workDays.add(dateStr);
          }
        }

        const offs = await db.select({ offDate: scheduledOffs.offDate })
          .from(scheduledOffs)
          .where(and(
            eq(scheduledOffs.userId, user.id),
            gte(scheduledOffs.offDate, weekStartStr),
            lte(scheduledOffs.offDate, weekEndStr)
          ));
        const offSet = new Set(offs.map(o => o.offDate));

        let absentDays = 0;
        for (let d = 0; d < 7; d++) {
          const checkDate = new Date(weekStart);
          checkDate.setDate(weekStart.getDate() + d);
          const ds = toDateStr(checkDate);
          if (!offSet.has(ds) && !workDays.has(ds)) absentDays++;
        }

        const plannedMinutes = (user.weeklyHours || 45) * 60;
        const overtimeMinutes = Math.max(0, totalMinutes - plannedMinutes);
        const missingMinutes = Math.max(0, plannedMinutes - totalMinutes);
        const complianceScore = plannedMinutes > 0 ? Math.min(100, Math.round((totalMinutes / plannedMinutes) * 100)) : 100;

        await db.insert(branchWeeklyAttendanceSummary).values({
          userId: user.id,
          branchId: user.branchId,
          weekStartDate: weekStartStr,
          weekEndDate: weekEndStr,
          weekNumber,
          year: isoYear,
          plannedTotalMinutes: plannedMinutes,
          actualTotalMinutes: totalMinutes,
          overtimeMinutes,
          missingMinutes,
          workDaysCount: workDays.size,
          absentDaysCount: absentDays,
          lateDaysCount: lateDays,
          weeklyComplianceScore: complianceScore,
        }).onConflictDoNothing();

        processed++;
      } catch (e) {
        console.error(`[PDKS-B2] Weekly summary error for user ${user.id}:`, e);
      }
    }

    log(`[PDKS-B2] Weekly summaries: ${processed}/${allStaff.length} personel (${weekStartStr} → ${weekEndStr})`);
    return { processed, weekStartStr, weekEndStr };
  } catch (error) {
    console.error("[PDKS-B2] Weekly summary calculation error:", error);
    return { processed: 0, weekStartStr: '', weekEndStr: '' };
  }
}

async function sendWeeklyDeficitNotifications(weekStartStr: string) {
  try {
    if (!weekStartStr) return;

    const deficits = await db.select({
      userId: branchWeeklyAttendanceSummary.userId,
      branchId: branchWeeklyAttendanceSummary.branchId,
      missingMinutes: branchWeeklyAttendanceSummary.missingMinutes,
      actualTotalMinutes: branchWeeklyAttendanceSummary.actualTotalMinutes,
    }).from(branchWeeklyAttendanceSummary).where(and(
      eq(branchWeeklyAttendanceSummary.weekStartDate, weekStartStr),
      sql`${branchWeeklyAttendanceSummary.missingMinutes} > 60`
    ));

    if (deficits.length === 0) return;

    const byBranch: Record<number, typeof deficits> = {};
    for (const d of deficits) {
      if (!d.branchId) continue;
      if (!byBranch[d.branchId]) byBranch[d.branchId] = [];
      byBranch[d.branchId].push(d);
    }

    for (const [branchIdStr, items] of Object.entries(byBranch)) {
      const branchId = Number(branchIdStr);
      const supervisors = await db.select({ id: users.id }).from(users).where(and(
        eq(users.branchId, branchId),
        sql`${users.role} IN ('supervisor', 'mudur')`,
        eq(users.isActive, true)
      ));

      const totalMissing = items.reduce((s, i) => s + (i.missingMinutes || 0), 0);
      const avgMissingHours = Math.round(totalMissing / items.length / 60 * 10) / 10;

      for (const sup of supervisors) {
        await storage.createNotification({
          userId: sup.id,
          type: 'pdks_weekly_deficit',
          title: 'Haftalık Çalışma Eksikliği',
          message: `Geçen hafta ${items.length} personel 45 saati tamamlayamadı. Ortalama eksik: ${avgMissingHours} saat.`,
          link: '/pdks-izin-gunleri',
          branchId,
        });
      }
    }

    log(`[PDKS-B2] Weekly deficit notifications: ${deficits.length} deficit, ${Object.keys(byBranch).length} branch notified`);
  } catch (error) {
    console.error("[PDKS-B2] Weekly deficit notification error:", error);
  }
}

/**
 * Sprint B.2 Fix — Haftalık özet catch-up.
 * Son N haftayı geriye dönük hesaplar. Server restart sonrası Pazar 23:00
 * tetiğini kaçırmış olabilir; bu fonksiyon startup'ta çağrılarak eksikleri
 * doldurur. INSERT'ler onConflictDoNothing() kullanır → idempotent.
 */
async function catchUpWeeklySummaries(weeks: number = 4): Promise<void> {
  log(`[PDKS-B2] Starting catch-up for last ${weeks} weeks`);
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(now);
    // i=0: dün (bu hafta), i=1: 8 gün önce (geçen hafta), ...
    weekEnd.setDate(now.getDate() - 1 - (i * 7));
    try {
      await calculateWeeklySummaries(weekEnd);
    } catch (e) {
      console.error(`[PDKS-B2] Catch-up week -${i} error:`, e);
      // Bir hafta başarısız olursa diğerlerini denemeye devam
    }
  }
  log(`[PDKS-B2] Catch-up complete: ${weeks} weeks processed`);
}

function startPdksWeeklySummaryScheduler() {
  schedulerManager.registerInterval('pdks-weekly-summary', async () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (now.getDay() === 0 && now.getHours() === 23 && now.getMinutes() < 10) {
      const result = await calculateWeeklySummaries();
      if (result.weekStartStr) {
        setTimeout(async () => {
          await sendWeeklyDeficitNotifications(result.weekStartStr);
        }, 5 * 60 * 1000);
      }
    }
  }, 10 * 60 * 1000);

  // Startup catch-up: son 4 haftanın eksiklerini doldur (non-blocking)
  // Idempotent — var olan kayıtlar onConflictDoNothing ile atlanır.
  catchUpWeeklySummaries(4).catch(e =>
    console.error("[PDKS-B2] Startup catch-up error:", e)
  );

  log("[PDKS-B2] Weekly summary scheduler started (Sunday 23:00, deficit notifications Monday 08:30, startup catch-up: 4 weeks)");
}

// NOT (18 Nis 2026 gece post-mortem): Burada "Sprint B.5 monthly payroll scheduler"
// yazmıştım. Replit'in kendi startPdksMonthlyPayrollScheduler (line ~1691)
// fonksiyonu ile DUPLICATE çıktı (Madde 37 envanter hatası — Replit'in local
// unpushed kodu görülmedi). Unified motor + catch-up özelliği bu commit'te
// silindi, Replit'in PDKS serisi tutarlı scheduler'ı tek kaldı.
// Catch-up bir kez çalıştı (Ocak/Şubat/Mart 2026 bordroları tamamlandı — yan kazanım).
// Gelecekte unified motor + catch-up + muhasebe bildirimi birleşik yazılmak
// isteniyorsa Sprint I (16 Haz+) backlog'unda.
// Referans: docs/DEVIR-TESLIM-18-NISAN-2026-GECE.md post-mortem


async function sendDailyAbsenceReport() {
  try {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = toDateStr(yesterday);

    const plannedShifts = await db.select({
      id: shifts.id,
      branchId: shifts.branchId,
      assignedToId: shifts.assignedToId,
    }).from(shifts).where(and(
      eq(shifts.shiftDate, yesterdayStr),
      sql`${shifts.status} IN ('confirmed', 'completed')`
    ));

    if (plannedShifts.length === 0) return;

    const yesterdayRecords = await db.select({
      userId: pdksRecords.userId,
      recordType: pdksRecords.recordType,
    }).from(pdksRecords).where(
      eq(pdksRecords.recordDate, yesterdayStr)
    );
    const usersWithEntry = new Set(
      yesterdayRecords.filter(r => r.recordType === 'giris').map(r => r.userId)
    );

    const absentByBranch: Record<number, string[]> = {};
    for (const shift of plannedShifts) {
      if (!shift.assignedToId || !shift.branchId) continue;
      if (usersWithEntry.has(shift.assignedToId)) continue;

      const offs = await db.select({ id: scheduledOffs.id }).from(scheduledOffs)
        .where(and(
          eq(scheduledOffs.userId, shift.assignedToId),
          eq(scheduledOffs.offDate, yesterdayStr)
        )).limit(1);
      if (offs.length > 0) continue;

      if (!absentByBranch[shift.branchId]) absentByBranch[shift.branchId] = [];
      absentByBranch[shift.branchId].push(shift.assignedToId);
    }

    let totalNotified = 0;
    for (const [branchIdStr, absentUserIds] of Object.entries(absentByBranch)) {
      const branchId = Number(branchIdStr);
      const uniqueAbsent = [...new Set(absentUserIds)];
      if (uniqueAbsent.length === 0) continue;

      const absentNames = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(inArray(users.id, uniqueAbsent));

      const nameList = absentNames.map(u => [u.firstName, u.lastName].filter(Boolean).join(' ')).join(', ');
      const supervisors = await db.select({ id: users.id }).from(users).where(and(
        eq(users.branchId, branchId),
        sql`${users.role} IN ('supervisor', 'mudur')`,
        eq(users.isActive, true)
      ));

      for (const sup of supervisors) {
        await storage.createNotification({
          userId: sup.id,
          type: 'pdks_daily_absence',
          title: 'Günlük Devamsızlık Raporu',
          message: `Dün (${yesterdayStr}) ${uniqueAbsent.length} personel vardiyaya gelmedi: ${nameList}`,
          link: '/pdks-izin-gunleri',
          branchId,
        });
      }
      totalNotified += supervisors.length;
    }

    log(`[PDKS-B3] Daily absence report: ${Object.values(absentByBranch).flat().length} absent across ${Object.keys(absentByBranch).length} branches, ${totalNotified} supervisor notified`);
  } catch (error) {
    console.error("[PDKS-B3] Daily absence report error:", error);
  }
}

function startPdksDailyAbsenceScheduler() {
  schedulerManager.registerInterval('pdks-daily-absence', async () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (now.getHours() === 8 && now.getMinutes() >= 25 && now.getMinutes() < 35) {
      await sendDailyAbsenceReport();
    }
  }, 10 * 60 * 1000);

  log("[PDKS-B3] Daily absence report scheduler started (runs daily at 08:30)");
}

async function calculateMonthlyPayrollAuto() {
  try {
    const { calculatePayroll, savePayrollResults } = await import("./lib/payroll-engine");
    const { PayrollResult } = await import("./lib/payroll-engine");

    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const hqStaff = await db.select({ id: users.id, role: users.role })
      .from(users)
      .where(and(
        inArray(users.branchId, HQ_BRANCH_IDS),
        eq(users.isActive, true),
        ne(users.role, 'sube_kiosk')
      ));

    const results: any[] = [];
    let errors = 0;
    for (const user of hqStaff) {
      try {
        const result = await calculatePayroll(user.id, year, lastMonth);
        if (result) results.push(result);
      } catch (e) {
        errors++;
        console.error(`[PDKS-B4] Payroll error for ${user.id}:`, e);
      }
    }

    if (results.length > 0) {
      await savePayrollResults(results);
    }

    const muhasebeUsers = await db.select({ id: users.id }).from(users).where(and(
      sql`${users.role} IN ('muhasebe_ik', 'muhasebe', 'admin')`,
      eq(users.isActive, true)
    ));

    for (const muh of muhasebeUsers) {
      await storage.createNotification({
        userId: muh.id,
        type: 'payroll_ready',
        title: `${lastMonth}/${year} Bordro Hazır`,
        message: `${results.length} personelin bordrosu otomatik hesaplandı. ${errors > 0 ? `${errors} hata oluştu.` : ''} Kontrol edin.`,
        link: '/bordrom',
      });
    }

    log(`[PDKS-B4] Monthly payroll auto: ${results.length}/${hqStaff.length} calculated, ${errors} errors (${lastMonth}/${year})`);
  } catch (error) {
    console.error("[PDKS-B4] Monthly payroll auto error:", error);
  }
}

function startPdksMonthlyPayrollScheduler() {
  schedulerManager.registerInterval('pdks-monthly-payroll', async () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (now.getDate() === 1 && now.getHours() === 4 && now.getMinutes() < 10) {
      await calculateMonthlyPayrollAuto();
    }
  }, 10 * 60 * 1000);

  log("[PDKS-B4] Monthly payroll auto-calculate scheduler started (1st of month at 04:00)");
}

// ═══════════════════════════════════════════════════════════════════
// Sprint B.3 — Monthly Attendance Summaries Scheduler
//
// Bağlam: storage.generateMonthlyAttendanceSummary(userId, periodMonth)
// fonksiyonu hazır, UPSERT mantığı içeriyor (if existing → update, else insert).
// Ama hiçbir scheduler çağırmıyordu → monthly_attendance_summaries tablosu 0 kayıt.
// Sonuç: KPI dashboard'ları, mission control, compliance skorları BOŞ.
//
// Tetik: Ayın 1'i Türkiye saati 01:00-01:10 (02:00 branch snapshot öncesi)
// Kapsam: ÖNCEKİ AY (bitmiş ayı özetle — cari ay yarım veri)
// Strateji: Tüm aktif şubelerin tüm aktif user'ları için UPSERT
// Startup catch-up: Son 3 tamamlanmış ay (idempotent UPSERT, manuel trigger
//                   ile çakışma riski yok)
//
// Madde 37 envanter (19 Nis 2026):
//   - monthly_attendance_summaries yazıcı: storage.ts:5331 (tek fonksiyon)
//   - UNIQUE: (user_id, period_month) — idempotent
//   - Başka yerden INSERT yok → duplicate yazım riski SIFIR
//   - Scheduler runtime: tek yazıcıyı paralel değil sıralı çağırıyoruz
// ═══════════════════════════════════════════════════════════════════

async function generateMonthlyAttendanceSummariesForAll(
  periodMonth: string  // YYYY-MM format
): Promise<{ processed: number; errors: number }> {
  log(`[PDKS-B3] Monthly attendance summary generation start: ${periodMonth}`);

  // Tüm aktif şubelerin tüm aktif kullanıcılarını al
  const activeUsers = await db
    .select({ id: users.id, branchId: users.branchId })
    .from(users)
    .where(and(
      eq(users.isActive, true),
      ne(users.role, "sube_kiosk"),  // kiosk user'ları için attendance summary anlamsız
    ));

  let processed = 0;
  let errors = 0;

  for (const user of activeUsers) {
    try {
      await storage.generateMonthlyAttendanceSummary(user.id, periodMonth);
      processed++;
    } catch (e) {
      errors++;
      console.error(`[PDKS-B3] Summary error for user ${user.id} (${periodMonth}):`, e);
      // Diğer user'lar devam etsin
    }
  }

  log(
    `[PDKS-B3] Monthly summary done: ${periodMonth} — ` +
    `${processed}/${activeUsers.length} users, ${errors} errors`
  );
  return { processed, errors };
}

/**
 * Sprint B.3 catch-up: son N tamamlanmış ayı hesapla.
 * UPSERT idempotent olduğu için var olanları günceller, eksikleri ekler.
 * Cari ay DAHIL EDILMEZ (yarım veri riski).
 */
async function catchUpMonthlyAttendanceSummaries(months: number = 3): Promise<void> {
  log(`[PDKS-B3] Starting catch-up for last ${months} completed months`);
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

  for (let i = 1; i <= months; i++) {
    // i=1: önceki ay, i=2: iki ay önce, ...
    const target = new Date(now);
    target.setDate(1); // ay taşma koruması
    target.setMonth(target.getMonth() - i);

    const year = target.getFullYear();
    const month = target.getMonth() + 1;
    const periodMonth = `${year}-${String(month).padStart(2, "0")}`;

    try {
      await generateMonthlyAttendanceSummariesForAll(periodMonth);
    } catch (e) {
      console.error(`[PDKS-B3] Catch-up month ${periodMonth} error:`, e);
    }
  }
  log(`[PDKS-B3] Catch-up complete: ${months} months processed`);
}

function startPdksMonthlyAttendanceSummaryScheduler() {
  schedulerManager.registerInterval("pdks-monthly-attendance-summary", async () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    // Ayın 1'i 01:00-01:10 Türkiye saati (monthly payroll 04:00'ten önce hazır olsun)
    if (now.getDate() === 1 && now.getHours() === 1 && now.getMinutes() < 10) {
      // Önceki ay
      const prev = new Date(now);
      prev.setDate(1);
      prev.setMonth(prev.getMonth() - 1);
      const periodMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      try {
        await generateMonthlyAttendanceSummariesForAll(periodMonth);
      } catch (e) {
        console.error("[PDKS-B3] Monthly summary scheduler error:", e);
      }
    }
  }, 10 * 60 * 1000);

  // Startup catch-up: son 3 tamamlanmış ay (idempotent UPSERT)
  catchUpMonthlyAttendanceSummaries(3).catch(e =>
    console.error("[PDKS-B3] Startup catch-up error:", e)
  );

  log("[PDKS-B3] Monthly attendance summary scheduler started (1st of month 01:00-01:10 Turkey time, startup catch-up: 3 months)");
}

function forceShutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);

  schedulerManager.stop();

  try { stopAllReminderSystems(); } catch {}
  try { stopAgentScheduler(); } catch {}
  try { stopBackupScheduler(); } catch {}
  try { stopTrackingCleanup(); } catch {}
  try { cache.destroy(); } catch {}
  try { aiRateLimiter.destroy(); } catch {}

  if (httpServer) {
    httpServer.close(() => {
      console.log('Server closed gracefully');
      process.exit(0);
    });
  }

  setTimeout(() => {
    console.log('Forced exit after timeout');
    process.exit(0);
  }, 2000).unref();
}

process.on('SIGTERM', () => forceShutdown('SIGTERM'));
process.on('SIGINT', () => forceShutdown('SIGINT'));
