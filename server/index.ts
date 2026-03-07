import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { startSLACheckSystem, startPhotoCleanupSystem, startFeedbackSlaCheckSystem, startFeedbackPatternAnalysisSystem } from "./reminders";
import { seedRolePermissions } from "./seed-role-permissions";
import { seedPermissionModules } from "./seed-permission-modules";
import { seedRoleTemplates } from "./seed-role-templates";
import { seedAdminMenu } from "./seed-admin-menu";
import { seedServiceRequests } from "./seed-service-requests";
import { seedDospressoRecipes } from "./seed-dospresso-recipes";
import { seedDefaultAuditTemplate } from "./seed-audit-template";
import { seedRoles } from "./seed-roles";
import { startWeeklyBackupScheduler, performHealthCheck } from "./backup";
import { startTrackingCleanup } from "./tracking";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, productionLots, notifications as notificationsTable } from "@shared/schema";
import { eq, sql, count, and, lte, gte, ne, inArray, isNotNull } from "drizzle-orm";

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

  async function onServerReady() {
    
    // CRITICAL: Admin bootstrap FIRST, before any seeds (production login depends on this)
    await logDbDiagnostics();
    await bootstrapAdminUser();
    await ensureAdminUserApproved();
    
    // Seed system roles (idempotent)
    await seedRoles().catch((error) => {
      console.error("Error seeding roles:", error);
    });
    
    // Seed permission modules (idempotent)
    await seedPermissionModules().catch((error) => {
      console.error("Error seeding permission modules:", error);
    });
    
    // Seed role permissions from PERMISSIONS constant (idempotent)
    await seedRolePermissions().catch((error) => {
      console.error("Error seeding role permissions:", error);
    });
    
    // Seed default role templates (idempotent)
    await seedRoleTemplates().catch((error) => {
      console.error("Error seeding role templates:", error);
    });
    
    // Seed admin menu structure (idempotent)
    await seedAdminMenu().catch((error) => {
      console.error("Error seeding admin menu:", error);
    });
    
    // Seed service requests (test data - idempotent)
    await seedServiceRequests().catch((error) => {
      console.error("Error seeding service requests:", error);
    });
    
    // Seed DOSPRESSO recipes (replaces old generic recipes with actual products)
    await seedDospressoRecipes().catch((error) => {
      console.error("Error seeding DOSPRESSO recipes:", error);
    });
    
    // Seed default audit template (idempotent)
    await seedDefaultAuditTemplate().catch((error) => {
      console.error("Error seeding audit template:", error);
    });
    
    // Start shift reminder job (runs every 10 minutes)
    startShiftReminderJob();
    startCompositeScoreUpdateJob();
    startDangerZoneCheckJob();
    startDailyTaskTriggerJob();
    startSktExpiryCheckJob();
    
    // Start SLA check system (runs every 15 minutes)
    startSLACheckSystem();
    startPhotoCleanupSystem();
    
    // Start feedback SLA breach check (runs every hour)
    startFeedbackSlaCheckSystem();
    
    // Start weekly feedback pattern analysis (Mondays 08:00 Europe/Istanbul)
    startFeedbackPatternAnalysisSystem();
    
    // Start weekly backup scheduler (runs every Sunday at midnight Turkey time)
    startWeeklyBackupScheduler();

    // Start real-time employee tracking cleanup (runs every 10 minutes)
    startTrackingCleanup();
    
    // Perform initial health check
    performHealthCheck().then(health => {
      log(`🏥 Sistem sağlık durumu: ${health.status.toUpperCase()}`);
      health.details.forEach(d => log(`   ${d}`));
    }).catch(err => {
      console.error('Health check hatası:', err);
    });
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

// Background job for shift reminders
function startShiftReminderJob() {
  // Run immediately on startup
  storage.sendShiftReminders().catch((error: Error | unknown) => {
    console.error("Error sending shift reminders:", error);
  });
  
  // Then run every 10 minutes
  setInterval(async () => {
    try {
      await storage.sendShiftReminders();
      log("Shift reminders sent successfully");
    } catch (error) {
      console.error("Error in shift reminder job:", error);
    }
  }, 10 * 60 * 1000); // 10 minutes
  
  log("Shift reminder job started (runs every 10 minutes)");
}

function startCompositeScoreUpdateJob() {
  setInterval(async () => {
    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (nowTR.getHours() === 3 && nowTR.getMinutes() < 5) {
      try {
        const result = await storage.runAllCompositeScoreUpdates();
        log(`Composite score update completed: ${result.processed} users, ${result.dangerCount} danger, ${result.warningCount} warning`);
      } catch (error) {
        console.error("Error in composite score update job:", error);
      }
    }
  }, 5 * 60 * 1000);

  log("Composite score update job started (daily at 03:00 Europe/Istanbul)");
}

// Background job for danger zone checks (monthly on 1st)
function startDangerZoneCheckJob() {
  // Check on the 1st of each month at midnight
  const checkIfFirstOfMonth = () => {
    const now = new Date();
    return now.getDate() === 1 && now.getHours() === 0;
  };
  
  // Run every hour to check if it's the 1st of month
  setInterval(async () => {
    if (checkIfFirstOfMonth()) {
      try {
        const result = await storage.runAllDangerZoneChecks();
        log(`Danger zone check completed: ${result.processed} processed, ${result.warnings} warnings, ${result.demotions} demotions`);
      } catch (error) {
        console.error("Error in danger zone check job:", error);
      }
    }
  }, 60 * 60 * 1000); // Check every hour
  
  log("Danger zone check job initialized (runs monthly on 1st)");
}

function startDailyTaskTriggerJob() {
  const checkIfMorning = () => {
    const nowTR = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    return nowTR.getHours() === 8 && nowTR.getMinutes() < 5;
  };

  setInterval(async () => {
    if (checkIfMorning()) {
      try {
        const { generateTasksForAllActiveUsers } = await import("./services/task-trigger-service");
        const result = await generateTasksForAllActiveUsers();
        log(`[TaskTrigger] Daily generation: ${result.usersProcessed} users, ${result.totalCreated} created, ${result.totalSkipped} skipped`);
      } catch (error) {
        console.error("[TaskTrigger] Daily generation error:", error);
      }
    }
  }, 5 * 60 * 1000);

  log("Task trigger daily scheduler started (08:00 Europe/Istanbul)");
}

function startSktExpiryCheckJob() {
  setInterval(async () => {
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
          ? `LOT ${lot.lotNumber} son kullanma tarihi geçmiş! Acil müdahale gerekli.`
          : `LOT ${lot.lotNumber} son kullanma tarihi 7 gün içinde dolacak.`;

        if (isExpired) {
          expiredIds.push(lot.id);
        }

        const alreadySent = existingSet.has(`${notifType}:${message}`);
        if (!alreadySent) {
          for (const u of targetUsers) {
            notifValues.push({ userId: u.id, type: notifType, title: isExpired ? 'SKT Süresi Dolmuş!' : 'SKT Uyarısı', message });
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

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  if (httpServer) {
    httpServer.close(() => process.exit(0));
  }
  setTimeout(() => process.exit(1), 5000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  if (httpServer) {
    httpServer.close(() => process.exit(0));
  }
  setTimeout(() => process.exit(1), 5000);
});
