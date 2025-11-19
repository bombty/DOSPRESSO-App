import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Branch } from '@shared/schema';

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

interface ServiceRequestWithEquipment {
  id: number;
  equipmentId: number;
  equipmentName: string;
  equipmentType: string;
  branchId: number;
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
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: serviceRequests = [], isLoading } = useQuery<ServiceRequestWithEquipment[]>({
    queryKey: ['/api/service-requests', filterBranch !== 'all' ? parseInt(filterBranch) : undefined, filterStatus !== 'all' ? filterStatus : undefined],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      return await apiRequest(`/api/equipment/service-requests/${requestId}/status`, 'PATCH', {
        newStatus: status,
        notes: `Durum güncellendi: ${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}`,
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

  const filteredRequests = serviceRequests.filter(request => {
    if (filterBranch !== 'all' && request.branchId !== parseInt(filterBranch)) return false;
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    return true;
  });

  const handleUpdateStatus = () => {
    if (!selectedRequest || !newStatus) return;
    updateStatusMutation.mutate({ requestId: selectedRequest.id, status: newStatus });
  };

  const activeFiltersCount = (filterBranch !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold" data-testid="text-page-title">Servis Talepleri</h1>
        <p className="text-muted-foreground mt-1">Ekipman bakım ve servis taleplerini yönetin</p>
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
            <Card key={request.id} className="hover-elevate" data-testid={`card-service-request-${request.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-equipment-name-${request.id}`}>
                      {request.equipmentName}
                    </CardTitle>
                    <CardDescription>
                      {request.equipmentType} • Servis Sağlayıcı: {request.serviceProvider}
                    </CardDescription>
                  </div>
                  <Badge className={STATUS_VARIANTS[request.status]} data-testid={`badge-status-${request.id}`}>
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Öncelik:</span>
                      <span className="ml-2 font-medium capitalize">{request.priority}</span>
                    </div>
                    {request.scheduledDate && (
                      <div>
                        <span className="text-muted-foreground">Planlanan:</span>
                        <span className="ml-2 font-medium">
                          {new Date(request.scheduledDate).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    )}
                    {request.estimatedCost && (
                      <div>
                        <span className="text-muted-foreground">Tahmini Maliyet:</span>
                        <span className="ml-2 font-medium">₺{request.estimatedCost}</span>
                      </div>
                    )}
                    {request.actualCost && (
                      <div>
                        <span className="text-muted-foreground">Gerçek Maliyet:</span>
                        <span className="ml-2 font-medium">₺{request.actualCost}</span>
                      </div>
                    )}
                  </div>
                  {request.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notlar:</span>
                      <p className="mt-1 text-sm">{request.notes}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Oluşturulma: {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setNewStatus(request.status);
                        setStatusDialogOpen(true);
                      }}
                      data-testid={`button-update-status-${request.id}`}
                    >
                      Durumu Güncelle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Servis Talebi Durumunu Güncelle</DialogTitle>
            <DialogDescription>
              {selectedRequest?.equipmentName} için servis talebi durumunu güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Yeni Durum</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending || newStatus === selectedRequest?.status}
              data-testid="button-submit-status-update"
            >
              {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
