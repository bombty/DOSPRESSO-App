import { db, pool } from "./db";
import { storage } from "./storage";
import { sql, desc, eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import { objectStorageClient } from "./objectStorage";

// Backup status tracking (cached from database)
interface BackupStatus {
  lastBackupDate: Date | null;
  lastBackupSuccess: boolean;
  backupHistory: schema.BackupRecord[];
}

// In-memory cache (synced from database on startup)
let backupStatus: BackupStatus = {
  lastBackupDate: null,
  lastBackupSuccess: false,
  backupHistory: [],
};

// Critical tables that MUST be preserved - prioritized by importance
const CRITICAL_TABLES = [
  'users',
  'branches', 
  'equipment',
  'equipment_faults',
  'shift_attendance',
  'quality_audits',
  'audit_item_scores',
  'customer_feedback',
  'maintenance_schedules',
  'maintenance_logs',
  'employee_warnings',
  'leave_requests',
  'overtime_requests',
  'attendance_penalties',
  'monthly_attendance_summaries',
  'employee_documents',
  'disciplinary_reports',
  'tasks',
  'checklists',
  'checklist_tasks',
] as const;

// Tables to fully backup to object storage (most critical for recovery)
const TABLES_TO_EXPORT = [
  'users',
  'branches',
  'equipment',
  'equipment_faults',
  'shift_attendance',
  'customer_feedback',
  'quality_audits',
  'audit_item_scores',
  'tasks',
  'checklists',
  'checklist_tasks',
] as const;

// Get bucket ID from environment
function getBackupBucketId(): string | null {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  return bucketId || null;
}

// Export table data to object storage with verification
async function exportTableToStorage(tableName: string, backupId: string): Promise<{ success: boolean; rowCount: number; error?: string }> {
  try {
    const result = await db.execute(sql.raw(`SELECT * FROM "${tableName}"`));
    const rows = result.rows || [];
    
    const bucketId = getBackupBucketId();
    if (!bucketId) {
      return { success: false, rowCount: 0, error: 'Object storage not configured' };
    }
    
    const bucket = objectStorageClient.bucket(bucketId);
    const filePath = `.private/backups/${backupId}/${tableName}.json`;
    const file = bucket.file(filePath);
    
    const jsonData = JSON.stringify(rows, null, 2);
    await file.save(jsonData, { contentType: 'application/json' });
    
    // Verify file exists after save
    const [exists] = await file.exists();
    if (!exists) {
      return { success: false, rowCount: 0, error: `Dosya kaydedildi fakat doğrulanamadı: ${filePath}` };
    }
    
    return { success: true, rowCount: rows.length };
  } catch (error: any) {
    return { success: false, rowCount: 0, error: error.message };
  }
}

// Export all critical tables to object storage
async function exportAllTablesToStorage(backupId: string): Promise<{ 
  totalExported: number; 
  errors: string[];
  tableResults: Record<string, { success: boolean; rowCount: number }>;
}> {
  const errors: string[] = [];
  const tableResults: Record<string, { success: boolean; rowCount: number }> = {};
  let totalExported = 0;
  
  for (const tableName of TABLES_TO_EXPORT) {
    const result = await exportTableToStorage(tableName, backupId);
    tableResults[tableName] = { success: result.success, rowCount: result.rowCount };
    
    if (result.success) {
      totalExported += result.rowCount;
    } else {
      errors.push(`${tableName}: ${result.error}`);
    }
  }
  
  return { totalExported, errors, tableResults };
}

// Ensure backup_records table exists
async function ensureBackupTableExists(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS backup_records (
        id SERIAL PRIMARY KEY,
        backup_id VARCHAR(100) UNIQUE NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        success BOOLEAN DEFAULT FALSE NOT NULL,
        tables_backed_up TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
        record_counts JSONB DEFAULT '{}' NOT NULL,
        error_message TEXT,
        duration_ms INTEGER DEFAULT 0 NOT NULL,
        backup_type VARCHAR(20) DEFAULT 'weekly' NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS backup_records_timestamp_idx ON backup_records(timestamp)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS backup_records_success_idx ON backup_records(success)`);
  } catch (error) {
    console.error('Backup tablosu oluşturulamadı:', error);
  }
}

// Load backup history from database
async function loadBackupHistory(): Promise<void> {
  try {
    await ensureBackupTableExists();
    
    const records = await db.select()
      .from(schema.backupRecords)
      .orderBy(desc(schema.backupRecords.timestamp))
      .limit(10);
    
    backupStatus.backupHistory = records;
    
    if (records.length > 0) {
      const lastRecord = records[0];
      backupStatus.lastBackupDate = lastRecord.timestamp;
      backupStatus.lastBackupSuccess = lastRecord.success;
    }
    
    console.log(`📚 ${records.length} backup kaydı veritabanından yüklendi`);
  } catch (error) {
    console.error('Backup geçmişi yüklenemedi:', error);
  }
}

// Get record counts for all critical tables
async function getTableRecordCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  for (const tableName of CRITICAL_TABLES) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
      counts[tableName] = parseInt((result.rows[0] as any)?.count || '0', 10);
    } catch (error) {
      counts[tableName] = -1;
    }
  }
  
  return counts;
}

// Verify data integrity - ensure no data loss
async function verifyDataIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    const counts = await getTableRecordCounts();
    
    for (const [table, count] of Object.entries(counts)) {
      if (count === -1) {
        issues.push(`Tablo bulunamadı: ${table}`);
      }
    }
    
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    if (!connectionTest.rows || connectionTest.rows.length === 0) {
      issues.push('Veritabanı bağlantısı başarısız');
    }
    
    return { valid: issues.length === 0, issues };
  } catch (error: any) {
    issues.push(`Veri bütünlüğü kontrolü hatası: ${error.message}`);
    return { valid: false, issues };
  }
}

// Create a backup snapshot and persist to database + object storage
async function createBackupSnapshot(backupType: 'weekly' | 'manual' = 'weekly'): Promise<schema.BackupRecord> {
  const startTime = Date.now();
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    console.log(`🔄 Backup başlatılıyor: ${backupId}`);
    
    const recordCounts = await getTableRecordCounts();
    const integrity = await verifyDataIntegrity();
    
    if (!integrity.valid) {
      throw new Error(`Veri bütünlüğü sorunları: ${integrity.issues.join(', ')}`);
    }
    
    // Export critical tables to object storage
    console.log(`📦 Kritik tablolar object storage'a yedekleniyor...`);
    const exportResult = await exportAllTablesToStorage(backupId);
    
    const duration = Date.now() - startTime;
    
    // Check if any critical tables failed to export
    const criticalExportFailed = exportResult.errors.length > 0;
    const successfullyExported = Object.entries(exportResult.tableResults)
      .filter(([_, result]) => result.success)
      .map(([table, _]) => table);
    
    if (criticalExportFailed) {
      console.error(`❌ Bazı tablolar yedeklenemedi:`, exportResult.errors);
      
      // If less than half of tables exported successfully, treat as failure
      if (successfullyExported.length < TABLES_TO_EXPORT.length / 2) {
        throw new Error(`Object storage yedekleme başarısız: ${exportResult.errors.join('; ')}`);
      }
      console.warn(`⚠️ Kısmi yedekleme: ${successfullyExported.length}/${TABLES_TO_EXPORT.length} tablo başarılı`);
    }
    
    // Insert backup record to database
    const [backupRecord] = await db.insert(schema.backupRecords)
      .values({
        backupId,
        success: !criticalExportFailed, // Mark as partial success if some exports failed
        tablesBackedUp: successfullyExported,
        recordCounts: { ...recordCounts, exportedRows: exportResult.totalExported },
        durationMs: duration,
        backupType,
        errorMessage: criticalExportFailed ? `Bazı tablolar yedeklenemedi: ${exportResult.errors.join('; ')}` : null,
      })
      .returning();
    
    // Update in-memory cache
    backupStatus.lastBackupDate = backupRecord.timestamp;
    backupStatus.lastBackupSuccess = backupRecord.success;
    backupStatus.backupHistory.unshift(backupRecord);
    if (backupStatus.backupHistory.length > 10) {
      backupStatus.backupHistory = backupStatus.backupHistory.slice(0, 10);
    }
    
    if (backupRecord.success) {
      console.log(`✅ Backup tamamlandı: ${backupId} (${duration}ms)`);
    } else {
      console.warn(`⚠️ Backup kısmi başarılı: ${backupId} (${duration}ms)`);
    }
    console.log(`📊 Tablo sayıları:`, recordCounts);
    console.log(`📦 Object storage'a ${exportResult.totalExported} kayıt yedeklendi (${successfullyExported.length}/${TABLES_TO_EXPORT.length} tablo)`);
    console.log(`💾 Backup veritabanına kaydedildi (ID: ${backupRecord.id})`);
    
    return backupRecord;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Insert failed backup record to database
    let backupRecord: schema.BackupRecord;
    try {
      const [record] = await db.insert(schema.backupRecords)
        .values({
          backupId,
          success: false,
          tablesBackedUp: [],
          recordCounts: {},
          errorMessage: error.message,
          durationMs: duration,
          backupType,
        })
        .returning();
      backupRecord = record;
    } catch (dbError) {
      console.error('Backup kaydı veritabanına yazılamadı:', dbError);
      backupRecord = {
        id: 0,
        backupId,
        timestamp: new Date(),
        success: false,
        tablesBackedUp: [],
        recordCounts: {},
        errorMessage: error.message,
        durationMs: duration,
        backupType,
      };
    }
    
    backupStatus.lastBackupSuccess = false;
    backupStatus.backupHistory.unshift(backupRecord);
    
    console.error(`❌ Backup başarısız: ${backupId}`, error);
    
    return backupRecord;
  }
}

// Notify admins about backup status
async function notifyAdminsAboutBackup(backupRecord: schema.BackupRecord): Promise<void> {
  try {
    const adminUsers = await storage.getUsersByRole('admin');
    const gmUsers = await storage.getUsersByRole('genel_mudur');
    const admins = [...adminUsers, ...gmUsers];
    
    const title = backupRecord.success 
      ? '✅ Haftalık Backup Tamamlandı'
      : '❌ Haftalık Backup Başarısız';
    
    const counts = backupRecord.recordCounts as Record<string, number>;
    const totalRecords = Object.values(counts).reduce((a, b) => a + Math.max(0, b), 0);
    
    const message = backupRecord.success
      ? `Veritabanı yedeği başarıyla alındı ve kaydedildi.\n\nToplam ${totalRecords} kayıt doğrulandı.\nBackup ID: ${backupRecord.backupId}\nSüre: ${backupRecord.durationMs}ms\nTarih: ${backupRecord.timestamp.toLocaleString('tr-TR')}`
      : `Veritabanı yedeği alınamadı!\n\nHata: ${backupRecord.errorMessage}\nTarih: ${backupRecord.timestamp.toLocaleString('tr-TR')}\n\nLütfen sistem yöneticisiyle iletişime geçin.`;
    
    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        title,
        message,
        type: backupRecord.success ? 'info' : 'warning',
      });
    }
    
    console.log(`📧 ${admins.length} admin'e backup bildirimi gönderildi`);
  } catch (error) {
    console.error('Backup bildirimi gönderilemedi:', error);
  }
}

// Daily backup scheduler - runs every day at midnight (00:00 Turkey time)
let backupSchedulerRunning = false;

export async function startWeeklyBackupScheduler(): Promise<void> {
  if (backupSchedulerRunning) {
    console.log('Backup scheduler zaten çalışıyor');
    return;
  }
  
  backupSchedulerRunning = true;
  console.log('📅 Günlük backup scheduler başlatıldı');
  
  // Load backup history from database
  await loadBackupHistory();
  
  // Run initial backup on startup
  runBackupWithNotification();
  
  // Calculate time until next midnight (Turkey time, UTC+3)
  const scheduleNextBackup = () => {
    const now = new Date();
    const turkeyOffset = 3 * 60 * 60 * 1000;
    const nowTurkey = new Date(now.getTime() + turkeyOffset);
    
    const nextMidnight = new Date(nowTurkey);
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    nextMidnight.setUTCHours(0, 0, 0, 0);
    
    const nextBackupTime = new Date(nextMidnight.getTime() - turkeyOffset);
    const msUntilBackup = nextBackupTime.getTime() - now.getTime();
    
    console.log(`⏰ Sonraki backup: ${nextBackupTime.toISOString()} (${Math.round(msUntilBackup / 1000 / 60 / 60)} saat sonra)`);
    
    setTimeout(async () => {
      await runBackupWithNotification();
      scheduleNextBackup();
    }, msUntilBackup);
  };
  
  scheduleNextBackup();
}

// Run backup and send notifications
async function runBackupWithNotification(): Promise<schema.BackupRecord> {
  console.log('🔄 Günlük backup çalıştırılıyor...');
  const backupRecord = await createBackupSnapshot('daily');
  await notifyAdminsAboutBackup(backupRecord);
  return backupRecord;
}

// Manual backup trigger (for API endpoint)
export async function triggerManualBackup(): Promise<schema.BackupRecord> {
  console.log('🔄 Manuel backup tetiklendi');
  const backupRecord = await createBackupSnapshot('manual');
  await notifyAdminsAboutBackup(backupRecord);
  return backupRecord;
}

// Get backup status
export function getBackupStatus(): BackupStatus {
  return { ...backupStatus };
}

// Get backup history from database
export async function getBackupHistory(limit: number = 10): Promise<schema.BackupRecord[]> {
  try {
    const records = await db.select()
      .from(schema.backupRecords)
      .orderBy(desc(schema.backupRecords.timestamp))
      .limit(limit);
    return records;
  } catch (error) {
    console.error('Backup geçmişi alınamadı:', error);
    return backupStatus.backupHistory;
  }
}

// Health check for database connection and data integrity
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  checks: {
    database: boolean;
    integrity: boolean;
    recentBackup: boolean;
  };
  details: string[];
}> {
  const details: string[] = [];
  const checks = {
    database: false,
    integrity: false,
    recentBackup: false,
  };
  
  try {
    // Check database connection
    const dbTest = await db.execute(sql`SELECT 1 as test`);
    checks.database = dbTest.rows && dbTest.rows.length > 0;
    details.push(checks.database ? '✅ Veritabanı bağlantısı aktif' : '❌ Veritabanı bağlantısı başarısız');
    
    // Check data integrity
    const integrity = await verifyDataIntegrity();
    checks.integrity = integrity.valid;
    if (integrity.valid) {
      details.push('✅ Veri bütünlüğü doğrulandı');
    } else {
      details.push(`❌ Veri bütünlüğü sorunları: ${integrity.issues.join(', ')}`);
    }
    
    // Check recent backup from database (within last 8 days)
    try {
      const recentBackups = await db.select()
        .from(schema.backupRecords)
        .where(eq(schema.backupRecords.success, true))
        .orderBy(desc(schema.backupRecords.timestamp))
        .limit(1);
      
      if (recentBackups.length > 0) {
        const lastBackup = recentBackups[0];
        const daysSinceBackup = (Date.now() - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        checks.recentBackup = daysSinceBackup <= 8;
        details.push(checks.recentBackup 
          ? `✅ Son başarılı backup: ${new Date(lastBackup.timestamp).toLocaleString('tr-TR')}`
          : `⚠️ Son backup ${Math.round(daysSinceBackup)} gün önce alındı`);
      } else {
        details.push('⚠️ Henüz backup alınmadı');
      }
    } catch (error) {
      details.push('⚠️ Backup durumu kontrol edilemedi');
    }
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (!checks.database) {
      status = 'critical';
    } else if (!checks.integrity || !checks.recentBackup) {
      status = 'degraded';
    }
    
    return { status, checks, details };
  } catch (error: any) {
    return {
      status: 'critical',
      checks: { database: false, integrity: false, recentBackup: false },
      details: [`❌ Sağlık kontrolü hatası: ${error.message}`],
    };
  }
}

// Export table record counts for monitoring
export async function getDataStats(): Promise<{
  totalRecords: number;
  tableCounts: Record<string, number>;
  criticalTablesOk: boolean;
}> {
  const tableCounts = await getTableRecordCounts();
  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + Math.max(0, b), 0);
  const criticalTablesOk = !Object.values(tableCounts).includes(-1);
  
  return { totalRecords, tableCounts, criticalTablesOk };
}
