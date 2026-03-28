/**
 * CSRF Protection Middleware
 * 
 * Validates Origin/Referer headers on mutating requests (POST/PUT/PATCH/DELETE).
 * This is a defense-in-depth layer on top of sameSite: 'lax' cookies.
 * 
 * Does NOT require frontend changes — browsers automatically send Origin headers.
 * 
 * Skip list:
 *   - GET/HEAD/OPTIONS (safe methods)
 *   - /api/login, /api/register (pre-auth)
 *   - /api/public/* (public endpoints)
 *   - Kiosk endpoints (PIN-based auth, no cookies)
 *   - Webhooks (if any, identified by custom header)
 */

import type { Request, Response, NextFunction } from "express";

// Allowed origins — Replit dev + production domains
const ALLOWED_ORIGINS = new Set([
  // Will be populated dynamically from request host
]);

// Paths that skip CSRF check
const CSRF_SKIP_PATHS = [
  "/api/login",
  "/api/register",
  "/api/setup",
  "/api/health",
  "/api/public/",
  "/api/kiosk/",
  "/api/vapid",
  "/api/forgot-password",
  "/api/reset-password",
];

// Safe HTTP methods (no side effects)
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip safe methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip pre-auth and public endpoints
  const path = req.path;
  if (CSRF_SKIP_PATHS.some(skip => path.startsWith(skip))) {
    return next();
  }

  // Skip if no session (unauthenticated — will fail at isAuthenticated anyway)
  if (!(req as any).user) {
    return next();
  }

  // Get Origin or Referer header
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];

  // If neither header present, some browsers don't send them on same-origin
  // sameSite: 'lax' already blocks cross-site POST, so this is belt-and-suspenders
  if (!origin && !referer) {
    // Allow — same-origin requests may omit these headers
    return next();
  }

  // Extract hostname from request
  const requestHost = req.hostname || req.headers.host?.split(":")[0] || "";

  // Validate Origin
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname;

      // Same host check
      if (originHost === requestHost) {
        return next();
      }

      // Replit dev domains
      if (originHost.endsWith(".replit.dev") && requestHost.endsWith(".replit.dev")) {
        return next();
      }

      // Check against allowed list
      if (ALLOWED_ORIGINS.has(originHost)) {
        return next();
      }
    } catch {
      // Malformed Origin header
    }
  }

  // Validate Referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.hostname;

      if (refererHost === requestHost) {
        return next();
      }

      if (refererHost.endsWith(".replit.dev") && requestHost.endsWith(".replit.dev")) {
        return next();
      }

      if (ALLOWED_ORIGINS.has(refererHost)) {
        return next();
      }
    } catch {
      // Malformed Referer header
    }
  }

  // CSRF detected — block request
  console.warn(`[CSRF] Blocked: ${req.method} ${path} from origin=${origin || "none"} referer=${referer || "none"} host=${requestHost}`);
  return res.status(403).json({
    error: "Geçersiz istek kaynağı. Lütfen sayfayı yenileyip tekrar deneyin.",
    code: "CSRF_REJECTED",
  });
}
