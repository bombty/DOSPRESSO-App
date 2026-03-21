import express, { type Request, Response, NextFunction } from "express";
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
import { seedRoles } from "./seed-roles";
import { seedAcademyCategories } from "./seed-academy-categories";
import { seedAllKioskAccounts } from "./lib/kiosk-accounts";
import { cleanupExpiredKioskSessions } from "./localAuth";
import { startWeeklyBackupScheduler, stopBackupScheduler, performHealthCheck } from "./backup";
import { startTrackingCleanup, stopTrackingCleanup } from "./tracking";
import { startAgentScheduler, stopAgentScheduler } from "./services/agent-scheduler";
import { calculateAndSaveDailyScores, calculateAndSaveWeeklyScores, backfillNullScores, closeOrphanedBreakLogs, cleanupStaleShiftSessions } from "./services/factory-scoring-service";
import { cache, aiRateLimiter } from "./cache";
import { schedulerManager } from "./scheduler-manager";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, productionLots, tasks, notifications as notificationsTable, branches, branchKioskSettings, factoryKioskConfig, factoryShiftSessions, factoryBreakLogs, kioskSessions, pdksRecords } from "@shared/schema";
import { eq, lt, sql, count, and, lte, gte, ne, inArray, isNotNull, isNull } from "drizzle-orm";
import crypto from "crypto";

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[UnhandledRejection] Unhandled promise rejection:', reason);
  console.error('[UnhandledRejection] Promise:', promise);
});

let httpServer: import('http').Server | null = null;

process.on('uncaughtException', (error: Error) => {
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

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = (err as any).message || "Internal Server Error";

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

  async function ensureKioskSessionsTable() {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS kiosk_sessions (
          id SERIAL PRIMARY KEY,
          token VARCHAR(64) NOT NULL UNIQUE,
          user_id VARCHAR NOT NULL REFERENCES users(id),
          station_id INTEGER,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_token ON kiosk_sessions(token)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_user ON kiosk_sessions(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_expires ON kiosk_sessions(expires_at)`);
    } catch (error) {
      console.error("[KioskSessions] Table bootstrap error:", error);
    }
  }

  async function migrateKioskPasswords() {
    try {
      await db.execute(sql`ALTER TABLE branch_kiosk_settings ALTER COLUMN kiosk_password TYPE varchar(255)`);
      await db.execute(sql`ALTER TABLE branch_kiosk_settings ALTER COLUMN kiosk_password DROP DEFAULT`);
    } catch (error) {
      console.error("[KioskMigration] Schema migration error:", error);
    }

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
    
    await logDbDiagnostics();
    await bootstrapAdminUser();
    await ensureAdminUserApproved();
    await ensureKioskSessionsTable();
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
    ]);

    const seedNames = ['roleChain', 'adminMenu', 'serviceRequests', 'recipes', 'academyCategories', 'auditTemplate', 'slaRules', 'moduleFlags', 'branchTasks'];
    allSeedResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Error seeding ${seedNames[i]}:`, result.reason);
      }
    });
    
    const seedDuration = Date.now() - startupTime;
    log(`Seeds completed in ${seedDuration}ms`);
    
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
      startTrackingCleanup();
      startNotificationCleanupJob();
      startFactoryScoringScheduler();

      generateDailyTaskInstances().catch(e => console.error("[BranchTasks] Startup generation error:", e));
      markOverdueInstances().catch(e => console.error("[BranchTasks] Startup overdue check error:", e));

      closeOrphanedBreakLogs().catch(e => console.error("[Factory Scoring] Startup orphan break cleanup error:", e));
      backfillNullScores().catch(e => console.error("[Factory Scoring] Startup backfill error:", e));
      cleanupStaleShiftSessions().catch(e => console.error("[Factory Kiosk] Startup stale shift cleanup error:", e));

      scheduleFactoryAutoCheckout();

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
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingAdmin = await storage.getUserByUsername('admin');
    if (existingAdmin) {
      await db.update(users)
        .set({ hashedPassword, accountStatus: 'approved', isActive: true })
        .where(eq(users.id, existingAdmin.id));
      log(`🔐 Admin user exists (id=${existingAdmin.id}), password synced from ADMIN_BOOTSTRAP_PASSWORD env`);
      return;
    }

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

    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 0) {
      try {
        const result = await storage.runAllDangerZoneChecks();
        log(`Danger zone check: ${result.processed} processed, ${result.warnings} warnings, ${result.demotions} demotions`);
      } catch (e) { console.error("Error in danger zone check:", e); }
    }
  }, 60 * 60 * 1000);
  log("Consolidated hourly tick started (stock-alert + feedback-sla + danger-zone@1st)");
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
            recordDate: now.toISOString().split('T')[0],
            recordTime: now.toTimeString().split(' ')[0],
            recordType: 'cikis',
            source: 'kiosk',
            deviceInfo: 'auto_checkout_2030',
          });
        }
      } catch (e) {
        console.error('[Factory] PDKS auto-checkout error:', e);
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
    } catch (error: any) { console.error("Scheduled task delivery initial run error:", error); }
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
    } catch (error: any) {
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
