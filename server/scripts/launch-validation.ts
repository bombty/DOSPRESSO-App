import { db } from "../db";
import { sql } from "drizzle-orm";
import fs from "fs";

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
}

async function countTable(table: string): Promise<number> {
  try {
    const result = await db.execute(sql.raw(`SELECT count(*) as c FROM "${table}"`));
    return parseInt((result as any).rows[0].c);
  } catch {
    return -1;
  }
}

async function runLaunchValidation() {
  const results: TestResult[] = [];

  console.log("\n Running DOSPRESSO Launch Validation...\n");

  const coreTables = [
    { name: "users", minRows: 10 },
    { name: "branches", minRows: 3 },
    { name: "factory_stations", minRows: 5 },
    { name: "factory_products", minRows: 5 },
    { name: "module_flags", minRows: 20 },
    { name: "sla_rules", minRows: 1 },
    { name: "checklists", minRows: 1 },
    { name: "titles", minRows: 1 },
    { name: "shift_templates", minRows: 0 },
  ];

  for (const t of coreTables) {
    const c = await countTable(t.name);
    if (c === -1) {
      results.push({ test: `DB: ${t.name}`, status: "FAIL", detail: "Table not found" });
    } else {
      results.push({
        test: `DB: ${t.name}`,
        status: c >= t.minRows ? "PASS" : "FAIL",
        detail: `${c} rows (min: ${t.minRows})`,
      });
    }
  }

  const launchBranches = [
    { name: "Fabrika", minStaff: 3 },
    { name: "Işıklar", minStaff: 5 },
    { name: "Lara", minStaff: 3 },
  ];

  for (const branch of launchBranches) {
    try {
      const staff = await db.execute(
        sql.raw(`SELECT count(*) as c FROM users u JOIN branches b ON u.branch_id = b.id WHERE b.name LIKE '%${branch.name}%' AND u.is_active = true AND u.deleted_at IS NULL`)
      );
      const c = parseInt((staff as any).rows[0].c);
      results.push({
        test: `Branch staff: ${branch.name}`,
        status: c >= branch.minStaff ? "PASS" : c >= 1 ? "WARN" : "FAIL",
        detail: `${c} active users (min: ${branch.minStaff})`,
      });
    } catch (e: any) {
      results.push({ test: `Branch staff: ${branch.name}`, status: "FAIL", detail: e.message });
    }
  }

  try {
    const noPassword = await db.execute(
      sql.raw(`SELECT count(*) as c FROM users WHERE (hashed_password IS NULL OR hashed_password = '') AND is_active = true AND deleted_at IS NULL`)
    );
    const c = parseInt((noPassword as any).rows[0].c);
    results.push({
      test: "Users: all have passwords",
      status: c === 0 ? "PASS" : "FAIL",
      detail: `${c} users without password`,
    });
  } catch (e: any) {
    results.push({ test: "Users: all have passwords", status: "FAIL", detail: e.message });
  }

  try {
    const noRole = await db.execute(
      sql.raw(`SELECT count(*) as c FROM users WHERE (role IS NULL OR role = '') AND is_active = true AND deleted_at IS NULL`)
    );
    const c = parseInt((noRole as any).rows[0].c);
    results.push({
      test: "Users: all have roles",
      status: c === 0 ? "PASS" : "FAIL",
      detail: `${c} users without role`,
    });
  } catch (e: any) {
    results.push({ test: "Users: all have roles", status: "FAIL", detail: e.message });
  }

  for (const branchName of ["Işıklar", "Lara"]) {
    try {
      const shifts = await db.execute(
        sql.raw(`SELECT count(*) as c FROM shifts s JOIN branches b ON s.branch_id = b.id WHERE b.name LIKE '%${branchName}%' AND s.shift_date >= '2026-03-26' AND s.shift_date <= '2026-04-01'`)
      );
      const c = parseInt((shifts as any).rows[0].c);
      results.push({
        test: `Shifts launch week: ${branchName}`,
        status: c >= 7 ? "PASS" : c >= 1 ? "WARN" : "FAIL",
        detail: `${c} shifts (Mar 26-Apr 1)`,
      });
    } catch (e: any) {
      results.push({ test: `Shifts launch week: ${branchName}`, status: "FAIL", detail: e.message });
    }
  }

  try {
    const stationMapping = await db.execute(
      sql.raw(`SELECT count(*) as c FROM factory_stations WHERE is_active = true AND product_type_id IS NOT NULL`)
    );
    const total = await db.execute(
      sql.raw(`SELECT count(*) as c FROM factory_stations WHERE is_active = true`)
    );
    const mapped = parseInt((stationMapping as any).rows[0].c);
    const all = parseInt((total as any).rows[0].c);
    results.push({
      test: "Factory: station->product mapping",
      status: mapped === all ? "PASS" : mapped > 0 ? "WARN" : "FAIL",
      detail: `${mapped}/${all} stations mapped`,
    });
  } catch (e: any) {
    results.push({ test: "Factory: station->product mapping", status: "FAIL", detail: e.message });
  }

  try {
    const flagCount = await db.execute(
      sql.raw(`SELECT count(*) as c FROM module_flags WHERE deleted_at IS NULL`)
    );
    const c = parseInt((flagCount as any).rows[0].c);
    results.push({
      test: "Module flags: count",
      status: c >= 20 ? "PASS" : "WARN",
      detail: `${c} flags`,
    });
  } catch (e: any) {
    results.push({ test: "Module flags: count", status: "FAIL", detail: e.message });
  }

  try {
    const alwaysOn = await db.execute(
      sql.raw(`SELECT module_key, is_enabled FROM module_flags WHERE flag_behavior = 'always_on' AND deleted_at IS NULL`)
    );
    const disabled = (alwaysOn as any).rows.filter((r: any) => !r.is_enabled);
    results.push({
      test: "Module flags: always_on enabled",
      status: disabled.length === 0 ? "PASS" : "FAIL",
      detail: disabled.length === 0 ? "All OK" : `${disabled.length} disabled: ${disabled.map((r: any) => r.module_key).join(", ")}`,
    });
  } catch (e: any) {
    results.push({ test: "Module flags: always_on enabled", status: "WARN", detail: e.message });
  }

  try {
    const branchPins = await db.execute(
      sql.raw(`SELECT count(*) as c FROM branch_staff_pins WHERE is_active = true`)
    );
    const c = parseInt((branchPins as any).rows[0].c);
    results.push({
      test: "Kiosk: staff PINs configured",
      status: c >= 10 ? "PASS" : c >= 5 ? "WARN" : "FAIL",
      detail: `${c} active PINs`,
    });
  } catch (e: any) {
    results.push({ test: "Kiosk: staff PINs configured", status: "FAIL", detail: e.message });
  }

  try {
    const kioskAccounts = await db.execute(
      sql.raw(`SELECT count(*) as c FROM users WHERE role = 'sube_kiosk' AND is_active = true`)
    );
    const c = parseInt((kioskAccounts as any).rows[0].c);
    results.push({
      test: "Kiosk: branch kiosk accounts",
      status: c >= 3 ? "PASS" : c >= 1 ? "WARN" : "FAIL",
      detail: `${c} kiosk accounts`,
    });
  } catch (e: any) {
    results.push({ test: "Kiosk: branch kiosk accounts", status: "FAIL", detail: e.message });
  }

  try {
    const activeBranches = await db.execute(
      sql.raw(`SELECT count(*) as c FROM branches WHERE is_active = true`)
    );
    const c = parseInt((activeBranches as any).rows[0].c);
    results.push({
      test: "Branches: active count",
      status: c >= 3 ? "PASS" : "FAIL",
      detail: `${c} active branches`,
    });
  } catch (e: any) {
    results.push({ test: "Branches: active count", status: "FAIL", detail: e.message });
  }

  try {
    const checklistCount = await db.execute(
      sql.raw(`SELECT count(*) as c FROM checklists WHERE is_active = true`)
    );
    const c = parseInt((checklistCount as any).rows[0].c);
    results.push({
      test: "Checklists: templates exist",
      status: c >= 2 ? "PASS" : c >= 1 ? "WARN" : "FAIL",
      detail: `${c} active checklists`,
    });
  } catch (e: any) {
    results.push({ test: "Checklists: templates exist", status: "WARN", detail: e.message });
  }

  const qcPlanExists = fs.existsSync(".local/reports/QC-LOT-TRACKING-PLAN.md");
  results.push({
    test: "Docs: QC plan document",
    status: qcPlanExists ? "PASS" : "FAIL",
    detail: qcPlanExists ? "File exists" : "Missing",
  });

  const launchChecklist = fs.existsSync(".local/reports/LAUNCH-CHECKLIST-2026-03-26.md");
  results.push({
    test: "Docs: Launch checklist",
    status: launchChecklist ? "PASS" : "FAIL",
    detail: launchChecklist ? "File exists" : "Missing",
  });

  const resetScript = fs.existsSync("server/scripts/launch-reset.ts");
  results.push({
    test: "Docs: Reset script",
    status: resetScript ? "PASS" : "FAIL",
    detail: resetScript ? "File exists" : "Missing",
  });

  console.log("\n═══════════════════════════════════════");
  console.log("DOSPRESSO LAUNCH VALIDATION REPORT");
  console.log("═══════════════════════════════════════\n");

  let pass = 0, fail = 0, warn = 0;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "⚠";
    console.log(`  ${icon} [${r.status}] ${r.test} — ${r.detail}`);
    if (r.status === "PASS") pass++;
    else if (r.status === "FAIL") fail++;
    else warn++;
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`TOTAL: ${results.length} tests | ${pass} PASS | ${warn} WARN | ${fail} FAIL`);
  console.log(`VERDICT: ${fail === 0 ? (warn <= 3 ? "✓ READY FOR LAUNCH" : "⚠ CONDITIONAL GO") : "✗ NOT READY — fix FAIL items"}`);
  console.log(`═══════════════════════════════════════\n`);

  const report = results.map((r) => `${r.status}\t${r.test}\t${r.detail}`).join("\n");
  fs.mkdirSync(".local/reports", { recursive: true });
  fs.writeFileSync(".local/reports/launch-validation-result.txt", 
    `DOSPRESSO Launch Validation — ${new Date().toISOString()}\n${"=".repeat(60)}\n\n${report}\n\nTOTAL: ${results.length} | PASS: ${pass} | WARN: ${warn} | FAIL: ${fail}\nVERDICT: ${fail === 0 ? (warn <= 3 ? "READY FOR LAUNCH" : "CONDITIONAL GO") : "NOT READY"}\n`
  );
  console.log("Report saved to .local/reports/launch-validation-result.txt");

  process.exit(fail > 0 ? 1 : 0);
}

runLaunchValidation().catch((err) => {
  console.error("VALIDATION ERROR:", err);
  process.exit(1);
});
