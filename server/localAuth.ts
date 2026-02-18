import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";
import { db } from "./db";
import { branches } from "@shared/schema";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı zorunludur"),
  password: z.string().min(1, "Şifre zorunludur"),
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
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
  const normalizeTurkish = (s: string) => s.toLowerCase()
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

    // İlk önce normal kullanıcı girişini dene
    passport.authenticate("local", async (err: unknown, user: unknown, info: any) => {
      if (err) {
        console.error(`[Auth] Passport error for '${username}':`, err);
        return res.status(500).json({ error: "Sunucu hatası" });
      }
      
      // Normal kullanıcı girişi başarılı
      if (user) {
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
              }
            });
          });
        });
        return;
      }
      
      // Kullanıcı bulunamadı - şube kimlik bilgilerini dene
      const branch = await tryBranchLogin(username, password);
      
      if (branch) {
        // Şube girişi başarılı - session'a şube bilgilerini kaydet
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
        return;
      }
      
      // Her iki giriş de başarısız
      return res.status(401).json({ error: info?.message || "Kullanıcı adı veya şifre hatalı" });
    })(req, res, next);
  });

  // Logout handler (shared logic)
  const logoutHandler = (req: unknown, res: any) => {
    req.logout((err: any) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      // Destroy session and clear cookie
      req.session.destroy((destroyErr: any) => {
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

  // Debug endpoint to check session status
  app.get("/api/debug/session", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      session: req.session,
      user: req.user || null,
      cookies: req.headers.cookie || null,
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const kioskSessions = new Map<string, { userId: string; expiresAt: Date; stationId?: number }>();
const KIOSK_SESSION_TTL = 8 * 60 * 60 * 1000;

export function createKioskSession(userId: string): string {
  const token = crypto.randomUUID();
  kioskSessions.set(token, {
    userId,
    expiresAt: new Date(Date.now() + KIOSK_SESSION_TTL),
  });
  return token;
}

export function validateKioskSession(token: string): { userId: string; stationId?: number } | null {
  const session = kioskSessions.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    kioskSessions.delete(token);
    return null;
  }
  return { userId: session.userId, stationId: session.stationId };
}

export function updateKioskStation(token: string, stationId: number): void {
  const session = kioskSessions.get(token);
  if (session) {
    session.stationId = stationId;
  }
}

export function deleteKioskSession(token: string): void {
  kioskSessions.delete(token);
}

// Kiosk işlemlerine web oturumu ile de erişebilen yetkili roller
const KIOSK_AUTHORIZED_ROLES = [
  'admin', 'fabrika_mudur', 'fabrika_operator', 'fabrika',
  'supervisor', 'supervisor_buddy', 'coach'
];

export const isKioskAuthenticated: RequestHandler = (req, res, next) => {
  // Önce kiosk token'ı kontrol et
  const token = req.headers['x-kiosk-token'] as string;
  if (token) {
    const session = validateKioskSession(token);
    if (session) {
      (req as any).kioskUserId = session.userId;
      (req as any).kioskStationId = session.stationId;
      (req as any).authMethod = 'kiosk_token';
      return next();
    }
  }
  
  // Kiosk token yoksa veya geçersizse, web oturumunu kontrol et
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
