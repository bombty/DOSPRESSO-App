import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Wrench, Calendar, Clock, Building2, Zap, History, CheckCircle2, Plus, X, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Branch, Equipment as EquipmentType, InsertEquipmentServiceRequest } from '@shared/schema';
import { insertEquipmentServiceRequestSchema } from '@shared/schema';

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

interface Equipment {
  id: number;
  branchId: number;
  name: string;
  type: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  isActive: boolean;
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
  'talep_edildi': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'planlandı': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'devam_ediyor': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'tamamlandı': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'iptal_edildi': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const getHealthStatus = (equipment: Equipment): { status: string; color: string; icon: React.ReactNode } => {
  if (!equipment.isActive) {
    return { status: 'Pasif', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: <Clock className="w-4 h-4" /> };
  }

  if (equipment.warrantyExpiryDate) {
    const warrantyEnd = parseISO(equipment.warrantyExpiryDate);
    const daysToWarrantyEnd = differenceInDays(warrantyEnd, new Date());
    if (daysToWarrantyEnd < 0) {
      return { status: 'Garanti Sona Erdi', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <AlertCircle className="w-4 h-4" /> };
    }
    if (daysToWarrantyEnd < 30) {
      return { status: 'Garanti Bitme Yakın', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: <AlertCircle className="w-4 h-4" /> };
    }
  }

  return { status: 'Sağlıklı', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: <Zap className="w-4 h-4" /> };
};

export default function EquipmentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');

  // Queries
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
  });

  const { data: serviceRequests = [], isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

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
    () => serviceRequests.filter(sr => ['talep_edildi', 'planlandı'].includes(sr.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [serviceRequests]
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
      critical: 0,
    }),
    [pendingRequests, inProgressRequests, completedRequests]
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ekipman & Servis Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Tüm talepleri, devam eden işleri ve ekipman durumunu merkezi yerde yönetin</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2" data-testid="button-create-request">
          <Plus className="w-4 h-4" />
          Yeni Talep
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            {stats.critical > 0 && <div className="text-xs text-red-600 mt-1">🚨 {stats.critical} Kritik</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devam Eden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan (30gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ekipman</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Bekleyen ({stats.pending})</TabsTrigger>
          <TabsTrigger value="inprogress">Devam Eden ({stats.inProgress})</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan ({stats.completed})</TabsTrigger>
          <TabsTrigger value="equipment">Ekipman Durumu</TabsTrigger>
        </TabsList>

        {/* TAB 1: Bekleyen Talepler */}
        <TabsContent value="pending" className="space-y-4">
          {requestsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Bekleyen talep yok</p>
              <Button onClick={() => setShowCreateDialog(true)}>Yeni Talep Oluştur</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map(req => {
                const eq = equipment.find(e => e.id === req.equipmentId);
                const branch = branches.find(b => b.id === eq?.branchId);

                return (
                  <Card
                    key={req.id}
                    className="hover-elevate cursor-pointer p-4"
                    onClick={() => setSelectedRequest(req)}
                    data-testid={`card-request-${req.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">
                          {EQUIPMENT_TYPE_LABELS[eq?.type || ''] || eq?.type || 'Bilinmiyor'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {branch?.name} • {req.serviceProvider || 'Teknisyen atanmadı'}
                        </div>
                        {req.notes && <p className="text-sm mt-2">{req.notes.substring(0, 100)}</p>}
                      </div>
                      <div className="text-right">
                        <Badge className={STATUS_COLORS[req.status] || 'bg-gray-100'}>
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
        <TabsContent value="inprogress" className="space-y-4">
          {inProgressRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Devam eden talep yok</div>
          ) : (
            <div className="space-y-2">
              {inProgressRequests.map(req => {
                const eq = equipment.find(e => e.id === req.equipmentId);
                const branch = branches.find(b => b.id === eq?.branchId);

                return (
                  <Card
                    key={req.id}
                    className="hover-elevate cursor-pointer p-4"
                    onClick={() => setSelectedRequest(req)}
                    data-testid={`card-request-${req.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{EQUIPMENT_TYPE_LABELS[eq?.type || ''] || eq?.type}</div>
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
        <TabsContent value="completed" className="space-y-4">
          {completedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Tamamlanan talep yok</div>
          ) : (
            <div className="space-y-2">
              {completedRequests.map(req => {
                const eq = equipment.find(e => e.id === req.equipmentId);
                const branch = branches.find(b => b.id === eq?.branchId);

                return (
                  <Card key={req.id} className="p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{EQUIPMENT_TYPE_LABELS[eq?.type || ''] || eq?.type}</div>
                        <div className="text-sm text-muted-foreground">{branch?.name}</div>
                      </div>
                      <Badge className={STATUS_COLORS[req.status] || 'bg-gray-100'}>
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
        <TabsContent value="equipment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentForDisplay.map(eq => {
              const health = getHealthStatus(eq);
              const branch = branches.find(b => b.id === eq.branchId);
              const relatedRequests = serviceRequests.filter(r => r.equipmentId === eq.id);

              return (
                <Card key={eq.id} className="hover-elevate" data-testid={`card-equipment-${eq.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{EQUIPMENT_TYPE_LABELS[eq.type] || eq.type}</CardTitle>
                        <CardDescription className="text-xs">{branch?.name}</CardDescription>
                      </div>
                      <Badge className={health.color}>
                        {health.icon}
                        <span className="ml-1">{health.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {eq.serialNumber && <div><span className="text-muted-foreground">Seri: </span>{eq.serialNumber}</div>}
                    {eq.warrantyExpiryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-muted-foreground">Garanti: </span>
                        {format(parseISO(eq.warrantyExpiryDate), 'dd MMM yyyy', { locale: tr })}
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
                        <span className="text-muted-foreground">{relatedRequests.length} talep</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Panel Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Talep Detayı #{selectedRequest.id}</DialogTitle>
              <DialogDescription>
                {format(parseISO(selectedRequest.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Equipment Info */}
              {equipment.find(e => e.id === selectedRequest.equipmentId) && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="font-medium">Ekipman Bilgisi</div>
                  <div className="text-sm mt-2 text-muted-foreground">
                    {EQUIPMENT_TYPE_LABELS[equipment.find(e => e.id === selectedRequest.equipmentId)?.type || ''] || 'Bilinmiyor'} •{' '}
                    {branches.find(b => b.id === equipment.find(e => e.id === selectedRequest.equipmentId)?.branchId)?.name}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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

          <div className="space-y-6">
            {/* Step 1: Branch */}
            {createStep === 1 && (
              <div className="space-y-2">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Ekipman Seçiniz</label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger data-testid="select-equipment-create">
                    <SelectValue placeholder="Ekipman seçiniz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branchEquipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id.toString()}>
                        {EQUIPMENT_TYPE_LABELS[eq.type] || eq.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Form */}
            {createStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Teknik / Sağlayıcı *</label>
                  <input
                    placeholder="Teknisyen adı"
                    value={form.watch('serviceProvider') || ''}
                    onChange={(e) => form.setValue('serviceProvider', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Açıklama / Sorun</label>
                  <Textarea
                    placeholder="Sorun açıklaması..."
                    value={form.watch('notes') || ''}
                    onChange={(e) => form.setValue('notes', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
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
