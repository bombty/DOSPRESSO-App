import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { auditLog } from '../audit';
import multer from 'multer';
import { startExport, getExportJob, getExportFilePath, cleanupOldExports } from '../lib/export-service';
import { validateImport, startImport, getImportJob } from '../lib/import-service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

function isAdmin(req: Request): boolean {
  const user = req.user as any;
  return user && ['admin', 'ceo', 'cgo'].includes(user.role);
}

router.post('/api/admin/export', isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

  const { scope = 'full', branchId, includeMedia = false, password } = req.body;

  if (!['full', 'config_only', 'branch'].includes(scope)) {
    return res.status(400).json({ error: 'Geçersiz scope' });
  }

  if (scope === 'branch' && !branchId) {
    return res.status(400).json({ error: 'Branch scope için branchId gerekli' });
  }

  try {
    const jobId = await startExport({ scope, branchId, includeMedia, password });

    await auditLog(req, {
      eventType: 'system.export_started',
      action: 'export',
      resource: 'system',
      details: { scope, branchId, includeMedia, jobId },
    });

    res.json({ jobId, status: 'processing' });
  } catch (error: unknown) {
    console.error("Export error:", error);
    res.status(500).json({ error: 'Export başlatılamadı' });
  }
});

router.get('/api/admin/export/:jobId/status', isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

  const job = getExportJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Export job bulunamadı' });

  res.json({
    status: job.status,
    progress: job.progress,
    totalTables: job.totalTables,
    processedTables: job.processedTables,
    downloadUrl: job.downloadUrl,
    error: job.error,
    fileSize: job.fileSize,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

router.get('/api/admin/export/:jobId/download', isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

  const job = getExportJob(req.params.jobId);
  if (!job || job.status !== 'completed') {
    return res.status(404).json({ error: 'Export tamamlanmamış veya bulunamadı' });
  }

  const filePath = getExportFilePath(req.params.jobId);
  if (!filePath) return res.status(404).json({ error: 'Export dosyası bulunamadı' });

  await auditLog(req, {
    eventType: 'system.export_downloaded',
    action: 'download',
    resource: 'system',
    details: { jobId: req.params.jobId },
  });

  const fileName = `dospresso-export-${new Date().toISOString().split('T')[0]}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.sendFile(filePath);
});

router.post('/api/admin/import', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

  if (!req.file) return res.status(400).json({ error: 'ZIP dosyası gerekli' });

  const mode = (req.body.mode || 'merge') as 'full_replace' | 'merge' | 'config_only';
  if (!['full_replace', 'merge', 'config_only'].includes(mode)) {
    return res.status(400).json({ error: 'Geçersiz mod' });
  }

  try {
    const jobId = await startImport(req.file.buffer, { mode, password: req.body.password });

    await auditLog(req, {
      eventType: 'system.import_started',
      action: 'import',
      resource: 'system',
      details: { mode, fileName: req.file.originalname, fileSize: req.file.size, jobId },
    });

    res.json({ jobId, status: 'validating' });
  } catch (error: unknown) {
    console.error("Import error:", error);
    res.status(500).json({ error: 'Import başlatılamadı' });
  }
});

router.get('/api/admin/import/:jobId/status', isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });

  const job = getImportJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Import job bulunamadı' });

  res.json({
    status: job.status,
    progress: job.progress,
    totalTables: job.totalTables,
    processedTables: job.processedTables,
    errors: job.errors,
    warnings: job.warnings,
    summary: job.summary,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

router.post('/api/admin/export/cleanup', isAuthenticated, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  cleanupOldExports();
  res.json({ success: true });
});

router.post('/api/admin/import/validate', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Yetkisiz' });
  if (!req.file) return res.status(400).json({ error: 'ZIP dosyası gerekli' });

  try {
    const result = await validateImport(req.file.buffer);
    res.json(result);
  } catch (error: unknown) {
    console.error("Validation error:", error);
    res.status(500).json({ error: 'Dosya doğrulama hatası oluştu' });
  }
});

export default router;
