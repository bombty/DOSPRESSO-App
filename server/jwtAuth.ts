import jwt from "jsonwebtoken";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";

// JWT secret - use environment variable or default for development
const JWT_SECRET = process.env.JWT_SECRET || "dospresso-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d"; // 7 days

const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı zorunludur"),
  password: z.string().min(1, "Şifre zorunludur"),
});

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  branchId: number | null;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export async function setupAuth(app: Express) {
  // Login endpoint with JWT
  app.post("/api/login", async (req, res) => {
    try {
      // Validate request body
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Geçersiz giriş bilgileri",
          details: validationResult.error.errors 
        });
      }

      const { username, password } = validationResult.data;

      // Find user
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
      });

      return res.json({ 
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          branchId: user.branchId,
        }
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Logout endpoint (client-side will remove token)
  app.post("/api/logout", (req, res) => {
    res.json({ success: true });
  });
}

// Middleware to verify JWT token
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    try {
      const payload = verifyToken(token);
      
      // Attach user info to request
      req.user = {
        id: payload.userId,
        username: payload.username,
        role: payload.role,
        branchId: payload.branchId,
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
