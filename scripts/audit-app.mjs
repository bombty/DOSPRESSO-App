#!/usr/bin/env node
// Audit script for DOSPRESSO API endpoints.
// Detects FE-called endpoints that have no matching server route.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROUTES_DIR = path.join(ROOT, "server/routes");
const ROUTES_INDEX = path.join(ROOT, "server/routes.ts");
const CLIENT_DIR = path.join(ROOT, "client/src");

function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

// 1) Discover mount prefixes from server/routes.ts
//    Patterns: app.use("/api/x", router); app.use("/api/x", mw, router); app.use(router);
function discoverMounts() {
  const src = fs.readFileSync(ROUTES_INDEX, "utf8");
  // Map: routerVar -> import path (file)
  const importMap = new Map();
  const importRe = /import\s+(?:\{[^}]*\}|(\w+)(?:\s*,\s*\{[^}]*\})?)\s+from\s+["']\.\/routes\/([\w\-/]+)["']/g;
  let m;
  while ((m = importRe.exec(src))) {
    if (m[1]) importMap.set(m[1], m[2]);
  }
  // named imports: import { crmIletisimRouter } from "./routes/crm-iletisim"
  const namedRe = /import\s+\{\s*([^}]+)\s*\}\s+from\s+["']\.\/routes\/([\w\-/]+)["']/g;
  while ((m = namedRe.exec(src))) {
    for (const name of m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0])) {
      if (name) importMap.set(name, m[2]);
    }
  }
  // mounts: app.use("/prefix", maybeMW..., router)
  const mounts = []; // {prefix, file}
  const mountRe = /app\.use\(\s*("[^"]+"\s*,\s*)?([^)]*)\)/g;
  while ((m = mountRe.exec(src))) {
    const prefix = m[1] ? m[1].match(/"([^"]+)"/)[1] : "";
    const args = m[2].split(",").map((s) => s.trim());
    for (const arg of args) {
      const name = arg.replace(/[^\w]/g, "");
      if (importMap.has(name)) {
        mounts.push({ prefix, file: importMap.get(name) });
      }
    }
  }
  return mounts;
}

// 2) Extract route declarations from a router file
//    router.METHOD("/sub", ...) and app.METHOD("/api/...", ...)
function extractRoutes(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const routes = [];
  const re = /\b(?:router|app)\.(get|post|put|patch|delete|all)\(\s*["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = re.exec(src))) {
    routes.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return routes;
}

function buildServerEndpointSet() {
  const set = new Set(); // "METHOD path-template"
  const add = (method, p) => set.add(method.toUpperCase() + " " + p);
  // mounted routers
  const mounts = discoverMounts();
  for (const { prefix, file } of mounts) {
    const fp = path.join(ROUTES_DIR, file + ".ts");
    if (!fs.existsSync(fp)) continue;
    for (const r of extractRoutes(fp)) {
      const full = (prefix + r.path).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
      add(r.method, full);
    }
  }
  // direct app.METHOD in routes.ts itself
  for (const r of extractRoutes(ROUTES_INDEX)) {
    if (r.path.startsWith("/api")) add(r.method, r.path);
  }
  // any router files not mounted (sometimes mounted with wildcard) — also scan all and treat unmounted /api/... as defined
  for (const file of fs.readdirSync(ROUTES_DIR)) {
    if (!file.endsWith(".ts")) continue;
    const fp = path.join(ROUTES_DIR, file);
    for (const r of extractRoutes(fp)) {
      if (r.path.startsWith("/api")) add(r.method, r.path);
    }
  }
  // top-level server files that register routes directly on `app`
  const serverDir = path.join(ROOT, "server");
  for (const file of fs.readdirSync(serverDir)) {
    if (!file.endsWith(".ts")) continue;
    const fp = path.join(serverDir, file);
    if (!fs.statSync(fp).isFile()) continue;
    for (const r of extractRoutes(fp)) {
      if (r.path.startsWith("/api")) add(r.method, r.path);
    }
  }
  return set;
}

// 3) Extract FE calls
function extractFeCalls() {
  const files = walk(CLIENT_DIR, [".ts", ".tsx"]);
  const calls = []; // {method, path, file, line}
  // Normalize template literal segments to a `:param` placeholder
  // and strip query strings so we match server templates.
  const normalize = (raw) => {
    let p = raw;
    // Strip `${...}` (possibly broken/unclosed) that is NOT preceded by `/`
    // (typically these are query-string concatenations like `${qs}`).
    p = p.replace(/(?<!\/)\$\{[^}]*\}?/g, "");
    // Replace remaining `${...}` (segment placeholders) with `:p`
    p = p.replace(/\$\{[^}]*\}?/g, ":p");
    // Cut at query string
    p = p.split("?")[0];
    // Trim trailing slash
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  };
  // Helper: build the runtime URL by joining the queryKey items
  // ["/api/foo", id, "bar"] -> "/api/foo/:p/bar"
  const buildKeyPath = (firstPath, restRaw) => {
    const items = [];
    // crude tokenization: strings ('...' or "..." or `...`) or identifiers
    // Identifiers/expressions can contain optional chaining (?.), member
    // access (.), bracketed access ([n]), and template-literal-like
    // characters; keep them as a single token so `user?.branchId` doesn't
    // become two `:p` URL segments.
    const tokenRe = /"([^"]*)"|'([^']*)'|`([^`]*)`|([A-Za-z0-9_$?.\[\]]+)/g;
    let tm;
    while ((tm = tokenRe.exec(restRaw))) {
      if (tm[1] !== undefined || tm[2] !== undefined || tm[3] !== undefined) {
        const lit = tm[1] ?? tm[2] ?? tm[3];
        items.push(lit);
      } else if (tm[4] !== undefined) {
        items.push(":p");
      }
    }
    let out = firstPath;
    for (const it of items) {
      // skip empty strings
      if (it === "") continue;
      out += "/" + it.replace(/^\/+|\/+$/g, "");
    }
    return out;
  };

  for (const fp of files) {
    const src = fs.readFileSync(fp, "utf8");
    // Strip cache-only operations (invalidateQueries / removeQueries /
    // setQueryData / getQueryData / cancelQueries / refetchQueries) — these
    // do not perform a network request, they are queryKey-prefix matches
    // against the in-memory cache. Including them here would create false
    // positives for bare prefixes like "/api/agent" or "/api/analytics".
    const cacheOnlyRe = /\b(?:invalidateQueries|removeQueries|setQueryData|getQueryData|cancelQueries|refetchQueries)\s*\([^)]*\)/g;
    const srcForScan = src.replace(cacheOnlyRe, " ");
    // apiRequest("METHOD", "/api/...", ...) — supports template literals via backticks
    const apiReqRe = /apiRequest\(\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]\s*,\s*["'`](\/api\/[^"'`]+)["'`]/g;
    // apiRequest("/api/...", "METHOD", ...) — REVERSED arg order (FE bug, but
    // we still need to detect & report so the broken call is fixed).
    const apiReqRevRe = /apiRequest\(\s*["'`](\/api\/[^"'`]+)["'`]\s*,\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/g;
    // queryKey: ["/api/...", item, item, ...] -> GET
    // Capture the first path AND the rest of the array so we can build the
    // resolved URL (queryClient default fetcher does queryKey.join("/")).
    const qkRe = /queryKey:\s*\[\s*["'`](\/api\/[^"'`]+)["'`]([^\]]*)\]/g;
    // fetch("/api/...", { method: "X" }) or fetch(`/api/...`)
    const fetchRe = /fetch\(\s*["'`](\/api\/[^"'`]+)["'`]\s*(?:,\s*\{[^}]*method:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`])?/g;
    let m;
    while ((m = apiReqRe.exec(srcForScan))) {
      const ln = srcForScan.slice(0, m.index).split("\n").length;
      calls.push({ method: m[1], path: normalize(m[2]), file: path.relative(ROOT, fp), line: ln });
    }
    while ((m = apiReqRevRe.exec(srcForScan))) {
      const ln = srcForScan.slice(0, m.index).split("\n").length;
      calls.push({ method: m[2], path: normalize(m[1]), file: path.relative(ROOT, fp), line: ln });
    }
    while ((m = qkRe.exec(srcForScan))) {
      const ln = srcForScan.slice(0, m.index).split("\n").length;
      // If this queryKey is paired with a custom `queryFn`, the queryKey is
      // only used for cache identity — the actual fetch URL is whatever the
      // custom queryFn calls. Skip it (the underlying fetch() inside the
      // queryFn body is captured separately by fetchRe / apiReqRe).
      const lookahead = srcForScan.slice(m.index, m.index + 1500);
      const lookbehind = srcForScan.slice(Math.max(0, m.index - 800), m.index);
      const hasCustomQueryFn =
        /\bqueryFn\s*:/.test(lookahead) || /\bqueryFn\s*:/.test(lookbehind);
      if (hasCustomQueryFn) continue;
      const fullKeyPath = buildKeyPath(m[1], m[2] || "");
      calls.push({ method: "GET", path: normalize(fullKeyPath), file: path.relative(ROOT, fp), line: ln });
    }
    while ((m = fetchRe.exec(srcForScan))) {
      const ln = srcForScan.slice(0, m.index).split("\n").length;
      calls.push({ method: (m[2] || "GET"), path: normalize(m[1]), file: path.relative(ROOT, fp), line: ln });
    }
  }
  return calls;
}

// 4) Match calls against server set with param tolerance.
//    A server template "/api/foo/:id" matches any call that begins with "/api/foo/" + segment.
function buildMatcher(serverSet) {
  const byMethod = new Map();
  for (const e of serverSet) {
    const [method, p] = e.split(" ");
    if (!byMethod.has(method)) byMethod.set(method, []);
    // Server template -> regex matching exact path
    const regex = new RegExp(
      "^" +
        p
          .replace(/[.+*?^${}()|[\]\\]/g, "\\$&")
          .replace(/:\w+/g, "[^/]+") +
        "$"
    );
    byMethod.get(method).push({ template: p, regex });
  }
  return (method, callPath) => {
    const list = byMethod.get(method) || [];
    return list.some((e) => e.regex.test(callPath));
  };
}

function main() {
  const serverSet = buildServerEndpointSet();
  const calls = extractFeCalls();
  const matches = buildMatcher(serverSet);
  const broken = new Map(); // key: "METHOD path" -> [{file, line}]
  for (const c of calls) {
    if (matches(c.method, c.path)) continue;
    const key = c.method + " " + c.path;
    if (!broken.has(key)) broken.set(key, []);
    broken.get(key).push({ file: c.file, line: c.line });
  }
  const arr = [...broken.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log(`Server endpoints: ${serverSet.size}`);
  console.log(`FE calls: ${calls.length}`);
  console.log(`Broken (FE calls without server endpoint): ${arr.length}`);
  console.log("");
  for (const [key, locs] of arr) {
    console.log(`${key} (${locs.length})`);
    for (const l of locs.slice(0, 3)) console.log(`   ${l.file}:${l.line}`);
  }
  process.exit(0);
}
main();
