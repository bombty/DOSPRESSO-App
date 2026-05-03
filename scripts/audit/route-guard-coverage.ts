#!/usr/bin/env tsx
/**
 * Route Guard Coverage Audit (Task #325 — F33 regression önleyici)
 *
 * client/src/App.tsx içindeki tüm <Route ...> tanımlarını parse eder ve
 * guard'sız (ProtectedRoute / ModuleGuard / *Only / Redirect / window.location
 * içermeyen) route'ları tespit eder. Whitelist'te olmayan herhangi bir bare
 * route bulursa exit code 1 ile fail eder.
 *
 * Whitelist: scripts/audit/public-routes-whitelist.json
 *
 * Kullanım:
 *   tsx scripts/audit/route-guard-coverage.ts            # tüm bare route'ları doğrula
 *   tsx scripts/audit/route-guard-coverage.ts --list     # sadece bare route'ları listele (fail etme)
 *   tsx scripts/audit/route-guard-coverage.ts --json     # JSON output
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const APP_TSX = path.join(REPO_ROOT, "client", "src", "App.tsx");
const WHITELIST_FILE = path.join(__dirname, "public-routes-whitelist.json");

const GUARD_TOKENS = [
  "ProtectedRoute",
  "ModuleGuard",
  "ExecutiveOnly",
  "AdminOnly",
  "FabrikaOnly",
  "HQOnly",
  "FabrikaKiosk",
  "HqKiosk",
  "SubeKiosk",
  "FabrikaDashboardRedirect",
];

const REDIRECT_TOKENS = ["<Redirect", "window.location", "nav("];

interface RouteEntry {
  line: number;
  raw: string;
  path: string | null;
  hasComponent: boolean;
  hasGuard: boolean;
  isRedirect: boolean;
  catchAllComponent: string | null;
}

interface WhitelistEntry { path: string; reason: string }
interface CatchAllEntry { match: string; reason: string }
interface Whitelist {
  publicNoAuth: WhitelistEntry[];
  authenticatedRoleAgnostic: WhitelistEntry[];
  catchAllComponents: CatchAllEntry[];
}

function parseRoutes(source: string): RouteEntry[] {
  const lines = source.split("\n");
  const entries: RouteEntry[] = [];
  const routeRegex = /<Route\b([^>]*?)(\/?)>/;
  const pathRegex = /\bpath\s*=\s*"([^"]+)"/;
  const componentRegex = /\bcomponent\s*=\s*\{([A-Za-z0-9_]+)\}/;

  lines.forEach((line, idx) => {
    const m = line.match(routeRegex);
    if (!m) return;

    const attrs = m[1] || "";
    const pathMatch = attrs.match(pathRegex);
    const compMatch = attrs.match(componentRegex);

    let raw = line.trim();
    let blockEnd = idx;
    if (!raw.includes("</Route>") && !m[2]) {
      for (let j = idx + 1; j < Math.min(lines.length, idx + 20); j++) {
        raw += "\n" + lines[j].trim();
        if (lines[j].includes("</Route>")) {
          blockEnd = j;
          break;
        }
      }
    }

    const hasGuard = GUARD_TOKENS.some((t) => raw.includes(t));
    const isRedirect = REDIRECT_TOKENS.some((t) => raw.includes(t));
    const isPureRedirect = isRedirect && !hasGuard;

    entries.push({
      line: idx + 1,
      raw: raw.length > 200 ? raw.slice(0, 200) + "…" : raw,
      path: pathMatch ? pathMatch[1] : null,
      hasComponent: !!compMatch,
      hasGuard,
      isRedirect: isPureRedirect,
      catchAllComponent: !pathMatch && compMatch ? compMatch[1] : null,
    });
  });

  return entries;
}

function loadWhitelist(): Whitelist {
  const raw = fs.readFileSync(WHITELIST_FILE, "utf8");
  const json = JSON.parse(raw) as Partial<Whitelist>;
  return {
    publicNoAuth: json.publicNoAuth ?? [],
    authenticatedRoleAgnostic: json.authenticatedRoleAgnostic ?? [],
    catchAllComponents: json.catchAllComponents ?? [],
  };
}

function isWhitelisted(entry: RouteEntry, wl: Whitelist): boolean {
  if (entry.catchAllComponent) {
    return wl.catchAllComponents.some((c) => entry.catchAllComponent === c.match);
  }
  if (!entry.path) return false;
  const allow = [...wl.publicNoAuth, ...wl.authenticatedRoleAgnostic];
  return allow.some((w) => w.path === entry.path);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const listMode = args.has("--list");
  const jsonMode = args.has("--json");

  if (!fs.existsSync(APP_TSX)) {
    console.error(`[route-guard-coverage] App.tsx bulunamadı: ${APP_TSX}`);
    process.exit(2);
  }

  const source = fs.readFileSync(APP_TSX, "utf8");
  const entries = parseRoutes(source);
  const wl = loadWhitelist();

  const bare = entries.filter((e) => !e.hasGuard && !e.isRedirect);
  const violations = bare.filter((e) => !isWhitelisted(e, wl));

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          totalRoutes: entries.length,
          bareRoutes: bare.length,
          whitelisted: bare.length - violations.length,
          violations,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`[route-guard-coverage] App.tsx → ${entries.length} route, ${bare.length} bare (guard'sız)`);
    if (listMode) {
      console.log("\nBare route'lar:");
      for (const e of bare) {
        const flag = isWhitelisted(e, wl) ? "OK " : "!! ";
        console.log(`  ${flag}L${e.line}  ${e.path ?? "(catch-all: " + e.catchAllComponent + ")"}`);
      }
    }
    if (violations.length > 0) {
      console.error(`\n[route-guard-coverage] ${violations.length} GUARD'SIZ ROUTE bulundu:\n`);
      for (const v of violations) {
        console.error(`  ✗ App.tsx:${v.line}  path=${v.path ?? "(none)"}`);
        console.error(`      ${v.raw.split("\n")[0]}`);
      }
      console.error(
        `\nÇözüm: Route'u <ProtectedRoute>/<ModuleGuard>/<ExecutiveOnly> vb. ile sarmalayın\n` +
          `         ya da gerçekten public ise scripts/audit/public-routes-whitelist.json'a ekleyin.\n`,
      );
    } else {
      console.log(`[route-guard-coverage] OK — tüm bare route'lar whitelist'te.`);
    }
  }

  if (!listMode && violations.length > 0) process.exit(1);
}

main();
