import { db } from "./db";
import { sql } from "drizzle-orm";
import { ALL_MODULES, generateModuleFlagSeeds } from "@shared/module-manifest";

// Legacy modül key'leri — manifest'te olmayan ama DB'de olan eski tanımlar
// Manifest geçişi tamamlanınca bunlar kaldırılacak
const LEGACY_MODULES = [
  { key: "checklist", level: "module", behavior: "fully_hidden", parent: null },
  { key: "gorevler", level: "module", behavior: "fully_hidden", parent: null },
  { key: "denetim", level: "module", behavior: "fully_hidden", parent: null },
  { key: "iletisim_merkezi", level: "module", behavior: "fully_hidden", parent: null },
  { key: "delegasyon", level: "module", behavior: "fully_hidden", parent: null },
  { key: "franchise", level: "module", behavior: "fully_hidden", parent: null },
  { key: "sube_gorevleri", level: "module", behavior: "fully_hidden", parent: null },
];

export async function seedModuleFlags() {
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS flag_level VARCHAR(20) NOT NULL DEFAULT 'module'`);
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS flag_behavior VARCHAR(30) NOT NULL DEFAULT 'fully_hidden'`);
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS parent_key VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS target_role VARCHAR(50)`);

  await db.execute(sql`DROP INDEX IF EXISTS uq_module_flags_key_scope_branch`);
  await db.execute(sql`DROP INDEX IF EXISTS uq_module_flags_key_scope_branch_role`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_module_flags_key_scope_branch_role ON module_flags (module_key, scope, COALESCE(branch_id, 0), COALESCE(target_role, ''))`);

  // Manifest'ten seed verileri üret
  const manifestSeeds = generateModuleFlagSeeds();
  const allSeeds = [...manifestSeeds, ...LEGACY_MODULES];

  let upserted = 0;
  for (const def of allSeeds) {
    try {
      await db.execute(
        sql`INSERT INTO module_flags (module_key, scope, branch_id, is_enabled, flag_level, flag_behavior, parent_key, target_role, created_at, updated_at)
            VALUES (${def.key}, 'global', NULL, true, ${def.level}, ${def.behavior}, ${def.parent}, NULL, NOW(), NOW())
            ON CONFLICT (module_key, scope, COALESCE(branch_id, 0), COALESCE(target_role, ''))
            DO UPDATE SET
              flag_level = EXCLUDED.flag_level,
              flag_behavior = EXCLUDED.flag_behavior,
              parent_key = EXCLUDED.parent_key,
              updated_at = NOW()`
      );
      upserted++;
    } catch (error) {
      console.error(`[SEED] Module flag error for ${def.key}:`, error);
    }
  }
  console.log(`[SEED] Module flags: ${upserted}/${allSeeds.length} flags upserted (${ALL_MODULES.length} manifest modules + ${LEGACY_MODULES.length} legacy)`);
}
