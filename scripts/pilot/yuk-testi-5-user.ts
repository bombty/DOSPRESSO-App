// =====================================================================
// 5-User Eşzamanlı Yük Testi
// Kullanım:
//   tsx scripts/pilot/yuk-testi-5-user.ts
// =====================================================================
// SENARYO:
//   5 farklı role eşzamanlı:
//   1) Login (POST /api/login)
//   2) Dashboard fetch (GET /api/me/dashboard-data)
//   3) Task list fetch (GET /api/tasks)
//   4) Logout (POST /api/logout)
// METRIK:
//   - Response time (min/max/avg)
//   - HTTP status distribution
//   - DB connection pool davranışı
//   - Toplam süre
// =====================================================================

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

interface TestUser {
  username: string;
  password: string;
  role: string;
}

// 5 test kullanıcısı — TÜM credentials env'den okunur, hardcoded fallback YOK
// Çağrı: TEST_USER_ADMIN=... TEST_PASS_ADMIN=... npx tsx scripts/pilot/yuk-testi-5-user.ts
function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`💥 Missing required env var: ${key}`);
    console.error('Usage: TEST_USER_ADMIN=... TEST_PASS_ADMIN=... (5 user × 2 var)');
    process.exit(2);
  }
  return v;
}

const TEST_USERS: TestUser[] = [
  { username: requireEnv('TEST_USER_ADMIN'),      password: requireEnv('TEST_PASS_ADMIN'),      role: 'admin' },
  { username: requireEnv('TEST_USER_MUDUR'),      password: requireEnv('TEST_PASS_MUDUR'),      role: 'mudur' },
  { username: requireEnv('TEST_USER_SUPERVISOR'), password: requireEnv('TEST_PASS_SUPERVISOR'), role: 'supervisor' },
  { username: requireEnv('TEST_USER_KURYE'),      password: requireEnv('TEST_PASS_KURYE'),      role: 'barista' },
  { username: requireEnv('TEST_USER_FABRIKA'),    password: requireEnv('TEST_PASS_FABRIKA'),    role: 'fabrika_operator' },
];

interface StepResult {
  step: string;
  status: number;
  durationMs: number;
  error?: string;
}

interface UserResult {
  username: string;
  role: string;
  steps: StepResult[];
  totalDurationMs: number;
  success: boolean;
}

async function runUserScenario(user: TestUser): Promise<UserResult> {
  const steps: StepResult[] = [];
  const startAll = Date.now();
  let cookies = '';

  // Step 1: Login
  const t1 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: user.password }),
    });
    const setCookie = res.headers.get('set-cookie') || '';
    cookies = setCookie.split(';')[0]; // sadece connect.sid
    steps.push({ step: 'login', status: res.status, durationMs: Date.now() - t1 });
    if (!res.ok) {
      return { username: user.username, role: user.role, steps, totalDurationMs: Date.now() - startAll, success: false };
    }
  } catch (e: any) {
    steps.push({ step: 'login', status: 0, durationMs: Date.now() - t1, error: e.message });
    return { username: user.username, role: user.role, steps, totalDurationMs: Date.now() - startAll, success: false };
  }

  // Step 2: Dashboard
  const t2 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/me/dashboard-data`, {
      headers: { Cookie: cookies },
    });
    steps.push({ step: 'dashboard', status: res.status, durationMs: Date.now() - t2 });
  } catch (e: any) {
    steps.push({ step: 'dashboard', status: 0, durationMs: Date.now() - t2, error: e.message });
  }

  // Step 3: Tasks list
  const t3 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookies },
    });
    steps.push({ step: 'tasks', status: res.status, durationMs: Date.now() - t3 });
  } catch (e: any) {
    steps.push({ step: 'tasks', status: 0, durationMs: Date.now() - t3, error: e.message });
  }

  // Step 4: Logout
  const t4 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { Cookie: cookies },
    });
    steps.push({ step: 'logout', status: res.status, durationMs: Date.now() - t4 });
  } catch (e: any) {
    steps.push({ step: 'logout', status: 0, durationMs: Date.now() - t4, error: e.message });
  }

  const success = steps.every(s => s.status >= 200 && s.status < 400);
  return { username: user.username, role: user.role, steps, totalDurationMs: Date.now() - startAll, success };
}

async function main() {
  console.log('🚀 5-User Eşzamanlı Yük Testi Başlıyor...');
  console.log(`Hedef: ${BASE_URL}`);
  console.log(`Kullanıcı sayısı: ${TEST_USERS.length}`);
  console.log('-----------------------------------');

  const startTotal = Date.now();
  const results = await Promise.all(TEST_USERS.map(u => runUserScenario(u)));
  const totalElapsed = Date.now() - startTotal;

  // Rapor
  console.log('\n📊 SONUÇLAR');
  console.log('═══════════════════════════════════');
  results.forEach(r => {
    console.log(`\n👤 ${r.username} (${r.role})`);
    console.log(`   Toplam: ${r.totalDurationMs}ms | Başarılı: ${r.success ? '✅' : '❌'}`);
    r.steps.forEach(s => {
      const icon = s.status >= 200 && s.status < 400 ? '✅' : '❌';
      console.log(`   ${icon} ${s.step.padEnd(10)} | ${s.status} | ${s.durationMs}ms${s.error ? ` | ERR: ${s.error}` : ''}`);
    });
  });

  // Özet
  const allSteps = results.flatMap(r => r.steps);
  const allDurations = allSteps.map(s => s.durationMs);
  const successCount = results.filter(r => r.success).length;
  const failedSteps = allSteps.filter(s => s.status < 200 || s.status >= 400);

  console.log('\n═══════════════════════════════════');
  console.log('📈 ÖZET METRİKLER');
  console.log('═══════════════════════════════════');
  console.log(`Toplam test süresi:        ${totalElapsed}ms`);
  console.log(`Başarılı kullanıcı:        ${successCount}/${results.length}`);
  console.log(`Toplam adım:               ${allSteps.length}`);
  console.log(`Başarısız adım:            ${failedSteps.length}`);
  console.log(`Min response:              ${Math.min(...allDurations)}ms`);
  console.log(`Max response:              ${Math.max(...allDurations)}ms`);
  console.log(`Avg response:              ${Math.round(allDurations.reduce((a,b)=>a+b,0) / allDurations.length)}ms`);
  console.log(`Median response:           ${[...allDurations].sort((a,b)=>a-b)[Math.floor(allDurations.length/2)]}ms`);

  // Status code dağılımı
  const statusDist: Record<number, number> = {};
  allSteps.forEach(s => { statusDist[s.status] = (statusDist[s.status] || 0) + 1; });
  console.log('\n📊 Status dağılımı:');
  Object.entries(statusDist).sort().forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  // Karar
  console.log('\n═══════════════════════════════════');
  console.log('🎯 KARAR');
  console.log('═══════════════════════════════════');
  if (successCount === results.length && failedSteps.length === 0) {
    console.log('✅ TÜM TESTLER GEÇTİ — Pilot için yeşil ışık');
  } else if (successCount >= 4) {
    console.log('🟡 KISMİ BAŞARI — düşen kullanıcı incele, pilot devam edebilir');
  } else {
    console.log('🔴 KRİTİK BAŞARISIZLIK — Pilot öncesi çözülmeli');
  }

  process.exit(failedSteps.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('💥 FATAL:', e);
  process.exit(2);
});
