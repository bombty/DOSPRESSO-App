import { db } from './db';
import { roleModulePermissions, PERMISSIONS } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Seeds the roleModulePermissions table with default permissions from PERMISSIONS constant
 * Uses ON CONFLICT DO UPDATE to ensure idempotency (can be run multiple times safely)
 */
export async function seedRolePermissions() {
  console.log("🌱 Starting role permissions seed...");
  
  let insertedCount = 0;
  let updatedCount = 0;
  
  try {
    // Iterate through all roles in PERMISSIONS
    for (const [role, modules] of Object.entries(PERMISSIONS)) {
      // Iterate through all modules for this role
      for (const [module, actions] of Object.entries(modules)) {
        // Skip if actions array is empty (no permissions for this module)
        if (actions.length === 0) {
          continue;
        }
        
        // Upsert (insert or update) the permission
        const result = await db
          .insert(roleModulePermissions)
          .values({
            role,
            module,
            actions,
          })
          .onConflictDoUpdate({
            target: [roleModulePermissions.role, roleModulePermissions.module],
            set: {
              actions,
              updatedAt: new Date(),
            },
          })
          .returning();
        
        if (result.length > 0) {
          // Check if this was an update or insert by comparing timestamps
          const record = result[0];
          if (record.createdAt && record.updatedAt) {
            if (record.createdAt.getTime() === record.updatedAt.getTime()) {
              insertedCount++;
            } else {
              updatedCount++;
            }
          }
        }
      }
    }
    
    console.log(`✅ Role permissions seed completed:`);
    console.log(`   - Inserted: ${insertedCount} new permissions`);
    console.log(`   - Updated: ${updatedCount} existing permissions`);
    console.log(`   - Total: ${insertedCount + updatedCount} role-module combinations`);
    
  } catch (error) {
    console.error("❌ Error seeding role permissions:", error);
    throw error;
  }
}

