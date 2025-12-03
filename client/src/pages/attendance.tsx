import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Clock, LogIn, LogOut, Coffee, Calendar, Camera, ChevronDown, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoQuota, setPhotoQuota] = useState({ remaining: 10, total: 10, used: 0 });

  const { data: activeShift, isLoading: activeLoading } = useQuery<unknown>({
    queryKey: ["/api/shift-attendance/active"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/shift-attendance");
        if (!res.ok) return null;
        const allShifts = await res.json();
        return allShifts.find((s) => !s.checkOutTime) || null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: attendanceHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/shift-attendance"],
    queryFn: async () => {
      const res = await fetch("/api/shift-attendance");
      if (!res.ok) throw new Error(res.statusText);
      const allShifts = await res.json();
      return allShifts.filter((s) => s.checkOutTime).slice(0, 10);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!activeShift || !activeShift.checkInTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const checkInTime = new Date(activeShift.checkInTime).getTime();
      let elapsed = now - checkInTime;

      if (activeShift.breakStartTime && !activeShift.breakEndTime) {
        const breakStart = new Date(activeShift.breakStartTime).getTime();
        elapsed -= (now - breakStart);
      } else if (activeShift.breakStartTime && activeShift.breakEndTime) {
        const breakStart = new Date(activeShift.breakStartTime).getTime();
        const breakEnd = new Date(activeShift.breakEndTime).getTime();
        elapsed -= (breakEnd - breakStart);
      }

      setElapsedTime(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeShift]);

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedPhotoUrl) {
        throw new Error("Fotoğraf yüklemesi zorunludur");
      }
      return apiRequest("POST", "/api/shift-attendance", {
        photoUrl: uploadedPhotoUrl,
      });
    },
    onSuccess: (data) => {
      const analysisResult = data.analysisDetails;
      const isCompliant = analysisResult?.isCompliant ?? true;
      
      toast({
        title: isCompliant ? "✅ Giriş Başarılı" : "⚠️ Giriş Yapıldı - Uyarı",
        description: isCompliant 
          ? "Dress code uyumlu. Vardiyaya giriş yapıldı." 
          : "Dress code uyumsuzluk tespit edildi. Supervisor ile görüşün.",
        variant: isCompliant ? "default" : "destructive",
      });
      
      setUploadedPhotoUrl(null);
      if (data.quota) {
        setPhotoQuota(data.quota);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Giriş yapılamadı",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest(`/api/shift-attendance/${activeShift.id}`, "PATCH", {
        checkOutTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Vardiyadan çıkış yapıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Çıkış yapılamadı",
        variant: "destructive",
      });
    },
  });

  const startBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest(`/api/shift-attendance/${activeShift.id}`, "PATCH", {
        breakStartTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Mola başlatıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Mola başlatılamadı",
        variant: "destructive",
      });
    },
  });

  const endBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest(`/api/shift-attendance/${activeShift.id}`, "PATCH", {
        breakEndTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Mola sonlandırıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Mola sonlandırılamadı",
        variant: "destructive",
      });
    },
  });

  const isOnBreak = activeShift?.breakStartTime && !activeShift?.breakEndTime;
  const canStartBreak = activeShift && !activeShift.breakStartTime;
  const canEndBreak = isOnBreak;

  return (
    <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Devam Takibi</h1>
        <p className="text-muted-foreground">Vardiya giriş/çıkış ve mola yönetimi</p>
      </div>

      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {activeShift ? "Aktif Vardiya" : "Vardiya Durumu"}
            </CardTitle>
            <CardDescription>
              {activeShift
                ? "Vardiyada çalışıyorsunuz"
                : "Vardiyaya giriş yapmadınız"}
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full space-y-2 sm:space-y-3">
            {activeLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : activeShift ? (
              <>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Giriş Saati</span>
                    <span className="font-medium" data-testid="text-checkin-time">
                      {format(new Date(activeShift.checkInTime), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Geçen Süre</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-elapsed-time">
                      {formatElapsedTime(elapsedTime)}
                    </span>
                  </div>
                  {isOnBreak && (
                    <Badge variant="secondary" className="w-full justify-center" data-testid="badge-on-break">
                      <Coffee className="mr-2 h-3 w-3" />
                      Molada
                    </Badge>
                  )}

                  {activeShift.analysisDetails && (
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Dress Code</span>
                        {activeShift.analysisStatus === 'completed' ? (
                          activeShift.analysisDetails.isCompliant ? (
                            <Badge variant="default" className="bg-success" data-testid="badge-dress-code-compliant">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Uyumlu
                            </Badge>
                          ) : (
                            <Badge variant="destructive" data-testid="badge-dress-code-noncompliant">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Uyumsuz
                            </Badge>
                          )
                        ) : activeShift.analysisStatus === 'pending' ? (
                          <Badge variant="secondary" data-testid="badge-dress-code-pending">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Beklemede
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid="badge-dress-code-error">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Hata
                          </Badge>
                        )}
                      </div>
                      
                      {activeShift.aiWarnings && activeShift.aiWarnings.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="button-toggle-warnings">
                            <ChevronDown className="h-4 w-4" />
                            Uyarılar ({activeShift.aiWarnings.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <ul className="text-sm space-y-1 list-disc pl-5" data-testid="list-ai-warnings">
                              {activeShift.aiWarnings.map((warning: string, idx: number) => (
                                <li key={idx} className="text-destructive">{warning}</li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {canStartBreak && (
                    <Button
                      onClick={() => startBreakMutation.mutate()}
                      disabled={startBreakMutation.isPending}
                      variant="outline"
                      data-testid="button-start-break"
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Mola Başlat
                    </Button>
                  )}
                  {canEndBreak && (
                    <Button
                      onClick={() => endBreakMutation.mutate()}
                      disabled={endBreakMutation.isPending}
                      variant="outline"
                      data-testid="button-end-break"
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Mola Bitir
                    </Button>
                  )}
                  <Button
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                    variant="destructive"
                    data-testid="button-checkout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full space-y-2 sm:space-y-3">
                {uploadedPhotoUrl ? (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="relative aspect-video rounded-lg overflow-hidden border">
                      <img 
                        src={uploadedPhotoUrl} 
                        alt="Giriş fotoğrafı" 
                        className="w-full h-full object-cover"
                        data-testid="img-uploaded-photo"
                      />
                    </div>
                    <Button
                      onClick={() => setUploadedPhotoUrl(null)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      data-testid="button-remove-photo"
                    >
                      Fotoğrafı Değiştir
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Giriş yapmak için fotoğraf yüklemesi zorunludur
                    </p>
                    <ObjectUploader
                      maxFileSize={10485760}
                      onGetUploadParameters={async () => {
                        const res = await fetch("/api/objects/upload", { method: "POST" });
                        if (!res.ok) throw new Error("Upload URL alınamadı");
                        return res.json();
                      }}
                      onComplete={(result) => {
                        if (result.successful && result.successful[0]) {
                          setUploadedPhotoUrl(result.successful[0].uploadURL);
                          toast({
                            title: "Başarılı",
                            description: "Fotoğraf yüklendi",
                          });
                        }
                      }}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle
                    </ObjectUploader>
                    <p className="text-xs text-muted-foreground text-center" data-testid="text-photo-quota">
                      Kalan analiz hakkı: {photoQuota.remaining}/{photoQuota.total}
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending || !uploadedPhotoUrl}
                  className="w-full"
                  size="lg"
                  data-testid="button-checkin"
                >
                  {checkInMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analiz Ediliyor...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Vardiyaya Giriş
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bu Hafta
            </CardTitle>
            <CardDescription>Toplam çalışma süresi özeti</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Vardiya</span>
                  <span className="text-2xl font-bold" data-testid="text-total-shifts">
                    {attendanceHistory.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Çalışma</span>
                  <span className="font-medium" data-testid="text-total-worked">
                    {formatElapsedTime(
                      attendanceHistory.reduce((sum, s) => sum + (s.totalWorkedMinutes || 0), 0) * 60000
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devam Geçmişi</CardTitle>
          <CardDescription>Son 10 vardiya kaydı</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex flex-col gap-3 sm:gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fotoğraf</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Giriş</TableHead>
                  <TableHead>Çıkış</TableHead>
                  <TableHead>Çalışma</TableHead>
                  <TableHead>Dress Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Devam kaydı bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceHistory.map((record) => (
                    <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                      <TableCell>
                        {record.photoUrl ? (
                          <div className="w-12 h-12 rounded overflow-hidden border">
                            <img 
                              src={record.photoUrl} 
                              alt="Check-in" 
                              className="w-full h-full object-cover"
                              data-testid={`img-photo-${record.id}`}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(new Date(record.shiftDate), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        {record.checkInTime
                          ? format(new Date(record.checkInTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime
                          ? format(new Date(record.checkOutTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.totalWorkedMinutes
                          ? `${Math.floor(record.totalWorkedMinutes / 60)}s ${record.totalWorkedMinutes % 60}d`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.analysisDetails ? (
                          record.analysisDetails.isCompliant ? (
                            <Badge variant="default" className="bg-success" data-testid={`badge-compliant-${record.id}`}>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Uyumlu
                            </Badge>
                          ) : (
                            <Badge variant="destructive" data-testid={`badge-noncompliant-${record.id}`}>
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Uyumsuz
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-no-analysis-${record.id}`}>
                            -
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
