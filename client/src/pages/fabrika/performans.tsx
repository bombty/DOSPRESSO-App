import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Factory,
  AlertTriangle,
  Award,
  Clock,
  RefreshCw,
  Trash2,
  Target,
  Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface WorkerPerformance {
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  totalProduced: number;
  totalWaste: number;
  totalHours: number;
  efficiency: number;
  avgProductionPerHour: number;
  qualityApproved: number;
  qualityRejected: number;
  stationsWorked: string[];
}

interface StationPerformance {
  stationId: number;
  stationName: string;
  totalProduced: number;
  totalWaste: number;
  wastePercentage: number;
  avgOutputPerHour: number;
  workerCount: number;
}

interface WasteAnalysis {
  reasonId: number;
  reasonName: string;
  category: string;
  count: number;
  percentage: number;
}

const CHART_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function FabrikaPerformans() {
  const [period, setPeriod] = useState("weekly");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: workerStats = [], isLoading: loadingWorkers, refetch } = useQuery<WorkerPerformance[]>({
    queryKey: ['/api/factory/analytics/workers', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/analytics/workers?period=${period}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch worker stats');
      return res.json();
    },
  });

  const { data: stationStats = [], isLoading: loadingStations } = useQuery<StationPerformance[]>({
    queryKey: ['/api/factory/analytics/stations', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/analytics/stations?period=${period}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch station stats');
      return res.json();
    },
  });

  const { data: wasteAnalysis = [], isLoading: loadingWaste } = useQuery<WasteAnalysis[]>({
    queryKey: ['/api/factory/analytics/waste', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/analytics/waste?period=${period}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch waste analysis');
      return res.json();
    },
  });

  const totalProduction = workerStats.reduce((sum, w) => sum + w.totalProduced, 0);
  const totalWaste = workerStats.reduce((sum, w) => sum + w.totalWaste, 0);
  const avgEfficiency = workerStats.length > 0 
    ? (workerStats.reduce((sum, w) => sum + w.efficiency, 0) / workerStats.length).toFixed(1)
    : 0;

  const topPerformers = [...workerStats]
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 5);

  const highWasteWorkers = [...workerStats]
    .filter(w => w.totalWaste > 0)
    .sort((a, b) => (b.totalWaste / (b.totalProduced + b.totalWaste)) - (a.totalWaste / (a.totalProduced + a.totalWaste)))
    .slice(0, 5);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika Performans Analitiği</h1>
            <p className="text-muted-foreground">Üretim verimliliği ve personel performansı</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Bugün</SelectItem>
              <SelectItem value="weekly">Bu Hafta</SelectItem>
              <SelectItem value="monthly">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Factory className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Üretim</p>
                <p className="text-2xl font-bold" data-testid="text-total-production">{totalProduction}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Zaiyat</p>
                <p className="text-2xl font-bold" data-testid="text-total-waste">{totalWaste}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ort. Verimlilik</p>
                <p className="text-2xl font-bold" data-testid="text-avg-efficiency">%{avgEfficiency}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktif Personel</p>
                <p className="text-2xl font-bold" data-testid="text-worker-count">{workerStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="workers" data-testid="tab-workers">Personel</TabsTrigger>
          <TabsTrigger value="stations" data-testid="tab-stations">İstasyonlar</TabsTrigger>
          <TabsTrigger value="waste" data-testid="tab-waste">Zaiyat Analizi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  En İyi Performans
                </CardTitle>
                <CardDescription>Verimlilik bazında sıralama</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingWorkers ? (
                  <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                ) : topPerformers.length > 0 ? (
                  <div className="space-y-4">
                    {topPerformers.map((worker, index) => (
                      <div key={worker.userId} className="flex items-center gap-3" data-testid={`top-performer-${index}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-muted'
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={worker.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-amber-600 text-white">
                            {worker.firstName[0]}{worker.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{worker.firstName} {worker.lastName}</p>
                          <p className="text-sm text-muted-foreground">{worker.totalProduced} üretim</p>
                        </div>
                        <Badge className={worker.efficiency >= 90 ? 'bg-green-600' : worker.efficiency >= 70 ? 'bg-amber-600' : 'bg-red-600'}>
                          %{worker.efficiency.toFixed(0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz veri yok</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Yüksek Zaiyat Oranı
                </CardTitle>
                <CardDescription>Dikkat gerektiren personeller</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingWorkers ? (
                  <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                ) : highWasteWorkers.length > 0 ? (
                  <div className="space-y-4">
                    {highWasteWorkers.map((worker) => {
                      const wasteRate = ((worker.totalWaste / (worker.totalProduced + worker.totalWaste)) * 100).toFixed(1);
                      return (
                        <div key={worker.userId} className="flex items-center gap-3" data-testid={`high-waste-${worker.userId}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={worker.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-red-600 text-white">
                              {worker.firstName[0]}{worker.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{worker.firstName} {worker.lastName}</p>
                            <p className="text-sm text-muted-foreground">{worker.totalWaste} zaiyat / {worker.totalProduced} üretim</p>
                          </div>
                          <Badge variant="destructive">%{wasteRate}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Yüksek zaiyat oranı yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {stationStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>İstasyon Bazlı Üretim</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stationStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stationName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalProduced" name="Üretim" fill="#10b981" />
                      <Bar dataKey="totalWaste" name="Zaiyat" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <CardTitle>Personel Performans Tablosu</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkers ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : workerStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Personel</TableHead>
                      <TableHead>Üretim</TableHead>
                      <TableHead>Zaiyat</TableHead>
                      <TableHead>Verimlilik</TableHead>
                      <TableHead>Ort. Üretim/Saat</TableHead>
                      <TableHead>Kalite Onay</TableHead>
                      <TableHead>İstasyonlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerStats.map((worker) => (
                      <TableRow key={worker.userId} data-testid={`row-worker-${worker.userId}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={worker.profileImageUrl || undefined} />
                              <AvatarFallback className="bg-amber-600 text-white text-xs">
                                {worker.firstName[0]}{worker.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{worker.firstName} {worker.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{worker.totalProduced}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-500">{worker.totalWaste}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={worker.efficiency} className="w-16 h-2" />
                            <span className={worker.efficiency >= 80 ? 'text-green-600' : worker.efficiency >= 60 ? 'text-amber-600' : 'text-red-600'}>
                              %{worker.efficiency.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{worker.avgProductionPerHour.toFixed(1)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge className="bg-green-600">{worker.qualityApproved}</Badge>
                            {worker.qualityRejected > 0 && (
                              <Badge variant="destructive">{worker.qualityRejected}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {worker.stationsWorked.slice(0, 3).map((station, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{station}</Badge>
                            ))}
                            {worker.stationsWorked.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{worker.stationsWorked.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Seçilen dönemde veri yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <CardTitle>İstasyon Performansları</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStations ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : stationStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İstasyon</TableHead>
                      <TableHead>Toplam Üretim</TableHead>
                      <TableHead>Toplam Zaiyat</TableHead>
                      <TableHead>Zaiyat Oranı</TableHead>
                      <TableHead>Ort. Üretim/Saat</TableHead>
                      <TableHead>Çalışan Sayısı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationStats.map((station) => (
                      <TableRow key={station.stationId} data-testid={`row-station-${station.stationId}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{station.stationName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{station.totalProduced}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-500">{station.totalWaste}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={station.wastePercentage < 5 ? 'secondary' : station.wastePercentage < 10 ? 'outline' : 'destructive'}>
                            %{station.wastePercentage.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{station.avgOutputPerHour.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{station.workerCount} kişi</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Factory className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Seçilen dönemde veri yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Zaiyat Nedenleri Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWaste ? (
                  <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                ) : wasteAnalysis.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={wasteAnalysis}
                          dataKey="count"
                          nameKey="reasonName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {wasteAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Zaiyat kaydı yok</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zaiyat Detayları</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWaste ? (
                  <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                ) : wasteAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    {wasteAnalysis.map((reason, index) => (
                      <div key={reason.reasonId} className="flex items-center gap-3" data-testid={`waste-reason-${reason.reasonId}`}>
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} 
                        />
                        <div className="flex-1">
                          <p className="font-medium">{reason.reasonName}</p>
                          <p className="text-sm text-muted-foreground">{reason.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{reason.count}</p>
                          <p className="text-sm text-muted-foreground">%{reason.percentage.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Zaiyat kaydı yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
