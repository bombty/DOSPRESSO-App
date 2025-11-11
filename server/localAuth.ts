import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";

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
    name: 'dospresso.sid', // Custom cookie name for clarity
    proxy: true, // Trust the reverse proxy
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

export async function setupAuth(app: Express) {
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
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }

        if (!user.hashedPassword) {
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }

        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        
        if (!isValidPassword) {
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUserById(id);
      cb(null, user);
    } catch (error) {
      console.error("[Auth] Deserialize error:", error);
      cb(error);
    }
  });

  // Login endpoint with validation
  app.post("/api/login", (req, res, next) => {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Geçersiz giriş bilgileri",
        details: validationResult.error.errors 
      });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Sunucu hatası" });
      }
      
      if (!user) {
        return res.status(401).json({ error: info?.message || "Giriş başarısız" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Login error:", err);
          return res.status(500).json({ error: "Giriş işlemi başarısız" });
        }
        
        // Explicitly save session to ensure cookie is set
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Auth] Session save error:", saveErr);
            return res.status(500).json({ error: "Oturum kaydedilemedi" });
          }
          
          return res.json({ 
            success: true,
            user: {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              branchId: user.branchId,
            }
          });
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      // Destroy session and clear cookie
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("[Auth] Session destroy error:", destroyErr);
          return res.status(500).json({ error: "Session destroy failed" });
        }
        
        // Clear session cookie with matching options (custom name: dospresso.sid)
        res.clearCookie('dospresso.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        res.json({ message: "Logged out" });
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
