#!/usr/bin/env node
/**
 * extract-broken-apis.mjs — APP_AUDIT_REPORT_2026-05.md §7.1 reconstruction.
 *
 * Task #283 / #288 (W0). READ-ONLY. No DB, no network, no writes outside
 * the configured output path.
 *
 * METHODOLOGY (mirrors APP_AUDIT_REPORT_2026-05 §7 wording):
 *   1. Walk client/src for FE API references:
 *      - apiRequest('METHOD', '/api/...')   → method
 *      - apiRequest('/api/...')              → GET (single-arg signature)
 *      - useQuery({ queryKey: ['/api/...'] }) → GET
 *      - useMutation w/ inline mutationFn that calls apiRequest → method
 *      - fetch('/api/...', { method: 'X' })  → X (default GET)
 *      - fetch('/api/...')                   → GET
 *   2. Walk server/ for route definitions:
 *      - app.METHOD('/api/...', ...)
 *      - router.METHOD('/sub/path', ...) inside files mounted at a prefix
 *      - Mount prefix detection from server/routes.ts `app.use(prefix, router)`
 *   3. Path normalisation: lowercase, strip trailing slash, collapse
 *      `:param`, `${var}`, numeric segments, and UUID segments to `:param`.
 *   4. Compare (method, path). FE entry whose normalised key has no server
 *      counterpart (any method) → "broken" (path-level). FE entry where
 *      path exists but method differs → "method-mismatch".
 *   5. Output a markdown report sorted by usage count (desc), with FE
 *      file:line references.
 *
 * USAGE:
 *   node scripts/audit/extract-broken-apis.mjs
 *   node scripts/audit/extract-broken-apis.mjs --out=docs/audit/broken-api-full-2026-05.md
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, 'client/src');
const SERVER_DIR = path.join(ROOT, 'server');
const ROUTES_FILE = path.join(SERVER_DIR, 'routes.ts');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true'];
  })
);
const OUT = args.out || 'docs/audit/broken-api-full-2026-05.md';

// ---------------- File walking ----------------
function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

const clientFiles = walk(CLIENT_DIR, ['.ts', '.tsx']);
const serverFiles = walk(SERVER_DIR, ['.ts']);

// ---------------- Path normalisation ----------------
function normalisePath(raw) {
  if (!raw) return null;
  let p = raw.trim();
  if (!p.startsWith('/api')) return null;
  // strip query string
  p = p.split('?')[0];
  // collapse template literal vars `${x}` to :param (and dangling `${x` from regex truncation)
  p = p.replace(/\$\{[^}]+\}/g, ':param');
  p = p.replace(/\$\{[^/]*$/, ':param');
  p = p.replace(/\$\{[^/}]*\//g, ':param/');
  // collapse explicit :id-style
  p = p.replace(/\/:[A-Za-z_][A-Za-z0-9_]*/g, '/:param');
  // collapse pure numeric or UUID segments
  p = p.replace(/\/\d+(?=\/|$)/g, '/:param');
  p = p.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:param');
  // trailing slash
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p.toLowerCase();
}

function origPath(raw) {
  let p = (raw || '').trim().split('?')[0];
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

// ---------------- FE extraction ----------------
const FE_PATTERNS = [
  // apiRequest('METHOD', '/api/...')
  { re: /apiRequest\(\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]\s*,\s*['"`](\/api\/[^'"`]+)['"`]/g, methodIdx: 1, pathIdx: 2 },
  // apiRequest('METHOD', `/api/...`)
  // covered by above due to backtick in the alt

  // apiRequest('/api/...')  (single-arg, GET)
  { re: /apiRequest\(\s*['"`](\/api\/[^'"`]+)['"`]\s*\)/g, method: 'GET', pathIdx: 1 },

  // queryKey: ['/api/...', ...]   (TanStack Query → GET)
  { re: /queryKey:\s*\[\s*['"`](\/api\/[^'"`]+)['"`]/g, method: 'GET', pathIdx: 1 },

  // fetch('/api/...', { method: 'X' })
  { re: /fetch\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*\{[^}]*method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/g, methodIdx: 2, pathIdx: 1 },

  // fetch('/api/...') no options → GET
  { re: /fetch\(\s*['"`](\/api\/[^'"`]+)['"`]\s*\)/g, method: 'GET', pathIdx: 1 },

  // fetch(`/api/...`, { method: 'X' })  (template literal version handled by /api/ inside backtick)
];

const feCalls = []; // {method, path, raw, file, line}

for (const f of clientFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  for (const pat of FE_PATTERNS) {
    pat.re.lastIndex = 0;
    let m;
    while ((m = pat.re.exec(content))) {
      const raw = m[pat.pathIdx];
      const method = pat.method || m[pat.methodIdx];
      const norm = normalisePath(raw);
      if (!norm) continue;
      const lineNo = content.slice(0, m.index).split('\n').length;
      feCalls.push({
        method: method.toUpperCase(),
        path: norm,
        raw: origPath(raw),
        file: path.relative(ROOT, f),
        line: lineNo,
      });
    }
  }
}

// ---------------- Server extraction ----------------
// Mount prefixes from app.use("/prefix", router) and registerXRoutes(app)
// (registerX functions add routes at the app level, so no prefix needed.)
const mountByImport = {}; // identifier → prefix
{
  const txt = fs.readFileSync(ROUTES_FILE, 'utf8');
  const useRe = /app\.use\(\s*(?:isAuthenticated\s*,\s*)?['"`](\/[^'"`]+)['"`]\s*,\s*(?:isAuthenticated\s*,\s*)?(\w+)/g;
  let m;
  while ((m = useRe.exec(txt))) mountByImport[m[2]] = m[1];
  // Also support: app.use(prefix, mw, router) where mw is identifier
  const useReWithMw = /app\.use\(\s*['"`](\/[^'"`]+)['"`]\s*,\s*\w+\s*,\s*(\w+)\s*\)/g;
  while ((m = useReWithMw.exec(txt))) {
    if (!mountByImport[m[2]]) mountByImport[m[2]] = m[1];
  }
}

// Map import identifier → file path
const importToFile = {}; // ident → absolute path
{
  const txt = fs.readFileSync(ROUTES_FILE, 'utf8');
  const importRe = /^import\s+(?:(\w+)|\{\s*([^}]+)\s*\})\s+from\s+['"`](\.\/routes\/[^'"`]+)['"`]/gm;
  let m;
  while ((m = importRe.exec(txt))) {
    const file = path.resolve(SERVER_DIR, m[3] + (m[3].endsWith('.ts') ? '' : '.ts'));
    if (m[1]) importToFile[m[1]] = file;
    if (m[2]) {
      for (const name of m[2].split(',').map((s) => s.trim().split(/\s+as\s+/)[0])) {
        if (name) importToFile[name] = file;
      }
    }
  }
}

// Server route definitions
const serverRoutes = new Map(); // method+norm → Set(file:line)
function addServerRoute(method, fullPath, file, line) {
  const norm = normalisePath(fullPath);
  if (!norm) return;
  const key = `${method.toUpperCase()} ${norm}`;
  if (!serverRoutes.has(key)) serverRoutes.set(key, new Set());
  serverRoutes.get(key).add(`${path.relative(ROOT, file)}:${line}`);
}

const SERVER_RE = /(?:^|\b)(?:app|router|apiRouter|publicRouter)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;

for (const f of serverFiles) {
  const content = fs.readFileSync(f, 'utf8');
  // Determine prefix for this file based on imported identifier
  const fileAbs = path.resolve(f);
  let prefix = '';
  for (const [ident, ifile] of Object.entries(importToFile)) {
    if (ifile === fileAbs && mountByImport[ident]) {
      prefix = mountByImport[ident];
      break;
    }
  }

  SERVER_RE.lastIndex = 0;
  let m;
  while ((m = SERVER_RE.exec(content))) {
    const method = m[1];
    const sub = m[2];
    let full;
    if (sub.startsWith('/api/')) {
      full = sub; // app.METHOD('/api/...') — already absolute
    } else if (sub.startsWith('/')) {
      // router.METHOD('/sub') with prefix
      full = (prefix || '') + sub;
    } else {
      continue;
    }
    if (!full.startsWith('/api')) continue;
    const lineNo = content.slice(0, m.index).split('\n').length;
    addServerRoute(method, full, f, lineNo);
  }
}

// ---------------- Compare ----------------
// Group FE calls by method+norm
const feByKey = new Map(); // "GET /api/x" → { method, path, locations:[], rawSample }
for (const c of feCalls) {
  const key = `${c.method} ${c.path}`;
  if (!feByKey.has(key)) feByKey.set(key, { method: c.method, path: c.path, locations: [], raw: c.raw });
  feByKey.get(key).locations.push(`${c.file}:${c.line}`);
}

// Build set of all server normalised paths regardless of method (for method-mismatch detection)
const serverPathMethods = new Map(); // norm path → Set(methods)
for (const key of serverRoutes.keys()) {
  const [meth, ...rest] = key.split(' ');
  const p = rest.join(' ');
  if (!serverPathMethods.has(p)) serverPathMethods.set(p, new Set());
  serverPathMethods.get(p).add(meth);
}

// Helper: check if server has a related path (with or without :param expansion)
function serverHasPath(p) {
  if (serverPathMethods.has(p)) return true;
  // try with trailing /:param
  if (serverPathMethods.has(p + '/:param')) return true;
  // try parent path (strip last segment)
  const parent = p.replace(/\/[^/]+$/, '');
  if (parent !== p && serverPathMethods.has(parent)) return true;
  // try child sub-paths existing under p
  for (const sp of serverPathMethods.keys()) {
    if (sp.startsWith(p + '/')) return true;
  }
  return false;
}

const broken = []; // { method, path, locations, raw, kind: 'missing'|'method-mismatch', serverMethods }
for (const entry of feByKey.values()) {
  const key = `${entry.method} ${entry.path}`;
  if (serverRoutes.has(key)) continue; // exact match (even with :param) — OK
  // method-mismatch: same path exists but different method
  if (serverPathMethods.has(entry.path)) {
    broken.push({
      ...entry,
      kind: 'method-mismatch',
      serverMethods: [...serverPathMethods.get(entry.path)].sort(),
    });
    continue;
  }
  // related path exists (a1/a2 categories) — still broken at exact key but lower severity
  const related = serverHasPath(entry.path);
  broken.push({
    ...entry,
    kind: related ? 'related-exists' : 'missing',
    serverMethods: [],
  });
}

// Sort by use count desc
broken.sort((a, b) => b.locations.length - a.locations.length || a.path.localeCompare(b.path));

// ---------------- Output ----------------
const lines = [];
lines.push('# Kırık API Çağrıları — Tam Liste (W0 reconstruction)');
lines.push('');
lines.push(`**Üretim:** ${new Date().toISOString()}`);
lines.push(`**Script:** scripts/audit/extract-broken-apis.mjs (committed, READ-ONLY)`);
lines.push(`**Task:** #288 — Wave W0 of #283`);
lines.push('');
lines.push('Bu rapor APP_AUDIT_REPORT_2026-05.md §7.1 truncate edilmiş 51-118 satırlarını geri kazandırmak için bağımsız extraction ile üretildi. Methodology audit ile birebir uyumlu (FE: apiRequest/useQuery/fetch; server: app.METHOD + router.METHOD + mount prefix).');
lines.push('');

lines.push('## Özet');
lines.push('');
lines.push('| Metrik | Değer |');
lines.push('|---|---|');
lines.push(`| Taranan FE dosyası | ${clientFiles.length} |`);
lines.push(`| Taranan server dosyası | ${serverFiles.length} |`);
lines.push(`| Toplam FE API çağrı kalemi (distinct method+path) | ${feByKey.size} |`);
lines.push(`| Toplam server endpoint (method+path) | ${serverRoutes.size} |`);
lines.push(`| Mount prefix tespit edilen router sayısı | ${Object.keys(mountByImport).length} |`);
lines.push(`| **TOPLAM kırık** (tüm kategoriler) | **${broken.length}** |`);
lines.push(`| → missing (server'da hiç yok) | ${broken.filter((b) => b.kind === 'missing').length} |`);
lines.push(`| → method-mismatch (path var, method farklı) | ${broken.filter((b) => b.kind === 'method-mismatch').length} |`);
lines.push(`| → related-exists (sub/parent path mevcut) | ${broken.filter((b) => b.kind === 'related-exists').length} |`);
lines.push('');

lines.push('## Tüm Kırık Çağrılar (use count desc)');
lines.push('');
lines.push('| # | Method+Path | Use | Kind | Server methods | Örnek FE konum |');
lines.push('|---|---|---|---|---|---|');
broken.forEach((b, i) => {
  const sm = b.serverMethods.length ? b.serverMethods.join('/') : '—';
  const loc = b.locations.slice(0, 2).join('<br>');
  lines.push(`| ${i + 1} | \`${b.method} ${b.raw}\` | ${b.locations.length} | ${b.kind} | ${sm} | ${loc} |`);
});
lines.push('');

lines.push('## 51-118 Aralığı (audit truncate satırları)');
lines.push('');
lines.push('Audit ilk 50 satırı göstermişti. Aşağıdaki tablo bu listenin 51 ve sonrasını yalıtarak audit truncate satırlarını kapatır.');
lines.push('');
lines.push('| # | Method+Path | Use | Kind | FE konumları |');
lines.push('|---|---|---|---|---|');
broken.slice(50, 118).forEach((b, i) => {
  const loc = b.locations.slice(0, 3).join('<br>');
  lines.push(`| ${i + 51} | \`${b.method} ${b.raw}\` | ${b.locations.length} | ${b.kind} | ${loc} |`);
});
lines.push('');

const outPath = path.resolve(OUT);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`✓ FE files: ${clientFiles.length}, server files: ${serverFiles.length}`);
console.log(`✓ FE distinct method+path: ${feByKey.size}, server endpoints: ${serverRoutes.size}`);
console.log(`✓ Mount prefixes: ${Object.keys(mountByImport).length}`);
console.log(`✓ Broken total: ${broken.length} (missing=${broken.filter((b) => b.kind === 'missing').length}, mm=${broken.filter((b) => b.kind === 'method-mismatch').length}, rel=${broken.filter((b) => b.kind === 'related-exists').length})`);
console.log(`✓ Report: ${outPath}`);
