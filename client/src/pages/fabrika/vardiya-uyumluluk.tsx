import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isHQRole } from "@shared/schema";
import { 
  Clock, 
  Timer, 
  TrendingDown, 
  Coffee, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  FileText,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

export default function FabrikaVardiyaUyumluluk() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [reportDialog, setReportDialog] = useState(false);
  const [accountingNotes, setAccountingNotes] = useState('');

  const isHQ = user && isHQRole(user.role as any);
  const canAccess = user?.role === 'admin' || user?.role === 'fabrika_mudur' || isHQ || user?.role === 'muhasebe';

  const weekStartStr = format(selectedWeek, 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: dailyCompliance = [], isLoading: dailyLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/factory', 'shift-compliance', 'daily', selectedDate, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await fetch(`/api/factory/shift-compliance?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canAccess,
  });

  const { data: weeklySummaries, isLoading: weeklyLoading } = useQuery<any>({
    queryKey: ['/api/factory', 'weekly-summaries', weekStartStr],
    queryFn: async () => {
      const res = await fetch(`/api/factory/weekly-summaries?weekStart=${weekStartStr}`);
      if (!res.ok) return { all: [], withMissingHours: [], totalMissingMinutes: 0 };
      return res.json();
    },
    enabled: canAccess,
  });

  const reportToAccountingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/factory/report-to-accounting", {
        summaryIds: selectedItems,
        notes: accountingNotes,
      });
    },
    onSuccess: () => {
      toast({ title: "Bildirim gönderildi", description: "Muhasebe bildirimi başarıyla oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory', 'weekly-summaries'] });
      setReportDialog(false);
      setSelectedItems([]);
      setAccountingNotes('');
    },
    onError: () => {
      toast({ title: "Hata", description: "Bildirim gönderilemedi", variant: "destructive" });
    },
  });

  if (!canAccess) {
    return <Redirect to="/" />;
  }

  const getStatusBadge = (status: string, score: number) => {
    if (status === 'compliant' || score >= 90) {
      return <Badge className="bg-green-500 text-white">Uyumlu</Badge>;
    } else if (status === 'minor_issue' || score >= 70) {
      return <Badge className="bg-yellow-500 text-white">Küçük Sorun</Badge>;
    } else if (status === 'warning' || score >= 50) {
      return <Badge className="bg-orange-500 text-white">Uyarı</Badge>;
    } else {
      return <Badge variant="destructive">Kritik</Badge>;
    }
  };

  const toggleItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  
  if (dailyLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Fabrika Vardiya Uyumluluk</h1>
          <p className="text-sm text-muted-foreground">Personel çalışma saati takibi ve muhasebe raporları</p>
        </div>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily" data-testid="tab-daily">
            <Calendar className="h-4 w-4 mr-2" />
            Günlük
          </TabsTrigger>
          <TabsTrigger value="weekly" data-testid="tab-weekly">
            <FileText className="h-4 w-4 mr-2" />
            Haftalık Özet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              data-testid="input-date"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border bg-background text-sm"
              data-testid="select-status-filter"
            >
              <option value="all">Tümü</option>
              <option value="compliant">Uyumlu</option>
              <option value="minor_issue">Küçük Sorun</option>
              <option value="warning">Uyarı</option>
              <option value="critical">Kritik</option>
            </select>
          </div>

          {dailyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : dailyCompliance.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Bu tarih için kayıt bulunamadı</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dailyCompliance.map((record: any) => (
                <Card key={record.compliance.id} className="hover-elevate" data-testid={`card-compliance-${record.compliance.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={record.user?.profilePhotoUrl} />
                        <AvatarFallback>
                          {record.user?.firstName?.[0]}{record.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {record.user?.firstName} {record.user?.lastName}
                          </span>
                          {getStatusBadge(record.compliance.complianceStatus, record.compliance.complianceScore)}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          {record.compliance.latenessMinutes > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <Timer className="h-3 w-3" />
                              {record.compliance.latenessMinutes} dk geç
                            </span>
                          )}
                          {record.compliance.earlyLeaveMinutes > 0 && (
                            <span className="flex items-center gap-1 text-orange-500">
                              <TrendingDown className="h-3 w-3" />
                              {record.compliance.earlyLeaveMinutes} dk erken
                            </span>
                          )}
                          {record.compliance.breakOverageMinutes > 0 && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Coffee className="h-3 w-3" />
                              {record.compliance.breakOverageMinutes} dk mola aşımı
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{record.compliance.complianceScore}</div>
                        <div className="text-xs text-muted-foreground">Skor</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-center">
                      <div>
                        <div className="text-muted-foreground">Çalışma</div>
                        <div className="font-medium">{Math.floor((record.compliance.effectiveWorkedMinutes || 0) / 60)}s {(record.compliance.effectiveWorkedMinutes || 0) % 60}dk</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Mesai</div>
                        <div className="font-medium text-green-600">+{record.compliance.overtimeMinutes || 0} dk</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Eksik</div>
                        <div className="font-medium text-red-500">-{record.compliance.missingMinutes || 0} dk</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(selectedWeek, 'd MMM', { locale: tr })} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: tr })}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{weeklySummaries?.all?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Personel</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">{weeklySummaries?.withMissingHours?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Eksik Saati Olan</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {Math.floor((weeklySummaries?.totalMissingMinutes || 0) / 60)}s
                  </div>
                  <div className="text-xs text-muted-foreground">Toplam Eksik</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {weeklySummaries?.withMissingHours?.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedItems.length} öğe seçildi
              </span>
              <Button 
                size="sm" 
                onClick={() => setReportDialog(true)}
                disabled={selectedItems.length === 0}
                data-testid="button-report-accounting"
              >
                <Send className="h-4 w-4 mr-2" />
                Muhasebeye Bildir
              </Button>
            </div>
          )}

          {weeklyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : weeklySummaries?.all?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Bu hafta için kayıt bulunamadı</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {weeklySummaries?.all?.map((record: any) => {
                const hasMissing = (record.summary.missingMinutes || 0) > 0;
                const isSelected = selectedItems.includes(record.summary.id);
                
                return (
                  <Card 
                    key={record.summary.id} 
                    className={`hover-elevate ${hasMissing ? 'border-orange-300 dark:border-orange-800' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    data-testid={`card-weekly-${record.summary.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {hasMissing && (
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(record.summary.id)}
                            data-testid={`checkbox-${record.summary.id}`}
                          />
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {record.user?.firstName?.[0]}{record.user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {record.user?.firstName} {record.user?.lastName}
                            </span>
                            {record.summary.reportedToAccounting && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Bildirildi
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span>{record.summary.workDaysCount || 0} gün çalışıldı</span>
                            {record.summary.lateDaysCount > 0 && (
                              <span className="text-orange-500">{record.summary.lateDaysCount} geç kalma</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.floor((record.summary.actualTotalMinutes || 0) / 60)}s / 45s
                          </div>
                          {hasMissing ? (
                            <div className="text-xs text-red-500">
                              -{Math.floor((record.summary.missingMinutes || 0) / 60)}s {(record.summary.missingMinutes || 0) % 60}dk eksik
                            </div>
                          ) : record.summary.overtimeMinutes > 0 ? (
                            <div className="text-xs text-green-500">
                              +{Math.floor(record.summary.overtimeMinutes / 60)}s mesai
                            </div>
                          ) : (
                            <div className="text-xs text-green-500">Tam</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={reportDialog} onOpenChange={setReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Muhasebeye Bildir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedItems.length} personelin eksik çalışma saati muhasebeye bildirilecek.
            </p>
            <Textarea
              placeholder="Muhasebe için notlar (isteğe bağlı)"
              value={accountingNotes}
              onChange={(e) => setAccountingNotes(e.target.value)}
              rows={3}
              data-testid="textarea-accounting-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={() => reportToAccountingMutation.mutate()}
              disabled={reportToAccountingMutation.isPending}
              data-testid="button-confirm-report"
            >
              {reportToAccountingMutation.isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
