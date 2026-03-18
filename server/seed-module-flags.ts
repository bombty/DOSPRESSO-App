import { db } from "./db";
import { sql } from "drizzle-orm";

interface ModuleDefinition {
  key: string;
  level: string;
  behavior: string;
  parent: string | null;
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  { key: "admin", level: "module", behavior: "always_on", parent: null },
  { key: "dashboard", level: "module", behavior: "always_on", parent: null },
  { key: "bordro", level: "module", behavior: "always_on", parent: null },
  { key: "dobody", level: "module", behavior: "always_on", parent: null },
  { key: "fabrika", level: "module", behavior: "always_on", parent: null },
  { key: "satinalma", level: "module", behavior: "always_on", parent: null },

  { key: "pdks", level: "module", behavior: "ui_hidden_data_continues", parent: null },
  { key: "vardiya", level: "module", behavior: "ui_hidden_data_continues", parent: null },

  { key: "checklist", level: "module", behavior: "fully_hidden", parent: null },
  { key: "gorevler", level: "module", behavior: "fully_hidden", parent: null },
  { key: "akademi", level: "module", behavior: "fully_hidden", parent: null },
  { key: "crm", level: "module", behavior: "fully_hidden", parent: null },
  { key: "stok", level: "module", behavior: "fully_hidden", parent: null },
  { key: "ekipman", level: "module", behavior: "fully_hidden", parent: null },
  { key: "denetim", level: "module", behavior: "fully_hidden", parent: null },
  { key: "iletisim_merkezi", level: "module", behavior: "fully_hidden", parent: null },
  { key: "raporlar", level: "module", behavior: "fully_hidden", parent: null },
  { key: "finans", level: "module", behavior: "fully_hidden", parent: null },
  { key: "delegasyon", level: "module", behavior: "fully_hidden", parent: null },
  { key: "franchise", level: "module", behavior: "fully_hidden", parent: null },

  { key: "fabrika.sevkiyat", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
  { key: "fabrika.sayim", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
  { key: "fabrika.hammadde", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
  { key: "fabrika.siparis", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
  { key: "fabrika.vardiya", level: "submodule", behavior: "ui_hidden_data_continues", parent: "fabrika" },
  { key: "fabrika.kalite", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
  { key: "fabrika.kavurma", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
  { key: "fabrika.stok", level: "submodule", behavior: "fully_hidden", parent: "fabrika" },
];

export async function seedModuleFlags() {
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS flag_level VARCHAR(20) NOT NULL DEFAULT 'module'`);
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS flag_behavior VARCHAR(30) NOT NULL DEFAULT 'fully_hidden'`);
  await db.execute(sql`ALTER TABLE module_flags ADD COLUMN IF NOT EXISTS parent_key VARCHAR(100)`);

  let upserted = 0;
  for (const def of MODULE_DEFINITIONS) {
    try {
      await db.execute(
        sql`INSERT INTO module_flags (module_key, scope, branch_id, is_enabled, flag_level, flag_behavior, parent_key, created_at, updated_at)
            VALUES (${def.key}, 'global', NULL, true, ${def.level}, ${def.behavior}, ${def.parent}, NOW(), NOW())
            ON CONFLICT (module_key, scope, branch_id)
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
  console.log(`[SEED] Module flags: ${upserted}/${MODULE_DEFINITIONS.length} flags upserted (${MODULE_DEFINITIONS.length} total definitions)`);
}
