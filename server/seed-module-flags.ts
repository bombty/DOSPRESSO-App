import { db } from "./db";
import { moduleFlags } from "@shared/schema";
import { sql } from "drizzle-orm";

const MODULE_KEYS = [
  "checklist",
  "crm",
  "akademi",
  "fabrika",
  "pdks",
  "vardiya",
  "stok",
  "raporlar",
  "ekipman",
  "gorevler",
  "finans",
  "satinalma",
  "denetim",
  "iletisim_merkezi",
  "delegasyon",
  "franchise",
];

export async function seedModuleFlags() {
  let inserted = 0;
  for (const moduleKey of MODULE_KEYS) {
    try {
      await db.execute(
        sql`INSERT INTO module_flags (module_key, scope, branch_id, is_enabled, created_at, updated_at)
            VALUES (${moduleKey}, 'global', NULL, true, NOW(), NOW())
            ON CONFLICT DO NOTHING`
      );
      inserted++;
    } catch (error) {
    }
  }
  console.log(`[SEED] Module flags: ${MODULE_KEYS.length} global flags ensured`);
}
