import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileArchive,
  RefreshCw,
  ArrowRight,
  Shield,
  HardDrive,
  Loader2,
  Info
} from "lucide-react";

interface ExportJobStatus {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  totalTables: number;
  processedTables: number;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
  startedAt?: string;
  completedAt?: string;
}

interface ImportJobStatus {
  status: 'validating' | 'importing' | 'completed' | 'failed';
  progress: number;
  totalTables: number;
  processedTables: number;
  errors: string[];
  warnings: string[];
  summary?: {
    users: number;
    branches: number;
    tables: number;
    totalRecords: number;
    estimatedTime: string;
  };
  startedAt?: string;
  completedAt?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    users: number;
    branches: number;
    tables: number;
    totalRecords: number;
    estimatedTime: string;
  };
}

export default function TopluVeriYonetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportScope, setExportScope] = useState<string>('full');
  const [exportBranchId, setExportBranchId] = useState<string>('');
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [importMode, setImportMode] = useState<string>('merge');
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportJobStatus | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (!exportJobId || exportStatus?.status === 'completed' || exportStatus?.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/export/${exportJobId}/status`, { credentials: 'include' });
        const data = await res.json();
        setExportStatus(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setIsExporting(false);
          if (data.status === 'completed') {
            toast({ title: "Export Tamamlandı", description: "ZIP dosyası indirmeye hazır." });
          }
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [exportJobId, exportStatus?.status]);

  useEffect(() => {
    if (!importJobId || importStatus?.status === 'completed' || importStatus?.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/import/${importJobId}/status`, { credentials: 'include' });
        const data = await res.json();
        setImportStatus(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setIsImporting(false);
          if (data.status === 'completed') {
            toast({ title: "Import Tamamlandı", description: "Veriler başarıyla içe aktarıldı." });
          }
        }
      } catch {}
    }, 1500);
    return () => clearInterval(interval);
  }, [importJobId, importStatus?.status]);

  const startExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    try {
      const body: any = { scope: exportScope };
      if (exportScope === 'branch' && exportBranchId) body.branchId = parseInt(exportBranchId);
      const res = await apiRequest('POST', '/api/admin/export', body);
      const data = await res.json();
      setExportJobId(data.jobId);
      setExportStatus({ status: 'processing', progress: 0, totalTables: 0, processedTables: 0 });
    } catch (error: any) {
      setIsExporting(false);
      toast({ title: "Hata", description: error.message || "Export başlatılamadı", variant: "destructive" });
    }
  };

  const downloadExport = () => {
    if (exportJobId) {
      window.open(`/api/admin/export/${exportJobId}/download`, '_blank');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast({ title: "Geçersiz Dosya", description: "Lütfen ZIP dosyası seçin.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setValidationResult(null);
    setImportStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import/validate', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (error: any) {
      toast({ title: "Validasyon Hatası", description: error.message, variant: "destructive" });
    }

    event.target.value = '';
  };

  const startImport = async () => {
    if (!selectedFile) return;
    setShowConfirmDialog(false);
    setIsImporting(true);
    setImportStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', importMode);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      setImportJobId(data.jobId);
      setImportStatus({ status: 'validating', progress: 0, totalTables: 0, processedTables: 0, errors: [], warnings: [] });
    } catch (error: any) {
      setIsImporting(false);
      toast({ title: "Hata", description: error.message || "Import başlatılamadı", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'cgo';

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Yetkisiz Erişim</AlertTitle>
          <AlertDescription>Bu sayfaya erişim yetkiniz bulunmuyor.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Veri Yönetimi</h1>
          <p className="text-muted-foreground">Sistem verilerini dışa/içe aktar</p>
        </div>
        <Badge variant="outline">
          <Database className="h-3 w-3 mr-1" />
          WordPress Tarzı
        </Badge>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" data-testid="tab-export">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">
            <Upload className="h-4 w-4 mr-2" />
            İçe Aktar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5" />
                Sistem Verilerini Dışa Aktar
              </CardTitle>
              <CardDescription>
                Tüm sistem verilerinizi ZIP dosyası olarak indirin. Yedekleme, taşıma veya arşivleme için kullanabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kapsam</label>
                <Select value={exportScope} onValueChange={setExportScope}>
                  <SelectTrigger data-testid="select-export-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Tam Yedek (Tüm veriler)</SelectItem>
                    <SelectItem value="config_only">Sadece Yapılandırma</SelectItem>
                    <SelectItem value="branch">Tek Şube</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {exportScope === 'full' && 'Kullanıcılar, şubeler, eğitimler, tarifler, fabrika ve operasyon verileri dahil'}
                  {exportScope === 'config_only' && 'Roller, ayarlar, eğitim modülleri, ürünler ve tarifler'}
                  {exportScope === 'branch' && 'Seçili şubeye ait tüm veriler'}
                </p>
              </div>

              {exportScope === 'branch' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Şube ID</label>
                <input
                  type="number"
                  min="1"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  placeholder="Şube ID girin"
                  value={exportBranchId}
                  onChange={(e) => setExportBranchId(e.target.value)}
                  data-testid="input-branch-id"
                />
              </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Şifreler bcrypt hash olarak aktarılır. Plaintext şifre asla dışa aktarılmaz.
                </AlertDescription>
              </Alert>

              <Button
                onClick={startExport}
                disabled={isExporting}
                className="w-full"
                data-testid="button-start-export"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? 'Export Devam Ediyor...' : 'Dışa Aktarmayı Başlat'}
              </Button>

              {exportStatus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {exportStatus.status === 'processing' && 'İşleniyor...'}
                      {exportStatus.status === 'completed' && 'Tamamlandı'}
                      {exportStatus.status === 'failed' && 'Başarısız'}
                    </span>
                    <span className="text-muted-foreground">
                      {exportStatus.processedTables}/{exportStatus.totalTables} tablo
                    </span>
                  </div>
                  <Progress value={exportStatus.progress} className="h-2" />

                  {exportStatus.status === 'completed' && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>
                          {exportStatus.fileSize ? formatFileSize(exportStatus.fileSize) : ''} ZIP hazır
                        </span>
                      </div>
                      <Button onClick={downloadExport} data-testid="button-download-export">
                        <Download className="h-4 w-4 mr-2" />
                        İndir
                      </Button>
                    </div>
                  )}

                  {exportStatus.status === 'failed' && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{exportStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                ZIP Dosyasından İçe Aktar
              </CardTitle>
              <CardDescription>
                Daha önce dışa aktarılmış ZIP dosyasını yükleyerek verileri geri yükleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">İçe Aktarma Modu</label>
                <Select value={importMode} onValueChange={setImportMode}>
                  <SelectTrigger data-testid="select-import-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Birleştir (Mevcut verileri koru)</SelectItem>
                    <SelectItem value="full_replace">Tam Değiştir (Mevcut verileri sil)</SelectItem>
                    <SelectItem value="config_only">Sadece Yapılandırma</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {importMode === 'merge' && 'Yeni kayıtlar eklenir, mevcutlar korunur'}
                  {importMode === 'full_replace' && 'DİKKAT: Tüm mevcut veriler silinip yerine import verileri yazılır'}
                  {importMode === 'config_only' && 'Sadece yapılandırma tabloları güncellenir'}
                </p>
              </div>

              {importMode === 'full_replace' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dikkat!</AlertTitle>
                  <AlertDescription>
                    Tam değiştir modu tüm mevcut verileri silecektir. Bu işlem geri alınamaz.
                  </AlertDescription>
                </Alert>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-import-file"
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                data-testid="button-select-file"
              >
                <FileArchive className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : 'ZIP Dosyası Seç'}
              </Button>

              {validationResult && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {validationResult.isValid ? 'Dosya geçerli' : 'Dosya geçersiz'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span>{validationResult.summary.tables} tablo</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span>{(validationResult.summary.totalRecords ?? 0).toLocaleString()} kayıt</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kullanıcı:</span> {validationResult.summary.users}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Şube:</span> {validationResult.summary.branches}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Tahmini süre: {validationResult.summary.estimatedTime}
                    </p>

                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        {validationResult.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {validationResult.errors.length > 0 && (
                      <div className="space-y-1">
                        {validationResult.errors.map((e, i) => (
                          <div key={i} className="flex items-start gap-1 text-xs text-red-600">
                            <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{e}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {validationResult?.isValid && (
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isImporting}
                  className="w-full"
                  data-testid="button-start-import"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktarmayı Başlat'}
                </Button>
              )}

              {importStatus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {importStatus.status === 'validating' && 'Doğrulanıyor...'}
                      {importStatus.status === 'importing' && 'İçe aktarılıyor...'}
                      {importStatus.status === 'completed' && 'Tamamlandı'}
                      {importStatus.status === 'failed' && 'Başarısız'}
                    </span>
                    <span className="text-muted-foreground">
                      {importStatus.processedTables}/{importStatus.totalTables} tablo
                    </span>
                  </div>
                  <Progress value={importStatus.progress} className="h-2" />

                  {importStatus.status === 'completed' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Veriler başarıyla içe aktarıldı</span>
                    </div>
                  )}

                  {importStatus.errors.length > 0 && (
                    <ScrollArea className="h-[120px] border rounded-md p-2">
                      {importStatus.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs text-red-600 mb-1">
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{e}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  )}

                  {importStatus.warnings.length > 0 && (
                    <ScrollArea className="h-[80px] border rounded-md p-2">
                      {importStatus.warnings.slice(0, 20).map((w, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              İçe Aktarmayı Onayla
            </DialogTitle>
            <DialogDescription>
              {importMode === 'full_replace'
                ? 'Bu işlem mevcut tüm verileri silecek ve yerine yeni verileri yazacaktır. Bu işlem geri alınamaz!'
                : importMode === 'merge'
                  ? 'Mevcut veriler korunacak, yeni kayıtlar eklenecektir.'
                  : 'Sadece yapılandırma tabloları güncellenecektir.'
              }
            </DialogDescription>
          </DialogHeader>
          {validationResult?.summary && (
            <div className="text-sm space-y-1 py-2">
              <p>Toplam: <strong>{(validationResult.summary.totalRecords ?? 0).toLocaleString()}</strong> kayıt</p>
              <p>Tahmini süre: <strong>{validationResult.summary.estimatedTime}</strong></p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} data-testid="button-cancel-import">
              İptal
            </Button>
            <Button
              onClick={startImport}
              variant={importMode === 'full_replace' ? 'destructive' : 'default'}
              data-testid="button-confirm-import"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Onayla ve Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
