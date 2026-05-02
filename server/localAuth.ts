import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, Request, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";
import { db } from "./db";
import { branches, sessions, users, kioskSessions } from "@shared/schema";
import { generateTasksForUser } from "./services/task-trigger-service";
import { eq, sql, lt } from "drizzle-orm";
import { auditLog, createAuditEntry, getAuditContext } from "./audit";

const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı zorunludur"),
  password: z.string().min(1, "Şifre zorunludur"),
});

const LOGIN_LOCKOUT_MAX_ATTEMPTS = 10;
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

interface LoginAttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

function checkLoginLockout(username: string): { locked: boolean; remainingMs: number } {
  const normalizedUsername = username.toLocaleLowerCase('tr-TR');
  const record = loginAttempts.get(normalizedUsername);
  if (!record) return { locked: false, remainingMs: 0 };
  
  if (record.lockedUntil) {
    if (Date.now() < record.lockedUntil) {
      return { locked: true, remainingMs: record.lockedUntil - Date.now() };
    }
    loginAttempts.delete(normalizedUsername);
    return { locked: false, remainingMs: 0 };
  }
  return { locked: false, remainingMs: 0 };
}

function recordFailedLogin(username: string): { locked: boolean; remainingAttempts: number } {
  const normalizedUsername = username.toLocaleLowerCase('tr-TR');
  const now = Date.now();
  let record = loginAttempts.get(normalizedUsername);
  
  if (!record || (now - record.firstAttemptAt > LOGIN_LOCKOUT_WINDOW_MS)) {
    record = { count: 1, firstAttemptAt: now, lockedUntil: null };
    loginAttempts.set(normalizedUsername, record);
    return { locked: false, remainingAttempts: LOGIN_LOCKOUT_MAX_ATTEMPTS - 1 };
  }
  
  record.count++;
  
  if (record.count >= LOGIN_LOCKOUT_MAX_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_LOCKOUT_DURATION_MS;
    loginAttempts.set(normalizedUsername, record);
    return { locked: true, remainingAttempts: 0 };
  }
  
  loginAttempts.set(normalizedUsername, record);
  return { locked: false, remainingAttempts: LOGIN_LOCKOUT_MAX_ATTEMPTS - record.count };
}

function clearLoginAttempts(username: string): void {
  loginAttempts.delete(username.toLocaleLowerCase('tr-TR'));
}

export function getSession() {
  const sessionTtl = 8 * 60 * 60 * 1000; // 8 hours (one shift)
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

export async function setupAuth(app: Express, authLimiter?: any) {
  // Note: trust proxy is now set in server/index.ts before body parsers
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`[Auth] Login failed: user '${username}' not found`);
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }

        if (!user.hashedPassword) {
          console.log(`[Auth] Login failed: user '${username}' has no password hash`);
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }

        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        
        if (!isValidPassword) {
          console.log(`[Auth] Login failed: invalid password for '${username}'`);
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }

        // Check account status
        if (user.accountStatus === 'pending') {
          return done(null, false, { message: "Hesabınız onay bekliyor" });
        }
        
        if (user.accountStatus === 'rejected') {
          return done(null, false, { message: "Hesabınız onaylanmadı" });
        }

        // Check if account is active
        if (!user.isActive) {
          return done(null, false, { message: "Hesabınız aktif değil" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: unknown, cb) => {
    cb(null, (user as { id: string }).id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) {
        return cb(null, false);
      }
      cb(null, user);
    } catch (error) {
      console.warn("[Auth] Deserialize error (session invalidated):", (error as Error).message || error);
      cb(null, false);
    }
  });

  // Şube kimlik bilgileri kontrolü için yardımcı fonksiyon
  const normalizeTurkish = (s: string) => s.toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');

  const tryBranchLogin = async (username: string, password: string) => {
    try {
      // Tüm şubeleri çek ve kioskUsername ile eşleştir
      const allBranches = await db.select({
        id: branches.id,
        name: branches.name,
        kioskUsername: branches.kioskUsername,
        kioskPassword: branches.kioskPassword,
      }).from(branches);
      
      const normalizedInput = normalizeTurkish(username);
      
      // Şube bul
      const branch = allBranches.find(b => 
        b.kioskUsername && normalizeTurkish(b.kioskUsername) === normalizedInput
      );
      
      if (!branch) return null;
      if (!branch.kioskPassword) return null;
      
      const storedPassword = branch.kioskPassword;
      const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
      
      if (!isBcryptHash) {
        console.warn(`[Auth] Branch ${branch.id} has unhashed kiosk password — login rejected for security`);
        return null;
      }

      const isValid = await bcrypt.compare(password, storedPassword);
      if (!isValid) return null;
      
      return branch;
    } catch (error) {
      console.error("[Auth] Branch login error:", error);
      return null;
    }
  };

  // Login endpoint with validation (supports both user and branch login)
  app.post("/api/login", authLimiter, async (req, res, next) => {
    console.log(`[Auth] Login attempt - body keys: ${Object.keys(req.body || {}).join(',')}, username: ${req.body?.username}`);
    
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log(`[Auth] Login validation failed:`, validationResult.error.errors);
      return res.status(400).json({ 
        error: "Geçersiz giriş bilgileri",
        details: validationResult.error.errors 
      });
    }

    const { username, password } = validationResult.data;

    const lockoutCheck = checkLoginLockout(username);
    if (lockoutCheck.locked) {
      const remainingMinutes = Math.ceil(lockoutCheck.remainingMs / 60000);
      auditLog(req, {
        eventType: "auth.login_locked",
        action: "login_blocked",
        resource: "auth",
        details: { username, reason: "account_locked", remainingMinutes },
      });
      return res.status(423).json({
        error: `Hesabınız geçici olarak kilitlendi. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`,
        locked: true,
        remainingMinutes,
      });
    }

    // İlk önce normal kullanıcı girişini dene
    passport.authenticate("local", async (err: unknown, user: Express.User | false | null, info: any) => {
      if (err) {
        console.error(`[Auth] Passport error for '${username}':`, err);
        return res.status(500).json({ error: "Sunucu hatası" });
      }
      
      // Normal kullanıcı girişi başarılı
      if (user) {
        clearLoginAttempts(username);
        req.session.regenerate((regenErr) => {
          if (regenErr) {
            console.error("[Auth] Session regenerate error:", regenErr);
          }
          req.login(user, (err) => {
            if (err) {
              console.error("[Auth] Login error:", err);
              return res.status(500).json({ error: "Giriş işlemi başarısız" });
            }
          
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("[Auth] Session save error:", saveErr);
                return res.status(500).json({ error: "Oturum kaydedilemedi" });
              }
            
              const userId = (user as any).id;
              const currentSid = req.sessionID;

              (async () => {
                try {
                  const activeSessions = await db.execute(
                    sql`SELECT sid FROM sessions WHERE sess->'passport'->>'user' = ${String(userId)} AND expire > NOW() ORDER BY expire ASC`
                  );
                  const sessionRows = activeSessions.rows || activeSessions;
                  if (Array.isArray(sessionRows) && sessionRows.length >= 3) {
                    const toRemove = (sessionRows as { sid: string }[])
                      .filter(s => s.sid !== currentSid)
                      .slice(0, sessionRows.length - 2);
                    for (const oldSession of toRemove) {
                      await db.execute(
                        sql`DELETE FROM sessions WHERE sid = ${oldSession.sid}`
                      );
                      const auditCtx = getAuditContext(req);
                      auditCtx.userId = String(userId);
                      await createAuditEntry(auditCtx, {
                        eventType: "security",
                        action: "auth.session_forced_logout",
                        resource: "session",
                        resourceId: oldSession.sid,
                        details: { reason: "concurrent_session_limit", maxSessions: 2, forcedOutSid: oldSession.sid },
                      });
                      console.log(`[Auth] Concurrent session limit: removed session ${oldSession.sid} for user ${userId}`);
                    }
                  }
                } catch (sessionLimitErr) {
                  console.error("[Auth] Session limit check error:", sessionLimitErr);
                }
              })();

              auditLog(req, {
                eventType: "auth.login_success",
                action: "login",
                resource: "auth",
                resourceId: userId,
                details: { username: (user as any).username, authType: "user" },
              });

              db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId)).catch((err: any) =>
                console.error("[Auth] lastLoginAt update error:", err.message)
              );

              generateTasksForUser(userId).catch((err: any) => 
                console.error("[TaskTrigger] Login hook error:", err.message)
              );

              return res.json({ 
                success: true,
                authType: 'user',
              user: {
                id: (user as any).id,
                username: (user as any).username,
                firstName: (user as any).firstName,
                lastName: (user as any).lastName,
                role: (user as any).role,
                branchId: (user as any).branchId,
                mustChangePassword: (user as any).mustChangePassword || false,
              }
            });
          });
        });
        });
        return;
      }
      
      // Kullanıcı bulunamadı - şube kimlik bilgilerini dene
      const branch = await tryBranchLogin(username, password);
      
      if (branch) {
        req.session.regenerate((regenErr) => {
          if (regenErr) {
            console.error("[Auth] Branch session regenerate error:", regenErr);
          }
          (req.session as any).branchAuth = {
            authType: 'branch',
            branchId: branch.id,
            branchName: branch.name,
            loginTime: new Date().toISOString(),
          };
        
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[Auth] Session save error:", saveErr);
              return res.status(500).json({ error: "Oturum kaydedilemedi" });
            }
          
            return res.json({ 
              success: true,
              authType: 'branch',
              branch: {
                id: branch.id,
                name: branch.name,
              },
              redirectTo: '/sube/dashboard'
            });
          });
        });
        return;
      }
      
      const loginResult = recordFailedLogin(username);
      
      auditLog(req, {
        eventType: "auth.login_failed",
        action: "login_failed",
        resource: "auth",
        details: { username, reason: info?.message || "Invalid credentials", accountLocked: loginResult.locked, remainingAttempts: loginResult.remainingAttempts },
      });

      if (loginResult.locked) {
        console.warn(`[Auth] Account locked: ${username} (${LOGIN_LOCKOUT_MAX_ATTEMPTS} failed attempts)`);
        try {
          const adminUsers = await storage.getUsersByRole('admin');
          for (const admin of adminUsers) {
            await storage.createNotification({
              userId: admin.id,
              title: "Hesap Kilitleme Uyarısı",
              message: `"${username}" kullanıcısı ${LOGIN_LOCKOUT_MAX_ATTEMPTS} başarısız giriş denemesi sonrası 15 dakika kilitlendi.`,
              type: "critical",
              relatedType: "security",
              relatedId: username,
            });
          }
        } catch (notifErr) {
          console.error("[Auth] Admin notification error:", notifErr);
        }
        return res.status(423).json({
          error: `Hesabınız geçici olarak kilitlendi. Lütfen 15 dakika sonra tekrar deneyin.`,
          locked: true,
          remainingMinutes: 15,
        });
      }

      return res.status(401).json({ 
        error: `Kullanıcı adı veya şifre hatalı. ${loginResult.remainingAttempts} deneme hakkınız kaldı.`,
        remainingAttempts: loginResult.remainingAttempts,
      });
    })(req, res, next);
  });

  const logoutHandler = (req: Request, res: any) => {
    const logoutUser = req.user as any;
    if (logoutUser) {
      auditLog(req, {
        eventType: "auth.logout",
        action: "logout",
        resource: "auth",
        resourceId: logoutUser.id,
        details: { username: logoutUser.username },
      });
    }

    (req as any).logout((err: any) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      // Destroy session and clear cookie
      (req as any).session.destroy((destroyErr: any) => {
        if (destroyErr) {
          console.error("[Auth] Session destroy error:", destroyErr);
          return res.status(500).json({ error: "Session destroy failed" });
        }
        
        // Clear session cookie (must match session cookie settings)
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
        });
        res.json({ message: "Logged out" });
      });
    });
  };

  // Logout endpoints (both paths for compatibility)
  app.post("/api/logout", logoutHandler);
  app.post("/api/auth/logout", logoutHandler);

}

/**
 * [Task #274 / Audit Issue #10]
 * mustChangePassword=true olan kullanıcılar parolalarını değiştirmeden
 * hiçbir korumalı API'ye erişemez. Sadece aşağıdaki uç noktalar serbesttir:
 *  - GET  /api/auth/user           (oturum bilgisi/flag okuma)
 *  - POST /api/me/change-password  (parola değiştirme akışı)
 *  - POST /api/logout, /api/auth/logout (çıkış)
 *
 * Kiosk token ile gelen istekler bu kontrole tabi DEĞİLDİR; çünkü kiosk
 * akışında kullanıcı parolası kullanılmaz (PIN/QR ile ayrı oturum).
 */
const PASSWORD_CHANGE_ALLOWED_PATHS = new Set<string>([
  "/api/auth/user",
  "/api/me/change-password",
  "/api/logout",
  "/api/auth/logout",
]);

function enforcePasswordChangeGate(req: any, res: any): boolean {
  const user = req.user;
  if (!user || !(user as any).mustChangePassword) return false;
  const isKioskToken = (req as any).authMethod === "kiosk_token";
  if (isKioskToken) return false;
  const path = (req.path || req.url || "").split("?")[0];
  if (PASSWORD_CHANGE_ALLOWED_PATHS.has(path)) return false;
  res.status(423).json({
    error: "password_change_required",
    message: "Devam etmeden önce parolanızı değiştirmelisiniz.",
    mustChangePassword: true,
  });
  return true;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated()) {
    if (enforcePasswordChangeGate(req, res)) return;
    return next();
  }
  const token = req.headers['x-kiosk-token'] as string;
  if (token) {
    try {
      const session = await validateKioskSession(token);
      if (session) {
        (req as any).kioskUserId = session.userId;
        (req as any).kioskStationId = session.stationId;
        (req as any).authMethod = 'kiosk_token';
        const [kioskUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
        if (kioskUser) {
          (req as any).user = kioskUser;
          return next();
        }
      }
    } catch (err) {
      console.error("[Auth] Kiosk token validation in isAuthenticated:", err);
    }
  }
  return res.status(401).json({ message: "Unauthorized" });
};

const KIOSK_SESSION_TTL = 8 * 60 * 60 * 1000;
const KIOSK_CACHE_TTL = 30 * 1000;
const kioskSessionCache = new Map<string, { userId: string; stationId?: number; expiresAt: number; cachedAt: number }>();

export async function createKioskSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + KIOSK_SESSION_TTL);

  await db.insert(kioskSessions).values({ token, userId, expiresAt });

  return token;
}

export async function validateKioskSession(token: string): Promise<{ userId: string; stationId?: number } | null> {
  if (!token) return null;

  const cached = kioskSessionCache.get(token);
  if (cached && Date.now() - cached.cachedAt < KIOSK_CACHE_TTL) {
    if (Date.now() >= cached.expiresAt) {
      kioskSessionCache.delete(token);
      return null;
    }
    return { userId: cached.userId, stationId: cached.stationId };
  }

  const [session] = await db
    .select()
    .from(kioskSessions)
    .where(eq(kioskSessions.token, token))
    .limit(1);

  if (!session) {
    kioskSessionCache.delete(token);
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    kioskSessionCache.delete(token);
    await db.delete(kioskSessions).where(eq(kioskSessions.token, token));
    return null;
  }

  kioskSessionCache.set(token, {
    userId: session.userId,
    stationId: session.stationId ?? undefined,
    expiresAt: new Date(session.expiresAt).getTime(),
    cachedAt: Date.now(),
  });

  return { userId: session.userId, stationId: session.stationId ?? undefined };
}

export async function updateKioskStation(token: string, stationId: number): Promise<void> {
  kioskSessionCache.delete(token);
  await db
    .update(kioskSessions)
    .set({ stationId })
    .where(eq(kioskSessions.token, token));
}

export async function deleteKioskSession(token: string): Promise<void> {
  kioskSessionCache.delete(token);
  await db.delete(kioskSessions).where(eq(kioskSessions.token, token));
}

export async function cleanupExpiredKioskSessions(): Promise<number> {
  const now = Date.now();
  for (const [token, entry] of kioskSessionCache) {
    if (now >= entry.expiresAt) {
      kioskSessionCache.delete(token);
    }
  }

  const result = await db
    .delete(kioskSessions)
    .where(lt(kioskSessions.expiresAt, new Date()))
    .returning({ id: kioskSessions.id });
  return result.length;
}

// Kiosk işlemlerine web oturumu ile de erişebilen yetkili roller
const KIOSK_AUTHORIZED_ROLES = [
  'admin', 'fabrika_mudur', 'fabrika_operator', 'fabrika',
  'supervisor', 'supervisor_buddy', 'coach',
  'sube_kiosk', 'mudur', 'barista', 'bar_buddy', 'stajyer',
  'fabrika_sorumlu', 'fabrika_personel',
];

export const isKioskAuthenticated: RequestHandler = async (req, res, next) => {
  const token = req.headers['x-kiosk-token'] as string;
  if (token) {
    try {
      const session = await validateKioskSession(token);
      if (session) {
        (req as any).kioskUserId = session.userId;
        (req as any).kioskStationId = session.stationId;
        (req as any).authMethod = 'kiosk_token';
        return next();
      }
    } catch (err) {
      console.error("[Kiosk] Session validation error:", err);
    }
  }

  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    if (KIOSK_AUTHORIZED_ROLES.includes(user.role)) {
      (req as any).kioskUserId = user.id;
      (req as any).authMethod = 'web_session';
      return next();
    }
  }

  return res.status(401).json({ message: "Kiosk oturumu gerekli" });
};
