import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { startReminderSystem, startSLACheckSystem, startPhotoCleanupSystem, startFeedbackSlaCheckSystem, startFeedbackPatternAnalysisSystem, startStockAlertSystem, startOnboardingCompletionSystem, startStaleQuoteReminderSystem, startNotificationArchiveSystem, stopAllReminderSystems } from "./reminders";
import { seedRolePermissions } from "./seed-role-permissions";
import { seedPermissionModules } from "./seed-permission-modules";
import { seedRoleTemplates } from "./seed-role-templates";
import { seedAdminMenu } from "./seed-admin-menu";
import { seedServiceRequests } from "./seed-service-requests";
import { seedDospressoRecipes } from "./seed-dospresso-recipes";
import { seedDefaultAuditTemplate } from "./seed-audit-template";
import { seedRoles } from "./seed-roles";
import { seedAcademyCategories } from "./seed-academy-categories";
import { startWeeklyBackupScheduler, stopBackupScheduler, performHealthCheck } from "./backup";
import { startTrackingCleanup, stopTrackingCleanup } from "./tracking";
import { startAgentScheduler, stopAgentScheduler } from "./services/agent-scheduler";
import { cache, aiRateLimiter } from "./cache";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, productionLots, tasks, notifications as notificationsTable } from "@shared/schema";
import { eq, sql, count, and, lte, gte, ne, inArray, isNotNull } from "drizzle-orm";

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[UnhandledRejection] Unhandled promise rejection:', reason);
  console.error('[UnhandledRejection] Promise:', promise);
});

let httpServer: import('http').Server | null = null;
let schedulerInitTimeout: NodeJS.Timeout | null = null;
const trackedIntervals: NodeJS.Timeout[] = [];

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

  async function onServerReady() {
    const startupTime = Date.now();
    
    await logDbDiagnostics();
    await bootstrapAdminUser();
    await ensureAdminUserApproved();
    
    await seedRoles().catch((error) => {
      console.error("Error seeding roles:", error);
    });
    
    await seedPermissionModules().catch((error) => {
      console.error("Error seeding permission modules:", error);
    });
    
    await seedRolePermissions().catch((error) => {
      console.error("Error seeding role permissions:", error);
    });
    
    const independentSeedResults = await Promise.allSettled([
      seedRoleTemplates(),
      seedAdminMenu(),
      seedServiceRequests(),
      seedDospressoRecipes(),
      seedAcademyCategories(),
      seedDefaultAuditTemplate(),
    ]);
    
    const seedNames = ['roleTemplates', 'adminMenu', 'serviceRequests', 'recipes', 'academyCategories', 'auditTemplate'];
    independentSeedResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Error seeding ${seedNames[i]}:`, result.reason);
      }
    });
    
    const seedDuration = Date.now() - startupTime;
    log(`Seeds completed in ${seedDuration}ms`);
    
    log("Schedulers will start in 30 seconds (lazy init)...");
    schedulerInitTimeout = setTimeout(() => {
      startReminderSystem();
      startShiftReminderJob();
      startCompositeScoreUpdateJob();
      startDangerZoneCheckJob();
      startDailyTaskTriggerJob();
      startSktExpiryCheckJob();
      startScheduledTaskDeliveryJob();
      
      startSLACheckSystem();
      startPhotoCleanupSystem();
      startFeedbackSlaCheckSystem();
      startFeedbackPatternAnalysisSystem();
      
      startStockAlertSystem();
      startOnboardingCompletionSystem();
      startStaleQuoteReminderSystem();
      startNotificationArchiveSystem();
      startAgentScheduler();
      
      startWeeklyBackupScheduler();
      startTrackingCleanup();
      
      log(`All schedulers initialized (total startup: ${Date.now() - startupTime}ms)`);
      
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

function trackInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
  trackedIntervals.push(interval);
  return interval;
}

function startShiftReminderJob() {
  storage.sendShiftReminders().catch((error: Error | unknown) => {
    console.error("Error sending shift reminders:", error);
  });
  
  trackInterval(setInterval(async () => {
    try {
      await storage.sendShiftReminders();
    } catch (error) {
      console.error("Error in shift reminder job:", error);
    }
  }, 10 * 60 * 1000));
  
  log("Shift reminder job started (runs every 10 minutes)");
}

function startCompositeScoreUpdateJob() {
  trackInterval(setInterval(async () => {
    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (nowTR.getHours() === 3 && nowTR.getMinutes() < 10) {
      try {
        const result = await storage.runAllCompositeScoreUpdates();
        log(`Composite score update: ${result.processed} users, ${result.dangerCount} danger, ${result.warningCount} warning`);
      } catch (error) {
        console.error("Error in composite score update job:", error);
      }
    }
  }, 10 * 60 * 1000));

  log("Composite score update job started (daily at 03:00 Europe/Istanbul)");
}

function startDangerZoneCheckJob() {
  trackInterval(setInterval(async () => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 0) {
      try {
        const result = await storage.runAllDangerZoneChecks();
        log(`Danger zone check: ${result.processed} processed, ${result.warnings} warnings, ${result.demotions} demotions`);
      } catch (error) {
        console.error("Error in danger zone check job:", error);
      }
    }
  }, 60 * 60 * 1000));
  
  log("Danger zone check job initialized (runs monthly on 1st)");
}

function startDailyTaskTriggerJob() {
  trackInterval(setInterval(async () => {
    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (nowTR.getHours() === 8 && nowTR.getMinutes() < 10) {
      try {
        const { generateTasksForAllActiveUsers } = await import("./services/task-trigger-service");
        const result = await generateTasksForAllActiveUsers();
        log(`[TaskTrigger] Daily: ${result.usersProcessed} users, ${result.totalCreated} created, ${result.totalSkipped} skipped`);
      } catch (error) {
        console.error("[TaskTrigger] Daily generation error:", error);
      }
    }
  }, 10 * 60 * 1000));

  log("Task trigger daily scheduler started (08:00 Europe/Istanbul)");
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
      if (scheduledTasks.length > 0) console.log(`${scheduledTasks.length} zamanlanmis gorev iletildi (ilk calistirma)`);
    } catch (error: any) { console.error("Scheduled task delivery initial run error:", error); }
  })();

  trackInterval(setInterval(async () => {
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
        console.log(`${scheduledTasks.length} zamanlanmis gorev iletildi`);
      }
    } catch (error: any) {
      console.error("Scheduled task delivery error:", error);
    }
  }, 5 * 60 * 1000));

  log("Scheduled task delivery job started (runs every 5 minutes)");
}

function startSktExpiryCheckJob() {
  trackInterval(setInterval(async () => {
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
  }, 6 * 60 * 60 * 1000));

  log("SKT expiry check job started (runs every 6 hours)");
}

function forceShutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);

  if (schedulerInitTimeout) {
    clearTimeout(schedulerInitTimeout);
    schedulerInitTimeout = null;
  }

  for (const interval of trackedIntervals) {
    clearInterval(interval);
  }
  trackedIntervals.length = 0;

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
