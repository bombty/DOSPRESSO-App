import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { MobileFilterCollapse } from '@/components/mobile-filter-collapse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Filter, X, MapPin, Wrench, Calendar, AlertCircle, CheckCircle2, Clock, History, User, Upload, Image as ImageIcon, Download, Plus, QrCode, AlertTriangle, ClipboardList, Sparkles, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch } from '@shared/schema';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Html5Qrcode } from 'html5-qrcode';
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

// Status labels for unified system
const FAULT_STATUS_LABELS = {
  'acik': 'Açık',
  'devam_ediyor': 'Devam Ediyor',
  'cozuldu': 'Çözüldü',
} as const;

const SERVICE_STATUS_LABELS = {
  'talep_edildi': 'Talep Edildi',
  'planlandi': 'Planlandı',
  'devam_ediyor': 'Devam Ediyor',
  'tamamlandi': 'Tamamlandı',
  'iptal_edildi': 'İptal Edildi',
} as const;

const PRIORITY_VARIANTS = {
  'düşük': 'bg-primary/10 border-primary/30 dark:bg-primary/5 dark:border-primary/40',
  'orta': 'bg-warning/10 border-warning/30 dark:bg-warning/5 dark:border-warning/40',
  'yüksek': 'bg-warning/10 border-warning/30 dark:bg-warning/5 dark:border-warning/40',
  'kritik': 'bg-destructive/10 border-destructive/30 dark:bg-destructive/5 dark:border-destructive/40',
} as const;

interface SelectedEquipment {
  id: number;
  equipmentType: string;
  branchId?: number;
  [key: string]: unknown;
}

interface AIDiagnosis {
  diagnosis: string;
  troubleshootingSteps?: string[];
  estimatedSeverity?: string;
  estimatedRepairTime?: string;
  recommendedAction?: string;
}

interface UnifiedRequest {
  id: number;
  type: 'fault' | 'service'; // Arıza vs Servis Talebi
  equipmentId: number;
  equipmentType: string;
  equipmentName: string;
  branchId: number;
  branchName?: string;
  
  // Fault fields
  faultStatus?: string;
  faultDescription?: string;
  faultSeverity?: string;
  
  // Service Request fields
  serviceStatus?: string;
  serviceProvider?: string;
  priority?: string;
  notes?: string;
  photo1Url?: string;
  photo2Url?: string;
  estimatedCost?: string;
  actualCost?: string;
  
  // Common
  createdAt: string;
  createdById: string;
  createdByUsername?: string;
}

export default function EkipmanServis() {
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all'); // 'fault', 'service', 'all'
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Form states
  const [createBranch, setCreateBranch] = useState<string>('');
  const [createEquipment, setCreateEquipment] = useState<SelectedEquipment | null>(null);
  const [createType, setCreateType] = useState<'fault' | 'service'>('fault');
  
  // Fault fields
  const [faultDescription, setFaultDescription] = useState<string>('');
  const [faultSeverity, setFaultSeverity] = useState<string>('medium');
  const [aiDiagnosis, setAiDiagnosis] = useState<AIDiagnosis | null>(null);
  const [loadingAiDiagnosis, setLoadingAiDiagnosis] = useState(false);
  
  // Service fields
  const [serviceProvider, setServiceProvider] = useState<string>('');
  const [priority, setPriority] = useState<string>('orta');
  const [notes, setNotes] = useState<string>('');
  const [photo1Preview, setPhoto1Preview] = useState<string>('');
  const [photo2Preview, setPhoto2Preview] = useState<string>('');
  const [photo1File, setPhoto1File] = useState<File | null>(null);
  const [photo2File, setPhoto2File] = useState<File | null>(null);
  
  // QR Scanner
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const { data: branches = [], isError, refetch, isLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: allEquipment = [] } = useQuery<any[]>({
    queryKey: ['/api/equipment'],
  });

  const { data: faults = [] } = useQuery<any[]>({
    queryKey: ['/api/faults'],
  });

  const { data: serviceRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/service-requests'],
  });

  // Combine and filter
  const unifiedRequests: UnifiedRequest[] = useMemo(() => {
    const combined: UnifiedRequest[] = [];
    
    faults.forEach((fault) => {
      combined.push({
        id: fault.id,
        type: 'fault',
        equipmentId: fault.equipmentId,
        equipmentType: fault.equipmentName || 'Bilinmeyen',
        equipmentName: fault.equipmentName || 'Bilinmeyen',
        branchId: fault.branchId,
        faultStatus: fault.status,
        faultDescription: fault.description,
        faultSeverity: fault.severity,
        createdAt: fault.createdAt,
        createdById: fault.reportedById,
        createdByUsername: fault.reportedByName,
      });
    });

    serviceRequests.forEach((req) => {
      combined.push({
        id: req.id,
        type: 'service',
        equipmentId: req.equipmentId,
        equipmentType: req.equipmentType,
        equipmentName: req.equipmentName,
        branchId: req.branchId,
        branchName: req.branchName,
        serviceStatus: req.status,
        serviceProvider: req.serviceProvider,
        priority: req.priority,
        notes: req.notes,
        photo1Url: req.photo1Url,
        photo2Url: req.photo2Url,
        estimatedCost: req.estimatedCost,
        actualCost: req.actualCost,
        createdAt: req.createdAt,
        createdById: req.createdById,
        createdByUsername: req.createdByUsername,
      });
    });

    // Apply filters
    let filtered = combined;
    if (filterBranch !== 'all') {
      filtered = filtered.filter(r => r.branchId === parseInt(filterBranch));
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [faults, serviceRequests, filterBranch, filterType]);

  const branchEquipment = useMemo(() => {
    if (!createBranch) return [];
    return allEquipment.filter((eq) => eq.branchId === parseInt(createBranch));
  }, [createBranch, allEquipment]);

  // QR Scanner
  const startQRScanner = async () => {
    try {
      setQrScannerOpen(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const html5QrCode = new Html5Qrcode("qr-reader-ekipman-servis");
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            let equipmentId: string | null = null;
            if (decodedText.includes('/ekipman/')) {
              equipmentId = decodedText.split('/ekipman/')[1];
            } else if (decodedText.includes('/equipment/')) {
              equipmentId = decodedText.split('/equipment/')[1];
            }

            if (equipmentId && !isNaN(parseInt(equipmentId))) {
              const equipment = allEquipment?.find(e => e.id === parseInt(equipmentId));
              if (equipment) {
                setCreateEquipment(equipment);
                toast({
                  title: 'Başarılı',
                  description: `${equipment.equipmentType} seçildi`,
                });
                await html5QrCode.stop();
                setQrScannerOpen(false);
              } else {
                toast({
                  title: 'Hata',
                  description: 'Ekipman bulunamadı',
                  variant: 'destructive',
                });
              }
            }
          } catch (error) {
          }
        },
        () => {}
      );
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Kamera başlatılamadı',
        variant: 'destructive',
      });
      setQrScannerOpen(false);
    }
  };

  const stopQRScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (error) {
      }
    }
    setQrScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, photoNum: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (photoNum === 1) {
        setPhoto1Preview(base64);
        setPhoto1File(file);
      } else {
        setPhoto2Preview(base64);
        setPhoto2File(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createEquipment || !createBranch) {
        throw new Error('Ekipman ve şube seçimi zorunludur');
      }

      if (createType === 'fault') {
        if (!faultDescription) throw new Error('Arıza açıklaması zorunludur');
        await apiRequest('POST', '/api/faults', {
          equipmentId: createEquipment.id,
          equipmentName: createEquipment.equipmentType,
          description: faultDescription,
          priority: 'orta',
          severity: faultSeverity,
          status: 'acik',
          branchId: parseInt(createBranch),
          reportedById: 'current-user',
        });
      } else {
        if (!serviceProvider) throw new Error('Servis sağlayıcı zorunludur');
        const response = await apiRequest('POST', '/api/service-requests/', {
          branchId: parseInt(createBranch),
          equipmentId: createEquipment.id,
          equipmentName: createEquipment.equipmentType,
          equipmentType: createEquipment.equipmentType,
          priority,
          serviceProvider,
          notes,
          status: 'talep_edildi',
        });
        const data = await response.json();
        
        // Helper function to convert File to base64 and upload
        const uploadPhoto = async (file: File, photoNumber: number, requestId: number): Promise<void> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const base64 = (event.target?.result as string).split(',')[1];
                await apiRequest('POST', `/api/service-requests/${requestId}/upload-photo`, {
                  photoData: base64,
                  photoNumber,
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = () => reject(new Error('Fotoğraf okunamadı'));
            reader.readAsDataURL(file);
          });
        };
        
        // Upload photos if provided - await all uploads before continuing
        if (data && data.id && (photo1File || photo2File)) {
          const uploadPromises: Promise<void>[] = [];
          if (photo1File) {
            uploadPromises.push(uploadPhoto(photo1File, 1, data.id));
          }
          if (photo2File) {
            uploadPromises.push(uploadPhoto(photo2File, 2, data.id));
          }
          await Promise.all(uploadPromises);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faults'] });
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      
      const isPriorityCritical = createType === 'service' && (priority === 'yüksek' || priority === 'kritik');
      
      toast({
        title: 'Başarılı',
        description: isPriorityCritical 
          ? `${priority === 'kritik' ? 'KRİTİK' : 'Yüksek Öncelikli'} Servis Talebi oluşturuldu - HQ personeli bilgilendirildi`
          : createType === 'fault' ? 'Arıza raporu oluşturuldu' : 'Servis talebi oluşturuldu',
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error.message || 'İşlem başarısız',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCreateBranch('');
    setCreateEquipment(null);
    setCreateType('fault');
    setFaultDescription('');
    setFaultSeverity('medium');
    setAiDiagnosis(null);
    setServiceProvider('');
    setPriority('orta');
    setNotes('');
    setPhoto1Preview('');
    setPhoto2Preview('');
    setPhoto1File(null);
    setPhoto2File(null);
  };

  const handleGetAiDiagnosis = async () => {
    if (!createEquipment || !faultDescription) {
      toast({
        title: 'Hata',
        description: 'Ekipman ve arıza açıklaması seçiniz',
        variant: 'destructive',
      });
      return;
    }

    setLoadingAiDiagnosis(true);
    try {
      const response = await apiRequest('POST', '/api/faults/ai-diagnose', {
        equipmentType: createEquipment.equipmentType,
        faultDescription,
      });
      const data = await response.json();
      setAiDiagnosis(data as AIDiagnosis);
      toast({
        title: 'Başarılı',
        description: 'AI arıza analizi tamamlandı',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: (error instanceof Error ? error.message : 'AI analiz başarısız'),
        variant: 'destructive',
      });
    } finally {
      setLoadingAiDiagnosis(false);
    }
  };

  const stats = useMemo(() => ({
    total: unifiedRequests.length,
    faults: unifiedRequests.filter(r => r.type === 'fault').length,
    services: unifiedRequests.filter(r => r.type === 'service').length,
  }), [unifiedRequests]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ekipman Servis Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Arıza raporları ve servis talepleri birleştirilmiş görünüm</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-new">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Rapor / Talep
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-primary/10 dark:bg-primary/5/20 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-destructive/10 dark:bg-destructive/5/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground">Arıza</p>
              <p className="text-lg font-bold">{stats.faults}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-success/10 dark:bg-success/10 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-success" />
              </div>
              <p className="text-xs text-muted-foreground">Servis</p>
              <p className="text-lg font-bold">{stats.services}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <MobileFilterCollapse activeFilterCount={(filterBranch !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0)} testId="ekipman-servis-filter">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtreler
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="w-full space-y-1 md:space-y-1">
              <Label className="text-xs">Şube</Label>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger data-testid="select-filter-branch">
                  <SelectValue placeholder="Tüm şubeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1 md:space-y-1">
              <Label className="text-xs">Tip</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger data-testid="select-filter-type">
                  <SelectValue placeholder="Tüm tipler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="fault">Arıza Raporları</SelectItem>
                  <SelectItem value="service">Servis Talepleri</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      </MobileFilterCollapse>

      {/* List */}
      <div className="w-full space-y-2 sm:space-y-3">
        {unifiedRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Henüz servis kaydı bulunmuyor
            </CardContent>
          </Card>
        ) : (
          unifiedRequests.map(req => (
            <Card key={`${req.type}-${req.id}`} className="hover-elevate cursor-pointer" onClick={() => {
              setSelectedRequest(req);
              setDetailsDialogOpen(true);
            }} data-testid={`card-request-${req.type}-${req.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{req.equipmentType}</CardTitle>
                    <CardDescription>{req.equipmentName} • {req.branchName || `Şube #${req.branchId}`}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={req.type === 'fault' ? 'outline' : 'default'} className="flex items-center gap-1">
                      {req.type === 'fault' ? <><AlertTriangle className="h-3 w-3" /> Arıza</> : <><ClipboardList className="h-3 w-3" /> Talep</>}
                    </Badge>
                    {req.type === 'fault' && (
                      <Badge className={req.faultStatus === 'acik' ? 'bg-destructive/10 text-destructive dark:bg-destructive/5 dark:text-destructive' : 'bg-success/10 text-success dark:bg-success/5 dark:text-success'}>
                        {FAULT_STATUS_LABELS[req.faultStatus as keyof typeof FAULT_STATUS_LABELS]}
                      </Badge>
                    )}
                    {req.type === 'service' && req.priority && (
                      <Badge className={req.priority === 'kritik' ? 'bg-destructive/10 text-destructive dark:bg-destructive/5 dark:text-destructive' : 'bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary'}>
                        {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {req.type === 'fault' ? (
                    <>
                      <p>{req.faultDescription}</p>
                      <p className="mt-2">Ciddiyet: {req.faultSeverity}</p>
                    </>
                  ) : (
                    <>
                      <p>Technician: {req.serviceProvider}</p>
                      {req.notes && <p className="mt-1">Not: {req.notes}</p>}
                    </>
                  )}
                  <p className="mt-2">{format(parseISO(req.createdAt), 'd MMM yyyy, HH:mm', { locale: tr })}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Ekipman Raporu Oluştur</DialogTitle>
            <DialogDescription>
              Arıza raporu veya servis talebi oluşturun
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Branch Selection */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Label htmlFor="create-branch">Şube *</Label>
              <Select value={createBranch} onValueChange={(val) => {
                setCreateBranch(val);
                setCreateEquipment(null);
              }}>
                <SelectTrigger id="create-branch" data-testid="select-create-branch">
                  <SelectValue placeholder="Şube seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment Selection */}
            {createBranch && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <Label>Ekipman Seçimi *</Label>
                {qrScannerOpen ? (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div id="qr-reader-ekipman-servis" style={{ minHeight: '300px' }} className="rounded-lg border-2 border-primary/30" />
                    <Button onClick={stopQRScanner} variant="outline" className="w-full">
                      <X className="w-4 h-4 mr-2" />
                      İptal
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {branchEquipment.map((eq) => (
                        <button
                          key={eq.id}
                          onClick={() => setCreateEquipment(eq)}
                          className={`p-3 rounded-lg border-2 text-left hover-elevate transition-all ${
                            createEquipment?.id === eq.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                          data-testid={`button-equipment-${eq.id}`}
                        >
                          <div className="font-medium text-sm">{eq.equipmentType}</div>
                          <div className="text-xs text-muted-foreground">Seri: {eq.serialNumber || 'N/A'}</div>
                        </button>
                      ))}
                    </div>
                    {branchEquipment.length === 0 && (
                      <div className="text-center text-muted-foreground py-3">Bu şube için ekipman bulunmuyor</div>
                    )}
                    <Button onClick={startQRScanner} variant="outline" className="w-full" data-testid="button-scan-qr">
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Kodla Seç
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Type Selection */}
            {createEquipment && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <Label>Rapor Tipi *</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => setCreateType('fault')}
                    className={`p-3 rounded-lg border-2 text-center hover-elevate transition-all ${
                      createType === 'fault'
                        ? 'border-destructive bg-destructive/10 dark:bg-destructive/5/20'
                        : 'border-border'
                    }`}
                    data-testid="button-type-fault"
                  >
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Arıza Raporu</div>
                    <div className="text-xs text-muted-foreground">Sorunu bildirin</div>
                  </button>
                  <button
                    onClick={() => setCreateType('service')}
                    className={`p-3 rounded-lg border-2 text-center hover-elevate transition-all ${
                      createType === 'service'
                        ? 'border-primary bg-primary/10 dark:bg-primary/5'
                        : 'border-border'
                    }`}
                    data-testid="button-type-service"
                  >
                    <Wrench className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Servis Talebi</div>
                    <div className="text-xs text-muted-foreground">Teknik yardım isteyin</div>
                  </button>
                </div>
              </div>
            )}

            {/* Fault Fields */}
            {createType === 'fault' && (
              <div className="grid grid-cols-1 gap-2 sm:gap-3 border-t pt-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Arıza Açıklaması *</Label>
                  <Textarea
                    placeholder="Sorunu detaylı açıklayın..."
                    value={faultDescription}
                    onChange={(e) => setFaultDescription(e.target.value)}
                    rows={4}
                  />
                  {createEquipment && faultDescription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGetAiDiagnosis}
                      disabled={loadingAiDiagnosis}
                      className="w-full mt-2"
                      data-testid="button-ai-diagnose"
                    >
                      {loadingAiDiagnosis ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      AI Analiz Yap
                    </Button>
                  )}
                </div>

                {aiDiagnosis && (
                  <div className="bg-primary/10 dark:bg-primary/5 border border-primary/30 dark:border-primary/40 rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <p className="text-sm font-medium text-primary dark:text-primary">AI Tanısı</p>
                      <p className="text-sm text-primary dark:text-primary mt-1">{aiDiagnosis.diagnosis}</p>
                    </div>
                    {(aiDiagnosis.troubleshootingSteps?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-sm font-medium text-primary dark:text-primary">Sorun Giderme Adımları</p>
                        <ul className="text-sm text-primary dark:text-primary mt-1 list-disc list-inside space-y-1">
                          {aiDiagnosis.troubleshootingSteps?.map((step: string, idx: number) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <div className="bg-white dark:bg-primary/5 p-2 rounded">
                        <p className="text-muted-foreground dark:text-gray-300">Ciddiyet</p>
                        <p className="font-semibold text-primary dark:text-primary">{aiDiagnosis.estimatedSeverity}</p>
                      </div>
                      <div className="bg-white dark:bg-primary/5 p-2 rounded">
                        <p className="text-muted-foreground dark:text-gray-300">Süre</p>
                        <p className="font-semibold text-primary dark:text-primary">{aiDiagnosis.estimatedRepairTime}</p>
                      </div>
                      <div className="bg-white dark:bg-primary/5 p-2 rounded">
                        <p className="text-muted-foreground dark:text-gray-300">Eylem</p>
                        <p className="font-semibold text-primary dark:text-primary truncate">{aiDiagnosis.recommendedAction?.substring(0, 10)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Ciddiyet Seviyesi</Label>
                  <Select value={faultSeverity} onValueChange={setFaultSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="critical">Kritik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Service Fields */}
            {createType === 'service' && (
              <div className="grid grid-cols-1 gap-2 sm:gap-3 border-t pt-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Servis Sağlayıcı *</Label>
                  <Input
                    placeholder="Technician veya şirket adı"
                    value={serviceProvider}
                    onChange={(e) => setServiceProvider(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Öncelik</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className={
                      priority === 'kritik' ? 'border-destructive bg-destructive/10 dark:bg-destructive/5/20' :
                      priority === 'yüksek' ? 'border-orange-500 bg-warning/10 dark:bg-warning/5/20' : ''
                    }>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="düşük">Düşük</SelectItem>
                      <SelectItem value="orta">Orta</SelectItem>
                      <SelectItem value="yüksek">Yüksek</SelectItem>
                      <SelectItem value="kritik">Kritik</SelectItem>
                    </SelectContent>
                  </Select>
                  {(priority === 'yüksek' || priority === 'kritik') && (
                    <div className={`text-xs p-2 rounded flex items-center gap-1 ${
                      priority === 'kritik' 
                        ? 'bg-destructive/10 dark:bg-destructive/5/30 text-destructive dark:text-destructive' 
                        : 'bg-warning/10 dark:bg-warning/5/30 text-warning dark:text-warning'
                    }`}>
                      <Info className="h-3 w-3" />
                      HQ personeli otomatik olarak bilgilendirilecek
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Notlar</Label>
                  <Textarea
                    placeholder="Ek bilgiler..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:gap-3 border-t pt-4">
                  <Label>Fotoğraflar (İsteğe Bağlı)</Label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      {photo1Preview ? (
                        <img src={photo1Preview} alt="Foto 1" className="w-full aspect-square object-cover rounded-lg border" loading="lazy" />
                      ) : (
                        <div className="aspect-square bg-secondary dark:bg-gray-800 rounded-lg border-2 border-dashed flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => document.getElementById('photo1-input')?.click()}
                        data-testid="button-upload-photo-1"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf 1
                      </Button>
                      <input
                        id="photo1-input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handlePhotoUpload(e, 1)}
                      />
                    </div>
                    <div>
                      {photo2Preview ? (
                        <img src={photo2Preview} alt="Foto 2" className="w-full aspect-square object-cover rounded-lg border" loading="lazy" />
                      ) : (
                        <div className="aspect-square bg-secondary dark:bg-gray-800 rounded-lg border-2 border-dashed flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => document.getElementById('photo2-input')?.click()}
                        data-testid="button-upload-photo-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf 2
                      </Button>
                      <input
                        id="photo2-input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handlePhotoUpload(e, 2)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation?.isPending || !createEquipment || !createBranch}
              data-testid="button-submit-create"
            >
              {createMutation?.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest?.type === 'fault' ? (
                <><AlertTriangle className="w-5 h-5" /> Arıza Raporu Detayları</>
              ) : (
                <><Wrench className="w-5 h-5" /> Servis Talebi Detayları</>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Ekipman</p>
                  <p className="font-medium">{selectedRequest.equipmentType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Şube</p>
                  <p className="font-medium">{selectedRequest.branchName || `Şube #${selectedRequest.branchId}`}</p>
                </div>
              </div>

              {selectedRequest.type === 'fault' ? (
                <>
                  <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <p className="text-sm text-muted-foreground">Arıza Açıklaması</p>
                    <p>{selectedRequest.faultDescription}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Durum</p>
                      <Badge>{FAULT_STATUS_LABELS[selectedRequest.faultStatus as keyof typeof FAULT_STATUS_LABELS]}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ciddiyet</p>
                      <p className="font-medium">{selectedRequest.faultSeverity}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <p className="text-sm text-muted-foreground">Technician</p>
                    <p className="font-medium">{selectedRequest.serviceProvider}</p>
                  </div>
                  {selectedRequest.notes && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <p className="text-sm text-muted-foreground">Notlar</p>
                      <p>{selectedRequest.notes}</p>
                    </div>
                  )}
                  {(selectedRequest.photo1Url || selectedRequest.photo2Url) && (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <p className="text-sm text-muted-foreground">Fotoğraflar</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRequest.photo1Url && <img src={selectedRequest.photo1Url} alt="Foto 1" className="w-full h-32 object-cover rounded-lg" loading="lazy" />}
                        {selectedRequest.photo2Url && <img src={selectedRequest.photo2Url} alt="Foto 2" className="w-full h-32 object-cover rounded-lg" loading="lazy" />}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">Oluşturan: {selectedRequest.createdByUsername} • {format(parseISO(selectedRequest.createdAt), 'd MMM yyyy, HH:mm', { locale: tr })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
