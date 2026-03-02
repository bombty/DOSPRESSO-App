import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  Building2, 
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileUp,
  RefreshCw,
  ArrowRight
} from "lucide-react";

type DataType = 'equipment' | 'personnel' | 'branches';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ParsedData {
  data: Record<string, any>[];
  headers: string[];
  rowCount: number;
}

const dataTypeConfig = {
  equipment: {
    label: 'Ekipman',
    icon: Wrench,
    description: 'Kahve makineleri, değirmenler ve diğer ekipmanlar',
    templateUrl: '/api/bulk/template/equipment',
    exportUrl: '/api/bulk/export/equipment',
    importUrl: '/api/bulk/import/equipment',
    requiredRoles: ['admin', 'coach', 'teknik']
  },
  personnel: {
    label: 'Personel',
    icon: Users,
    description: 'Çalışan bilgileri ve rol atamaları',
    templateUrl: '/api/bulk/template/personnel',
    exportUrl: '/api/bulk/export/personnel',
    importUrl: '/api/bulk/import/personnel',
    requiredRoles: ['admin', 'coach', 'muhasebe']
  },
  branches: {
    label: 'Şubeler',
    icon: Building2,
    description: 'Şube adresleri ve iletişim bilgileri',
    templateUrl: '/api/bulk/template/branches',
    exportUrl: '/api/bulk/export/branches',
    importUrl: '/api/bulk/import/branches',
    requiredRoles: ['admin']
  }
};

export default function TopluVeriYonetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<DataType>('equipment');
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const userRole = user?.role || '';

  const canAccessType = (type: DataType) => {
    return dataTypeConfig[type].requiredRoles.includes(userRole);
  };

  const downloadTemplate = async (type: DataType) => {
    try {
      const response = await fetch(dataTypeConfig[type].templateUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Şablon indirilemedi');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_sablonu.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Şablon İndirildi",
        description: `${dataTypeConfig[type].label} şablonu başarıyla indirildi.`
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Şablon indirilemedi",
        variant: "destructive"
      });
    }
  };

  const exportData = async (type: DataType) => {
    try {
      const response = await fetch(dataTypeConfig[type].exportUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Veri dışa aktarılamadı');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Dışa Aktarıldı",
        description: `${dataTypeConfig[type].label} listesi başarıyla indirildi.`
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Dışa aktarma başarısız",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: DataType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Geçersiz Dosya",
        description: "Lütfen Excel (.xlsx veya .xls) dosyası yükleyin.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setParsedData(null);
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileData = e.target?.result as string;
          
          const response = await apiRequest('POST', '/api/bulk/parse', { fileData, fileName: file.name });
          const result = await response.json();

          setParsedData(result as ParsedData);
          setShowPreviewDialog(true);
        } catch (error: any) {
          toast({
            title: "Hata",
            description: error.message || "Dosya okunamadı",
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setIsUploading(false);
      toast({
        title: "Hata",
        description: error.message || "Dosya yüklenemedi",
        variant: "destructive"
      });
    }

    event.target.value = '';
  };

  const confirmImport = async () => {
    if (!parsedData) return;

    try {
      const response = await apiRequest('POST', dataTypeConfig[activeTab].importUrl, { data: parsedData.data });
      const result = await response.json();

      setImportResult(result as ImportResult);
      setShowPreviewDialog(false);
      setShowResultDialog(true);
      setParsedData(null);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "İçe aktarma başarısız",
        variant: "destructive"
      });
    }
  };

  const DataTypeCard = ({ type }: { type: DataType }) => {
    const config = dataTypeConfig[type];
    const Icon = config.icon;
    const hasAccess = canAccessType(type);

    return (
      <Card className={`${!hasAccess ? 'opacity-50' : ''}`} data-testid={`card-${type}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.label}</CardTitle>
              <CardDescription className="text-xs">{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => downloadTemplate(type)}
              disabled={!hasAccess}
              data-testid={`button-download-template-${type}`}
            >
              <Download className="h-4 w-4" />
              Şablon İndir
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => exportData(type)}
              disabled={!hasAccess}
              data-testid={`button-export-${type}`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Mevcut Verileri İndir
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={(e) => {
                  setActiveTab(type);
                  handleFileUpload(e, type);
                }}
                disabled={!hasAccess || isUploading}
                data-testid={`input-upload-${type}`}
              />
              <Button 
                variant="default" 
                size="sm" 
                className="w-full justify-start gap-2"
                disabled={!hasAccess || isUploading}
                data-testid={`button-upload-${type}`}
              >
                {isUploading && activeTab === type ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Dosya Yükle
              </Button>
            </div>

            {!hasAccess && (
              <p className="text-xs text-muted-foreground mt-1">
                Bu işlem için yetkiniz bulunmuyor.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Toplu Veri Yönetimi</h1>
          <p className="text-muted-foreground">Excel dosyaları ile toplu veri içe/dışa aktarma</p>
        </div>
      </div>

      <Alert>
        <FileUp className="h-4 w-4" />
        <AlertTitle>Nasıl Kullanılır?</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
            <li>Önce <strong>Şablon İndir</strong> butonuyla Excel şablonunu indirin</li>
            <li>Şablonu doldurun (yıldızlı alanlar zorunludur)</li>
            <li><strong>Dosya Yükle</strong> ile Excel dosyanızı seçin</li>
            <li>Önizleme ekranında verileri kontrol edin</li>
            <li>Onaylayarak içe aktarmayı tamamlayın</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(dataTypeConfig) as DataType[]).map(type => (
          <DataTypeCard key={type} type={type} />
        ))}
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Veri Önizleme - {dataTypeConfig[activeTab].label}
            </DialogTitle>
            <DialogDescription>
              İçe aktarılacak verileri kontrol edin. Toplam {parsedData?.rowCount || 0} satır bulundu.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] border rounded-md">
            {parsedData && parsedData.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {parsedData.headers.map((header, i) => (
                      <TableHead key={i}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.data.slice(0, 50).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="font-mono text-xs">{rowIndex + 1}</TableCell>
                      {parsedData.headers.map((header, colIndex) => (
                        <TableCell key={colIndex} className="text-sm">
                          {String(row[header] || '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Henüz veri bulunmuyor
              </div>
            )}
          </ScrollArea>

          {parsedData && parsedData.data.length > 50 && (
            <p className="text-sm text-muted-foreground">
              İlk 50 satır gösteriliyor. Toplam {parsedData.rowCount} satır içe aktarılacak.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)} data-testid="button-cancel-import">
              İptal
            </Button>
            <Button 
              onClick={confirmImport} 
              disabled={!parsedData || parsedData.data.length === 0}
              data-testid="button-confirm-import"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              İçe Aktar ({parsedData?.rowCount || 0} satır)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult && importResult.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              İçe Aktarma Sonucu
            </DialogTitle>
          </DialogHeader>

          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-sm text-muted-foreground">Başarılı</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Başarısız</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Hatalar:</p>
                  <ScrollArea className="h-[150px] border rounded-md p-2">
                    <ul className="space-y-1 text-sm">
                      {importResult.errors.map((error, i) => (
                        <li key={i} className="text-red-600 flex items-start gap-2">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <Progress 
                value={(importResult.success / (importResult.success + importResult.failed)) * 100} 
                className="h-2"
              />
              <p className="text-sm text-center text-muted-foreground">
                Başarı oranı: {Math.round((importResult.success / (importResult.success + importResult.failed)) * 100)}%
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)} data-testid="button-close-result">
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
