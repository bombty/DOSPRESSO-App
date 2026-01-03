import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  Clock, 
  Coffee, 
  Play, 
  Timer,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronRight
} from "lucide-react";

interface ActiveSession {
  session: {
    id: number;
    userId: string;
    branchId: number;
    checkInTime: string;
    status: string;
    breakMinutes: number;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    role: string;
  };
}

interface DailySummary {
  summary: {
    id: number;
    userId: string;
    branchId: number;
    workDate: string;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    netWorkMinutes: number;
    sessionCount: number;
    firstCheckIn: string;
    lastCheckOut: string | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function SubeDashboard() {
  const { user } = useAuth();
  const branchId = user?.branchId || 1;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: activeSessions = [], isLoading: loadingActive, refetch: refetchActive } = useQuery<ActiveSession[]>({
    queryKey: ['/api/branches', branchId, 'kiosk', 'active-shifts'],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/kiosk/active-shifts`);
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: dailySummaries = [], isLoading: loadingDaily } = useQuery<DailySummary[]>({
    queryKey: ['/api/branches', branchId, 'attendance', 'daily', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/attendance/daily?date=${selectedDate}`);
      return res.json();
    },
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}s ${mins}dk`;
    }
    return `${mins}dk`;
  };

  const calculateElapsedTime = (checkInTime: string) => {
    const start = new Date(checkInTime).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 60000);
    return formatMinutes(elapsed);
  };

  const activeCount = activeSessions.filter(s => s.session.status === 'active').length;
  const onBreakCount = activeSessions.filter(s => s.session.status === 'on_break').length;
  const totalActiveMinutes = dailySummaries.reduce((sum, s) => sum + (s.summary.netWorkMinutes || 0), 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Şube Vardiya Takibi</h1>
          <p className="text-muted-foreground">Gerçek zamanlı personel durumu</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchActive()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Badge variant={autoRefresh ? "default" : "secondary"}>
            {autoRefresh ? "Otomatik yenileme açık" : "Otomatik yenileme kapalı"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Aktif Çalışan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onBreakCount}</p>
                <p className="text-sm text-muted-foreground">Molada</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
                <p className="text-sm text-muted-foreground">Toplam Vardiyada</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatMinutes(totalActiveMinutes)}</p>
                <p className="text-sm text-muted-foreground">Bugün Toplam</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            <Play className="h-4 w-4 mr-2" />
            Aktif Vardiyalar
          </TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">
            <Calendar className="h-4 w-4 mr-2" />
            Günlük Özet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Şu An Vardiyada Olanlar
              </CardTitle>
              <CardDescription>
                Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Şu anda vardiyada personel yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map(({ session, user }) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                      data-testid={`active-session-${session.id}`}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Giriş: {formatTime(session.checkInTime)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>Süre: {calculateElapsedTime(session.checkInTime)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.breakMinutes > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Coffee className="h-3 w-3 mr-1" />
                            {formatMinutes(session.breakMinutes)} mola
                          </Badge>
                        )}
                        <Badge variant={session.status === 'on_break' ? 'secondary' : 'default'}>
                          {session.status === 'on_break' ? (
                            <>
                              <Coffee className="h-3 w-3 mr-1" />
                              Molada
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Çalışıyor
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Günlük Puantaj Özeti
                </CardTitle>
                <CardDescription>
                  Tarih seçerek geçmiş günleri görüntüleyebilirsiniz
                </CardDescription>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                data-testid="input-date"
              />
            </CardHeader>
            <CardContent>
              {loadingDaily ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : dailySummaries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bu tarihte kayıtlı vardiya yok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Personel</th>
                        <th className="text-center py-3 px-4 font-medium">Giriş</th>
                        <th className="text-center py-3 px-4 font-medium">Çıkış</th>
                        <th className="text-center py-3 px-4 font-medium">Toplam</th>
                        <th className="text-center py-3 px-4 font-medium">Mola</th>
                        <th className="text-center py-3 px-4 font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummaries.map(({ summary, user }) => (
                        <tr key={summary.id} className="border-b last:border-0" data-testid={`summary-row-${summary.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user?.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 text-sm">
                            {summary.firstCheckIn ? formatTime(summary.firstCheckIn) : '-'}
                          </td>
                          <td className="text-center py-3 px-4 text-sm">
                            {summary.lastCheckOut ? formatTime(summary.lastCheckOut) : '-'}
                          </td>
                          <td className="text-center py-3 px-4 text-sm">
                            {formatMinutes(summary.totalWorkMinutes || 0)}
                          </td>
                          <td className="text-center py-3 px-4 text-sm">
                            {formatMinutes(summary.totalBreakMinutes || 0)}
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant={
                              (summary.netWorkMinutes || 0) >= 450 ? 'default' : 
                              (summary.netWorkMinutes || 0) >= 360 ? 'secondary' : 'destructive'
                            }>
                              {formatMinutes(summary.netWorkMinutes || 0)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
