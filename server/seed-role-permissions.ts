import { db } from './db';
import { roleModulePermissions, PERMISSIONS } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seeds the roleModulePermissions table with default permissions from PERMISSIONS constant
 * ONLY inserts missing records - does NOT override existing ones
 * This allows admins to customize permissions without them being reset on every seed
 */
export async function seedRolePermissions() {
  console.log("🌱 Starting role permissions seed...");
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  try {
    // Iterate through all roles in PERMISSIONS
    for (const [role, modules] of Object.entries(PERMISSIONS)) {
      // Iterate through all modules for this role
      for (const [module, actions] of Object.entries(modules)) {
        // Check if record already exists
        const [existing] = await db
          .select()
          .from(roleModulePermissions)
          .where(and(
            eq(roleModulePermissions.role, role),
            eq(roleModulePermissions.module, module)
          ));
        
        if (existing) {
          // Skip if record exists (don't override user customizations)
          skippedCount++;
          continue;
        }
        
        // Insert new record (including empty arrays)
        await db.insert(roleModulePermissions).values({
          role,
          module,
          actions,
        });
        
        insertedCount++;
      }
    }
    
    console.log(`✅ Role permissions seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new permissions`);
    console.log(`   - Skipped: ${skippedCount} existing permissions (preserved)`);
    console.log(`   - Total: ${insertedCount + skippedCount} role-module combinations`);
    
  } catch (error) {
    console.error("❌ Error seeding role permissions:", error);
    throw error;
  }
}

