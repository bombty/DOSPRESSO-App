import "../lib/env-loader";
import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS escalation_config (
      id SERIAL PRIMARY KEY,
      level INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      target_role_key VARCHAR(50) NOT NULL,
      sla_days INTEGER NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      description TEXT,
      notify_email BOOLEAN DEFAULT true,
      notify_in_app BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT idx_escalation_config_level UNIQUE (level)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS role_permission_overrides (
      id SERIAL PRIMARY KEY,
      role VARCHAR(50) NOT NULL,
      module_key VARCHAR(100) NOT NULL,
      can_view BOOLEAN DEFAULT true,
      can_create BOOLEAN DEFAULT false,
      can_edit BOOLEAN DEFAULT false,
      can_delete BOOLEAN DEFAULT false,
      can_approve BOOLEAN DEFAULT false,
      is_enabled BOOLEAN DEFAULT true,
      updated_by_user_id VARCHAR,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT idx_role_perm_overrides_unique UNIQUE (role, module_key)
    )
  `);
  await db.execute(sql`
    INSERT INTO escalation_config (level, name, target_role_key, sla_days, description)
    VALUES
      (1,'Supervisor','supervisor',2,'Şube supervisor — sorun oluşunca ilk 2 gün içinde çözülmeli'),
      (2,'Müdür','mudur',3,'Şube müdürü — supervisor 2 gün içinde yanıt vermezse devreye girer'),
      (3,'Coach / Trainer','coach_trainer',7,'HQ Coach ve Trainer — müdür 3 gün içinde çözmezse müdahale eder'),
      (4,'CGO','cgo',14,'CGO — Coach/Trainer 7 gün içinde müdahale etmezse devreye girer'),
      (5,'CEO','ceo',21,'CEO — CGO 14 gün içinde çözmezse bildirim alır')
    ON CONFLICT (level) DO NOTHING
  `);
  console.log("✅ escalation_config + role_permission_overrides created and seeded");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
