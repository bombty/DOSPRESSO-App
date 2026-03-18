import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Wrench, Calendar, Clock, Building2, Zap, History, CheckCircle2, Plus, X, ChevronRight, Search, Download, Smartphone } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { format, parseISO, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Branch, Equipment as EquipmentType, InsertEquipmentServiceRequest } from '@shared/schema';
import { insertEquipmentServiceRequestSchema } from '@shared/schema';
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";

interface ServiceRequest {
  id: number;
  equipmentId: number;
  status: string;
  priority?: string;
  serviceProvider?: string;
  notes?: string;
  createdAt: string;
  createdById?: string;
  photo1Url?: string;
  photo2Url?: string;
  lastUpdated?: string;
}

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  espresso: 'Espresso Makinesi',
  grinder: 'Kahve Değirmeni',
  cappuccino: 'Cappuccino Makinesi',
  water_filter: 'Su Filtresi Sistemi',
  kiosk: 'Kiosk Sistemi',
  tea: 'Çay Makinesi',
  ice: 'Buz Makinesi',
};

const STATUS_LABELS: Record<string, string> = {
  'talep_edildi': 'Talep Edildi',
  'planlandı': 'Planlandı',
  'devam_ediyor': 'Devam Ediyor',
  'tamamlandı': 'Tamamlandı',
  'iptal_edildi': 'İptal Edildi',
};

const STATUS_COLORS: Record<string, string> = {
  'talep_edildi': 'bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary',
  'planlandı': 'bg-secondary/10 text-secondary dark:bg-secondary/5 dark:text-secondary',
  'devam_ediyor': 'bg-warning/10 text-warning dark:bg-warning/5 dark:text-warning',
  'tamamlandı': 'bg-success/10 text-success dark:bg-success/5 dark:text-success',
  'iptal_edildi': 'bg-secondary text-foreground dark:bg-gray-900 dark:text-gray-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  'kritik': 'bg-destructive/10 text-destructive dark:bg-destructive/5 dark:text-destructive',
  'yuksek': 'bg-warning/10 text-warning dark:bg-warning/5 dark:text-warning',
  'normal': 'bg-primary/10 text-primary dark:bg-primary/5 dark:text-primary',
};

const getPriority = (req: ServiceRequest, equipment: EquipmentType[]): string => {
  const eq = equipment.find(e => e.id === req.equipmentId);
  if (!eq) return 'normal';
  
  // Critical if warranty expired or pending for >24 hours
  const health = getHealthStatus(eq);
  if (health.status === 'Garanti Sona Erdi') return 'kritik';
  
  const createdTime = new Date(req.createdAt).getTime();
  const hoursOld = (Date.now() - createdTime) / (1000 * 60 * 60);
  if (hoursOld > 24) return 'kritik';
  
  // High priority if warranty expiring soon or pending >8 hours
  if (health.status === 'Garanti Bitme Yakın') return 'yuksek';
  if (hoursOld > 8) return 'yuksek';
  
  return 'normal';
};

const getHealthStatus = (equipment: EquipmentType): { status: string; color: string; icon: React.ReactNode } => {
  if (!equipment.isActive) {
    return { status: 'Pasif', color: 'bg-secondary text-foreground dark:bg-gray-800 dark:text-gray-200', icon: <Clock className="w-4 h-4" /> };
  }

  if (equipment.warrantyEndDate) {
    const warrantyEnd = parseISO(equipment.warrantyEndDate.toString());
    const daysToWarrantyEnd = differenceInDays(warrantyEnd, new Date());
    if (daysToWarrantyEnd < 0) {
      return { status: 'Garanti Sona Erdi', color: 'bg-destructive/10 text-destructive dark:bg-destructive/5 dark:text-destructive', icon: <AlertCircle className="w-4 h-4" /> };
    }
    if (daysToWarrantyEnd < 30) {
      return { status: 'Garanti Bitme Yakın', color: 'bg-warning/10 text-warning dark:bg-warning/5 dark:text-warning', icon: <AlertCircle className="w-4 h-4" /> };
    }
  }

  return { status: 'Sağlıklı', color: 'bg-success/10 text-success dark:bg-success/5 dark:text-success', icon: <Zap className="w-4 h-4" /> };
};

export default function EquipmentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<EquipmentType | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Queries
  const { data: branches = [], isError, refetch, isLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: equipment = [] } = useQuery<EquipmentType[]>({
    queryKey: ['/api/equipment'],
  });

  const { data: serviceRequests = [], isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  // QR Scanner effect - defined AFTER queries
  useEffect(() => {
    if (!showQRScanner) {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.clear().catch(() => {});
        } catch (e) {
        }
        qrScannerRef.current = null;
      }
      return;
    }

    if (showQRScanner && !qrScannerRef.current) {
      // Use requestAnimationFrame to wait for DOM to be painted
      const initializeScanner = () => {
        const element = document.getElementById('qr-reader');
        if (!element) {
          // Try again on next frame if element not ready
          requestAnimationFrame(initializeScanner);
          return;
        }
        
        try {
          const scanner = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          qrScannerRef.current = scanner;
          
          scanner.render(
            (decodedText) => {
              // Parse QR code: DOSPRESSO-EQ-{equipmentId}
              const match = decodedText.match(/DOSPRESSO-EQ-(\d+)/);
              if (match && match[1]) {
                const equipmentId = parseInt(match[1]);
                const foundEquipment = equipment.find(e => e.id === equipmentId);
                if (foundEquipment) {
                  setSelectedEquipmentDetail(foundEquipment);
                  setShowQRScanner(false);
                  scanner.clear().catch(() => {});
                  qrScannerRef.current = null;
                  toast({
                    title: 'Başarılı',
                    description: `${EQUIPMENT_TYPE_LABELS[foundEquipment.equipmentType] || foundEquipment.equipmentType} tarandi`,
                  });
                } else {
                  toast({
                    title: 'Hata',
                    description: 'Bu ekipman bulunamadı',
                    variant: 'destructive',
                  });
                }
              }
            },
            (error) => {
            }
          );
        } catch (error) {
        }
      };
      
      requestAnimationFrame(initializeScanner);
    }
  }, [showQRScanner, equipment, toast]);

  // Form
  const form = useForm<InsertEquipmentServiceRequest>({
    resolver: zodResolver(insertEquipmentServiceRequestSchema),
    defaultValues: {
      equipmentId: 0,
      serviceDecision: '',
      serviceProvider: '',
      notes: '',
      status: 'talep_edildi',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipmentServiceRequest) => {
      await apiRequest('POST', '/api/service-requests/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({
        title: 'Başarılı',
        description: 'Servis talebi oluşturuldu',
      });
      setShowCreateDialog(false);
      setCreateStep(1);
      form.reset();
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Servis talebi oluşturulamadı',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { status?: string; notes?: string }) => {
      if (selectedRequest) {
        await apiRequest('PATCH', `/api/service-requests/${selectedRequest.id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({
        title: 'Başarılı',
        description: 'Talep güncellendi',
      });
      setSelectedRequest(null);
    },
  });

  // Filters & Sorting
  const branchEquipment = useMemo(
    () => equipment.filter(eq => eq.branchId === parseInt(selectedBranch)),
    [equipment, selectedBranch]
  );

  const pendingRequests = useMemo(
    () => {
      let filtered = serviceRequests.filter(sr => ['talep_edildi', 'planlandı'].includes(sr.status));
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLocaleLowerCase('tr-TR');
        filtered = filtered.filter(sr => {
          const eq = equipment.find(e => e.id === sr.equipmentId);
          const branch = branches.find(b => b.id === eq?.branchId);
          
  return (
            sr.notes?.toLocaleLowerCase('tr-TR').includes(query) ||
            sr.serviceProvider?.toLocaleLowerCase('tr-TR').includes(query) ||
            eq?.equipmentType.toLocaleLowerCase('tr-TR').includes(query) ||
            branch?.name.toLocaleLowerCase('tr-TR').includes(query)
          );
        });
      }
      
      // Branch filter
      if (filterBranch !== 'all') {
        filtered = filtered.filter(sr => {
          const eq = equipment.find(e => e.id === sr.equipmentId);
          return eq?.branchId === parseInt(filterBranch);
        });
      }
      
      // Status filter
      if (filterStatus !== 'all') {
        filtered = filtered.filter(sr => sr.status === filterStatus);
      }
      
      // Priority filter
      if (filterPriority !== 'all') {
        filtered = filtered.filter(sr => getPriority(sr, equipment) === filterPriority);
      }
      
      // Sort: Critical first, then by date
      return filtered.sort((a, b) => {
        const aPriority = getPriority(a, equipment);
        const bPriority = getPriority(b, equipment);
        const priorityOrder = { kritik: 0, yuksek: 1, normal: 2 };
        
        const priorityDiff = priorityOrder[aPriority as keyof typeof priorityOrder] - priorityOrder[bPriority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    [serviceRequests, equipment, branches, searchQuery, filterBranch, filterStatus, filterPriority]
  );

  const inProgressRequests = useMemo(
    () => serviceRequests.filter(sr => sr.status === 'devam_ediyor'),
    [serviceRequests]
  );

  const completedRequests = useMemo(
    () => serviceRequests.filter(sr => ['tamamlandı', 'iptal_edildi'].includes(sr.status))
      .sort((a, b) => new Date(b.lastUpdated || b.createdAt).getTime() - new Date(a.lastUpdated || a.createdAt).getTime())
      .slice(0, 20),
    [serviceRequests]
  );

  const equipmentForDisplay = useMemo(
    () => equipment.sort((a, b) => a.branchId - b.branchId),
    [equipment]
  );

  const stats = useMemo(
    () => ({
      pending: pendingRequests.length,
      inProgress: inProgressRequests.length,
      completed: completedRequests.length,
      critical: pendingRequests.filter(r => getPriority(r, equipment) === 'kritik').length,
    }),
    [pendingRequests, inProgressRequests, completedRequests, equipment]
  );

  const handleCreateSubmit = () => {
    if (createStep === 1 && !selectedBranch) {
      toast({ title: 'Hata', description: 'Şube seçiniz' });
      return;
    }
    if (createStep === 2 && !selectedEquipment) {
      toast({ title: 'Hata', description: 'Ekipman seçiniz' });
      return;
    }
    if (createStep === 3) {
      form.setValue('equipmentId', parseInt(selectedEquipment));
      createMutation.mutate(form.getValues());
      return;
    }
    setCreateStep(createStep + 1);
  };

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleNotesSubmit = (notes: string) => {
    updateMutation.mutate({ notes });
  };

  const exportToCSV = () => {
    if (pendingRequests.length === 0) {
      toast({ title: 'Hata', description: 'Dışa aktarılacak talep yok' });
      return;
    }

    // Prepare CSV rows
    const headers = ['ID', 'Ekipman Türü', 'Şube', 'Durum', 'Technician', 'Notlar', 'Oluşturma Tarihi'];
    const rows = pendingRequests.map(req => {
      const eq = equipment.find(e => e.id === req.equipmentId);
      const branch = branches.find(b => b.id === eq?.branchId);
      return [
        req.id,
        EQUIPMENT_TYPE_LABELS[eq?.equipmentType || ''] || eq?.equipmentType || 'Bilinmiyor',
        branch?.name || 'Bilinmiyor',
        STATUS_LABELS[req.status] || req.status,
        req.serviceProvider || '-',
        (req.notes || '').replace(/"/g, '""'), // Escape quotes for CSV
        format(parseISO(req.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr }),
      ];
    });

    // Build CSV string
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `servis-talepleri-${format(new Date(), 'dd-MM-yyyy-HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Başarılı',
      description: `${pendingRequests.length} talep dışa aktarıldı`,
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ekipman & Servis Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Tüm talepleri, devam eden işleri ve ekipman durumunu merkezi yerde yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowQRScanner(true)} 
            variant="outline"
            className="gap-2" 
            data-testid="button-qr-scanner"
          >
            <Smartphone className="w-4 h-4" />
            QR Kod Tarayıcı
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2" data-testid="button-create-request">
            <Plus className="w-4 h-4" />
            Yeni Talep
          </Button>
        </div>
      </div>

      {/* Stats */}
      <CompactKPIStrip
        items={[
          { label: "Bekleyen", value: stats.pending, color: stats.critical > 0 ? "danger" : "default", subtitle: stats.critical > 0 ? `${stats.critical} Kritik` : undefined, testId: "kpi-pending" },
          { label: "Devam Eden", value: stats.inProgress, color: "warning", testId: "kpi-inprogress" },
          { label: "Tamamlanan (30gün)", value: stats.completed, color: "success", testId: "kpi-completed" },
          { label: "Toplam Ekipman", value: equipment.length, testId: "kpi-total-equipment" },
        ]}
        desktopColumns={4}
      />

      {/* Main Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="pending">Bekleyen ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="inprogress">Devam Eden ({stats.inProgress})</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan ({stats.completed})</TabsTrigger>
          <TabsTrigger value="equipment">Ekipman Durumu</TabsTrigger>
        </TabsList>

        {/* TAB 1: Bekleyen Talepler */}
        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          {/* Filters */}
          <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <div className="flex gap-2 items-center">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ara: ekipman, şube, teknisyen, notlar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                data-testid="input-search-requests"
              />
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-branch">
                  <SelectValue placeholder="Şube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="talep_edildi">Talep Edildi</SelectItem>
                  <SelectItem value="planlandı">Planlandı</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-priority">
                  <SelectValue placeholder="Öncelik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Öncelikler</SelectItem>
                  <SelectItem value="kritik">Kritik</SelectItem>
                  <SelectItem value="yuksek">Yüksek</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || filterBranch !== 'all' || filterStatus !== 'all' || filterPriority !== 'all') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterBranch('all');
                    setFilterStatus('all');
                    setFilterPriority('all');
                  }}
                  data-testid="button-reset-filters"
                >
                  Filtreleri Temizle
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="gap-2 ml-auto"
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4" />
                CSV Dışa Aktar
              </Button>
            </div>
          </div>
          {requestsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Bekleyen talep yok</p>
              <Button onClick={() => setShowCreateDialog(true)}>Yeni Talep Oluştur</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {pendingRequests.map(req => {
                const eq = equipment.find(e => e.id === req.equipmentId);
                const branch = branches.find(b => b.id === eq?.branchId);
                const priority = getPriority(req, equipment);
                const hoursOld = (Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60);

                return (
                  <Card
                    key={req.id}
                    className={`hover-elevate cursor-pointer p-3 ${priority === 'kritik' ? 'border-destructive/30 dark:border-destructive/40' : priority === 'yuksek' ? 'border-warning/30 dark:border-warning/40' : ''}`}
                    onClick={() => setSelectedRequest(req)}
                    data-testid={`card-request-${req.id}`}
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {EQUIPMENT_TYPE_LABELS[eq?.equipmentType || ''] || eq?.equipmentType || 'Bilinmiyor'}
                          {priority !== 'normal' && (
                            <Badge className={PRIORITY_COLORS[priority]}>
                              {priority === 'kritik' ? 'KRITIK' : 'YÜKSEK'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {branch?.name} • {req.serviceProvider || 'Technician atanmadı'}
                        </div>
                        {req.notes && <p className="text-sm mt-2">{req.notes.substring(0, 100)}</p>}
                        <div className="text-xs text-muted-foreground mt-1">{(hoursOld ?? 0).toFixed(1)}s önce oluşturuldu</div>
                      </div>
                      <div className="text-right">
                        <Badge className={STATUS_COLORS[req.status] || 'bg-secondary'}>
                          {STATUS_LABELS[req.status] || req.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(req.createdAt), 'dd MMM HH:mm', { locale: tr })}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Devam Eden */}
        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          {inProgressRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Devam eden talep yok</div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {inProgressRequests.map(req => {
                const eq = equipment.find(e => e.id === req.equipmentId);
                const branch = branches.find(b => b.id === eq?.branchId);

                return (
                  <Card
                    key={req.id}
                    className="hover-elevate cursor-pointer p-3"
                    onClick={() => setSelectedRequest(req)}
                    data-testid={`card-request-${req.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{EQUIPMENT_TYPE_LABELS[eq?.equipmentType || ''] || eq?.equipmentType}</div>
                        <div className="text-sm text-muted-foreground">{branch?.name}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Tamamlanan */}
        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          {completedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Tamamlanan talep yok</div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {completedRequests.map(req => {
                const eq = equipment.find(e => e.id === req.equipmentId);
                const branch = branches.find(b => b.id === eq?.branchId);

                return (
                  <Card key={req.id} className="p-3 opacity-75">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{EQUIPMENT_TYPE_LABELS[eq?.equipmentType || ''] || eq?.equipmentType}</div>
                        <div className="text-sm text-muted-foreground">{branch?.name}</div>
                      </div>
                      <Badge className={STATUS_COLORS[req.status] || 'bg-secondary'}>
                        {STATUS_LABELS[req.status] || req.status}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: Ekipman Durumu */}
        <TabsContent value="content" className="w-full space-y-2 sm:space-y-3">
          <div className="w-full space-y-2 sm:space-y-3 lg:grid-cols-3 gap-2 sm:gap-3">
            {equipmentForDisplay.map(eq => {
              const health = getHealthStatus(eq);
              const branch = branches.find(b => b.id === eq.branchId);
              const relatedRequests = serviceRequests.filter(r => r.equipmentId === eq.id);

              return (
                <div 
                  key={eq.id} 
                  onClick={() => setSelectedEquipmentDetail(eq)}
                  className="cursor-pointer"
                  data-testid={`button-view-equipment-${eq.id}`}
                >
                  <Card className="hover-elevate" data-testid={`card-equipment-${eq.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{EQUIPMENT_TYPE_LABELS[eq.equipmentType] || eq.equipmentType}</CardTitle>
                          <CardDescription className="text-xs">{branch?.name}</CardDescription>
                        </div>
                        <Badge className={health.color}>
                          {health.icon}
                          <span className="ml-1">{health.status}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-2 text-sm">
                      {eq.serialNumber && <div><span className="text-muted-foreground">Seri: </span>{eq.serialNumber}</div>}
                      {eq.warrantyEndDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-muted-foreground">Garanti: </span>
                          {format(parseISO(eq.warrantyEndDate), 'dd MMM yyyy', { locale: tr })}
                        </div>
                      )}
                      {eq.nextMaintenanceDate && (
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          <span className="text-muted-foreground">Bakım: </span>
                          {format(parseISO(eq.nextMaintenanceDate), 'dd MMM yyyy', { locale: tr })}
                        </div>
                      )}
                      {relatedRequests.length > 0 && (
                        <div className="pt-2 border-t text-xs">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <span>{relatedRequests.length} talep</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Equipment Detail Modal */}
      {selectedEquipmentDetail && (
        <Dialog open={!!selectedEquipmentDetail} onOpenChange={() => setSelectedEquipmentDetail(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{EQUIPMENT_TYPE_LABELS[selectedEquipmentDetail.equipmentType] || selectedEquipmentDetail.equipmentType}</DialogTitle>
              <DialogDescription>
                {branches.find(b => b.id === selectedEquipmentDetail.branchId)?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Equipment Details */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <div className="text-sm font-medium text-muted-foreground">Seri No</div>
                  <div className="font-semibold">{selectedEquipmentDetail.serialNumber || '-'}</div>
                </div>
                <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <div className="text-sm font-medium text-muted-foreground">Durum</div>
                  <div className="font-semibold">
                    <Badge className={getHealthStatus(selectedEquipmentDetail).color}>
                      {getHealthStatus(selectedEquipmentDetail).icon}
                      <span className="ml-1">{getHealthStatus(selectedEquipmentDetail).status}</span>
                    </Badge>
                  </div>
                </div>
                {selectedEquipmentDetail.purchaseDate && (
                  <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-sm font-medium text-muted-foreground">Satın Alma Tarihi</div>
                    <div className="font-semibold">{format(parseISO(selectedEquipmentDetail.purchaseDate), 'dd MMM yyyy', { locale: tr })}</div>
                  </div>
                )}
                {selectedEquipmentDetail.warrantyEndDate && (
                  <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-sm font-medium text-muted-foreground">Garanti Bitiş</div>
                    <div className="font-semibold">{format(parseISO(selectedEquipmentDetail.warrantyEndDate), 'dd MMM yyyy', { locale: tr })}</div>
                  </div>
                )}
                {selectedEquipmentDetail.lastMaintenanceDate && (
                  <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-sm font-medium text-muted-foreground">Son Bakım</div>
                    <div className="font-semibold">{format(parseISO(selectedEquipmentDetail.lastMaintenanceDate), 'dd MMM yyyy', { locale: tr })}</div>
                  </div>
                )}
                {selectedEquipmentDetail.nextMaintenanceDate && (
                  <div className="bg-muted p-3 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-sm font-medium text-muted-foreground">Sonraki Bakım</div>
                    <div className="font-semibold">{format(parseISO(selectedEquipmentDetail.nextMaintenanceDate), 'dd MMM yyyy', { locale: tr })}</div>
                  </div>
                )}
              </div>

              {/* Service History */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Servis Geçmişi ({serviceRequests.filter(r => r.equipmentId === selectedEquipmentDetail.id).length} talep)
                </label>
                {serviceRequests.filter(r => r.equipmentId === selectedEquipmentDetail.id).length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
                    Bu ekipman için servis talebi yok
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {serviceRequests
                      .filter(r => r.equipmentId === selectedEquipmentDetail.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(req => (
                        <div 
                          key={req.id}
                          className="border rounded-lg p-3 hover-elevate cursor-pointer"
                          onClick={() => {
                            setSelectedEquipmentDetail(null);
                            setSelectedRequest(req);
                          }}
                          data-testid={`link-view-request-${req.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium flex items-center gap-2">
                                <span>Talep #{req.id}</span>
                                <Badge variant="outline" className={STATUS_COLORS[req.status] || 'bg-secondary'}>
                                  {STATUS_LABELS[req.status] || req.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(parseISO(req.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                              </div>
                              {req.notes && <div className="text-sm mt-1 line-clamp-2">{req.notes}</div>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Create New Request Button */}
              <Button
                onClick={() => {
                  setSelectedEquipmentDetail(null);
                  setShowCreateDialog(true);
                  setSelectedBranch(selectedEquipmentDetail.branchId.toString());
                  setSelectedEquipment(selectedEquipmentDetail.id.toString());
                  setCreateStep(3);
                }}
                className="w-full gap-2"
                data-testid="button-create-request-from-equipment"
              >
                <Plus className="w-4 h-4" />
                Bu Ekipman İçin Talep Oluştur
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Service Request Detail Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Talep Detayı #{selectedRequest.id}</DialogTitle>
              <DialogDescription>
                {format(parseISO(selectedRequest.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Equipment Info */}
              {equipment.find(e => e.id === selectedRequest.equipmentId) && (
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">Ekipman Bilgisi</div>
                  <div className="text-sm mt-2 text-muted-foreground">
                    {EQUIPMENT_TYPE_LABELS[equipment.find(e => e.id === selectedRequest.equipmentId)?.equipmentType || ''] || 'Bilinmiyor'} •{' '}
                    {branches.find(b => b.id === equipment.find(e => e.id === selectedRequest.equipmentId)?.branchId)?.name}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium">Durum</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={selectedRequest.status === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(key)}
                      data-testid={`button-status-${key}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium">Notlar</label>
                <Textarea
                  placeholder="Not ekleyin..."
                  defaultValue={selectedRequest.notes || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedRequest.notes || '')) {
                      handleNotesSubmit(e.target.value);
                    }
                  }}
                  className="min-h-20"
                />
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Zaman Çizelgesi
                </label>
                <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                  Oluşturma: {format(parseISO(selectedRequest.createdAt), 'dd MMM HH:mm', { locale: tr })}
                  {selectedRequest.lastUpdated && (
                    <>
                      <br />
                      Son güncelleme: {format(parseISO(selectedRequest.lastUpdated), 'dd MMM HH:mm', { locale: tr })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Scanner Modal */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Kod Tarayıcı</DialogTitle>
            <DialogDescription>
              Ekipman QR kodunu kameraya gösteriniz
            </DialogDescription>
          </DialogHeader>
          <div className="w-full space-y-2 sm:space-y-3">
            <div 
              id="qr-reader" 
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: '300px' }}
            />
            <Button 
              variant="outline"
              onClick={() => setShowQRScanner(false)}
              className="w-full"
              data-testid="button-close-qr-scanner"
            >
              İptal Et
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Servis Talebi - Adım {createStep}/3</DialogTitle>
            <DialogDescription>
              {createStep === 1 && 'Şubeyi seçiniz'}
              {createStep === 2 && 'Ekipmanı seçiniz'}
              {createStep === 3 && 'Detayları doldurunuz'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Step 1: Branch */}
            {createStep === 1 && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium">Şube Seçiniz</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger data-testid="select-branch-create">
                    <SelectValue placeholder="Şube seçiniz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 2: Equipment */}
            {createStep === 2 && selectedBranch && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium">Ekipman Seçiniz</label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger data-testid="select-equipment-create">
                    <SelectValue placeholder="Ekipman seçiniz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branchEquipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id.toString()}>
                        {EQUIPMENT_TYPE_LABELS[eq.equipmentType] || eq.equipmentType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Form */}
            {createStep === 3 && (
              <div className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <label className="text-sm font-medium">Teknik / Sağlayıcı *</label>
                  <input
                    placeholder="Technician adı"
                    value={form.watch('serviceProvider') || ''}
                    onChange={(e) => form.setValue('serviceProvider', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <label className="text-sm font-medium">Açıklama / Sorun</label>
                  <Textarea
                    placeholder="Sorun açıklaması..."
                    value={form.watch('notes') || ''}
                    onChange={(e) => form.setValue('notes', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <label className="text-sm font-medium">Hizmet Kararı</label>
                  <input
                    placeholder="Bakım / Tamir vb..."
                    value={form.watch('serviceDecision') || ''}
                    onChange={(e) => form.setValue('serviceDecision', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                İptal
              </Button>
              {createStep > 1 && (
                <Button variant="outline" onClick={() => setCreateStep(createStep - 1)}>
                  Geri
                </Button>
              )}
              <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                {createStep === 3 ? 'Oluştur' : 'İleri'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
