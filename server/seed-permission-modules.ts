import { db } from './db';
import { permissionModules } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { MODULES } from '@shared/modules-registry';

/**
 * Seeds the permission_modules table from centralized modules registry
 * Single source of truth for all module definitions
 */
export async function seedPermissionModules() {
  console.log("🌱 Starting permission modules seed from registry...");
  
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  try {
    for (const module of MODULES) {
      const [existing] = await db
        .select()
        .from(permissionModules)
        .where(eq(permissionModules.moduleKey, module.moduleKey));
      
      if (existing) {
        // Update existing module with latest data from registry
        await db
          .update(permissionModules)
          .set({
            moduleName: module.moduleName,
            category: module.category,
            description: module.description,
          })
          .where(eq(permissionModules.moduleKey, module.moduleKey));
        updatedCount++;
        continue;
      }
      
      // Insert new module
      await db.insert(permissionModules).values({
        moduleKey: module.moduleKey,
        moduleName: module.moduleName,
        category: module.category,
        description: module.description,
        isActive: true,
      });
      
      insertedCount++;
    }
    
    console.log(`✅ Permission modules seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new modules`);
    console.log(`   - Updated: ${updatedCount} existing modules`);
    console.log(`   - Total modules in registry: ${MODULES.length}`);
    
  } catch (error) {
    console.error("❌ Error seeding permission modules:", error);
    throw error;
  }
}
