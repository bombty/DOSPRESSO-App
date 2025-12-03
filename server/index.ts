import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { startSLACheckSystem } from "./reminders";
import { seedRolePermissions } from "./seed-role-permissions";
import { seedPermissionModules } from "./seed-permission-modules";
import { seedAdminMenu } from "./seed-admin-menu";
import { seedServiceRequests } from "./seed-service-requests";
import { startWeeklyBackupScheduler, performHealthCheck } from "./backup";
import { startTrackingCleanup } from "./tracking";

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Seed permission modules (idempotent)
    await seedPermissionModules().catch((error) => {
      console.error("Error seeding permission modules:", error);
    });
    
    // Seed role permissions from PERMISSIONS constant (idempotent)
    await seedRolePermissions().catch((error) => {
      console.error("Error seeding role permissions:", error);
    });
    
    // Seed admin menu structure (idempotent)
    await seedAdminMenu().catch((error) => {
      console.error("Error seeding admin menu:", error);
    });
    
    // Seed service requests (test data - idempotent)
    await seedServiceRequests().catch((error) => {
      console.error("Error seeding service requests:", error);
    });
    
    // Ensure admin user is always approved and active (self-healing)
    await ensureAdminUserApproved();
    
    // Start shift reminder job (runs every 10 minutes)
    startShiftReminderJob();
    
    // Start SLA check system (runs every 15 minutes)
    startSLACheckSystem();
    
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
  });
})();

// Self-healing function to ensure admin user is always approved and active
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
  storage.sendShiftReminders().catch((error: any) => {
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
