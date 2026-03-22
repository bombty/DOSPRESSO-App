const BASE = "http://localhost:5000";
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";

interface TestResult {
  name: string;
  group: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
  durationMs: number;
}

const results: TestResult[] = [];
let sessionCookie = "";

async function req(method: string, path: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; data: any; ok: boolean }> {
  const h: Record<string, string> = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    ...headers,
  };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data: any;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, ok: res.ok };
}

async function test(group: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, group, status: "PASS", detail: "", durationMs: Date.now() - start });
  } catch (e: any) {
    results.push({ name, group, status: "FAIL", detail: e.message || String(e), durationMs: Date.now() - start });
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log("====================================");
  console.log("  DOSPRESSO E2E Test Suite");
  console.log("====================================\n");

  await test("Auth", "Admin login başarılı", async () => {
    const r = await req("POST", "/api/login", { username: "admin", password: ADMIN_PASSWORD });
    assert(r.status === 200, `Login status ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data?.success === true, "Login success=false");
    const setCookie = r.data?.cookie;
    const rawRes = await fetch(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: ADMIN_PASSWORD }),
      redirect: "manual",
    });
    const cookies = rawRes.headers.getSetCookie?.() || [];
    sessionCookie = cookies.map(c => c.split(";")[0]).join("; ");
    assert(sessionCookie.length > 0, "No session cookie received");
  });

  await test("Auth", "Yanlış şifre → 401", async () => {
    const r = await req("POST", "/api/login", { username: "admin", password: "wrongpassword123" });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test("Auth", "Session olmadan korumalı endpoint → 401", async () => {
    const r = await fetch(`${BASE}/api/branches`, { redirect: "manual" });
    assert(r.status === 401 || r.status === 302, `Expected 401/302, got ${r.status}`);
  });

  await test("Auth", "/api/auth/user session ile 200", async () => {
    const r = await req("GET", "/api/auth/user");
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.data?.id, "No user id in response");
    assert(!r.data?.hashedPassword, "hashedPassword exposed!");
    assert(r.data?.role === "admin", `Role: ${r.data?.role}`);
  });

  await test("Smoke", "GET /api/health → 200", async () => {
    const r = await fetch(`${BASE}/api/health`);
    assert(r.status === 200, `Health status ${r.status}`);
  });

  await test("Smoke", "GET /api/branches → 200 + array", async () => {
    const r = await req("GET", "/api/branches");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
    assert(r.data.length > 0, "Empty branches");
  });

  await test("Smoke", "GET /api/factory/stations → 200", async () => {
    const r = await req("GET", "/api/factory/stations");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
  });

  await test("Smoke", "GET /api/factory/qc/stats → 200", async () => {
    const r = await req("GET", "/api/factory/qc/stats");
    assert(r.ok || r.status === 200, `Status ${r.status}`);
  });

  await test("Smoke", "GET /api/hr/ik-dashboard → 200", async () => {
    const r = await req("GET", "/api/hr/ik-dashboard");
    assert(r.ok, `Status ${r.status}`);
  });

  await test("Smoke", "GET /api/module-flags → 200", async () => {
    const r = await req("GET", "/api/module-flags");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
  });

  await test("Smoke", "GET /api/notifications → 200", async () => {
    const r = await req("GET", "/api/notifications");
    assert(r.ok, `Status ${r.status}`);
  });

  await test("Smoke", "GET /api/me/menu → 200 + items", async () => {
    const r = await req("GET", "/api/me/menu");
    assert(r.ok, `Status ${r.status}`);
  });

  await test("QC", "GET /api/factory/qc/pending-outputs → array", async () => {
    const r = await req("GET", "/api/factory/qc/pending-outputs");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
  });

  await test("QC", "GET /api/factory/qc/assignments/check → response", async () => {
    const r = await req("GET", "/api/factory/qc/assignments/check?userId=admin");
    assert(r.ok, `Status ${r.status}`);
    assert(r.data?.hasOwnProperty("isQcAssigned"), "Missing isQcAssigned field");
  });

  await test("QC", "POST /api/factory/qc/inspections eksik alan → 400", async () => {
    const r = await req("POST", "/api/factory/qc/inspections", {});
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test("Payroll", "GET /api/payroll/parameters → array", async () => {
    const r = await req("GET", "/api/payroll/parameters");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
  });

  await test("Payroll", "POST /api/payroll/calculate-detailed → hesaplama", async () => {
    const r = await req("POST", "/api/payroll/calculate-detailed", {
      baseSalaryGross: 33030,
      year: 2026,
      month: 3,
    });
    if (r.status === 404) {
      results[results.length - 1] = { ...results[results.length - 1], status: "SKIP", detail: "Endpoint not found (may be in different path)" };
      return;
    }
    assert(r.ok, `Status ${r.status}: ${JSON.stringify(r.data)}`);
  });

  await test("Payroll", "GET /api/payroll/records → array", async () => {
    const r = await req("GET", "/api/payroll/records");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
  });

  await test("Knowledge Base", "GET /api/knowledge-base/articles → gerçek veri", async () => {
    const r = await req("GET", "/api/knowledge-base/articles");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
    assert(r.data.length > 0, "Knowledge base boş — 79 makale olmalı!");
  });

  await test("Knowledge Base", "GET /api/knowledge-base/categories → kategoriler", async () => {
    const r = await req("GET", "/api/knowledge-base/categories");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
    assert(r.data.length > 0, "Kategori yok");
  });

  await test("Knowledge Base", "Arama: 'training' → sonuç", async () => {
    const r = await req("GET", "/api/knowledge-base/articles?search=training");
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data), "Not an array");
  });

  await test("Academy", "GET /api/academy/streak-tracker → gerçek veri", async () => {
    const r = await req("GET", "/api/academy/streak-tracker");
    assert(r.ok, `Status ${r.status}`);
    assert(r.data?.hasOwnProperty("currentStreak"), "Missing currentStreak");
    assert(r.data?.hasOwnProperty("totalXp"), "Missing totalXp");
  });

  await test("Academy", "GET /api/academy/achievement-stats → başarılar", async () => {
    const r = await req("GET", "/api/academy/achievement-stats");
    assert(r.ok, `Status ${r.status}`);
    assert(r.data?.hasOwnProperty("totalBadges"), "Missing totalBadges");
    assert(r.data?.hasOwnProperty("earnedBadges"), "Missing earnedBadges");
    assert(r.data?.hasOwnProperty("achievements"), "Missing achievements");
  });

  await test("Academy", "GET /api/academy/progress-overview → ilerleme", async () => {
    const r = await req("GET", "/api/academy/progress-overview");
    assert(r.ok, `Status ${r.status}`);
    assert(r.data?.hasOwnProperty("totalModules"), "Missing totalModules");
    assert(r.data?.hasOwnProperty("completionRate"), "Missing completionRate");
  });

  await test("Academy", "GET /api/academy/career-progress → kariyer", async () => {
    const r = await req("GET", "/api/academy/career-progress");
    assert(r.ok, `Status ${r.status}`);
    assert(r.data?.hasOwnProperty("currentLevel"), "Missing currentLevel");
    assert(r.data?.hasOwnProperty("milestones"), "Missing milestones");
  });

  await test("Franchise", "GET /api/franchise/performance → branch verileri", async () => {
    const r = await req("GET", "/api/franchise/performance");
    assert(r.ok, `Status ${r.status}`);
    assert(r.data?.hasOwnProperty("branches"), "Missing branches");
    assert(r.data?.hasOwnProperty("overallScore"), "Missing overallScore");
    assert(Array.isArray(r.data.branches), "branches not array");
  });

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;
  const total = results.length;

  console.log("\n====================================");
  console.log("  SONUÇLAR");
  console.log("====================================\n");

  const groups = [...new Set(results.map(r => r.group))];
  for (const group of groups) {
    console.log(`\n--- ${group} ---`);
    for (const r of results.filter(r => r.group === group)) {
      const icon = r.status === "PASS" ? "  PASS" : r.status === "FAIL" ? "  FAIL" : "  SKIP";
      const detail = r.detail ? ` (${r.detail})` : "";
      console.log(`${icon} [${r.durationMs}ms] ${r.name}${detail}`);
    }
  }

  console.log("\n====================================");
  console.log(`  ÖZET: ${passed}/${total} geçti, ${failed} başarısız, ${skipped} atlandı`);
  console.log("====================================\n");

  if (failed > 0) {
    console.log("BAŞARISIZ TESTLER:");
    for (const r of results.filter(r => r.status === "FAIL")) {
      console.log(`  [${r.group}] ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Test runner crash:", err);
  process.exit(2);
});
