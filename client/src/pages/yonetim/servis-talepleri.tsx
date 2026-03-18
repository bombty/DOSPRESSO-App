import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Filter, X, MapPin, Wrench, Calendar, AlertCircle, CheckCircle2, Clock, History, User, Upload, Image as ImageIcon, Download, Plus, QrCode, Camera, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch } from '@shared/schema';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import machine1 from '@assets/stock_images/coffee_machine_equip_c86e5250.jpg';
import machine2 from '@assets/stock_images/coffee_machine_equip_8e9d0f33.jpg';
import machine3 from '@assets/stock_images/coffee_machine_equip_c7ddb01a.jpg';
import machine4 from '@assets/stock_images/coffee_machine_equip_29a816b5.jpg';
import { Html5Qrcode } from 'html5-qrcode';
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";

const STATUS_LABELS = {
  'talep_edildi': 'Talep Edildi',
  'planlandi': 'Planlandı',
  'devam_ediyor': 'Devam Ediyor',
  'tamamlandi': 'Tamamlandı',
  'iptal_edildi': 'İptal Edildi',
} as const;

const STATUS_VARIANTS = {
  'talep_edildi': 'bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary',
  'planlandi': 'bg-secondary/10 text-secondary dark:bg-secondary/5 dark:text-secondary',
  'devam_ediyor': 'bg-warning/10 text-warning dark:bg-warning/5 dark:text-warning',
  'tamamlandi': 'bg-success/10 text-success dark:bg-success/5 dark:text-success',
  'iptal_edildi': 'bg-secondary text-foreground dark:bg-gray-900 dark:text-gray-200',
} as const;

const PRIORITY_VARIANTS = {
  'düşük': 'bg-primary/10 border-primary/30 dark:bg-primary/5 dark:border-primary/40',
  'orta': 'bg-warning/10 border-warning/30 dark:bg-warning/5 dark:border-warning/40',
  'yüksek': 'bg-warning/10 border-warning/30 dark:bg-warning/5/20 dark:border-warning/40',
  'kritik': 'bg-destructive/10 border-destructive/30 dark:bg-destructive/5/20 dark:border-destructive/40',
} as const;

const PRIORITY_COLORS = {
  'düşük': 'text-primary dark:text-primary',
  'orta': 'text-warning dark:text-warning',
  'yüksek': 'text-warning dark:text-warning',
  'kritik': 'text-destructive dark:text-destructive',
} as const;

interface ServiceRequestWithEquipment {
  id: number;
  equipmentId: number;
  equipmentName: string;
  equipmentType: string;
  branchId: number;
  branchName?: string;
  status: keyof typeof STATUS_LABELS;
  priority: 'düşük' | 'orta' | 'yüksek' | 'kritik';
  serviceProvider: string;
  scheduledDate?: string;
  completedDate?: string;
  estimatedCost?: string;
  actualCost?: string;
  notes?: string;
  photo1Url?: string;
  photo2Url?: string;
  createdAt: string;
  createdById: string;
  createdByUsername?: string;
  updatedById?: string;
  updatedByUsername?: string;
  updatedAt?: string;
  timeline?: Array<{
    id: string;
    timestamp: string;
    status: string;
    actorId: string;
    notes?: string;
    meta?: Record<string, any>;
  }>;
}

const MACHINE_TEMPLATES = [
  { id: 'espresso', name: 'Espresso Makinesi', type: 'Espresso Machine', image: machine1 },
  { id: 'grinder', name: 'Kahve Değirmeni', type: 'Grinder', image: machine2 },
  { id: 'cappuccino', name: 'Cappuccino Makinesi', type: 'Cappuccino Machine', image: machine3 },
  { id: 'water_filter', name: 'Su Filtresi Sistemi', type: 'Water Filter System', image: machine4 },
];

export default function ServiceRequestsManagement() {
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithEquipment | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [lastContactDate, setLastContactDate] = useState<string>('');
  const [serviceUpdate, setServiceUpdate] = useState<string>('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>('');
  const [actualCostInput, setActualCostInput] = useState<string>('');
  const [photo1Preview, setPhoto1Preview] = useState<string>('');
  const [photo2Preview, setPhoto2Preview] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [createBranch, setCreateBranch] = useState<string>('');
  const [createPriority, setCreatePriority] = useState<string>('orta');
  const [createServiceProvider, setCreateServiceProvider] = useState<string>('');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [createPhoto1Preview, setCreatePhoto1Preview] = useState<string>('');
  const [createPhoto2Preview, setCreatePhoto2Preview] = useState<string>('');
  const [createPhoto1File, setCreatePhoto1File] = useState<File | null>(null);
  const [createPhoto2File, setCreatePhoto2File] = useState<File | null>(null);
  const [uploadingCreatePhoto, setUploadingCreatePhoto] = useState<number | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<unknown>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const { data: branches = [], isError, refetch, isLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: allEquipment = [] } = useQuery<any[]>({
    queryKey: ['/api/equipment'],
  });

  const { data: serviceRequests = [], isLoading: requestsLoading } = useQuery<ServiceRequestWithEquipment[]>({
    queryKey: ['/api/service-requests', filterBranch !== 'all' ? parseInt(filterBranch) : undefined, filterStatus !== 'all' ? filterStatus : undefined],
  });

  const branchEquipment = selectedEquipment ? [] : (createBranch ? allEquipment.filter((eq) => eq.branchId === parseInt(createBranch)) : []);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, details }: { requestId: number; status: string; details?: any }) => {
      return await apiRequest('PATCH', `/api/equipment/service-requests/${requestId}/status`, {
        newStatus: status,
        lastContactDate: details?.lastContactDate,
        serviceUpdate: details?.serviceUpdate,
        estimatedCompletionDate: details?.estimatedCompletionDate,
        actualCost: details?.actualCost,
        notes: details?.serviceUpdate || `Durum güncellendi: ${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      setStatusDialogOpen(false);
      setSelectedRequest(null);
      toast({
        title: 'Başarılı',
        description: 'Servis talebi durumu güncellendi',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error.message || 'Durum güncellenemedi',
        variant: 'destructive',
      });
    },
  });

  const uploadCreatePhotos = async (requestId: number) => {
    if (!createPhoto1File && !createPhoto2File) return;

    try {
      if (createPhoto1File) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          await apiRequest('POST', `/api/service-requests/${requestId}/upload-photo`, {
            photoData: base64,
            photoNumber: 1,
          });
        };
        reader.readAsDataURL(createPhoto1File);
      }

      if (createPhoto2File) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          await apiRequest('POST', `/api/service-requests/${requestId}/upload-photo`, {
            photoData: base64,
            photoNumber: 2,
          });
        };
        reader.readAsDataURL(createPhoto2File);
      }
    } catch (error) {
    }
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest('POST', '/api/service-requests/', data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      setCreateDialogOpen(false);
      const newRequestId = response?.id;
      if (newRequestId && (createPhoto1File || createPhoto2File)) {
        uploadCreatePhotos(newRequestId);
      }
      setSelectedEquipment(null);
      setCreateBranch('');
      setCreatePriority('orta');
      setCreateServiceProvider('');
      setCreateNotes('');
      setCreatePhoto1Preview('');
      setCreatePhoto2Preview('');
      setCreatePhoto1File(null);
      setCreatePhoto2File(null);
      toast({
        title: 'Başarılı',
        description: 'Servis talebi oluşturuldu' + (createPhoto1File || createPhoto2File ? ' ve fotoğraflar yükleniyor' : ''),
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: error.message || 'Talep oluşturulamadı',
        variant: 'destructive',
      });
    },
  });

  const handleCreatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, photoNumber: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (photoNumber === 1) {
        setCreatePhoto1Preview(base64);
        setCreatePhoto1File(file);
      } else {
        setCreatePhoto2Preview(base64);
        setCreatePhoto2File(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const startQRScanner = async () => {
    try {
      setQrScannerOpen(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const html5QrCode = new Html5Qrcode("qr-reader-service");
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
            
            // Parse equipment ID from QR code (supports /ekipman/123 or /equipment/123)
            if (decodedText.includes('/ekipman/')) {
              equipmentId = decodedText.split('/ekipman/')[1];
            } else if (decodedText.includes('/equipment/')) {
              equipmentId = decodedText.split('/equipment/')[1];
            }

            if (equipmentId && !isNaN(parseInt(equipmentId))) {
              // Find and select the scanned equipment
              const equipment = allEquipment?.find(e => e.id === parseInt(equipmentId));
              if (equipment) {
                setSelectedEquipment(equipment);
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
            } else {
              toast({
                title: 'Hata',
                description: 'Geçersiz ekipman QR kodu',
                variant: 'destructive',
              });
            }
          } catch (error) {
          }
        },
        () => {} // Error callback (no-op)
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

  const handleCreateRequest = async () => {
    if (!selectedEquipment || !createBranch || !createServiceProvider) {
      toast({
        title: 'Hata',
        description: 'Zorunlu alanları doldurunuz',
        variant: 'destructive',
      });
      return;
    }

    setCreatingRequest(true);
    try {
      await createRequestMutation.mutateAsync({
        branchId: parseInt(createBranch),
        equipmentId: selectedEquipment.id,
        equipmentName: selectedEquipment.equipmentType,
        equipmentType: selectedEquipment.equipmentType,
        priority: createPriority,
        serviceProvider: createServiceProvider,
        notes: createNotes,
        status: 'talep_edildi',
      });
    } finally {
      setCreatingRequest(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return serviceRequests.filter(request => {
      if (filterBranch !== 'all' && request.branchId !== parseInt(filterBranch)) return false;
      if (filterStatus !== 'all' && request.status !== filterStatus) return false;
      return true;
    });
  }, [serviceRequests, filterBranch, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredRequests.length,
    open: filteredRequests.filter(r => ['talep_edildi', 'planlandi', 'devam_ediyor'].includes(r.status)).length,
    completed: filteredRequests.filter(r => r.status === 'tamamlandi').length,
    cancelled: filteredRequests.filter(r => r.status === 'iptal_edildi').length,
    criticalPriority: filteredRequests.filter(r => r.priority === 'kritik').length,
  }), [filteredRequests]);

  const handleUpdateStatus = () => {
    if (!selectedRequest || !newStatus) return;
    updateStatusMutation.mutate({ 
      requestId: selectedRequest.id, 
      status: newStatus,
      details: {
        lastContactDate,
        serviceUpdate,
        estimatedCompletionDate,
        actualCost: actualCostInput ? parseFloat(actualCostInput) : undefined,
      }
    });
  };

  const handleStatusDialogOpen = (request: ServiceRequestWithEquipment) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setLastContactDate('');
    setServiceUpdate('');
    setEstimatedCompletionDate('');
    setActualCostInput('');
    setPhoto1Preview(request.photo1Url || '');
    setPhoto2Preview(request.photo2Url || '');
    setStatusDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoNumber: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRequest) return;

    setUploadingPhoto(photoNumber);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        const response = await apiRequest('POST', `/api/service-requests/${selectedRequest.id}/upload-photo`, {
          photoData: base64,
          photoNumber,
        }) as unknown as { photoUrl: string; photoNumber: number; success: boolean };

        if (response.photoUrl) {
          if (photoNumber === 1) {
            setPhoto1Preview(response.photoUrl);
          } else {
            setPhoto2Preview(response.photoUrl);
          }
          toast({
            title: "Başarılı",
            description: `Fotoğraf ${photoNumber} yüklendi`,
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Fotoğraf yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleEquipmentClick = (request: ServiceRequestWithEquipment) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const activeFiltersCount = (filterBranch !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);

  const handleExportCSV = () => {
    const headers = ['ID', 'Cihaz Adı', 'Cihaz Tipi', 'Şube', 'Durum', 'Öncelik', 'Servis Sağlayıcı', 'Tahmini Maliyet', 'Gerçek Maliyet', 'Oluşturulma Tarihi'];
    const rows = filteredRequests.map(req => [
      req.id,
      req.equipmentName,
      req.equipmentType,
      req.branchName || `Şube #${req.branchId}`,
      STATUS_LABELS[req.status],
      req.priority ? req.priority.charAt(0).toUpperCase() + req.priority.slice(1) : '',
      req.serviceProvider,
      req.estimatedCost || '',
      req.actualCost || '',
      format(new Date(req.createdAt), 'd MMM yyyy, HH:mm', { locale: tr }),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `servis-talepleri-${format(new Date(), 'dd-MM-yyyy-HHmm', { locale: tr })}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto p-3 lg:p-6 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold" data-testid="text-page-title">Servis Talepleri</h1>
          <p className="text-muted-foreground mt-1">Ekipman bakım ve servis taleplerini yönetin</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" data-testid="button-create-service-request">
          <Plus className="w-4 h-4" />
          Yeni Talep
        </Button>
      </div>

      {/* Stats Cards */}
      <CompactKPIStrip
        items={[
          { label: "Toplam Talep", value: stats.total, testId: "kpi-total" },
          { label: "Açık Talep", value: stats.open, color: "warning", testId: "kpi-open" },
          { label: "Tamamlanan", value: stats.completed, color: "success", testId: "kpi-completed" },
          { label: "İptal Edilen", value: stats.cancelled, color: "muted", testId: "kpi-cancelled" },
          { label: "Kritik Öncelik", value: stats.criticalPriority, color: "danger", testId: "kpi-critical" },
        ]}
        desktopColumns={5}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>Filtreler</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2" data-testid="badge-active-filters">
                  {activeFiltersCount} aktif filtre
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {filteredRequests.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  data-testid="button-export-csv"
                  className="gap-1"
                >
                  <Download className="w-4 h-4" />
                  CSV İndir
                </Button>
              )}
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterBranch('all');
                    setFilterStatus('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4 mr-1" />
                  Temizle
                </Button>
              )}
            </div>
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
              <Label className="text-xs">Durum</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="Tüm durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 col-span-full">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Henüz servis talebi bulunmuyor
          </CardContent>
        </Card>
      ) : (
        <div className="w-full space-y-2 sm:space-y-3">
          {filteredRequests.map(request => (
            <Card key={request.id} className="hover-elevate border-l-4" style={{ borderLeftColor: !request.priority ? '#3b82f6' : request.priority === 'kritik' ? '#ef4444' : request.priority === 'yüksek' ? '#f97316' : request.priority === 'orta' ? '#eab308' : '#3b82f6' }} data-testid={`card-service-request-${request.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 cursor-pointer" onClick={() => handleEquipmentClick(request)}>
                    <CardTitle className="text-lg hover:text-primary transition-colors" data-testid={`text-equipment-name-${request.id}`}>
                      {request.equipmentName}
                    </CardTitle>
                    <CardDescription>
                      {request.equipmentType} • {request.serviceProvider}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className={STATUS_VARIANTS[request.status]} data-testid={`badge-status-${request.id}`}>
                      {STATUS_LABELS[request.status]}
                    </Badge>
                    {request.priority && (
                      <Badge className={`${PRIORITY_COLORS[request.priority]} border ${PRIORITY_VARIANTS[request.priority]}`}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full space-y-2 sm:space-y-3">
                  {/* Location and dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{request.branchName || `Şube #${request.branchId}`}</span>
                    </div>
                    {request.scheduledDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Planlanan: {format(new Date(request.scheduledDate), 'd MMM yyyy', { locale: tr })}</span>
                      </div>
                    )}
                    {request.estimatedCost && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wrench className="w-4 h-4" />
                        <span>Tahmini: ₺{request.estimatedCost}</span>
                      </div>
                    )}
                    {request.completedDate && (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tamamlandı: {format(new Date(request.completedDate), 'd MMM yyyy', { locale: tr })}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes preview */}
                  {request.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notlar:</span>
                      <p className="mt-1 text-sm line-clamp-2">{request.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Oluşturulma: {format(new Date(request.createdAt), 'd MMM yyyy, HH:mm', { locale: tr })}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEquipmentClick(request)}
                        data-testid={`button-details-${request.id}`}
                      >
                        Detaylar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusDialogOpen(request)}
                        data-testid={`button-update-status-${request.id}`}
                      >
                        Durumu Güncelle
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Equipment Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Cihaz Detayları
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.equipmentName} - Servis Talebi #{selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Equipment Info */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="w-full space-y-1 md:space-y-1">
                  <p className="text-sm text-muted-foreground">Cihaz Adı</p>
                  <p className="font-medium">{selectedRequest.equipmentName}</p>
                </div>
                <div className="w-full space-y-1 md:space-y-1">
                  <p className="text-sm text-muted-foreground">Cihaz Tipi</p>
                  <p className="font-medium">{selectedRequest.equipmentType}</p>
                </div>
                <div className="w-full space-y-1 md:space-y-1">
                  <p className="text-sm text-muted-foreground">Şube</p>
                  <p className="font-medium">{selectedRequest.branchName || `Şube #${selectedRequest.branchId}`}</p>
                </div>
                <div className="w-full space-y-1 md:space-y-1">
                  <p className="text-sm text-muted-foreground">Cihaz ID</p>
                  <p className="font-medium">{selectedRequest.equipmentId}</p>
                </div>
              </div>

              {/* Service Request Info */}
              <div className="border-t pt-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                <h3 className="font-semibold">Servis Talebi Bilgileri</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="w-full space-y-1 md:space-y-1">
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <Badge className={STATUS_VARIANTS[selectedRequest.status]}>
                      {STATUS_LABELS[selectedRequest.status]}
                    </Badge>
                  </div>
                  <div className="w-full space-y-1 md:space-y-1">
                    <p className="text-sm text-muted-foreground">Öncelik</p>
                    {selectedRequest.priority ? (
                      <Badge className={`${PRIORITY_COLORS[selectedRequest.priority]} border ${PRIORITY_VARIANTS[selectedRequest.priority]}`}>
                        {selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                  <div className="w-full space-y-1 md:space-y-1">
                    <p className="text-sm text-muted-foreground">Servis Sağlayıcı</p>
                    <p className="font-medium">{selectedRequest.serviceProvider}</p>
                  </div>
                  <div className="w-full space-y-1 md:space-y-1">
                    <p className="text-sm text-muted-foreground">Talep Tarihi</p>
                    <p className="font-medium">{format(new Date(selectedRequest.createdAt), 'd MMM yyyy, HH:mm', { locale: tr })}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              {(selectedRequest.scheduledDate || selectedRequest.completedDate) && (
                <div className="border-t pt-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                  <h3 className="font-semibold">Tarihler</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {selectedRequest.scheduledDate && (
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-sm text-muted-foreground">Planlanan Tarih</p>
                        <p className="font-medium">{format(new Date(selectedRequest.scheduledDate), 'd MMM yyyy', { locale: tr })}</p>
                      </div>
                    )}
                    {selectedRequest.completedDate && (
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-sm text-muted-foreground">Tamamlanma Tarihi</p>
                        <p className="font-medium text-success">{format(new Date(selectedRequest.completedDate), 'd MMM yyyy', { locale: tr })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Costs */}
              {(selectedRequest.estimatedCost || selectedRequest.actualCost) && (
                <div className="border-t pt-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                  <h3 className="font-semibold">Maliyetler</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {selectedRequest.estimatedCost && (
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-sm text-muted-foreground">Tahmini Maliyet</p>
                        <p className="font-medium">₺{selectedRequest.estimatedCost}</p>
                      </div>
                    )}
                    {selectedRequest.actualCost && (
                      <div className="w-full space-y-1 md:space-y-1">
                        <p className="text-sm text-muted-foreground">Gerçek Maliyet</p>
                        <p className="font-medium">₺{selectedRequest.actualCost}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="border-t pt-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                  <h3 className="font-semibold">Notlar</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Timeline */}
              {selectedRequest.timeline && selectedRequest.timeline.length > 0 && (
                <div className="border-t pt-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Tarih
                  </h3>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {selectedRequest.timeline.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-2 sm:gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-primary/100 rounded-full mt-2"></div>
                          {idx < selectedRequest.timeline!.length - 1 && (
                            <div className="w-0.5 h-8 bg-primary/20 mt-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {STATUS_LABELS[entry.status as keyof typeof STATUS_LABELS] || entry.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'd MMM yyyy, HH:mm', { locale: tr })}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Servis Talebi Güncelle
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.equipmentName} - Detaylı servis durumu güncellemesi
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 sm:gap-3 py-3">
            {/* Status */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Label>Yeni Durum *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Last Contact Date */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Label>Son Görüşme Tarihi</Label>
              <Input 
                type="datetime-local" 
                value={lastContactDate}
                onChange={(e) => setLastContactDate(e.target.value)}
                data-testid="input-last-contact"
              />
              <p className="text-xs text-muted-foreground">Servis sağlayıcısı ile son iletişim zamanı</p>
            </div>

            {/* Service Status Update */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Label>Servis Durumu / Güncellemeler</Label>
              <Textarea
                placeholder="Teknikçinin çalışma durumu, bulduğu sorunlar, yapılan işlemler vs..."
                value={serviceUpdate}
                onChange={(e) => setServiceUpdate(e.target.value)}
                rows={4}
                data-testid="textarea-service-update"
              />
              <p className="text-xs text-muted-foreground">Servis sağlayıcının güncel durumu ve yapılan işlemler</p>
            </div>

            {/* Estimated Completion */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex flex-col gap-3 sm:gap-4">
                <Label>Tahmini Bitiş Tarihi</Label>
                <Input 
                  type="date" 
                  value={estimatedCompletionDate}
                  onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                  data-testid="input-estimated-completion"
                />
              </div>

              {/* Actual Cost */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <Label>Gerçek Maliyet (₺)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={actualCostInput}
                  onChange={(e) => setActualCostInput(e.target.value)}
                  data-testid="input-actual-cost"
                  step="0.01"
                />
              </div>
            </div>

            {/* Photo Uploads */}
            <div className="grid grid-cols-1 gap-2 sm:gap-3 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Kırık Parça Fotoğrafları
              </h3>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Photo 1 */}
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Fotoğraf 1</Label>
                  {photo1Preview && (
                    <img src={photo1Preview} alt="Photo 1" className="w-full h-32 object-cover rounded-md border" loading="lazy" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('photo1-input')?.click()}
                    disabled={uploadingPhoto === 1}
                    className="w-full"
                    data-testid="button-upload-photo-1"
                  >
                    {uploadingPhoto === 1 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf Seç
                      </>
                    )}
                  </Button>
                  <input
                    id="photo1-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 1)}
                  />
                </div>

                {/* Photo 2 */}
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Fotoğraf 2</Label>
                  {photo2Preview && (
                    <img src={photo2Preview} alt="Photo 2" className="w-full h-32 object-cover rounded-md border" loading="lazy" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('photo2-input')?.click()}
                    disabled={uploadingPhoto === 2}
                    className="w-full"
                    data-testid="button-upload-photo-2"
                  >
                    {uploadingPhoto === 2 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf Seç
                      </>
                    )}
                  </Button>
                  <input
                    id="photo2-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 2)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Fotoğraflar otomatik olarak sıkıştırılır ve kalitesi korunur</p>
            </div>

            {/* Info Box */}
            <div className="bg-primary/10 dark:bg-primary/5 border border-primary/30 dark:border-primary/40 rounded-md p-3">
              <p className="text-sm text-primary dark:text-primary">
                💡 <span className="font-medium">İpucu:</span> Durum "Devam Ediyor" olduğunda son görüşme ve güncellemeler kaydedilir. "Tamamlandı" olduğunda gerçek maliyet kaydedilir.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending || newStatus === selectedRequest?.status}
              data-testid="button-submit-status-update"
              className="gap-2"
            >
              {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Güncelle ve Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Service Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Yeni Servis Talebi Oluştur
            </DialogTitle>
            <DialogDescription>
              Cihaz seçimi yaparak yeni bir servis talebi oluşturun
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Step 1: Branch Selection */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Label htmlFor="create-branch" className="text-base font-semibold">Adım 1: Şube Seçimi *</Label>
              <Select value={createBranch} onValueChange={(val) => { setCreateBranch(val); setSelectedEquipment(null); }}>
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

            {/* Step 2: Equipment Selection */}
            {createBranch && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <Label className="text-base font-semibold">Adım 2: Cihaz Seçimi *</Label>
                {branchEquipment.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {branchEquipment.map((eq) => (
                      <button
                        key={eq.id}
                        onClick={() => setSelectedEquipment(eq)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left hover-elevate ${
                          selectedEquipment?.id === eq.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                        data-testid={`button-equipment-${eq.id}`}
                      >
                        <div className="font-medium">{eq.equipmentType}</div>
                        <div className="text-sm text-muted-foreground">Seri: {eq.serialNumber || 'N/A'}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-muted-foreground">Bu şube için cihaz bulunmuyor</div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="w-full space-y-2 sm:space-y-3">

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="create-priority">Öncelik</Label>
                  <Select value={createPriority} onValueChange={setCreatePriority}>
                    <SelectTrigger id="create-priority" data-testid="select-create-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="düşük">Düşük</SelectItem>
                      <SelectItem value="orta">Orta</SelectItem>
                      <SelectItem value="yüksek">Yüksek</SelectItem>
                      <SelectItem value="kritik">Kritik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <Label htmlFor="create-provider">Servis Sağlayıcı *</Label>
                <Input
                  id="create-provider"
                  placeholder="Örn: DOSPRESSO Technical Support"
                  value={createServiceProvider}
                  onChange={(e) => setCreateServiceProvider(e.target.value)}
                  data-testid="input-service-provider"
                />
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <Label htmlFor="create-notes">Notlar</Label>
                <Textarea
                  id="create-notes"
                  placeholder="Sorun açıklaması ve ek notlar..."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <Label className="text-base font-semibold">Fotoğraflar (İsteğe Bağlı)</Label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  {createPhoto1Preview ? (
                    <img src={createPhoto1Preview} alt="Fotoğraf 1" className="w-full aspect-square object-cover rounded-lg border" loading="lazy" />
                  ) : (
                    <div className="aspect-square bg-secondary dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fotoğraf 1</p>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => document.getElementById('create-photo1-input')?.click()}
                    disabled={uploadingCreatePhoto === 1}
                    data-testid="button-upload-create-photo-1"
                  >
                    {uploadingCreatePhoto === 1 ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf Seç
                      </>
                    )}
                  </Button>
                  <input
                    id="create-photo1-input"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleCreatePhotoUpload(e, 1)}
                  />
                </div>
                <div>
                  {createPhoto2Preview ? (
                    <img src={createPhoto2Preview} alt="Fotoğraf 2" className="w-full aspect-square object-cover rounded-lg border" loading="lazy" />
                  ) : (
                    <div className="aspect-square bg-secondary dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fotoğraf 2</p>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => document.getElementById('create-photo2-input')?.click()}
                    disabled={uploadingCreatePhoto === 2}
                    data-testid="button-upload-create-photo-2"
                  >
                    {uploadingCreatePhoto === 2 ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Fotoğraf Seç
                      </>
                    )}
                  </Button>
                  <input
                    id="create-photo2-input"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleCreatePhotoUpload(e, 2)}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Her fotoğraf otomatik olarak WebP formatında sıkıştırılır (1920x1080, %80 kalite)
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-primary/10 dark:bg-primary/5 border border-primary/30 dark:border-primary/40 rounded-md p-3">
              <p className="text-sm text-primary dark:text-primary">
                💡 <span className="font-medium">Bilgi:</span> Yeni talep "Talep Edildi" durumuyla oluşturulacak. Daha sonra fotoğraf ekleyebilir ve durumunu güncelleyebilirsiniz.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={creatingRequest || !selectedEquipment || !createBranch || !createServiceProvider}
              data-testid="button-submit-create-request"
              className="gap-2"
            >
              {creatingRequest && <Loader2 className="w-4 h-4 animate-spin" />}
              Talebi Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
