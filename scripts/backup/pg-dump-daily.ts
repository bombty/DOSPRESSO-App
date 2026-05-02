/**
 * Wave A-2 / Sprint 2 B16 — Günlük pg_dump cron + Object Storage upload + retention
 *
 * NE YAPAR:
 *   1. DATABASE_URL'den pg_dump (custom format) alır
 *   2. /tmp/db-backups/dospresso-YYYY-MM-DD-HHmm.dump dosyasına yazar
 *   3. Replit Object Storage'a `db-backups/dospresso/YYYY-MM-DD/dump.dump` path'ine yükler
 *   4. Local dosyayı siler
 *   5. 30 günden eski Object Storage backup'larını temizler (retention)
 *
 * ÇALIŞTIRMA:
 *   - Manuel:  tsx scripts/backup/pg-dump-daily.ts
 *   - Dry-run: tsx scripts/backup/pg-dump-daily.ts --dry-run   (dump alır, upload+cleanup ETMEZ, dosyayı bırakır)
 *   - Scheduler: server/backup.ts → startDailyPgDumpScheduler() (her gece 03:00 UTC = TR 06:00)
 *
 * EXCLUDE TABLOLAR (sadece veri, schema dahil):
 *   - audit_logs, notifications, scheduler_executions  (büyük, recover edilmesi kritik değil)
 *
 * RETENTION: 30 gün. Daha eski backup'lar Object Storage'dan silinir.
 *
 * GÜVENLİK NOTU: Backup dosyası HASSAS veri içerir (kullanıcı bilgileri, hashed parolalar,
 * pdks, müşteri bilgileri). Object Storage erişimi sadece admin/ceo rolü olmalı. Asla
 * git'e veya email'e gönderme.
 *
 * BAĞIMLILIK: pg_dump binary (Replit Nix ortamında PostgreSQL 16.10 kurulu).
 */

import { spawn } from "child_process";
import { mkdir, stat, unlink, readFile } from "fs/promises";
import { createReadStream } from "fs";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { objectStorageClient } from "../../server/objectStorage";

const BACKUP_DIR = "/tmp/db-backups";
const RETENTION_DAYS = 30;
const EXCLUDE_TABLE_DATA = ["audit_logs", "notifications", "scheduler_executions"];

interface BackupResult {
  ok: boolean;
  storagePath?: string;
  bytesUploaded?: number;
  durationMs: number;
  error?: string;
}

function getBucketId(): string | null {
  return process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || null;
}

function isoDate(d = new Date()): { day: string; stamp: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const stamp = `${day}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  return { day, stamp };
}

async function runPgDump(outFile: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const args = [
    url,
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--compress=6",
    `--file=${outFile}`,
    ...EXCLUDE_TABLE_DATA.flatMap((t) => ["--exclude-table-data", t]),
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("pg_dump", args, { stdio: ["ignore", "inherit", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

async function uploadToStorage(localPath: string, storagePath: string): Promise<number> {
  const bucketId = getBucketId();
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  const bucket = objectStorageClient.bucket(bucketId);
  const file = bucket.file(storagePath);
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      cacheControl: "private, max-age=0, no-store",
      metadata: {
        source: "pg-dump-daily",
        createdAt: new Date().toISOString(),
      },
    },
  });
  const st = await stat(localPath);
  return st.size;
}

async function cleanupOldBackups(): Promise<{ deleted: number; kept: number }> {
  const bucketId = getBucketId();
  if (!bucketId) return { deleted: 0, kept: 0 };
  const bucket = objectStorageClient.bucket(bucketId);
  const [files] = await bucket.getFiles({ prefix: "db-backups/dospresso/" });
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let kept = 0;
  for (const file of files) {
    // Path format: db-backups/dospresso/YYYY-MM-DD/dump.dump
    const m = file.name.match(/db-backups\/dospresso\/(\d{4}-\d{2}-\d{2})\//);
    if (!m) {
      kept++;
      continue;
    }
    const fileDate = new Date(`${m[1]}T00:00:00Z`).getTime();
    if (fileDate < cutoff) {
      try {
        await file.delete();
        deleted++;
        console.log(`[Cleanup] Deleted old backup: ${file.name}`);
      } catch (e) {
        console.error(`[Cleanup] Failed to delete ${file.name}:`, e);
      }
    } else {
      kept++;
    }
  }
  return { deleted, kept };
}

export async function runDailyPgDump(opts: { dryRun?: boolean } = {}): Promise<BackupResult> {
  const start = Date.now();
  const { day, stamp } = isoDate();
  const localPath = `${BACKUP_DIR}/dospresso-${stamp}.dump`;
  const storagePath = `db-backups/dospresso/${day}/dump.dump`;

  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    console.log(`[pg-dump-daily] Starting dump → ${localPath}`);
    await runPgDump(localPath);

    const st = await stat(localPath);
    const sizeMb = (st.size / (1024 * 1024)).toFixed(2);
    console.log(`[pg-dump-daily] Dump complete: ${sizeMb} MB`);

    if (opts.dryRun) {
      console.log(`[pg-dump-daily] DRY RUN — skipping upload + cleanup. Local file kept at ${localPath}`);
      return { ok: true, durationMs: Date.now() - start, bytesUploaded: 0 };
    }

    console.log(`[pg-dump-daily] Uploading to ${storagePath}`);
    const bytes = await uploadToStorage(localPath, storagePath);
    console.log(`[pg-dump-daily] Upload OK: ${(bytes / (1024 * 1024)).toFixed(2)} MB`);

    try {
      await unlink(localPath);
    } catch (e) {
      console.warn(`[pg-dump-daily] Local cleanup warning:`, e);
    }

    const { deleted, kept } = await cleanupOldBackups();
    console.log(`[pg-dump-daily] Retention: deleted=${deleted}, kept=${kept} (${RETENTION_DAYS} days)`);

    return { ok: true, storagePath, bytesUploaded: bytes, durationMs: Date.now() - start };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[pg-dump-daily] FAILED:`, msg);
    return { ok: false, durationMs: Date.now() - start, error: msg };
  }
}

// CLI entry
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const dryRun = process.argv.includes("--dry-run");
  runDailyPgDump({ dryRun })
    .then((r) => {
      console.log("[pg-dump-daily] Result:", JSON.stringify(r, null, 2));
      process.exit(r.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error("[pg-dump-daily] Unhandled:", e);
      process.exit(1);
    });
}
