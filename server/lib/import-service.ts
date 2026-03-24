import { db } from '../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs';

export interface ImportOptions {
  mode: 'full_replace' | 'merge' | 'config_only';
  password?: string;
}

export interface ImportJob {
  id: string;
  status: 'validating' | 'importing' | 'completed' | 'failed';
  progress: number;
  totalTables: number;
  processedTables: number;
  errors: string[];
  warnings: string[];
  summary?: ImportSummary;
  startedAt: Date;
  completedAt?: Date;
}

export interface ImportSummary {
  users: number;
  branches: number;
  tables: number;
  totalRecords: number;
  estimatedTime: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: ImportSummary;
}

const importJobs = new Map<string, ImportJob>();

const CONFIG_ONLY_CATEGORIES = ['config', 'products', 'recipes', 'training', 'factory'];

const IMPORT_ORDER = [
  'config', 'users', 'products', 'recipes', 'factory', 'training',
  'knowledge', 'operations', 'inventory', 'crm', 'hr',
  'factory_ops', 'branch_ops', 'misc',
];

const TABLES_WITH_CASCADE_DELETE = new Set([
  'audit_logs', 'sessions', 'password_reset_tokens', 'backup_records',
  'notifications', 'push_subscriptions',
]);

export function getImportJob(jobId: string): ImportJob | undefined {
  return importJobs.get(jobId);
}

export async function validateImport(zipBuffer: Buffer): Promise<ValidationResult> {
  const JSZip = (await import('jszip')).default;
  const errors: string[] = [];
  const warnings: string[] = [];

  let zip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    return { isValid: false, errors: ['ZIP dosyası okunamadı'], warnings: [], summary: { users: 0, branches: 0, tables: 0, totalRecords: 0, estimatedTime: '0' } };
  }

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    errors.push('manifest.json bulunamadı');
    return { isValid: false, errors, warnings, summary: { users: 0, branches: 0, tables: 0, totalRecords: 0, estimatedTime: '0' } };
  }

  let manifest;
  try {
    manifest = JSON.parse(await manifestFile.async('text'));
  } catch {
    errors.push('manifest.json parse edilemedi');
    return { isValid: false, errors, warnings, summary: { users: 0, branches: 0, tables: 0, totalRecords: 0, estimatedTime: '0' } };
  }

  if (!manifest.version || !manifest.exportDate) {
    errors.push('manifest.json geçersiz format');
  }

  const recordCountsFile = zip.file('record_counts.json');
  let recordCounts: Record<string, number> = {};
  if (recordCountsFile) {
    try {
      recordCounts = JSON.parse(await recordCountsFile.async('text'));
    } catch {
      warnings.push('record_counts.json parse edilemedi');
    }
  }

  let tableCount = 0;
  let totalRecords = 0;
  const dataFiles = zip.folder('data');
  if (dataFiles) {
    dataFiles.forEach((relativePath, file) => {
      if (file.name.endsWith('.json') && !file.dir) {
        tableCount++;
      }
    });
  }

  for (const [table, count] of Object.entries(recordCounts)) {
    if (count > 0) totalRecords += count;
  }

  const userCount = recordCounts['users'] || manifest.userCount || 0;
  const branchCount = recordCounts['branches'] || manifest.branchCount || 0;

  if (userCount > 0) {
    const existingUsers = await db.execute(sql`SELECT count(*)::int as cnt FROM users`);
    const existingCount = (existingUsers.rows[0] as any)?.cnt || 0;
    if (existingCount > 0) {
      warnings.push(`Mevcut sistemde ${existingCount} kullanıcı var, import ${userCount} kullanıcı içeriyor`);
    }
  }

  const estimatedSeconds = Math.max(10, Math.round(totalRecords / 500));
  const estimatedTime = estimatedSeconds > 60
    ? `~${Math.round(estimatedSeconds / 60)} dakika`
    : `~${estimatedSeconds} saniye`;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      users: userCount,
      branches: branchCount,
      tables: tableCount,
      totalRecords,
      estimatedTime,
    },
  };
}

export async function startImport(zipBuffer: Buffer, options: ImportOptions): Promise<string> {
  const jobId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

  const job: ImportJob = {
    id: jobId,
    status: 'validating',
    progress: 0,
    totalTables: 0,
    processedTables: 0,
    errors: [],
    warnings: [],
    startedAt: new Date(),
  };
  importJobs.set(jobId, job);

  runImport(jobId, zipBuffer, options).catch(err => {
    const j = importJobs.get(jobId);
    if (j) {
      j.status = 'failed';
      j.errors.push(err.message);
    }
  });

  return jobId;
}

async function runImport(jobId: string, zipBuffer: Buffer, options: ImportOptions): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const job = importJobs.get(jobId)!;

  const validation = await validateImport(zipBuffer);
  job.summary = validation.summary;
  job.warnings = validation.warnings;

  if (!validation.isValid) {
    job.status = 'failed';
    job.errors = validation.errors;
    return;
  }

  job.status = 'importing';

  const zip = await JSZip.loadAsync(zipBuffer);
  const dataFolder = zip.folder('data');
  if (!dataFolder) {
    job.status = 'failed';
    job.errors.push('data/ klasörü bulunamadı');
    return;
  }

  const tableFiles: { category: string; tableName: string; file: any }[] = [];
  dataFolder.forEach((relativePath, file) => {
    if (file.name.endsWith('.json') && !file.dir) {
      const parts = relativePath.split('/');
      const category = parts.length > 1 ? parts[0] : 'misc';
      const tableName = parts[parts.length - 1].replace('.json', '');
      tableFiles.push({ category, tableName, file });
    }
  });

  if (options.mode === 'config_only') {
    const filtered = tableFiles.filter(tf => CONFIG_ONLY_CATEGORIES.includes(tf.category));
    tableFiles.length = 0;
    tableFiles.push(...filtered);
  }

  const orderedFiles = tableFiles.sort((a, b) => {
    const aIdx = IMPORT_ORDER.indexOf(a.category);
    const bIdx = IMPORT_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  job.totalTables = orderedFiles.length;

  const existingTables = await getExistingTables();

  const validColumns = await getValidColumns(existingTables);
  const SAFE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  for (let i = 0; i < orderedFiles.length; i++) {
    const { tableName, file } = orderedFiles[i];

    if (!SAFE_NAME_RE.test(tableName) || !existingTables.has(tableName)) {
      job.warnings.push(`Tablo mevcut değil veya geçersiz isim, atlandı: ${tableName}`);
      job.processedTables = i + 1;
      job.progress = Math.round(((i + 1) / orderedFiles.length) * 100);
      continue;
    }

    if (TABLES_WITH_CASCADE_DELETE.has(tableName)) {
      job.warnings.push(`Sistem tablosu atlandı: ${tableName}`);
      job.processedTables = i + 1;
      job.progress = Math.round(((i + 1) / orderedFiles.length) * 100);
      continue;
    }

    const tableValidCols = validColumns.get(tableName);

    try {
      const content = await file.async('text');
      const rows = JSON.parse(content);

      if (!Array.isArray(rows) || rows.length === 0) {
        job.processedTables = i + 1;
        job.progress = Math.round(((i + 1) / orderedFiles.length) * 100);
        continue;
      }

      if (options.mode === 'full_replace') {
        try {
          await db.execute(sql`DELETE FROM ${sql.identifier(tableName)}`);
        } catch (delErr: any) {
          job.warnings.push(`${tableName} temizlenemedi (FK kısıtı): ${delErr.message?.substring(0, 100)}`);
        }
      }

      let failedRows = 0;
      const batchSize = 50;
      for (let batch = 0; batch < rows.length; batch += batchSize) {
        const chunk = rows.slice(batch, batch + batchSize);
        for (const row of chunk) {
          try {
            const rawCols = Object.keys(row).filter(k => row[k] !== undefined);
            const cols = rawCols.filter(c => SAFE_NAME_RE.test(c) && (!tableValidCols || tableValidCols.has(c)));
            if (cols.length === 0) continue;

            const colNames = cols.map(c => sql.identifier(c));
            const colValues = cols.map(k => {
              const v = row[k];
              if (v === null) return sql`NULL`;
              if (typeof v === 'object') return sql`${JSON.stringify(v)}::jsonb`;
              if (typeof v === 'boolean') return v ? sql`TRUE` : sql`FALSE`;
              return sql`${String(v)}`;
            });

            const colPart = sql.join(colNames, sql`, `);
            const valPart = sql.join(colValues, sql`, `);

            const hasId = cols.includes('id');
            if (options.mode === 'merge' && hasId) {
              await db.execute(sql`INSERT INTO ${sql.identifier(tableName)} (${colPart}) VALUES (${valPart}) ON CONFLICT (id) DO NOTHING`);
            } else {
              await db.execute(sql`INSERT INTO ${sql.identifier(tableName)} (${colPart}) VALUES (${valPart}) ON CONFLICT DO NOTHING`);
            }
          } catch (rowErr: any) {
            failedRows++;
          }
        }
      }

      if (failedRows > 0) {
        job.warnings.push(`${tableName}: ${failedRows} satır aktarılamadı`);
      }
    } catch (err: unknown) {
      job.errors.push(`${tableName}: ${err.message?.substring(0, 150)}`);
    }

    job.processedTables = i + 1;
    job.progress = Math.round(((i + 1) / orderedFiles.length) * 100);
  }

  job.status = job.errors.length > 10 ? 'failed' : 'completed';
  job.completedAt = new Date();
}

async function getExistingTables(): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return new Set((result.rows as any[]).map(r => r.table_name));
}

async function getValidColumns(existingTables: Set<string>): Promise<Map<string, Set<string>>> {
  const result = await db.execute(sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const map = new Map<string, Set<string>>();
  for (const row of result.rows as any[]) {
    if (!existingTables.has(row.table_name)) continue;
    if (!map.has(row.table_name)) map.set(row.table_name, new Set());
    map.get(row.table_name)!.add(row.column_name);
  }
  return map;
}
