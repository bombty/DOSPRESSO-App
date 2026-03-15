import { db } from "./db";
import { slaRules } from "@shared/schema";
import { sql } from "drizzle-orm";

const SLA_DEFAULTS = [
  { department: 'teknik', priority: 'kritik', hoursLimit: 4 },
  { department: 'teknik', priority: 'yuksek', hoursLimit: 8 },
  { department: 'teknik', priority: 'normal', hoursLimit: 24 },
  { department: 'teknik', priority: 'dusuk', hoursLimit: 48 },
  { department: 'lojistik', priority: 'kritik', hoursLimit: 8 },
  { department: 'lojistik', priority: 'yuksek', hoursLimit: 12 },
  { department: 'lojistik', priority: 'normal', hoursLimit: 24 },
  { department: 'lojistik', priority: 'dusuk', hoursLimit: 48 },
  { department: 'muhasebe', priority: 'kritik', hoursLimit: 12 },
  { department: 'muhasebe', priority: 'yuksek', hoursLimit: 24 },
  { department: 'muhasebe', priority: 'normal', hoursLimit: 48 },
  { department: 'muhasebe', priority: 'dusuk', hoursLimit: 72 },
  { department: 'marketing', priority: 'kritik', hoursLimit: 24 },
  { department: 'marketing', priority: 'yuksek', hoursLimit: 48 },
  { department: 'marketing', priority: 'normal', hoursLimit: 72 },
  { department: 'marketing', priority: 'dusuk', hoursLimit: 96 },
  { department: 'trainer', priority: 'kritik', hoursLimit: 12 },
  { department: 'trainer', priority: 'yuksek', hoursLimit: 24 },
  { department: 'trainer', priority: 'normal', hoursLimit: 48 },
  { department: 'trainer', priority: 'dusuk', hoursLimit: 72 },
  { department: 'hr', priority: 'kritik', hoursLimit: 12 },
  { department: 'hr', priority: 'yuksek', hoursLimit: 24 },
  { department: 'hr', priority: 'normal', hoursLimit: 72 },
  { department: 'hr', priority: 'dusuk', hoursLimit: 96 },
];

export async function seedSlaRules() {
  const existing = await db.select().from(slaRules);
  if (existing.length >= 24) return;

  for (const rule of SLA_DEFAULTS) {
    const match = existing.find(
      e => e.department === rule.department && e.priority === rule.priority
    );
    if (!match) {
      await db.insert(slaRules).values(rule);
    }
  }

  console.log(`[SEED] SLA rules: ${24 - existing.length} new rules inserted`);
}
