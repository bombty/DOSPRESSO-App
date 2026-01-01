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
import { useToast } from "@/hooks/use-toast";
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
  Trash2
} from "lucide-react";

type KioskStep = 'select-user' | 'enter-pin' | 'select-station' | 'working' | 'end-shift-summary';

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

export default function FactoryKiosk() {
  const { toast } = useToast();
  const [step, setStep] = useState<KioskStep>('select-user');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentProductionRun, setCurrentProductionRun] = useState<ProductionRun | null>(null);
  const [currentStationInfo, setCurrentStationInfo] = useState<Station | null>(null);
  const [quantityProduced, setQuantityProduced] = useState('');
  const [quantityWaste, setQuantityWaste] = useState('');
  const [wasteReason, setWasteReason] = useState('');
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: staffList = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['/api/factory/staff'],
  });

  const { data: stations = [], isLoading: loadingStations } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
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

  const switchStationMutation = useMutation({
    mutationFn: async (data: { sessionId: number; productionRunId: number; quantityProduced: number; quantityWaste: number; wasteReason?: string; newStationId?: number }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/switch-station', data);
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data.newProductionRun) {
        setCurrentProductionRun(data.newProductionRun);
        setCurrentStationInfo(data.station);
        toast({ title: "İstasyon değiştirildi", description: `${data.station.name} istasyonuna geçtin` });
      }
      setQuantityProduced('');
      setQuantityWaste('');
      setWasteReason('');
    },
    onError: (error: any) => {
      toast({ title: "İstasyon değiştirilemedi", description: error.message, variant: "destructive" });
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: async (data: { sessionId: number; productionRunId?: number; quantityProduced?: number; quantityWaste?: number; wasteReason?: string }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/end-shift', data);
      return res.json();
    },
    onSuccess: (data) => {
      setShiftSummary(data.summary);
      setStep('end-shift-summary');
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

  const handleSwitchStation = (newStationId: number) => {
    if (!currentSession || !currentProductionRun) return;
    switchStationMutation.mutate({
      sessionId: currentSession.id,
      productionRunId: currentProductionRun.id,
      quantityProduced: parseInt(quantityProduced) || 0,
      quantityWaste: parseInt(quantityWaste) || 0,
      wasteReason: wasteReason || undefined,
      newStationId,
    });
  };

  const handleEndShift = () => {
    if (!currentSession) return;
    endShiftMutation.mutate({
      sessionId: currentSession.id,
      productionRunId: currentProductionRun?.id,
      quantityProduced: parseInt(quantityProduced) || 0,
      quantityWaste: parseInt(quantityWaste) || 0,
      wasteReason: wasteReason || undefined,
    });
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
    setQuantityWaste('');
    setWasteReason('');
    setShiftSummary(null);
    setElapsedTime(0);
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Üretim Adedi</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantityProduced}
                    onChange={(e) => setQuantityProduced(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-xl h-14 text-center"
                    min="0"
                    data-testid="input-quantity-produced"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-400" />
                    Zaiyat
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantityWaste}
                    onChange={(e) => setQuantityWaste(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-xl h-14 text-center"
                    min="0"
                    data-testid="input-quantity-waste"
                  />
                </div>
              </div>

              {parseInt(quantityWaste) > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Zaiyat Nedeni</Label>
                  <Textarea
                    placeholder="Zaiyat nedenini açıklayın..."
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                    className="bg-slate-700 border-slate-600 resize-none"
                    rows={2}
                    data-testid="input-waste-reason"
                  />
                </div>
              )}

              <Separator className="bg-slate-700" />

              <div className="space-y-3">
                <p className="text-sm text-slate-400">İstasyon Değiştir (Mevcut üretimi kaydeder)</p>
                <div className="grid grid-cols-3 gap-2">
                  {stations
                    .filter(s => s.id !== currentStationInfo.id)
                    .slice(0, 6)
                    .map((station) => (
                      <Button
                        key={station.id}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 hover:bg-slate-600"
                        onClick={() => handleSwitchStation(station.id)}
                        disabled={switchStationMutation.isPending}
                        data-testid={`button-switch-station-${station.id}`}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        {station.name}
                      </Button>
                    ))}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg"
                  onClick={handleEndShift}
                  disabled={endShiftMutation.isPending}
                  data-testid="button-end-shift"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  {endShiftMutation.isPending ? "Sonlandırılıyor..." : "Vardiyayı Bitir"}
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
              
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 h-14 text-lg"
                onClick={resetKiosk}
                data-testid="button-new-shift"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Yeni Vardiya Başlat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
