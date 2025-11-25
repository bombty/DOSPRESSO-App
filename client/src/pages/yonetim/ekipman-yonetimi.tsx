import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Wrench, Calendar, Clock, Building2, Zap, History, CheckCircle2, AlertCircle as AlertIcon } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Branch } from '@shared/schema';

interface Equipment {
  id: number;
  branchId: number;
  equipmentType: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  maintenanceResponsible: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceIntervalDays: number;
  isActive: boolean;
  maxServiceTimeHours: number;
  alertThresholdHours: number;
}

interface ServiceRequest {
  id: number;
  equipmentId: number;
  status: string;
  createdAt: string;
  priority?: string;
  serviceProvider?: string;
  notes?: string;
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
  'planlandi': 'Planlandı',
  'devam_ediyor': 'Devam Ediyor',
  'tamamlandi': 'Tamamlandı',
  'iptal_edildi': 'İptal Edildi',
};

const STATUS_COLORS: Record<string, string> = {
  'talep_edildi': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'planlandi': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'devam_ediyor': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'tamamlandi': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'iptal_edildi': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const getHealthStatus = (equipment: Equipment): { status: string; color: string; icon: React.ReactNode } => {
  if (!equipment.isActive) {
    return { status: 'Pasif', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: <Clock className="w-4 h-4" /> };
  }

  if (equipment.warrantyEndDate) {
    const warrantyEnd = parseISO(equipment.warrantyEndDate);
    const daysToWarrantyEnd = differenceInDays(warrantyEnd, new Date());
    if (daysToWarrantyEnd < 0) {
      return { status: 'Garanti Sona Erdi', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <AlertCircle className="w-4 h-4" /> };
    }
    if (daysToWarrantyEnd < 30) {
      return { status: 'Garanti Bitme Yakın', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: <AlertCircle className="w-4 h-4" /> };
    }
  }

  if (equipment.nextMaintenanceDate) {
    const nextMaint = parseISO(equipment.nextMaintenanceDate);
    const daysToMaintenance = differenceInDays(nextMaint, new Date());
    if (daysToMaintenance < 0) {
      return { status: 'Bakım Gerekli', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <AlertCircle className="w-4 h-4" /> };
    }
    if (daysToMaintenance < 7) {
      return { status: 'Yakında Bakım', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: <Wrench className="w-4 h-4" /> };
    }
  }

  return { status: 'Sağlıklı', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: <Zap className="w-4 h-4" /> };
};

export default function EquipmentManagement() {
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
  });

  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  const filteredEquipment = useMemo(() => {
    return equipment.filter(eq => {
      if (filterBranch !== 'all' && eq.branchId !== parseInt(filterBranch)) return false;
      
      if (filterStatus !== 'all') {
        const health = getHealthStatus(eq);
        if (filterStatus === 'healthy' && health.status !== 'Sağlıklı') return false;
        if (filterStatus === 'warning' && !['Yakında Bakım', 'Garanti Bitme Yakın'].includes(health.status)) return false;
        if (filterStatus === 'critical' && !['Bakım Gerekli', 'Garanti Sona Erdi'].includes(health.status)) return false;
        if (filterStatus === 'inactive' && health.status !== 'Pasif') return false;
      }
      
      return true;
    });
  }, [equipment, filterBranch, filterStatus]);

  const stats = useMemo(() => {
    const total = filteredEquipment.length;
    const healthy = filteredEquipment.filter(eq => getHealthStatus(eq).status === 'Sağlıklı').length;
    const warning = filteredEquipment.filter(eq => ['Yakında Bakım', 'Garanti Bitme Yakın'].includes(getHealthStatus(eq).status)).length;
    const critical = filteredEquipment.filter(eq => ['Bakım Gerekli', 'Garanti Sona Erdi'].includes(getHealthStatus(eq).status)).length;
    return { total, healthy, warning, critical };
  }, [filteredEquipment]);

  const getAllServices = (equipId: number) => {
    return serviceRequests
      .filter(sr => sr.equipmentId === equipId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getStatusIcon = (status: string) => {
    if (status === 'tamamlandi') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'iptal_edildi') return <Clock className="w-4 h-4 text-gray-600" />;
    if (status === 'devam_ediyor') return <Wrench className="w-4 h-4 text-orange-600" />;
    return <AlertIcon className="w-4 h-4 text-blue-600" />;
  };

  const getBranchName = (branchId: number) => {
    return branches.find(b => b.id === branchId)?.name || `Şube ${branchId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ekipman Yönetimi</h1>
        <p className="text-muted-foreground mt-2">Tüm şubeler genelinde ekipman durumu, bakım tarihleri ve hizmet taleplerini izleyin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ekipman</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sağlıklı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.healthy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uyarı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kritik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-branch">
            <SelectValue placeholder="Şube Seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Şubeler</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-status">
            <SelectValue placeholder="Durum Seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="healthy">Sağlıklı</SelectItem>
            <SelectItem value="warning">Uyarı</SelectItem>
            <SelectItem value="critical">Kritik</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Equipment List */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Kart Görünüm</TabsTrigger>
          <TabsTrigger value="list">Liste Görünüm</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Ekipman bulunamadı</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map(eq => {
                const health = getHealthStatus(eq);
                const recentServices = getAllServices(eq.id);
                
                return (
                  <Card key={eq.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedEquipment(eq)} data-testid={`card-equipment-${eq.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{EQUIPMENT_TYPE_LABELS[eq.equipmentType] || eq.equipmentType}</CardTitle>
                          <CardDescription className="text-xs mt-1">{getBranchName(eq.branchId)}</CardDescription>
                        </div>
                        <Badge className={health.color}>
                          {health.icon}
                          <span className="ml-1 text-xs">{health.status}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {eq.serialNumber && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Seri No: </span>
                          <span className="font-mono text-xs">{eq.serialNumber}</span>
                        </div>
                      )}
                      
                      {eq.lastMaintenanceDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Son bakım: </span>
                          <span>{format(parseISO(eq.lastMaintenanceDate), 'dd MMM yyyy', { locale: tr })}</span>
                        </div>
                      )}

                      {eq.nextMaintenanceDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Sonraki bakım: </span>
                          <span>{format(parseISO(eq.nextMaintenanceDate), 'dd MMM yyyy', { locale: tr })}</span>
                        </div>
                      )}

                      {eq.warrantyEndDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Wrench className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Garanti sonu: </span>
                          <span>{format(parseISO(eq.warrantyEndDate), 'dd MMM yyyy', { locale: tr })}</span>
                        </div>
                      )}

                      {recentServices.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Son Hizmetler</div>
                          <div className="space-y-1">
                            {recentServices.map(sr => (
                              <div key={sr.id} className="text-xs bg-muted px-2 py-1 rounded">
                                {format(parseISO(sr.createdAt), 'dd MMM', { locale: tr })} - {sr.status}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Ekipman bulunamadı</div>
          ) : (
            <div className="space-y-2">
              {filteredEquipment.map(eq => {
                const health = getHealthStatus(eq);
                
                return (
                  <Card key={eq.id} className="hover-elevate cursor-pointer p-4" onClick={() => setSelectedEquipment(eq)} data-testid={`row-equipment-${eq.id}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{EQUIPMENT_TYPE_LABELS[eq.equipmentType] || eq.equipmentType}</div>
                        <div className="text-sm text-muted-foreground">{getBranchName(eq.branchId)} • Seri: {eq.serialNumber || 'N/A'}</div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {eq.nextMaintenanceDate && (
                          <div className="text-sm text-right">
                            <div className="text-muted-foreground">Sonraki Bakım</div>
                            <div className="font-medium">{format(parseISO(eq.nextMaintenanceDate), 'dd MMM', { locale: tr })}</div>
                          </div>
                        )}
                        
                        <Badge className={health.color}>
                          {health.icon}
                          <span className="ml-1">{health.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail View */}
      {selectedEquipment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ekipman Detayları</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedEquipment(null)}
              className="absolute top-4 right-4"
              data-testid="button-close-details"
            >
              Kapat
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Tür</div>
                <div className="font-medium">{EQUIPMENT_TYPE_LABELS[selectedEquipment.equipmentType] || selectedEquipment.equipmentType}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Şube</div>
                <div className="font-medium">{getBranchName(selectedEquipment.branchId)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Seri Numarası</div>
                <div className="font-mono text-sm">{selectedEquipment.serialNumber || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Durumu</div>
                <Badge className={`${getHealthStatus(selectedEquipment).color} mt-1`}>
                  {getHealthStatus(selectedEquipment).status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Satın Alma Tarihi</div>
                <div>{selectedEquipment.purchaseDate ? format(parseISO(selectedEquipment.purchaseDate), 'dd MMM yyyy', { locale: tr }) : 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Garanti Sonu</div>
                <div>{selectedEquipment.warrantyEndDate ? format(parseISO(selectedEquipment.warrantyEndDate), 'dd MMM yyyy', { locale: tr }) : 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Son Bakım</div>
                <div>{selectedEquipment.lastMaintenanceDate ? format(parseISO(selectedEquipment.lastMaintenanceDate), 'dd MMM yyyy', { locale: tr }) : 'Hiç'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sonraki Bakım</div>
                <div>{selectedEquipment.nextMaintenanceDate ? format(parseISO(selectedEquipment.nextMaintenanceDate), 'dd MMM yyyy', { locale: tr }) : 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
