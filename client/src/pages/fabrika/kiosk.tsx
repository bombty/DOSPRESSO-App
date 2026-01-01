import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Factory, 
  LogIn, 
  LogOut, 
  Play, 
  RefreshCw, 
  Timer, 
  Package, 
  AlertTriangle,
  Check,
  User,
  Lock,
  Settings,
  ArrowRight,
  Clock,
  Trash2,
  Coffee,
  HandHelping,
  CircleUser,
  StopCircle,
  CheckCircle2
} from "lucide-react";

type KioskStep = 'select-user' | 'enter-pin' | 'select-station' | 'working' | 'stop-options' | 'production-entry' | 'end-shift-summary' | 'auto-logout';
type BreakReason = 'mola' | 'yardim' | 'ozel_ihtiyac' | 'gorev_bitis';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}

interface Station {
  id: number;
  name: string;
  code: string;
  category: string | null;
  targetHourlyOutput: number | null;
}

interface WasteReason {
  id: number;
  code: string;
  name: string;
  category: string;
}

interface Session {
  id: number;
  userId: string;
  stationId: number;
  checkInTime: string;
  totalProduced: number;
  totalWaste: number;
  status: string;
}

interface ProductionRun {
  id: number;
  sessionId: number;
  stationId: number;
  startTime: string;
  quantityProduced: number;
  quantityWaste: number;
}

const BREAK_OPTIONS = [
  { value: 'mola' as BreakReason, label: 'Mola', icon: Coffee, description: 'Kısa ara (yemek, dinlenme)', color: 'bg-blue-600' },
  { value: 'yardim' as BreakReason, label: 'Başka İstasyonda Yardım', icon: HandHelping, description: 'Farklı istasyonda destek', color: 'bg-purple-600' },
  { value: 'ozel_ihtiyac' as BreakReason, label: 'Özel İhtiyaç', icon: CircleUser, description: 'WC, kişisel ihtiyaç', color: 'bg-orange-500' },
  { value: 'gorev_bitis' as BreakReason, label: 'Görev Sonlandırma', icon: CheckCircle2, description: 'Bu istasyondaki işi bitir', color: 'bg-green-600' },
];

export default function FactoryKiosk() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<KioskStep>('select-user');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentProductionRun, setCurrentProductionRun] = useState<ProductionRun | null>(null);
  const [currentStationInfo, setCurrentStationInfo] = useState<Station | null>(null);
  const [quantityProduced, setQuantityProduced] = useState('');
  const [producedUnit, setProducedUnit] = useState('adet');
  const [quantityWaste, setQuantityWaste] = useState('');
  const [wasteUnit, setWasteUnit] = useState('adet');
  const [selectedWasteReason, setSelectedWasteReason] = useState<number | null>(null);
  const [wasteNotes, setWasteNotes] = useState('');
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedBreakReason, setSelectedBreakReason] = useState<BreakReason | null>(null);
  const [targetStationId, setTargetStationId] = useState<number | null>(null);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(10);

  const { data: staffList = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['/api/factory/staff'],
  });

  const { data: stations = [], isLoading: loadingStations } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const { data: wasteReasons = [] } = useQuery<WasteReason[]>({
    queryKey: ['/api/factory/waste-reasons'],
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { userId: string; pin: string }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/login', data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
        fetchSessionDetails(data.user.id);
        setStep('working');
      } else {
        setStep('select-station');
      }
      toast({ title: "Giriş başarılı", description: `Hoş geldin ${data.user.firstName}` });
    },
    onError: (error: any) => {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
      setPinInput('');
    },
  });

  const startShiftMutation = useMutation({
    mutationFn: async (data: { userId: string; stationId: number }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/start-shift', data);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setCurrentProductionRun(data.productionRun);
      setCurrentStationInfo(data.station);
      setStep('working');
      toast({ title: "Vardiya başladı", description: `${data.station.name} istasyonunda çalışmaya başladın` });
    },
    onError: (error: any) => {
      toast({ title: "Vardiya başlatılamadı", description: error.message, variant: "destructive" });
    },
  });

  const logBreakMutation = useMutation({
    mutationFn: async (data: {
      sessionId: number;
      breakReason: BreakReason;
      targetStationId?: number;
      producedQuantity?: number;
      producedUnit?: string;
      wasteQuantity?: number;
      wasteUnit?: string;
      wasteReasonId?: number;
      wasteNotes?: string;
    }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/log-break', data);
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.breakReason === 'gorev_bitis') {
        toast({ title: "Görev tamamlandı", description: "Üretim kaydedildi" });
      } else {
        toast({ title: "Mola kaydedildi", description: "İyi dinlenmeler!" });
      }
      startAutoLogout();
    },
    onError: (error: any) => {
      toast({ title: "İşlem başarısız", description: error.message, variant: "destructive" });
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: async (data: { 
      sessionId: number; 
      productionRunId?: number; 
      quantityProduced?: number;
      producedUnit?: string;
      quantityWaste?: number;
      wasteUnit?: string;
      wasteReasonId?: number;
      wasteNotes?: string;
    }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/end-shift', data);
      return res.json();
    },
    onSuccess: (data) => {
      setShiftSummary(data.summary);
      setStep('end-shift-summary');
      startAutoLogout();
      toast({ title: "Vardiya tamamlandı" });
    },
    onError: (error: any) => {
      toast({ title: "Vardiya sonlandırılamadı", description: error.message, variant: "destructive" });
    },
  });

  const fetchSessionDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/factory/kiosk/session/${userId}`);
      const data = await res.json();
      if (data.session) {
        setCurrentSession(data.session);
        setCurrentProductionRun(data.productionRun);
        setCurrentStationInfo(data.station);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const startAutoLogout = () => {
    setStep('auto-logout');
    setAutoLogoutCountdown(10);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'auto-logout') {
      interval = setInterval(() => {
        setAutoLogoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setLocation('/fabrika/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, setLocation]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'working' && currentProductionRun) {
      interval = setInterval(() => {
        const start = new Date(currentProductionRun.startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, currentProductionRun]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUserSelect = (userId: string) => {
    const user = staffList.find(s => s.id === userId);
    if (user) {
      setSelectedUser(user);
      setStep('enter-pin');
    }
  };

  const handlePinSubmit = () => {
    if (!selectedUser || !pinInput) return;
    loginMutation.mutate({ userId: selectedUser.id, pin: pinInput });
  };

  const handleStartShift = () => {
    if (!selectedUser || !selectedStation) return;
    startShiftMutation.mutate({ userId: selectedUser.id, stationId: selectedStation });
  };

  const handleStopClick = () => {
    setQuantityProduced('');
    setProducedUnit('adet');
    setQuantityWaste('');
    setWasteUnit('adet');
    setSelectedWasteReason(null);
    setWasteNotes('');
    setTargetStationId(null);
    setSelectedBreakReason(null);
    setStep('stop-options');
  };

  const handleBreakReasonSelect = (reason: BreakReason) => {
    setSelectedBreakReason(reason);
    if (reason === 'gorev_bitis') {
      setStep('production-entry');
    } else if (reason === 'yardim') {
      setStep('production-entry');
    } else {
      if (!currentSession) return;
      logBreakMutation.mutate({
        sessionId: currentSession.id,
        breakReason: reason,
      });
    }
  };

  const handleProductionSubmit = () => {
    if (!currentSession || !selectedBreakReason) return;

    if (selectedBreakReason === 'gorev_bitis') {
      endShiftMutation.mutate({
        sessionId: currentSession.id,
        productionRunId: currentProductionRun?.id,
        quantityProduced: parseFloat(quantityProduced) || 0,
        producedUnit,
        quantityWaste: parseFloat(quantityWaste) || 0,
        wasteUnit,
        wasteReasonId: selectedWasteReason || undefined,
        wasteNotes: wasteNotes || undefined,
      });
    } else {
      logBreakMutation.mutate({
        sessionId: currentSession.id,
        breakReason: selectedBreakReason,
        targetStationId: targetStationId || undefined,
        producedQuantity: parseFloat(quantityProduced) || 0,
        producedUnit,
        wasteQuantity: parseFloat(quantityWaste) || 0,
        wasteUnit,
        wasteReasonId: selectedWasteReason || undefined,
        wasteNotes: wasteNotes || undefined,
      });
    }
  };

  const resetKiosk = () => {
    setStep('select-user');
    setSelectedUser(null);
    setPinInput('');
    setSelectedStation(null);
    setCurrentSession(null);
    setCurrentProductionRun(null);
    setCurrentStationInfo(null);
    setQuantityProduced('');
    setProducedUnit('adet');
    setQuantityWaste('');
    setWasteUnit('adet');
    setSelectedWasteReason(null);
    setWasteNotes('');
    setShiftSummary(null);
    setElapsedTime(0);
    setSelectedBreakReason(null);
    setTargetStationId(null);
    setAutoLogoutCountdown(10);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-800/90 border-slate-700 text-white shadow-2xl">
        <CardHeader className="text-center border-b border-slate-700 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Factory className="h-10 w-10 text-amber-500" />
            <CardTitle className="text-3xl font-bold text-amber-500">DOSPRESSO Fabrika</CardTitle>
          </div>
          <CardDescription className="text-slate-300 text-lg">Üretim Takip Sistemi</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          {step === 'select-user' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center text-slate-200">Personel Seçin</h3>
              {loadingStaff ? (
                <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Fabrika personeli bulunamadı</p>
                  <p className="text-sm mt-2">Sistem yöneticisine başvurun</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {staffList.map((staff) => (
                    <Button
                      key={staff.id}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2 bg-slate-700/50 border-slate-600 hover:bg-slate-600 hover:border-amber-500 transition-all"
                      onClick={() => handleUserSelect(staff.id)}
                      data-testid={`staff-select-${staff.id}`}
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={staff.avatarUrl || undefined} />
                        <AvatarFallback className="bg-amber-600 text-white text-lg">
                          {staff.firstName[0]}{staff.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-slate-200 font-medium text-center">
                        {staff.firstName} {staff.lastName}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'enter-pin' && selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 justify-center mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedUser.avatarUrl || undefined} />
                  <AvatarFallback className="bg-amber-600 text-white text-2xl">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold text-slate-200">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-slate-400">PIN kodunuzu girin</p>
                </div>
              </div>
              
              <div className="max-w-xs mx-auto space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="pl-10 text-center text-2xl tracking-widest bg-slate-700 border-slate-600 h-14"
                    maxLength={6}
                    autoFocus
                    data-testid="input-pin"
                    onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600"
                    onClick={() => {
                      setStep('select-user');
                      setSelectedUser(null);
                      setPinInput('');
                    }}
                    data-testid="button-back"
                  >
                    Geri
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={handlePinSubmit}
                    disabled={pinInput.length < 4 || loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Giriş..." : "Giriş Yap"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'select-station' && selectedUser && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-slate-200">İstasyon Seçin</h3>
                <p className="text-slate-400">{selectedUser.firstName}, hangi istasyonda çalışacaksın?</p>
              </div>
              
              {loadingStations ? (
                <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {stations.map((station) => (
                    <Button
                      key={station.id}
                      variant={selectedStation === station.id ? "default" : "outline"}
                      className={`h-auto p-4 flex flex-col items-center gap-2 transition-all ${
                        selectedStation === station.id 
                          ? 'bg-amber-600 hover:bg-amber-700 border-amber-500' 
                          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600 hover:border-amber-500'
                      }`}
                      onClick={() => setSelectedStation(station.id)}
                      data-testid={`station-select-${station.id}`}
                    >
                      <Settings className="h-8 w-8" />
                      <span className="font-medium text-center">{station.name}</span>
                      {station.targetHourlyOutput && (
                        <Badge variant="secondary" className="text-xs">
                          Hedef: {station.targetHourlyOutput}/saat
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600"
                  onClick={resetKiosk}
                  data-testid="button-cancel"
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleStartShift}
                  disabled={!selectedStation || startShiftMutation.isPending}
                  data-testid="button-start-shift"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {startShiftMutation.isPending ? "Başlatılıyor..." : "Vardiyayı Başlat"}
                </Button>
              </div>
            </div>
          )}

          {step === 'working' && currentSession && currentStationInfo && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-amber-600 text-white">
                      {selectedUser?.firstName[0]}{selectedUser?.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-200">{selectedUser?.firstName} {selectedUser?.lastName}</p>
                    <Badge className="bg-green-600">Aktif</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono text-amber-500" data-testid="text-elapsed-time">
                    <Timer className="h-5 w-5 inline mr-2" />
                    {formatTime(elapsedTime)}
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Factory className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-400">Aktif İstasyon</p>
                    <p className="text-xl font-semibold text-slate-200" data-testid="text-current-station">
                      {currentStationInfo.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 h-16 text-xl"
                  onClick={handleStopClick}
                  data-testid="button-stop"
                >
                  <StopCircle className="h-6 w-6 mr-2" />
                  STOP - Ara Ver / Bitir
                </Button>
              </div>
            </div>
          )}

          {step === 'stop-options' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center text-slate-200">Ne yapmak istiyorsunuz?</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {BREAK_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant="outline"
                      className={`h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 hover:border-amber-500 transition-all`}
                      onClick={() => handleBreakReasonSelect(option.value)}
                      disabled={logBreakMutation.isPending}
                      data-testid={`break-option-${option.value}`}
                    >
                      <div className={`p-3 rounded-full ${option.color}`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <span className="text-slate-200 font-semibold">{option.label}</span>
                      <span className="text-slate-400 text-xs text-center">{option.description}</span>
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-600"
                onClick={() => setStep('working')}
                data-testid="button-cancel-stop"
              >
                İptal - Çalışmaya Devam Et
              </Button>
            </div>
          )}

          {step === 'production-entry' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center text-slate-200">
                {selectedBreakReason === 'gorev_bitis' ? 'Görev Sonlandırma' : 'Yardım Öncesi Kayıt'}
              </h3>
              <p className="text-center text-slate-400">
                {selectedBreakReason === 'gorev_bitis' 
                  ? 'Üretim ve zaiyat bilgilerini girin' 
                  : 'Mevcut üretimi kaydedin'}
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Üretim Miktarı</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantityProduced}
                      onChange={(e) => setQuantityProduced(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-xl h-14 text-center"
                      min="0"
                      step="0.01"
                      data-testid="input-quantity-produced"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Birim</Label>
                    <Select value={producedUnit} onValueChange={setProducedUnit}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 h-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adet">Adet</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="litre">Litre</SelectItem>
                        <SelectItem value="paket">Paket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-400" />
                      Zaiyat/Fire
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantityWaste}
                      onChange={(e) => setQuantityWaste(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-xl h-14 text-center"
                      min="0"
                      step="0.01"
                      data-testid="input-quantity-waste"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Birim</Label>
                    <Select value={wasteUnit} onValueChange={setWasteUnit}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 h-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adet">Adet</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="litre">Litre</SelectItem>
                        <SelectItem value="paket">Paket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {parseFloat(quantityWaste) > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Zaiyat Nedeni</Label>
                      <Select 
                        value={selectedWasteReason?.toString() || ''} 
                        onValueChange={(v) => setSelectedWasteReason(parseInt(v))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="Neden seçin..." />
                        </SelectTrigger>
                        <SelectContent>
                          {wasteReasons.map((reason) => (
                            <SelectItem key={reason.id} value={reason.id.toString()}>
                              {reason.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Açıklama (Opsiyonel)</Label>
                      <Textarea
                        placeholder="Zaiyat hakkında ek bilgi..."
                        value={wasteNotes}
                        onChange={(e) => setWasteNotes(e.target.value)}
                        className="bg-slate-700 border-slate-600 resize-none"
                        rows={2}
                        data-testid="input-waste-notes"
                      />
                    </div>
                  </>
                )}

                {selectedBreakReason === 'yardim' && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Yardıma Gidilen İstasyon</Label>
                    <Select 
                      value={targetStationId?.toString() || ''} 
                      onValueChange={(v) => setTargetStationId(parseInt(v))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue placeholder="İstasyon seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stations
                          .filter(s => s.id !== currentStationInfo?.id)
                          .map((station) => (
                            <SelectItem key={station.id} value={station.id.toString()}>
                              {station.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600"
                  onClick={() => setStep('stop-options')}
                  data-testid="button-back-production"
                >
                  Geri
                </Button>
                <Button
                  className={`flex-1 ${selectedBreakReason === 'gorev_bitis' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                  onClick={handleProductionSubmit}
                  disabled={endShiftMutation.isPending || logBreakMutation.isPending}
                  data-testid="button-submit-production"
                >
                  {endShiftMutation.isPending || logBreakMutation.isPending 
                    ? "Kaydediliyor..." 
                    : selectedBreakReason === 'gorev_bitis' 
                      ? "Görevi Tamamla" 
                      : "Kaydet ve Devam Et"}
                </Button>
              </div>
            </div>
          )}

          {step === 'end-shift-summary' && shiftSummary && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-white" />
              </div>
              
              <h3 className="text-2xl font-semibold text-slate-200">Vardiya Tamamlandı!</h3>
              <p className="text-slate-400">İşte bugünkü performansın:</p>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Çalışma Süresi</p>
                    <p className="text-2xl font-bold text-slate-200" data-testid="text-summary-time">
                      {Math.floor(shiftSummary.workMinutes / 60)}s {shiftSummary.workMinutes % 60}dk
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <Package className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Toplam Üretim</p>
                    <p className="text-2xl font-bold text-slate-200" data-testid="text-summary-produced">
                      {shiftSummary.totalProduced}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Zaiyat</p>
                    <p className="text-2xl font-bold text-slate-200" data-testid="text-summary-waste">
                      {shiftSummary.totalWaste}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <RefreshCw className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Verimlilik</p>
                    <p className="text-2xl font-bold text-slate-200" data-testid="text-summary-efficiency">
                      %{shiftSummary.efficiency}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 'auto-logout' && (
            <div className="space-y-6 text-center">
              <div className="w-24 h-24 bg-amber-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl font-bold text-white">{autoLogoutCountdown}</span>
              </div>
              
              <h3 className="text-2xl font-semibold text-slate-200">İşlem Tamamlandı</h3>
              <p className="text-slate-400">
                {autoLogoutCountdown} saniye sonra ana ekrana dönülecek...
              </p>
              
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 h-14 text-lg"
                onClick={() => setLocation('/fabrika/dashboard')}
                data-testid="button-immediate-logout"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Hemen Çıkış Yap
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
