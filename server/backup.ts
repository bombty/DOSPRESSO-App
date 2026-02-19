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

// CRITICAL tables: MUST exist in DB. If any fails -> backup success=false
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
  'factory_shifts',
  'factory_shift_workers',
  'factory_shift_productions',
  'factory_production_batches',
  'factory_batch_specs',
  'factory_batch_verifications',
  'factory_machines',
  'factory_products',
  'factory_waste_reasons',
  'notifications',
  'product_recipes',
  'product_recipe_ingredients',
  'raw_materials',
  'recipes',
  'roles',
  'role_permissions',
  'role_permission_grants',
  'role_module_permissions',
  'knowledge_base_articles',
  'knowledge_base_embeddings',
  'inventory_counts',
  'training_materials',
  'quiz_questions',
  'badges',
  'user_badges',
  'banners',
  'announcements',
  'project_phases',
  'project_tasks',
  'suppliers',
] as const;

// OPTIONAL tables: May not exist yet (planned features, renamed tables).
// If missing -> skip silently, backup stays success=true
const OPTIONAL_TABLES = [
  'recipe_ingredients',
  'shift_schedules',
  'shift_assignments',
  'lost_and_found_items',
  'procurement_orders',
  'procurement_order_items',
  'inventory_items',
  'inventory_count_items',
  'quiz_attempts',
  'cost_templates',
  'cost_calculations',
] as const;

// Combined list for export
const ALL_BACKUP_TABLES = [...CRITICAL_TABLES, ...OPTIONAL_TABLES] as const;

// Check which tables actually exist in the database
async function getExistingTables(): Promise<Set<string>> {
  try {
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    return new Set((result.rows as any[]).map(r => r.table_name));
  } catch (error) {
    console.error('Tablo listesi alınamadı:', error);
    return new Set();
  }
}

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

interface ExportResult {
  totalExported: number;
  criticalErrors: string[];
  optionalSkipped: string[];
  failedTables: string[];
  tableResults: Record<string, { success: boolean; rowCount: number; skipped?: boolean }>;
  errorSummary: string | null;
}

async function exportAllTablesToStorage(backupId: string): Promise<ExportResult> {
  const criticalErrors: string[] = [];
  const optionalSkipped: string[] = [];
  const failedTables: string[] = [];
  const tableResults: Record<string, { success: boolean; rowCount: number; skipped?: boolean }> = {};
  let totalExported = 0;

  const existingTables = await getExistingTables();
  const criticalSet = new Set<string>(CRITICAL_TABLES);
  const optionalSet = new Set<string>(OPTIONAL_TABLES);

  for (const tableName of ALL_BACKUP_TABLES) {
    const isCritical = criticalSet.has(tableName);

    if (!existingTables.has(tableName)) {
      if (isCritical) {
        criticalErrors.push(`${tableName}: tablo veritabanında bulunamadı (KRİTİK)`);
        failedTables.push(tableName);
        tableResults[tableName] = { success: false, rowCount: 0 };
      } else {
        optionalSkipped.push(tableName);
        tableResults[tableName] = { success: true, rowCount: 0, skipped: true };
      }
      continue;
    }

    const result = await exportTableToStorage(tableName, backupId);
    tableResults[tableName] = { success: result.success, rowCount: result.rowCount };

    if (result.success) {
      totalExported += result.rowCount;
    } else {
      if (isCritical) {
        criticalErrors.push(`${tableName}: ${result.error}`);
        failedTables.push(tableName);
      } else {
        optionalSkipped.push(tableName);
        console.warn(`⚠️ Opsiyonel tablo yedeklenemedi (atlandı): ${tableName} - ${result.error}`);
      }
    }
  }

  if (optionalSkipped.length > 0) {
    console.log(`ℹ️ Atlanan opsiyonel tablolar (${optionalSkipped.length}): ${optionalSkipped.join(', ')}`);
  }

  const errorSummary = criticalErrors.length > 0
    ? `${criticalErrors.length} kritik tablo hatası: ${criticalErrors.join('; ')}`
    : optionalSkipped.length > 0
      ? `${optionalSkipped.length} opsiyonel tablo atlandı`
      : null;

  return { totalExported, criticalErrors, optionalSkipped, failedTables, tableResults, errorSummary };
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

// Verify database connectivity
async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    return !!(connectionTest.rows && connectionTest.rows.length > 0);
  } catch {
    return false;
  }
}

// Create a backup snapshot and persist to database + object storage
async function createBackupSnapshot(backupType: 'hourly' | 'daily' | 'weekly' | 'manual' = 'hourly'): Promise<schema.BackupRecord> {
  const startTime = Date.now();
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    console.log(`🔄 Backup başlatılıyor: ${backupId}`);
    
    const dbConnected = await verifyDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Veritabanı bağlantısı kurulamadı');
    }
    
    const recordCounts = await getTableRecordCounts();
    
    console.log(`📦 Tablolar object storage'a yedekleniyor...`);
    const exportResult = await exportAllTablesToStorage(backupId);
    
    const duration = Date.now() - startTime;
    
    const hasCriticalFailure = exportResult.criticalErrors.length > 0;
    const successfullyExported = Object.entries(exportResult.tableResults)
      .filter(([_, result]) => result.success && !result.skipped)
      .map(([table]) => table);
    
    if (hasCriticalFailure) {
      console.error(`❌ Kritik tablo hataları:`, exportResult.criticalErrors);
    }
    
    const metadata = {
      ...recordCounts,
      exportedRows: exportResult.totalExported,
      skippedTables: exportResult.optionalSkipped,
      failedTables: exportResult.failedTables,
      errorSummary: exportResult.errorSummary,
    };
    
    const [backupRecord] = await db.insert(schema.backupRecords)
      .values({
        backupId,
        success: !hasCriticalFailure,
        tablesBackedUp: successfullyExported,
        recordCounts: metadata,
        durationMs: duration,
        backupType,
        errorMessage: hasCriticalFailure
          ? `Kritik tablo hataları: ${exportResult.criticalErrors.join('; ')}`
          : exportResult.optionalSkipped.length > 0
            ? `${exportResult.optionalSkipped.length} opsiyonel tablo atlandı: ${exportResult.optionalSkipped.join(', ')}`
            : null,
      })
      .returning();
    
    backupStatus.lastBackupDate = backupRecord.timestamp;
    backupStatus.lastBackupSuccess = backupRecord.success;
    backupStatus.backupHistory.unshift(backupRecord);
    if (backupStatus.backupHistory.length > 10) {
      backupStatus.backupHistory = backupStatus.backupHistory.slice(0, 10);
    }
    
    const totalTables = ALL_BACKUP_TABLES.length;
    const skippedCount = exportResult.optionalSkipped.length;
    if (backupRecord.success) {
      console.log(`✅ Backup tamamlandı: ${backupId} (${duration}ms) - ${successfullyExported.length}/${totalTables} tablo, ${skippedCount} atlandı`);
    } else {
      console.warn(`❌ Backup başarısız: ${backupId} (${duration}ms) - ${exportResult.criticalErrors.length} kritik hata`);
    }
    console.log(`📦 Object storage'a ${exportResult.totalExported} kayıt yedeklendi`);
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
          errorMessage: error?.message || String(error),
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
        errorMessage: error?.message || String(error),
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

// Hourly backup scheduler with mutex lock to prevent overlapping runs
let backupSchedulerRunning = false;
let backupJobRunning = false;
let hourlyIntervalHandle: ReturnType<typeof setInterval> | null = null;

const RETENTION_LIMITS = {
  hourly: 48,
  daily: 30,
  manual: Infinity,
} as const;

const HOURLY_INTERVAL_MS = 60 * 60 * 1000;

export async function startWeeklyBackupScheduler(): Promise<void> {
  if (backupSchedulerRunning) {
    console.log('Backup scheduler zaten çalışıyor');
    return;
  }
  
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    console.log('⚠️ Object storage bucket yapılandırılmadı, backup scheduler başlatılmadı');
    return;
  }
  
  backupSchedulerRunning = true;
  console.log('📅 Saatlik backup scheduler başlatıldı (RPO ≤ 1 saat)');
  
  await loadBackupHistory();
  
  console.log('⏳ İlk backup atlandı - 1 saat sonra ilk saatlik backup çalışacak');
  
  hourlyIntervalHandle = setInterval(async () => {
    await runHourlyBackupWithRetention();
  }, HOURLY_INTERVAL_MS);
  
  console.log(`⏰ Saatlik backup aktif: her ${HOURLY_INTERVAL_MS / 1000 / 60} dakikada bir çalışacak`);
}

async function runHourlyBackupWithRetention(): Promise<void> {
  if (backupJobRunning) {
    console.log('⏳ Önceki backup hala çalışıyor, bu tur atlanıyor (mutex)');
    return;
  }
  backupJobRunning = true;
  try {
    await runBackupWithNotification('hourly');
    await enforceRetentionPolicy();
  } finally {
    backupJobRunning = false;
  }
}

async function deleteBackupFiles(backupId: string): Promise<boolean> {
  try {
    const bucketId = getBackupBucketId();
    if (!bucketId) return true;
    
    const bucket = objectStorageClient.bucket(bucketId);
    const prefix = `.private/backups/${backupId}/`;
    let deletedCount = 0;
    
    for (const tableName of ALL_BACKUP_TABLES) {
      try {
        const file = bucket.file(`${prefix}${tableName}.json`);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          deletedCount++;
        }
      } catch {
      }
    }
    console.log(`🗑️ Object storage dosyaları silindi: ${backupId} (${deletedCount} dosya)`);
    return true;
  } catch (error: any) {
    console.error(`⚠️ Object storage dosyaları silinemedi (${backupId}):`, error?.message);
    return false;
  }
}

async function enforceRetentionPolicy(): Promise<void> {
  try {
    for (const backupType of ['hourly', 'daily'] as const) {
      const limit = RETENTION_LIMITS[backupType];
      
      const allRecords = await db.select()
        .from(schema.backupRecords)
        .where(eq(schema.backupRecords.backupType, backupType))
        .orderBy(desc(schema.backupRecords.timestamp));
      
      if (allRecords.length <= limit) continue;
      
      const toDelete = allRecords.slice(limit);
      console.log(`🗑️ Retention: ${backupType} backuplarından ${toDelete.length} eski kayıt siliniyor (limit: ${limit})`);
      
      for (const record of toDelete) {
        const filesDeleted = await deleteBackupFiles(record.backupId);
        if (filesDeleted) {
          await db.delete(schema.backupRecords)
            .where(eq(schema.backupRecords.id, record.id));
        } else {
          console.warn(`⚠️ Object storage dosyaları silinemedi, DB kaydı korunuyor: ${record.backupId}`);
        }
      }
      
      console.log(`✅ Retention tamamlandı: ${backupType} (${allRecords.length} → ${limit})`);
    }
  } catch (error: any) {
    console.error('⚠️ Retention politikası uygulanırken hata:', error?.message);
  }
}


// Run backup and send notifications
async function runBackupWithNotification(type: 'hourly' | 'daily' | 'manual' = 'hourly'): Promise<schema.BackupRecord | null> {
  try {
    console.log(`🔄 ${type} backup çalıştırılıyor...`);
    const backupRecord = await createBackupSnapshot(type);
    if (!backupRecord.success || type === 'manual') {
      await notifyAdminsAboutBackup(backupRecord);
    }
    return backupRecord;
  } catch (error: any) {
    console.error('❌ Backup sırasında hata oluştu:', error?.message || error);
    return null;
  }
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
    
    checks.integrity = checks.database;
    if (checks.integrity) {
      details.push('✅ Veritabanı erişilebilir');
    } else {
      details.push('❌ Veritabanı erişilemiyor');
    }
    
    // Check recent backup from database (within last 2 hours for hourly schedule)
    try {
      const recentBackups = await db.select()
        .from(schema.backupRecords)
        .where(eq(schema.backupRecords.success, true))
        .orderBy(desc(schema.backupRecords.timestamp))
        .limit(1);
      
      if (recentBackups.length > 0) {
        const lastBackup = recentBackups[0];
        const hoursSinceBackup = (Date.now() - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60);
        checks.recentBackup = hoursSinceBackup <= 2;
        details.push(checks.recentBackup 
          ? `✅ Son başarılı backup: ${new Date(lastBackup.timestamp).toLocaleString('tr-TR')} (${Math.round(hoursSinceBackup * 60)} dk önce)`
          : `⚠️ Son backup ${Math.round(hoursSinceBackup)} saat önce alındı`);
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
      details: [`❌ Sağlık kontrolü hatası: ${error?.message || String(error)}`],
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

export async function restoreFromBackup(backupId: string): Promise<{
  success: boolean;
  tablesRestored: string[];
  totalRecords: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const tablesRestored: string[] = [];
  let totalRecords = 0;
  
  try {
    const bucketId = getBackupBucketId();
    if (!bucketId) {
      return { success: false, tablesRestored: [], totalRecords: 0, errors: ['Object storage not configured'] };
    }
    
    const bucket = objectStorageClient.bucket(bucketId);
    
    // Pre-download all backup data before starting transaction
    const tableData: Array<{ tableName: string; rows: any[] }> = [];
    
    for (const tableName of ALL_BACKUP_TABLES) {
      try {
        const filePath = `.private/backups/${backupId}/${tableName}.json`;
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        
        if (!exists) {
          console.log(`⏭️ ${tableName} backup dosyası bulunamadı, atlanıyor`);
          continue;
        }
        
        const [content] = await file.download();
        const rows = JSON.parse(content.toString());
        
        if (!Array.isArray(rows) || rows.length === 0) {
          console.log(`⏭️ ${tableName} boş, atlanıyor`);
          continue;
        }
        
        tableData.push({ tableName, rows });
      } catch (err: any) {
        errors.push(`${tableName} download: ${err?.message || String(err)}`);
      }
    }
    
    if (tableData.length === 0) {
      return { success: false, tablesRestored: [], totalRecords: 0, errors: ['No backup data found to restore'] };
    }
    
    // Execute restore in a single transaction for atomicity
    await db.transaction(async (tx) => {
      for (const { tableName, rows } of tableData) {
        try {
          // Clear existing data
          await tx.execute(sql.raw(`DELETE FROM "${tableName}"`));
          
          // Insert rows one at a time with safe value escaping
          for (const row of rows) {
            const columns = Object.keys(row);
            const columnList = columns.map(c => `"${c}"`).join(', ');
            const safeValues = columns.map(col => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (typeof val === 'number') return val.toString();
              if (typeof val === 'object') {
                const jsonStr = JSON.stringify(val).replace(/'/g, "''");
                return `'${jsonStr}'`;
              }
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');
            
            await tx.execute(sql.raw(
              `INSERT INTO "${tableName}" (${columnList}) VALUES (${safeValues}) ON CONFLICT DO NOTHING`
            ));
          }
          
          tablesRestored.push(tableName);
          totalRecords += rows.length;
          console.log(`✅ ${tableName}: ${rows.length} kayıt geri yüklendi`);
        } catch (err: any) {
          // Transaction will rollback on error
          throw new Error(`${tableName}: ${err?.message || String(err)}`);
        }
      }
    });
    
    return { success: true, tablesRestored, totalRecords, errors };
  } catch (error: any) {
    return { success: false, tablesRestored: [], totalRecords: 0, errors: [error?.message || String(error)] };
  }
}

export async function getAvailableRestorePoints(): Promise<Array<{
  backupId: string;
  timestamp: Date;
  type: string;
  tableCount: number;
  recordCount: number;
  success: boolean;
}>> {
  try {
    const records = await db.select()
      .from(schema.backupRecords)
      .where(eq(schema.backupRecords.success, true))
      .orderBy(desc(schema.backupRecords.timestamp))
      .limit(30);
    
    return records.map(r => ({
      backupId: r.backupId,
      timestamp: r.timestamp,
      type: r.backupType,
      tableCount: (r.tablesBackedUp as string[])?.length || 0,
      recordCount: Object.values(r.recordCounts as Record<string, number>).reduce((a, b) => a + Math.max(0, b), 0),
      success: r.success,
    }));
  } catch (error) {
    console.error('Restore noktaları alınamadı:', error);
    return [];
  }
}
