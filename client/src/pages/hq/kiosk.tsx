import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  LogIn,
  LogOut,
  User,
  Lock,
  Clock,
  Coffee,
  CheckCircle2,
  ChevronLeft,
  Briefcase,
  UserCircle,
  Timer,
  MapPin,
  ArrowLeft,
} from "lucide-react";

type HqKioskStep = "select-user" | "enter-pin" | "working" | "exit-dialog" | "end-summary";

interface HqStaff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImageUrl: string | null;
  hasPin: boolean;
}

interface HqSession {
  id: number;
  userId: string;
  checkInTime: string;
  checkOutTime: string | null;
  workMinutes: number;
  breakMinutes: number;
  netWorkMinutes: number;
  outsideMinutes: number;
  status: string;
}

interface HqEvent {
  id: number;
  sessionId: number;
  eventType: string;
  exitReason: string | null;
  exitDescription: string | null;
  estimatedReturnTime: string | null;
  eventTime: string;
}

export default function HqKiosk() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<HqKioskStep>("select-user");
  const [staffList, setStaffList] = useState<HqStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedUser, setSelectedUser] = useState<HqStaff | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [currentSession, setCurrentSession] = useState<HqSession | null>(null);
  const [sessionEvents, setSessionEvents] = useState<HqEvent[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exitReason, setExitReason] = useState<string>("");
  const [exitDescription, setExitDescription] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(15);
  const [showEndDayConfirm, setShowEndDayConfirm] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await fetch("/api/hq/kiosk/staff");
      const data = await res.json();
      setStaffList(data);
    } catch (error) {
      console.error("HQ staff fetch error:", error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (data: { userId: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/hq/kiosk/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
        fetchSessionDetails(data.user.id);
      }
      setStep("working");
      toast({ title: "Giris basarili", description: `Hos geldin ${data.user.firstName}` });
    },
    onError: (error: any) => {
      toast({ title: "Giris basarisiz", description: error.message, variant: "destructive" });
      setPinInput("");
    },
  });

  const startShiftMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/hq/kiosk/shift-start", { userId });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      toast({ title: "Vardiya basladi", description: "Iyi calismalar!" });
    },
    onError: (error: any) => {
      toast({ title: "Vardiya baslatilamadi", description: error.message, variant: "destructive" });
    },
  });

  const exitMutation = useMutation({
    mutationFn: async (data: {
      sessionId: number;
      exitReason: string;
      exitDescription?: string;
      estimatedReturnTime?: string;
    }) => {
      const res = await apiRequest("POST", "/api/hq/kiosk/exit", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.summary) {
        setShiftSummary(data.summary);
        setStep("end-summary");
      } else {
        setCurrentSession(data.session);
        setStep("working");
        toast({
          title: exitReason === "break" ? "Mola basladi" : "Dis gorev kaydedildi",
          description: exitReason === "break" ? "İyi dinlenmeler!" : "Başarılar!",
        });
      }
      setExitReason("");
      setExitDescription("");
      setEstimatedReturn("");
    },
    onError: (error: any) => {
      toast({ title: "Islem basarisiz", description: error.message, variant: "destructive" });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest("POST", "/api/hq/kiosk/return", { sessionId });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      toast({
        title: "Donus kaydedildi",
        description: `${data.exitDuration} dakika disarida kalindi`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Donus kaydedilemedi", description: error.message, variant: "destructive" });
    },
  });

  const fetchSessionDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/hq/kiosk/session/${userId}`);
      const data = await res.json();
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
      }
      if (data.events) {
        setSessionEvents(data.events);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentSession && !["completed"].includes(currentSession.status)) {
      interval = setInterval(() => {
        const startTime = new Date(currentSession.checkInTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "end-summary") {
      interval = setInterval(() => {
        setAutoLogoutCountdown((prev) => {
          if (prev <= 1) {
            resetKiosk();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const resetKiosk = () => {
    setStep("select-user");
    setSelectedUser(null);
    setPinInput("");
    setCurrentSession(null);
    setSessionEvents([]);
    setElapsedTime(0);
    setShiftSummary(null);
    setAutoLogoutCountdown(15);
    setExitReason("");
    setExitDescription("");
    setEstimatedReturn("");
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours} saat ${mins} dk`;
    return `${mins} dk`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "on_break": return "bg-yellow-500";
      case "outside": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Çalışıyor";
      case "on_break": return "Molada";
      case "outside": return "Dis Gorevde";
      default: return status;
    }
  };

  const renderSelectUser = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-hq-kiosk-title">HQ Kiosk</h1>
          <p className="text-sm text-muted-foreground">Merkez Ofis Personel Takibi</p>
        </div>
      </div>

      {loadingStaff ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {staffList.map((staff) => (
            <Card
              key={staff.id}
              className="cursor-pointer hover-elevate"
              onClick={() => {
                setSelectedUser(staff);
                setStep("enter-pin");
              }}
              data-testid={`hq-staff-card-${staff.id}`}
            >
              <CardContent className="flex flex-col items-center p-4">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarImage src={staff.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                    {staff.firstName?.[0]}{staff.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-center">{staff.firstName} {staff.lastName}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {staff.role}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {staffList.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              HQ personeli bulunamadi
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEnterPin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => {
              setSelectedUser(null);
              setPinInput("");
              setStep("select-user");
            }}
            data-testid="button-back-pin"
          >
            <ChevronLeft className="h-5 w-5 mr-1" /> Geri
          </Button>
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={selectedUser?.profileImageUrl || undefined} />
            <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
              {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <CardTitle>{selectedUser?.firstName} {selectedUser?.lastName}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" /> PIN kodunuzu girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-bold ${
                    pinInput.length > i
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-muted"
                  }`}
                >
                  {pinInput.length > i ? "\u2022" : ""}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"].map((num, idx) => (
                <Button
                  key={idx}
                  variant={num === "" ? "ghost" : "outline"}
                  size="lg"
                  className="h-14 text-xl"
                  disabled={num === "" || loginMutation.isPending}
                  data-testid={`hq-pin-keypad-${num}`}
                  onClick={() => {
                    if (num === "del") {
                      setPinInput((prev) => prev.slice(0, -1));
                    } else if (typeof num === "number" && pinInput.length < 4) {
                      const newPin = pinInput + num;
                      setPinInput(newPin);
                      if (newPin.length === 4) {
                        loginMutation.mutate({ userId: selectedUser!.id, pin: newPin });
                      }
                    }
                  }}
                >
                  {num === "del" ? "\u232B" : num}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderWorking = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={selectedUser?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{selectedUser?.firstName} {selectedUser?.lastName}</p>
            {currentSession && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(currentSession.status)}`} />
                <span className="text-sm text-muted-foreground">{getStatusText(currentSession.status)}</span>
              </div>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={resetKiosk} data-testid="button-hq-logout">
          <LogOut className="h-4 w-4 mr-2" /> Cikis
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Vardiya Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!currentSession ? (
              <div className="text-center py-8">
                <Timer className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg mb-6">Vardiya baslatilmadi</p>
                <Button
                  size="lg"
                  onClick={() => selectedUser && startShiftMutation.mutate(selectedUser.id)}
                  disabled={startShiftMutation.isPending}
                  data-testid="button-hq-start-shift"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  {startShiftMutation.isPending ? "Baslatiliyor..." : "Vardiya Baslat"}
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-5xl font-mono font-bold" data-testid="text-hq-elapsed-time">
                    {formatTime(elapsedTime)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Baslangic: {new Date(currentSession.checkInTime).toLocaleTimeString("tr-TR")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Mola</p>
                    <p className="font-semibold">{formatMinutes(currentSession.breakMinutes || 0)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Dis Gorev</p>
                    <p className="font-semibold">{formatMinutes(currentSession.outsideMinutes || 0)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Net Calisma</p>
                    <p className="font-semibold">{formatMinutes(Math.max(0, Math.floor(elapsedTime / 60) - (currentSession.breakMinutes || 0) - (currentSession.outsideMinutes || 0)))}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {currentSession.status === "active" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setExitReason("break");
                          setStep("exit-dialog");
                        }}
                        data-testid="button-hq-break"
                      >
                        <Coffee className="h-4 w-4 mr-2" /> Mola
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setExitReason("external_task");
                          setStep("exit-dialog");
                        }}
                        data-testid="button-hq-external"
                      >
                        <Briefcase className="h-4 w-4 mr-2" /> Dis Gorev
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setExitReason("personal");
                          setStep("exit-dialog");
                        }}
                        data-testid="button-hq-personal"
                      >
                        <UserCircle className="h-4 w-4 mr-2" /> Kisisel Izin
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setShowEndDayConfirm(true)}
                        data-testid="button-hq-end-day"
                      >
                        <LogOut className="h-4 w-4 mr-2" /> Gun Sonu
                      </Button>
                    </div>
                  )}

                  {(currentSession.status === "on_break" || currentSession.status === "outside") && (
                    <Button
                      className="w-full"
                      onClick={() => returnMutation.mutate(currentSession.id)}
                      disabled={returnMutation.isPending}
                      data-testid="button-hq-return"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {returnMutation.isPending ? "Kaydediliyor..." : "Ofise Don"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Olay Gecmisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Henuz olay yok</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {sessionEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      event.eventType.includes("start") ? "bg-red-400" :
                      event.eventType.includes("end") ? "bg-green-400" :
                      event.eventType === "check_in" ? "bg-blue-400" :
                      "bg-gray-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {event.eventType === "check_in" && "Giris yapildi"}
                        {event.eventType === "break_start" && "Mola basladi"}
                        {event.eventType === "break_end" && "Moladan dondu"}
                        {event.eventType === "outside_start" && `Dis cikis: ${event.exitReason === "external_task" ? "Dis Gorev" : "Kisisel"}`}
                        {event.eventType === "outside_end" && "Dondu"}
                        {event.eventType === "check_out" && "Gun sonu"}
                      </p>
                      {event.exitDescription && (
                        <p className="text-xs text-muted-foreground truncate">{event.exitDescription}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.eventTime).toLocaleTimeString("tr-TR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showEndDayConfirm} onOpenChange={setShowEndDayConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gun Sonu</AlertDialogTitle>
            <AlertDialogDescription>
              Vardiyayi sonlandirmak istediginize emin misiniz? Bu islem geri alinamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-end-day">Iptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (currentSession) {
                  exitMutation.mutate({
                    sessionId: currentSession.id,
                    exitReason: "end_of_day",
                  });
                }
              }}
              data-testid="button-confirm-end-day"
            >
              Onayla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderExitDialog = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => {
              setExitReason("");
              setExitDescription("");
              setEstimatedReturn("");
              setStep("working");
            }}
            data-testid="button-back-exit"
          >
            <ChevronLeft className="h-5 w-5 mr-1" /> Geri
          </Button>
          <CardTitle className="text-center">
            {exitReason === "break" && "Mola"}
            {exitReason === "external_task" && "Dis Gorev"}
            {exitReason === "personal" && "Kisisel Izin"}
          </CardTitle>
          <CardDescription className="text-center">
            {exitReason === "break" && "Mola suresini belirtin"}
            {exitReason === "external_task" && "Dis gorev detaylarini girin"}
            {exitReason === "personal" && "Kisisel izin sebebini belirtin"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(exitReason === "external_task" || exitReason === "personal") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {exitReason === "external_task" ? "Görev Açıklaması" : "Sebep"}
              </label>
              <Textarea
                placeholder={exitReason === "external_task" ? "Dis gorev aciklamasi..." : "Kisisel izin sebebi..."}
                value={exitDescription}
                onChange={(e) => setExitDescription(e.target.value)}
                className="resize-none"
                data-testid="input-exit-description"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tahmini Donus Saati</label>
            <Input
              type="time"
              value={estimatedReturn}
              onChange={(e) => setEstimatedReturn(e.target.value)}
              data-testid="input-estimated-return"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (currentSession) {
                let estReturnTime: string | undefined;
                if (estimatedReturn) {
                  const today = new Date();
                  const [hours, mins] = estimatedReturn.split(":").map(Number);
                  today.setHours(hours, mins, 0, 0);
                  estReturnTime = today.toISOString();
                }
                exitMutation.mutate({
                  sessionId: currentSession.id,
                  exitReason,
                  exitDescription: exitDescription || undefined,
                  estimatedReturnTime: estReturnTime,
                });
              }
            }}
            disabled={exitMutation.isPending}
            data-testid="button-confirm-exit"
          >
            {exitMutation.isPending ? "Kaydediliyor..." : "Onayla ve Cik"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderEndSummary = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle>Vardiya Tamamlandi</CardTitle>
          <CardDescription>
            {autoLogoutCountdown} saniye sonra otomatik cikis yapilacak
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shiftSummary && (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Toplam Sure</span>
                <span className="font-semibold">{formatMinutes(shiftSummary.totalMinutes)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Mola</span>
                <span className="font-semibold">{formatMinutes(shiftSummary.breakMinutes)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Dis Gorev</span>
                <span className="font-semibold">{formatMinutes(shiftSummary.outsideMinutes)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/50">
                <span className="text-sm font-medium">Net Calisma</span>
                <span className="font-bold text-lg">{formatMinutes(shiftSummary.netWorkMinutes)}</span>
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={resetKiosk} data-testid="button-hq-back-home">
            Ana Sayfaya Don
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const exitButton = (
    <Button
      variant="outline"
      size="sm"
      className="fixed top-4 right-4 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
      onClick={() => setLocation("/")}
      data-testid="button-kiosk-exit"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Kiosk'tan Cik
    </Button>
  );

  if (!step || step === "select-user") return <>{renderSelectUser()}{exitButton}</>;
  if (step === "enter-pin") return <>{renderEnterPin()}{exitButton}</>;
  if (step === "exit-dialog") return <>{renderExitDialog()}{exitButton}</>;
  if (step === "end-summary") return <>{renderEndSummary()}{exitButton}</>;
  return <>{renderWorking()}{exitButton}</>;
}
