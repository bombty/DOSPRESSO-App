import { useState, useMemo } from 'react';
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
import { Loader2, Filter, X, MapPin, Wrench, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch } from '@shared/schema';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const STATUS_LABELS = {
  'talep_edildi': 'Talep Edildi',
  'planlandi': 'Planlandı',
  'devam_ediyor': 'Devam Ediyor',
  'tamamlandi': 'Tamamlandı',
  'iptal_edildi': 'İptal Edildi',
} as const;

const STATUS_VARIANTS = {
  'talep_edildi': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'planlandi': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'devam_ediyor': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'tamamlandi': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'iptal_edildi': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
} as const;

const PRIORITY_VARIANTS = {
  'düşük': 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
  'orta': 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700',
  'yüksek': 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700',
  'kritik': 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
} as const;

const PRIORITY_COLORS = {
  'düşük': 'text-blue-600 dark:text-blue-400',
  'orta': 'text-amber-600 dark:text-amber-400',
  'yüksek': 'text-orange-600 dark:text-orange-400',
  'kritik': 'text-red-600 dark:text-red-400',
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
  createdAt: string;
  createdById: string;
}

export default function ServiceRequestsManagement() {
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithEquipment | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [lastContactDate, setLastContactDate] = useState<string>('');
  const [serviceUpdate, setServiceUpdate] = useState<string>('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>('');
  const [actualCostInput, setActualCostInput] = useState<string>('');

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: serviceRequests = [], isLoading } = useQuery<ServiceRequestWithEquipment[]>({
    queryKey: ['/api/service-requests', filterBranch !== 'all' ? parseInt(filterBranch) : undefined, filterStatus !== 'all' ? filterStatus : undefined],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, details }: { requestId: number; status: string; details?: any }) => {
      return await apiRequest(`/api/equipment/service-requests/${requestId}/status`, 'PATCH', {
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
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Durum güncellenemedi',
        variant: 'destructive',
      });
    },
  });

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
    setStatusDialogOpen(true);
  };

  const handleEquipmentClick = (request: ServiceRequestWithEquipment) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const activeFiltersCount = (filterBranch !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold" data-testid="text-page-title">Servis Talepleri</h1>
        <p className="text-muted-foreground mt-1">Ekipman bakım ve servis taleplerini yönetin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Talep</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Açık Talep</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">İptal Edilen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kritik Öncelik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalPriority}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>Filtreler</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2" data-testid="badge-active-filters">
                  {activeFiltersCount} aktif filtre
                </Badge>
              )}
            </div>
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Şube</Label>
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
            <div className="space-y-2">
              <Label>Durum</Label>
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Servis talebi bulunamadı.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map(request => (
            <Card key={request.id} className="hover-elevate border-l-4" style={{ borderLeftColor: !request.priority ? '#3b82f6' : request.priority === 'kritik' ? '#ef4444' : request.priority === 'yüksek' ? '#f97316' : request.priority === 'orta' ? '#eab308' : '#3b82f6' }} data-testid={`card-service-request-${request.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
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
                <div className="space-y-4">
                  {/* Location and dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                      <div className="flex items-center gap-2 text-green-600">
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
            <div className="space-y-6">
              {/* Equipment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cihaz Adı</p>
                  <p className="font-medium">{selectedRequest.equipmentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cihaz Tipi</p>
                  <p className="font-medium">{selectedRequest.equipmentType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Şube</p>
                  <p className="font-medium">{selectedRequest.branchName || `Şube #${selectedRequest.branchId}`}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cihaz ID</p>
                  <p className="font-medium">{selectedRequest.equipmentId}</p>
                </div>
              </div>

              {/* Service Request Info */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">Servis Talebi Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <Badge className={STATUS_VARIANTS[selectedRequest.status]}>
                      {STATUS_LABELS[selectedRequest.status]}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Öncelik</p>
                    {selectedRequest.priority ? (
                      <Badge className={`${PRIORITY_COLORS[selectedRequest.priority]} border ${PRIORITY_VARIANTS[selectedRequest.priority]}`}>
                        {selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Servis Sağlayıcı</p>
                    <p className="font-medium">{selectedRequest.serviceProvider}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Talep Tarihi</p>
                    <p className="font-medium">{format(new Date(selectedRequest.createdAt), 'd MMM yyyy, HH:mm', { locale: tr })}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              {(selectedRequest.scheduledDate || selectedRequest.completedDate) && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Tarihler</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRequest.scheduledDate && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Planlanan Tarih</p>
                        <p className="font-medium">{format(new Date(selectedRequest.scheduledDate), 'd MMM yyyy', { locale: tr })}</p>
                      </div>
                    )}
                    {selectedRequest.completedDate && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tamamlanma Tarihi</p>
                        <p className="font-medium text-green-600">{format(new Date(selectedRequest.completedDate), 'd MMM yyyy', { locale: tr })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Costs */}
              {(selectedRequest.estimatedCost || selectedRequest.actualCost) && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Maliyetler</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRequest.estimatedCost && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tahmini Maliyet</p>
                        <p className="font-medium">₺{selectedRequest.estimatedCost}</p>
                      </div>
                    )}
                    {selectedRequest.actualCost && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Gerçek Maliyet</p>
                        <p className="font-medium">₺{selectedRequest.actualCost}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Notlar</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.notes}</p>
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
          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tahmini Bitiş Tarihi</Label>
                <Input 
                  type="date" 
                  value={estimatedCompletionDate}
                  onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                  data-testid="input-estimated-completion"
                />
              </div>

              {/* Actual Cost */}
              <div className="space-y-2">
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

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
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
    </div>
  );
}
