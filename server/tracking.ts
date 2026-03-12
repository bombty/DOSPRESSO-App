import { db } from "./db";
import { sql } from "drizzle-orm";

// In-memory tracking of active employees
interface ActiveEmployee {
  userId: string;
  branchId: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  lastUpdate: Date;
}

const activeEmployees = new Map<string, ActiveEmployee>();

// Update employee location
export async function updateEmployeeLocation(
  userId: string,
  branchId: number,
  latitude: number,
  longitude: number,
  accuracy?: number
): Promise<void> {
  const now = new Date();
  activeEmployees.set(userId, {
    userId,
    branchId,
    latitude,
    longitude,
    timestamp: now,
    accuracy,
    lastUpdate: now,
  });

  // Log to database
  try {
    await db.execute(
      sql`INSERT INTO shift_attendance (user_id, branch_id, check_in_time, latitude, longitude, location_accuracy)
          VALUES (${userId}, ${branchId}, ${now}, ${latitude}, ${longitude}, ${accuracy || 0})
          ON CONFLICT (user_id, DATE(check_in_time)) DO UPDATE SET
          latitude = ${latitude}, longitude = ${longitude}, location_accuracy = ${accuracy || 0}, updated_at = ${now}`
    );
  } catch (error) {
    console.error("Error logging location:", error);
  }
}

// Get active employees on branch
export function getActiveBranchEmployees(branchId: number): ActiveEmployee[] {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  const active = Array.from(activeEmployees.values()).filter(
    (emp) =>
      emp.branchId === branchId &&
      emp.lastUpdate.getTime() > fiveMinutesAgo
  );

  return active;
}

// Get employee real-time location
export function getEmployeeLocation(userId: string): ActiveEmployee | undefined {
  const emp = activeEmployees.get(userId);
  if (!emp) return undefined;

  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  if (emp.lastUpdate.getTime() > fiveMinutesAgo) {
    return emp;
  }

  activeEmployees.delete(userId);
  return undefined;
}

// Mark employee as offline
export function removeEmployeeLocation(userId: string): void {
  activeEmployees.delete(userId);
}

let trackingCleanupInterval: NodeJS.Timeout | null = null;

export function startTrackingCleanup(): void {
  if (trackingCleanupInterval) {
    console.log("[Tracking] Cleanup already running, skipping.");
    return;
  }
  trackingCleanupInterval = setInterval(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    let removed = 0;
    activeEmployees.forEach((emp, userId) => {
      if (emp.lastUpdate.getTime() < tenMinutesAgo) {
        activeEmployees.delete(userId);
        removed++;
      }
    });

    if (removed > 0) {
      console.log(`[Tracking] Cleanup: ${removed} stale entries removed`);
    }
  }, 10 * 60 * 1000);
}

export function stopTrackingCleanup(): void {
  if (trackingCleanupInterval) {
    clearInterval(trackingCleanupInterval);
    trackingCleanupInterval = null;
    console.log("[Tracking] Cleanup stopped.");
  }
}
