import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

function kioskFetch(url: string, method: string = 'GET', data?: unknown): Promise<Response> {
  const token = localStorage.getItem("factory-kiosk-token");
  const headers: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "x-kiosk-token": token } : {}),
  };
  return fetch(url, {
    method,
    credentials: 'include',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  CheckCircle2,
  Camera,
  ImageIcon,
  X,
  CalendarOff,
  Users,
  Maximize,
  Minimize,
  Wrench,
  Sparkles,
  SprayCan,
  Home,
  MapPin,
  BarChart3,
  Repeat,
  ClipboardCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ObjectUploader } from "@/components/ObjectUploader";

interface GuidanceItem {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  deepLink?: string;
}

interface GuidanceResponse {
  totalGaps: number;
  criticalCount: number;
  items: GuidanceItem[];
  grouped: { critical: GuidanceItem[]; high: GuidanceItem[]; medium: GuidanceItem[]; low: GuidanceItem[] };
}

type KioskStep = 'device-password' | 'enter-credentials' | 'select-user' | 'enter-pin' | 'worker-home' | 'select-station' | 'working' | 'stop-options' | 'log-production' | 'production-entry' | 'end-shift-summary' | 'fault-report' | 'on-break';
type BreakReason = 'mola' | 'ozel_ihtiyac';
type KioskPhase = 'hazirlik' | 'uretim' | 'temizlik' | 'tamamlandi';
const PHASE_ORDER: KioskPhase[] = ['hazirlik', 'uretim', 'temizlik', 'tamamlandi'];

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  profileImageUrl?: string | null;
  role: string;
  username?: string;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>;
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
  stationId: number | null;
  checkInTime: string;
  totalProduced: number;
  totalWaste: number;
  status: string;
  phase?: string;
  prepStartedAt?: string;
  prodStartedAt?: string;
  cleanStartedAt?: string;
}

interface FactoryProduct {
  id: number;
  name: string;
  category: string;
  isActive: boolean;
}

interface ProductionRun {
  id: number;
  sessionId: number;
  stationId: number;
  startTime: string;
  quantityProduced: number;
  quantityWaste: number;
}

interface TodayStats {
  totalProduced: number;
  totalWaste: number;
  totalShiftMinutes: number;
  totalBreakMinutes: number;
  breakCount: number;
  shiftCount: number;
}

const FABRIKA_ALLOWED_ROLES = ['fabrika_operator', 'fabrika_personel', 'fabrika_sorumlu', 'admin'];

export default function FactoryKiosk() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;
    if (!FABRIKA_ALLOWED_ROLES.includes(user.role)) {
      setLocation('/');
    } else if (step === 'device-password') {
      setStep('select-user');
    }
  }, [user, setLocation]);

  const [step, setStep] = useState<KioskStep>('device-password');
  const [deviceUsername, setDeviceUsername] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
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
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(6);
  const [productionPhotoUrl, setProductionPhotoUrl] = useState<string | null>(null);
  const [faultType, setFaultType] = useState<'machine' | 'product' | null>(null);
  const [faultDescription, setFaultDescription] = useState('');
  const [faultStationId, setFaultStationId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<KioskPhase>('hazirlik');
  const [phaseStartTime, setPhaseStartTime] = useState<Date>(new Date());
  const [phaseDurations, setPhaseDurations] = useState({ hazirlik: 0, uretim: 0, temizlik: 0 });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productError, setProductError] = useState('');
  const [wasteDoughKg, setWasteDoughKg] = useState('');
  const [wasteProductCount, setWasteProductCount] = useState('');
  const [pendingPhaseTransition, setPendingPhaseTransition] = useState<KioskPhase | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [currentBreakLogId, setCurrentBreakLogId] = useState<number | null>(null);
  const [selectedBreakReason, setSelectedBreakReason] = useState<BreakReason | null>(null);

  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_MS = 30000;
  const AUTO_RETURN_STEPS: KioskStep[] = ['worker-home', 'end-shift-summary'];

  useEffect(() => {
    function resetInactivityTimer() {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      if (AUTO_RETURN_STEPS.includes(step) && selectedUser) {
        inactivityRef.current = setTimeout(() => resetWorker(), INACTIVITY_MS);
      }
    }
    const events = ['touchstart', 'mousedown', 'keydown'];
    events.forEach(e => document.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      events.forEach(e => document.removeEventListener(e, resetInactivityTimer));
    };
  }, [step, selectedUser]);

  async function kioskFetchJson<T>(url: string, fallback: T): Promise<T> {
    const res = await kioskFetch(url);
    if (!res.ok) return fallback;
    return res.json();
  }

  const { data: factoryStaff = [] } = useQuery<any[]>({
    queryKey: ['/api/factory/staff'],
    queryFn: () => kioskFetchJson<any[]>('/api/factory/staff', []),
    enabled: step === 'select-user',
    refetchInterval: 30000,
  });

  const { data: activeWorkersData = [] } = useQuery<any[]>({
    queryKey: ['/api/factory/active-workers'],
    queryFn: () => kioskFetchJson<any[]>('/api/factory/active-workers', []),
    enabled: step === 'select-user',
    refetchInterval: 15000,
  });

  const activeWorkerUserIds = useMemo(() => new Set(activeWorkersData.map((w: any) => w.userId)), [activeWorkersData]);
  const activeWorkersForGrid = useMemo(() => factoryStaff.filter((w: any) => activeWorkerUserIds.has(w.id)), [factoryStaff, activeWorkerUserIds]);
  const availableWorkersForGrid = useMemo(() => factoryStaff.filter((w: any) => !activeWorkerUserIds.has(w.id)), [factoryStaff, activeWorkerUserIds]);

  const { data: stations = [], isLoading: loadingStations } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
    queryFn: () => kioskFetchJson<Station[]>('/api/factory/stations', []),
  });

  const { data: wasteReasons = [] } = useQuery<WasteReason[]>({
    queryKey: ['/api/factory/waste-reasons'],
    queryFn: () => kioskFetchJson<WasteReason[]>('/api/factory/waste-reasons', []),
  });

  const stationCategory = currentStationInfo?.category || null;
  const { data: factoryProducts = [] } = useQuery<FactoryProduct[]>({
    queryKey: ['/api/factory/products', stationCategory],
    queryFn: () => {
      const url = stationCategory 
        ? `/api/factory/products?category=${encodeURIComponent(stationCategory)}`
        : '/api/factory/products';
      return kioskFetchJson<FactoryProduct[]>(url, []);
    },
    enabled: step === 'production-entry' || step === 'log-production' || step === 'working',
  });

  const { data: todayStats } = useQuery<TodayStats>({
    queryKey: ['/api/factory/kiosk/worker-today-stats', selectedUser?.id],
    queryFn: () => kioskFetchJson<TodayStats>(`/api/factory/kiosk/worker-today-stats?userId=${selectedUser!.id}`, { totalProduced: 0, totalWaste: 0, totalShiftMinutes: 0, totalBreakMinutes: 0, breakCount: 0, shiftCount: 0 }),
    enabled: !!selectedUser && (step === 'worker-home' || step === 'end-shift-summary'),
    refetchInterval: 30000,
  });

  const { data: guidanceData } = useQuery<GuidanceResponse>({
    queryKey: ['/api/agent/guidance', selectedUser?.id || 'kiosk'],
    queryFn: () => kioskFetchJson<GuidanceResponse>('/api/agent/guidance', { totalGaps: 0, criticalCount: 0, items: [], grouped: { critical: [], high: [], medium: [], low: [] } }),
    enabled: step === 'select-user' || step === 'worker-home',
    refetchInterval: 300000,
    retry: false,
  });

  const factoryGuidanceItems = useMemo(() => {
    if (!guidanceData?.items) return [];
    return guidanceData.items.filter(item => {
      const text = `${item.id} ${item.title} ${item.description} ${item.category}`.toLowerCase();
      return text.includes('fabrika') || text.includes('factory');
    });
  }, [guidanceData]);

  const { data: collaborativeScores } = useQuery<any>({
    queryKey: ['/api/factory/collaborative-scores', currentStationInfo?.id],
    queryFn: () => {
      if (!currentStationInfo?.id) return null;
      return kioskFetchJson<any>(`/api/factory/collaborative-scores/${currentStationInfo.id}`, null);
    },
    enabled: !!currentStationInfo?.id && (step === 'working' || step === 'end-shift-summary'),
    refetchInterval: 30000,
  });

  const { data: todayPlans = [], isFetched: todayPlansFetched } = useQuery<any[]>({
    queryKey: ['/api/factory/kiosk/today-plans', currentStationInfo?.id],
    queryFn: () => {
      const url = currentStationInfo?.id
        ? `/api/factory/kiosk/today-plans?stationId=${currentStationInfo.id}`
        : '/api/factory/kiosk/today-plans';
      return kioskFetchJson<any[]>(url, []);
    },
    enabled: !!currentStationInfo?.id && step === 'working',
    refetchInterval: 60000,
  });

  const deviceAuthMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/device-auth', data);
      return res.json();
    },
    onSuccess: () => {
      setStep('select-user');
      setDevicePassword('');
      setUsernameInput('');
      setPinInput('');
    },
    onError: (error: any) => {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
      setDevicePassword('');
    },
  });

  const autoStartShift = async (userData: StaffMember) => {
    try {
      const res = await kioskFetch('/api/factory/kiosk/start-shift', 'POST', { userId: userData.id });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Vardiya başlatılamadı');
      }
      const data = await res.json();
      setCurrentSession(data.session);
      setCurrentProductionRun(data.productionRun || null);
      setCurrentStationInfo(data.station || null);
      if (data.session.phase) {
        setCurrentPhase(data.session.phase as KioskPhase);
      }
      if (data.station) {
        const phaseStart = data.session.cleanStartedAt || data.session.prodStartedAt || data.session.prepStartedAt || data.session.checkInTime;
        if (phaseStart) setPhaseStartTime(new Date(phaseStart));
      }
      setStep('worker-home');
      if (data.resumed) {
        toast({ title: "Aktif vardiya bulundu", description: "Vardiyaya devam ediyorsunuz" });
      } else {
        toast({ title: "Vardiya başladı", description: `Hoş geldin ${userData.firstName}` });
      }
    } catch (error: any) {
      toast({ title: "Vardiya başlatılamadı", description: error.message, variant: "destructive" });
      setStep('select-user');
    }
  };

  const loginByUsernameMutation = useMutation({
    mutationFn: async (data: { username: string; pin: string }) => {
      const res = await apiRequest('POST', '/api/factory/kiosk/login-by-username', data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.kioskToken) {
        localStorage.setItem("factory-kiosk-token", data.kioskToken);
      }
      const userData: StaffMember = { id: data.user.id, firstName: data.user.firstName, lastName: data.user.lastName, avatarUrl: data.user.avatarUrl, role: data.user.role };
      setSelectedUser(userData);
      autoStartShift(userData);
    },
    onError: (error: any) => {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
      setPinInput('');
    },
  });

  const handlePinDigit = useCallback((digit: string) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + digit;
    setPinInput(newPin);
    if (newPin.length === 4 && selectedUser?.username) {
      loginByUsernameMutation.mutate({ username: selectedUser.username, pin: newPin });
    }
  }, [pinInput, selectedUser, loginByUsernameMutation]);

  const assignStationMutation = useMutation({
    mutationFn: async (data: { sessionId: number; stationId: number }) => {
      const res = await kioskFetch('/api/factory/kiosk/assign-station', 'POST', data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'İstasyon atanamadı'); }
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setCurrentProductionRun(data.productionRun);
      setCurrentStationInfo(data.station);
      setCurrentPhase('hazirlik');
      setPhaseStartTime(new Date());
      setPhaseDurations({ hazirlik: 0, uretim: 0, temizlik: 0 });
      setStep('working');
      toast({ title: "İstasyon atandı", description: `${data.station.name} istasyonunda çalışmaya başladın` });
    },
    onError: (error: any) => {
      toast({ title: "İstasyon atanamadı", description: error.message, variant: "destructive" });
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
      photoUrl?: string;
    }) => {
      const res = await kioskFetch('/api/factory/kiosk/log-break', 'POST', data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'İşlem başarısız'); }
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({ title: "Mola başladı", description: "İyi dinlenmeler!" });
      setCurrentBreakLogId(data.breakLogId || null);
      setBreakStartTime(new Date());
      setBreakElapsed(0);
      setStep('on-break');
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
      photoUrl?: string;
      productId?: number;
      productName?: string;
      wasteDoughKg?: number;
      wasteProductCount?: number;
    }) => {
      const res = await kioskFetch('/api/factory/kiosk/end-shift', 'POST', data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Vardiya sonlandırılamadı'); }
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

  const logProductionMutation = useMutation({
    mutationFn: async (data: {
      sessionId: number;
      quantityProduced?: number;
      producedUnit?: string;
      quantityWaste?: number;
      wasteUnit?: string;
      wasteReasonId?: number;
      wasteNotes?: string;
      photoUrl?: string;
      productId?: number;
      productName?: string;
      wasteDoughKg?: number;
      wasteProductCount?: number;
    }) => {
      const res = await kioskFetch('/api/factory/kiosk/log-production', 'POST', data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Üretim kaydedilemedi'); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Üretim kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/kiosk/worker-today-stats'] });
      setStep('worker-home');
    },
    onError: (error: any) => {
      toast({ title: "Üretim kaydedilemedi", description: error.message, variant: "destructive" });
    },
  });

  const reportFaultMutation = useMutation({
    mutationFn: async (data: {
      faultType: 'machine' | 'product';
      description: string;
      stationId?: number | null;
      sessionId?: number | null;
      userId?: string | null;
    }) => {
      const res = await kioskFetch('/api/factory/kiosk/report-fault', 'POST', data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Arıza bildirilemedi'); }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Arıza bildirildi", 
        description: data.notifiedPerson 
          ? `${data.notifiedPerson} bilgilendirildi` 
          : "Yetkili kişiye bildirim gönderildi" 
      });
      setStep('worker-home');
    },
    onError: (error: any) => {
      toast({ title: "Arıza bildirilemedi", description: error.message, variant: "destructive" });
    },
  });

  const endBreakMutation = useMutation({
    mutationFn: async (data: { breakLogId: number }) => {
      const res = await kioskFetch('/api/factory/kiosk/end-break', 'POST', data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Mola sonlandırılamadı'); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mola bitti", description: "İyi çalışmalar!" });
      setBreakStartTime(null);
      setBreakElapsed(0);
      setCurrentBreakLogId(null);
      setStep('worker-home');
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Mola sonlandırılamadı", variant: "destructive" });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'end-shift-summary') {
      setAutoLogoutCountdown(6);
      interval = setInterval(() => {
        setAutoLogoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            resetWorker();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'on-break' && breakStartTime) {
      interval = setInterval(() => {
        setBreakElapsed(Math.floor((Date.now() - breakStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, breakStartTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'working' && currentProductionRun) {
      interval = setInterval(() => {
        const start = new Date(currentProductionRun.startTime).getTime();
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
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

  const handleCredentialsSubmit = () => {
    if (!usernameInput || !pinInput) return;
    loginByUsernameMutation.mutate({ username: usernameInput.trim(), pin: pinInput });
  };

  const handleAssignStation = () => {
    if (!currentSession || !selectedStation) return;
    assignStationMutation.mutate({ sessionId: currentSession.id, stationId: selectedStation });
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request failed:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn("Exit fullscreen failed:", err);
      });
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const handlePhaseTransition = async (nextPhase: KioskPhase) => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - phaseStartTime.getTime()) / 60000);
    setPhaseDurations(prev => ({ ...prev, [currentPhase]: elapsed }));
    if (currentSession) {
      try {
        await kioskFetch(`/api/factory/kiosk/session/${currentSession.id}/phase`, 'PATCH', { phase: nextPhase });
      } catch (e) {
        console.warn("Phase transition API failed:", e);
      }
    }
    setCurrentPhase(nextPhase);
    setPhaseStartTime(now);
  };

  const handleStopClick = () => {
    setQuantityProduced('');
    setProducedUnit('adet');
    setQuantityWaste('');
    setWasteUnit('adet');
    setSelectedWasteReason(null);
    setWasteNotes('');
    setProductionPhotoUrl(null);
    setSelectedProductId(null);
    setProductError('');
    setWasteDoughKg('');
    setWasteProductCount('');
    setStep('stop-options');
  };

  const buildProductionPayload = () => {
    const selectedProduct = factoryProducts.find(p => p.id === selectedProductId);
    return {
      quantityProduced: parseFloat(quantityProduced) || 0,
      producedUnit,
      quantityWaste: parseFloat(quantityWaste) || 0,
      wasteUnit,
      wasteReasonId: selectedWasteReason || undefined,
      wasteNotes: wasteNotes || undefined,
      photoUrl: productionPhotoUrl || undefined,
      productId: selectedProductId || undefined,
      productName: selectedProduct?.name || undefined,
      wasteDoughKg: parseFloat(wasteDoughKg) || undefined,
      wasteProductCount: parseInt(wasteProductCount) || undefined,
    };
  };

  const handleLogProductionSubmit = () => {
    if (!currentSession) return;
    if ((parseFloat(quantityProduced) || 0) > 0 && !selectedProductId) {
      setProductError("Lütfen bir ürün seçin");
      return;
    }
    setProductError('');
    logProductionMutation.mutate({
      sessionId: currentSession.id,
      ...buildProductionPayload(),
    });
  };

  const handleProductionSubmit = () => {
    if (!currentSession) return;

    if ((parseFloat(quantityProduced) || 0) > 0 && !selectedProductId) {
      setProductError("Lütfen bir ürün seçin");
      return;
    }
    setProductError('');

    endShiftMutation.mutate({
      sessionId: currentSession.id,
      productionRunId: currentProductionRun?.id,
      ...buildProductionPayload(),
    });
  };

  const resetWorker = () => {
    setStep('select-user');
    setSelectedUser(null);
    setPinInput('');
    setUsernameInput('');
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
    setAutoLogoutCountdown(6);
    setProductionPhotoUrl(null);
    setFaultType(null);
    setFaultDescription('');
    setFaultStationId(null);
    setCurrentPhase('hazirlik');
    setPhaseStartTime(new Date());
    setPhaseDurations({ hazirlik: 0, uretim: 0, temizlik: 0 });
    setSelectedProductId(null);
    setProductError('');
    setWasteDoughKg('');
    setWasteProductCount('');
    setBreakStartTime(null);
    setBreakElapsed(0);
    setCurrentBreakLogId(null);
  };

  const handleKioskExit = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      queryClient.clear();
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const resetKiosk = () => {
    localStorage.removeItem("factory-kiosk-token");
    setStep((user && FABRIKA_ALLOWED_ROLES.includes(user.role)) ? 'select-user' : 'device-password');
    setDeviceUsername('');
    setDevicePassword('');
    resetWorker();
  };

  const shiftHours = currentSession 
    ? Math.floor((Date.now() - new Date(currentSession.checkInTime).getTime()) / 3600000)
    : 0;
  const shiftMinutes = currentSession 
    ? Math.floor(((Date.now() - new Date(currentSession.checkInTime).getTime()) % 3600000) / 60000)
    : 0;

  return (
    <div className="w-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ height: '100dvh' }}>
      <div className="flex-shrink-0 h-14 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-800/90">
        <div className="flex items-center gap-3">
          {selectedUser && !['device-password', 'enter-credentials', 'select-user', 'enter-pin'].includes(step) && step !== 'end-shift-summary' && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300"
              onClick={() => {
                if (step === 'on-break' && currentBreakLogId) {
                  kioskFetch('/api/factory/kiosk/end-break', 'POST', { breakLogId: currentBreakLogId }).catch(() => {});
                  setBreakStartTime(null);
                  setBreakElapsed(0);
                  setCurrentBreakLogId(null);
                }
                setStep('worker-home');
              }}
              data-testid="button-kiosk-home"
            >
              <Home className="h-4 w-4 mr-1" />
              Ana Sayfa
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Factory className="h-6 w-6 text-amber-500" />
            <span className="text-lg font-bold text-amber-500">DOSPRESSO Fabrika</span>
          </div>
          <span className="text-sm text-slate-400 hidden sm:inline">Üretim Takip Sistemi</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="bg-slate-700/80 border-slate-600 text-slate-200"
            onClick={handleFullscreen}
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-700/80 border-slate-600 text-slate-200"
            onClick={handleKioskExit}
            data-testid="button-kiosk-exit"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Kiosk'tan Cik
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex items-start justify-center p-4">
      <Card className={cn("w-full bg-slate-800/90 border-slate-700 text-white shadow-2xl", step === 'select-user' ? 'max-w-5xl' : 'max-w-2xl')}>
        <CardContent className="p-8">
          {step === 'device-password' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center text-slate-200">Kiosk Giriş</h3>
              <p className="text-center text-slate-400">Kullanıcı adı ve parolayı girin</p>
              <div className="max-w-xs mx-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Kullanıcı Adı</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="örn: Fabrika"
                      value={deviceUsername}
                      onChange={(e) => setDeviceUsername(e.target.value)}
                      className="pl-10 text-lg bg-slate-700 border-slate-600 h-12"
                      autoFocus
                      data-testid="input-device-username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Parola (4 haneli)</label>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                          devicePassword.length > i
                            ? 'border-amber-500 bg-amber-900/50'
                            : 'border-slate-600'
                        }`}
                      >
                        {devicePassword[i] ? '\u2022' : ''}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((num, idx) => (
                    <Button
                      key={idx}
                      variant={num === '' ? 'ghost' : 'outline'}
                      size="lg"
                      className="h-14 text-xl border-slate-600"
                      disabled={num === '' || !deviceUsername.trim()}
                      data-testid={`keypad-device-${num}`}
                      onClick={() => {
                        if (num === 'del') {
                          setDevicePassword(prev => prev.slice(0, -1));
                        } else if (typeof num === 'number' && devicePassword.length < 4) {
                          const newPass = devicePassword + num;
                          setDevicePassword(newPass);
                          if (newPass.length === 4 && deviceUsername.trim()) {
                            deviceAuthMutation.mutate({ username: deviceUsername, password: newPass });
                          }
                        }
                      }}
                    >
                      {num === 'del' ? '\u232B' : num}
                    </Button>
                  ))}
                </div>
                {!deviceUsername.trim() && (
                  <p className="text-sm text-slate-400 text-center">
                    Lütfen önce kullanıcı adını girin
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'enter-credentials' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <CircleUser className="h-16 w-16 mx-auto mb-3 text-amber-400 opacity-80" />
                <h3 className="text-xl font-semibold text-slate-200">Giriş Yapın</h3>
                <p className="text-sm text-slate-400 mt-1">Kullanıcı adınızı ve PIN kodunuzu girin</p>
              </div>
              
              <div className="max-w-xs mx-auto space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Kullanıcı adı"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="pl-10 text-lg bg-slate-700 border-slate-600 h-14"
                    autoFocus
                    autoComplete="off"
                    data-testid="input-kiosk-username"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const pinEl = document.querySelector('[data-testid="input-kiosk-pin"]') as HTMLInputElement;
                        if (pinEl) pinEl.focus();
                      }
                    }}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="pl-10 text-center text-2xl tracking-widest bg-slate-700 border-slate-600 h-14"
                    maxLength={4}
                    data-testid="input-kiosk-pin"
                    onKeyDown={(e) => e.key === 'Enter' && usernameInput && pinInput.length >= 4 && handleCredentialsSubmit()}
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 border-2 border-slate-600 rounded-lg flex items-center justify-center text-xl text-amber-400">
                      {pinInput[i] ? "\u25CF" : ""}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600"
                    onClick={() => {
                      setStep('select-user');
                      setUsernameInput('');
                      setPinInput('');
                    }}
                    data-testid="button-back-credentials"
                  >
                    Geri
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={handleCredentialsSubmit}
                    disabled={!usernameInput || pinInput.length < 4 || loginByUsernameMutation.isPending}
                    data-testid="button-login-credentials"
                  >
                    {loginByUsernameMutation.isPending ? "Giriş..." : "Giriş Yap"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'select-user' && (
            <div className="flex flex-col md:flex-row">
              <div className="md:w-3/5 p-4 overflow-y-auto">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-slate-100">DOSPRESSO Fabrika</h2>
                  <p className="text-sm text-slate-400">Vardiya başlatmak için isminize dokunun</p>
                </div>

                {activeWorkersForGrid.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-green-400 mb-2 uppercase tracking-wider">
                      Vardiyada ({activeWorkersForGrid.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {activeWorkersForGrid.map((worker: any) => (
                        <button
                          key={worker.id}
                          className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center active:scale-95 transition-all"
                          onClick={() => {
                            setSelectedUser({ id: worker.id, firstName: worker.firstName, lastName: worker.lastName, avatarUrl: worker.profileImageUrl || null, role: worker.role, username: worker.username });
                            setPinInput('');
                            setStep('enter-pin');
                          }}
                          data-testid={`worker-active-${worker.id}`}
                        >
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-1">
                            <span className="text-sm font-bold text-green-400">{worker.firstName?.[0]}</span>
                          </div>
                          <p className="font-medium text-xs truncate text-slate-100">{worker.firstName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{worker.lastName}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    Personel ({availableWorkersForGrid.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availableWorkersForGrid.map((worker: any) => (
                      <button
                        key={worker.id}
                        className="p-3 rounded-lg bg-slate-700/50 border border-slate-600 text-center active:scale-95 transition-all"
                        onClick={() => {
                          setSelectedUser({ id: worker.id, firstName: worker.firstName, lastName: worker.lastName, avatarUrl: worker.profileImageUrl || null, role: worker.role, username: worker.username });
                          setPinInput('');
                          setStep('enter-pin');
                        }}
                        data-testid={`worker-available-${worker.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center mx-auto mb-1">
                          <span className="text-sm font-bold text-slate-300">{worker.firstName?.[0]}</span>
                        </div>
                        <p className="font-medium text-xs truncate text-slate-100">{worker.firstName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{worker.lastName}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {factoryStaff.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Personel listesi yükleniyor...</p>
                  </div>
                )}
              </div>

              <div className="md:w-2/5 p-4 border-t md:border-t-0 md:border-l border-slate-700 overflow-y-auto bg-slate-900/30">
                <div className="text-center mb-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-3xl font-mono font-bold text-amber-400"><LiveClock /></p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>

                <div className="mb-3 p-3 bg-slate-700/50 rounded-lg">
                  <h3 className="text-xs font-medium text-slate-300 mb-2">Aktif Durum</h3>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-slate-800/50 rounded">
                      <p className="text-lg font-bold text-slate-100">{activeWorkersData.length}</p>
                      <p className="text-[10px] text-slate-400">Aktif Personel</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded">
                      <p className="text-lg font-bold text-slate-100">{stations.length}</p>
                      <p className="text-[10px] text-slate-400">Toplam İstasyon</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <h3 className="text-xs font-medium text-slate-300 mb-2">İstasyonlar</h3>
                  {stations.map((station) => {
                    const workersAtStation = activeWorkersData.filter((w: any) => w.stationId === station.id);
                    return (
                      <div key={station.id} className="flex justify-between items-center py-1 text-xs border-b border-slate-600 last:border-0">
                        <span className="text-slate-300">{station.name}</span>
                        <span className={workersAtStation.length > 0 ? "text-green-400" : "text-slate-500"}>
                          {workersAtStation.length > 0 ? `${workersAtStation.length} kişi` : 'Boş'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 p-3 bg-slate-700/50 rounded-lg" data-testid="kiosk-guidance-widget">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                      Mr. Dobody {factoryGuidanceItems.length > 0 ? `(${factoryGuidanceItems.length} uyarı)` : ''}
                    </h3>
                  </div>
                  {factoryGuidanceItems.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2" data-testid="guidance-empty">Şu an aktif uyarı yok</p>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        {factoryGuidanceItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "p-2 rounded text-xs",
                              item.severity === 'critical' ? 'bg-red-900/40 border border-red-500/30' :
                              item.severity === 'high' ? 'bg-orange-900/40 border border-orange-500/30' :
                              item.severity === 'medium' ? 'bg-yellow-900/40 border border-yellow-500/30' :
                              'bg-slate-800/40 border border-slate-600/30'
                            )}
                            data-testid={`guidance-item-${item.id}`}
                          >
                            <p className={cn(
                              "font-medium truncate",
                              item.severity === 'critical' ? 'text-red-300' :
                              item.severity === 'high' ? 'text-orange-300' :
                              item.severity === 'medium' ? 'text-yellow-300' :
                              'text-slate-300'
                            )}>
                              {item.title}
                            </p>
                            <p className="text-slate-400 truncate mt-0.5">{item.description}</p>
                          </div>
                        ))}
                      </div>
                      {factoryGuidanceItems.length > 3 && (
                        <p className="text-[10px] text-slate-500 mt-1.5 text-center">+{factoryGuidanceItems.length - 3} daha fazla uyarı</p>
                      )}
                    </>
                  )}
                </div>

                {!(user && FABRIKA_ALLOWED_ROLES.includes(user.role)) && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-slate-600 text-slate-300"
                    onClick={() => {
                      setStep('device-password');
                      setDeviceUsername('');
                      setDevicePassword('');
                    }}
                    data-testid="button-back-to-device"
                  >
                    Cihaz Girişine Dön
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'enter-pin' && selectedUser && (
            <div className="flex flex-col items-center justify-center py-8 px-6">
              <button
                className="absolute top-20 left-10 text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
                onClick={() => {
                  setSelectedUser(null);
                  setPinInput('');
                  setStep('select-user');
                }}
                data-testid="button-back-to-select-user"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Geri
              </button>

              <div className="w-14 h-14 rounded-full bg-amber-600/20 flex items-center justify-center mb-3">
                <span className="text-xl font-bold text-amber-400">
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">{selectedUser.firstName} {selectedUser.lastName}</h2>
              <p className="text-sm text-slate-400 mb-6">PIN kodunuzu girin</p>

              <div className="flex gap-3 mb-6">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={cn(
                    "w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold",
                    pinInput.length > i ? "border-amber-500 bg-amber-900/50" : "border-slate-600"
                  )}>
                    {pinInput.length > i ? '\u25CF' : ''}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 w-56">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <Button
                    key={n}
                    variant="outline"
                    className="h-12 text-lg font-bold border-slate-600"
                    data-testid={`keypad-pin-${n}`}
                    onClick={() => handlePinDigit(String(n))}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="h-12 text-xs border-slate-600"
                  onClick={() => setPinInput('')}
                  data-testid="keypad-pin-clear"
                >
                  Temizle
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-lg font-bold border-slate-600"
                  data-testid="keypad-pin-0"
                  onClick={() => handlePinDigit('0')}
                >
                  0
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-xs border-slate-600"
                  onClick={() => setPinInput(p => p.slice(0, -1))}
                  data-testid="keypad-pin-delete"
                >
                  Sil
                </Button>
              </div>

              {loginByUsernameMutation.isPending && (
                <p className="text-sm text-amber-400 mt-4">Giriş yapılıyor...</p>
              )}
              {loginByUsernameMutation.isError && (
                <p className="text-sm text-red-400 mt-4" data-testid="text-pin-error">
                  {(loginByUsernameMutation.error as any)?.message || 'PIN hatalı'}
                </p>
              )}
            </div>
          )}

          {step === 'worker-home' && selectedUser && currentSession && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-amber-500">
                  {selectedUser.avatarUrl ? (
                    <AvatarImage src={selectedUser.avatarUrl} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                  ) : null}
                  <AvatarFallback className="bg-amber-600 text-white text-xl font-bold">
                    {`${selectedUser.firstName?.[0] || ''}${selectedUser.lastName?.[0] || ''}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-100" data-testid="text-worker-name">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-600">Vardiyada</Badge>
                    <span className="text-sm text-slate-400">
                      {shiftHours}s {shiftMinutes}dk
                    </span>
                  </div>
                  {currentStationInfo && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-amber-400" />
                      <span className="text-sm text-amber-400">{currentStationInfo.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {todayStats && (
                <div className="grid grid-cols-3 gap-3" data-testid="worker-today-stats">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <Package className="h-5 w-5 text-green-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-100" data-testid="text-stat-produced">{todayStats.totalProduced}</p>
                    <p className="text-xs text-slate-400">Üretim</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <Clock className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-100" data-testid="text-stat-shift">
                      {Math.floor((todayStats.totalShiftMinutes || 0) / 60)}s {(todayStats.totalShiftMinutes || 0) % 60}dk
                    </p>
                    <p className="text-xs text-slate-400">Vardiya</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <Coffee className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-100" data-testid="text-stat-break">{todayStats.totalBreakMinutes || 0}dk</p>
                    <p className="text-xs text-slate-400">Mola</p>
                  </div>
                </div>
              )}

              {factoryGuidanceItems.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-900/30 border border-amber-500/30" data-testid="worker-home-guidance-banner">
                  <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-300">{factoryGuidanceItems[0].title}</p>
                    <p className="text-xs text-amber-400/70 truncate">{factoryGuidanceItems[0].description}</p>
                  </div>
                  {factoryGuidanceItems.length > 1 && (
                    <Badge className="bg-amber-600/50 text-amber-200 text-[10px] flex-shrink-0">+{factoryGuidanceItems.length - 1}</Badge>
                  )}
                </div>
              )}

              <Separator className="bg-slate-700" />

              <div className="grid grid-cols-2 gap-4">
                <Button
                  className="h-24 text-lg flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setSelectedStation(null);
                    setStep('select-station');
                  }}
                  data-testid="button-goto-station"
                >
                  <MapPin className="h-8 w-8" />
                  {currentStationInfo ? 'İstasyon Değiştir' : 'İstasyon Seç'}
                </Button>

                {currentStationInfo && (
                  <Button
                    className="h-24 text-lg flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => setStep('working')}
                    data-testid="button-goto-working"
                  >
                    <Play className="h-8 w-8" />
                    Üretime Devam
                  </Button>
                )}

                {currentStationInfo && (
                  <Button
                    className="h-24 text-lg flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setQuantityProduced('');
                      setProducedUnit('adet');
                      setQuantityWaste('');
                      setWasteUnit('adet');
                      setSelectedWasteReason(null);
                      setWasteNotes('');
                      setProductionPhotoUrl(null);
                      setSelectedProductId(null);
                      setProductError('');
                      setWasteDoughKg('');
                      setWasteProductCount('');
                      setStep('log-production');
                    }}
                    data-testid="button-log-production"
                  >
                    <Package className="h-8 w-8" />
                    Üretim Kaydet
                  </Button>
                )}

                <Button
                  className="h-24 text-lg flex flex-col items-center gap-2 bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    if (!currentSession) return;
                    setStep('stop-options');
                  }}
                  data-testid="button-goto-break"
                >
                  <Coffee className="h-8 w-8" />
                  Molaya Cik
                </Button>

                <Button
                  className="h-24 text-lg flex flex-col items-center gap-2 bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => {
                    setFaultType(null);
                    setFaultDescription('');
                    setFaultStationId(currentStationInfo?.id || null);
                    setStep('fault-report');
                  }}
                  data-testid="button-goto-fault"
                >
                  <AlertTriangle className="h-8 w-8" />
                  Ariza Bildir
                </Button>
              </div>

              <Button
                className="w-full h-16 text-xl bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setQuantityProduced('');
                  setProducedUnit('adet');
                  setQuantityWaste('');
                  setWasteUnit('adet');
                  setSelectedWasteReason(null);
                  setWasteNotes('');
                  setProductionPhotoUrl(null);
                  setSelectedProductId(null);
                  setProductError('');
                  setWasteDoughKg('');
                  setWasteProductCount('');
                  setStep('production-entry');
                }}
                data-testid="button-end-shift"
              >
                <LogOut className="h-6 w-6 mr-2" />
                Vardiya Bitir
              </Button>
            </div>
          )}

          {step === 'select-station' && selectedUser && currentSession && (
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
                  onClick={() => setStep('worker-home')}
                  data-testid="button-cancel-station"
                >
                  Geri
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleAssignStation}
                  disabled={!selectedStation || assignStationMutation.isPending}
                  data-testid="button-assign-station"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {assignStationMutation.isPending ? "Atanıyor..." : "Çalışmaya Başla"}
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

              <div className="flex items-center gap-1 w-full" data-testid="phase-progress">
                {[
                  { key: 'hazirlik' as KioskPhase, label: 'Hazırlık', Icon: Wrench },
                  { key: 'uretim' as KioskPhase, label: 'Üretim', Icon: Sparkles },
                  { key: 'temizlik' as KioskPhase, label: 'Temizlik', Icon: SprayCan },
                ].map((phase, index) => {
                  const isDone = PHASE_ORDER.indexOf(currentPhase) > index;
                  const isActive = currentPhase === phase.key;
                  const PhaseIcon = phase.Icon;
                  return (
                    <div key={phase.key} className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
                      isDone && "bg-green-900/40 text-green-400 border border-green-700",
                      isActive && "bg-blue-900/40 text-blue-400 ring-2 ring-blue-500",
                      !isDone && !isActive && "bg-slate-700/50 text-slate-500"
                    )} data-testid={`phase-indicator-${phase.key}`}>
                      <PhaseIcon className="h-4 w-4" />
                      <span>{phase.label}</span>
                      {isDone && <span className="text-[10px]">{phaseDurations[phase.key]}dk</span>}
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Factory className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-400">Aktif İstasyon</p>
                    <p className="text-xl font-semibold text-slate-200" data-testid="text-current-station">
                      {currentStationInfo.name}
                    </p>
                  </div>
                </div>
              </div>

              {todayPlans.length > 0 ? (
                <div className="bg-slate-700/30 rounded-lg p-3 space-y-2" data-testid="today-plan-section">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-slate-300">Bugünkü Üretim Planı</span>
                  </div>
                  {todayPlans.map((plan: any) => (
                    <div key={plan.id} className="flex items-center justify-between bg-slate-700/50 rounded-md px-3 py-2" data-testid={`today-plan-${plan.id}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{plan.productName || 'Ürün'}</p>
                        {plan.priority === 'urgent' && <Badge className="bg-red-600 text-xs mt-1">Acil</Badge>}
                        {plan.priority === 'high' && <Badge className="bg-orange-600 text-xs mt-1">Yüksek</Badge>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-400" data-testid={`plan-target-${plan.id}`}>
                          {plan.actualQuantity || 0} / {plan.targetQuantity}
                        </p>
                        <p className="text-xs text-slate-400">{plan.unit || 'adet'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayPlansFetched && (
                <div className="bg-slate-700/30 rounded-lg p-3 text-center" data-testid="no-plan-message">
                  <p className="text-sm text-slate-400">Bugün için atanmış üretim planı yok</p>
                </div>
              )}

              {currentPhase === 'uretim' && (
                <p className="text-xs text-slate-400 text-center" data-testid="text-perf-note">
                  Sadece üretim süresi performansa sayılır
                </p>
              )}

              {currentPhase === 'hazirlik' && (
                <Button 
                  className="w-full bg-blue-600 text-white text-lg h-14"
                  onClick={() => setPendingPhaseTransition('uretim')}
                  data-testid="button-phase-uretim"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Üretime Başla
                </Button>
              )}

              {currentPhase === 'uretim' && (
                <Button 
                  className="w-full bg-orange-500 text-white text-lg h-14"
                  onClick={() => setPendingPhaseTransition('temizlik')}
                  data-testid="button-phase-temizlik"
                >
                  <SprayCan className="h-5 w-5 mr-2" />
                  Temizliğe Geç
                </Button>
              )}

              {currentPhase === 'temizlik' && (
                <Button 
                  className="w-full bg-green-600 text-white text-lg h-14"
                  onClick={() => setPendingPhaseTransition('tamamlandi')}
                  data-testid="button-phase-tamamla"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Görevi Tamamla
                </Button>
              )}

              {collaborativeScores?.isCollaborative && (
                <Card className="bg-slate-700/30 border-slate-600">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-slate-300">Ortak Çalışanlar</span>
                    </div>
                    <div className="space-y-1">
                      {collaborativeScores.workers
                        .filter((w: any) => w.userId !== selectedUser?.id)
                        .map((w: any) => (
                          <div key={w.userId} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{w.firstName} {w.lastName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {w.activeMinutes} dk aktif
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedUser && <KioskBatchSection userId={selectedUser.id} stationId={currentStationInfo.id} />}

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
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 transition-all"
                  onClick={() => {
                    if (!currentSession) return;
                    setSelectedBreakReason('mola');
                    logBreakMutation.mutate({ sessionId: currentSession.id, breakReason: 'mola' });
                  }}
                  disabled={logBreakMutation.isPending}
                  data-testid="break-option-mola"
                >
                  <div className="p-3 rounded-full bg-blue-600">
                    <Coffee className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-slate-200 font-semibold">Mola</span>
                  <span className="text-slate-400 text-xs text-center">Kısa ara (yemek, dinlenme)</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 transition-all"
                  onClick={() => {
                    if (!currentSession) return;
                    setSelectedBreakReason('ozel_ihtiyac');
                    logBreakMutation.mutate({ sessionId: currentSession.id, breakReason: 'ozel_ihtiyac' });
                  }}
                  disabled={logBreakMutation.isPending}
                  data-testid="break-option-ozel_ihtiyac"
                >
                  <div className="p-3 rounded-full bg-orange-500">
                    <CircleUser className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-slate-200 font-semibold">Özel İhtiyaç</span>
                  <span className="text-slate-400 text-xs text-center">WC, kişisel ihtiyaç</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 transition-all"
                  onClick={() => {
                    setSelectedStation(null);
                    setStep('select-station');
                  }}
                  data-testid="break-option-station-change"
                >
                  <div className="p-3 rounded-full bg-purple-600">
                    <Repeat className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-slate-200 font-semibold">İstasyon Değiştir</span>
                  <span className="text-slate-400 text-xs text-center">Farklı istasyona geç</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 transition-all"
                  onClick={() => {
                    setFaultType(null);
                    setFaultDescription('');
                    setFaultStationId(currentStationInfo?.id || null);
                    setStep('fault-report');
                  }}
                  data-testid="button-fault-report"
                >
                  <div className="p-3 rounded-full bg-yellow-600">
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-slate-200 font-semibold">Arıza Bildir</span>
                  <span className="text-slate-400 text-xs text-center">Makina arızası veya ürün hatası</span>
                </Button>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
                onClick={() => {
                  setQuantityProduced('');
                  setProducedUnit('adet');
                  setQuantityWaste('');
                  setWasteUnit('adet');
                  setSelectedWasteReason(null);
                  setWasteNotes('');
                  setProductionPhotoUrl(null);
                  setSelectedProductId(null);
                  setProductError('');
                  setWasteDoughKg('');
                  setWasteProductCount('');
                  setStep('log-production');
                }}
                data-testid="stop-option-log-production"
              >
                <ClipboardCheck className="h-5 w-5 mr-2" />
                Üretimi Bitir
              </Button>

              <Button
                variant="outline"
                className="w-full border-slate-600 h-14 text-lg"
                onClick={() => setStep(currentStationInfo ? 'working' : 'worker-home')}
                data-testid="button-cancel-stop"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Üretime Dön
              </Button>
            </div>
          )}

          {step === 'fault-report' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center text-slate-200">Arıza Türü Seçin</h3>
              
              {!faultType ? (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 transition-all"
                    onClick={() => setFaultType('machine')}
                    data-testid="fault-type-machine"
                  >
                    <div className="p-3 rounded-full bg-red-600">
                      <Settings className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-slate-200 font-semibold">Makina Arızası</span>
                    <span className="text-slate-400 text-xs text-center">Ekipman veya makina arızası</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-700/50 border-slate-600 transition-all"
                    onClick={() => setFaultType('product')}
                    data-testid="fault-type-product"
                  >
                    <div className="p-3 rounded-full bg-orange-600">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-slate-200 font-semibold">Ürün Hatası</span>
                    <span className="text-slate-400 text-xs text-center">Üretilen üründe kalite sorunu</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Badge className={faultType === 'machine' ? 'bg-red-600' : 'bg-orange-600'}>
                    {faultType === 'machine' ? 'Makina Arızası' : 'Ürün Hatası'}
                  </Badge>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-300">Açıklama</Label>
                    <Textarea
                      placeholder={faultType === 'machine' ? 'Arıza detaylarını yazın...' : 'Ürün hatasını açıklayın...'}
                      value={faultDescription}
                      onChange={(e) => setFaultDescription(e.target.value)}
                      className="bg-slate-700 border-slate-600 resize-none text-white"
                      rows={3}
                      data-testid="input-fault-description"
                    />
                  </div>

                  <Button
                    className="w-full bg-red-600 h-14 text-lg"
                    onClick={() => {
                      reportFaultMutation.mutate({
                        faultType,
                        description: faultDescription,
                        stationId: faultStationId,
                        sessionId: currentSession?.id,
                        userId: selectedUser?.id,
                      });
                    }}
                    disabled={!faultDescription.trim() || reportFaultMutation.isPending}
                    data-testid="button-submit-fault"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {reportFaultMutation.isPending ? "Bildiriliyor..." : "Yetkili Kişiye Bildir"}
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full border-slate-600"
                onClick={() => setStep(currentStationInfo ? 'stop-options' : 'worker-home')}
                data-testid="button-back-fault"
              >
                Geri
              </Button>
            </div>
          )}

          {(step === 'log-production' || step === 'production-entry') && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center text-slate-200">
                {step === 'log-production' ? 'Üretim Kaydı' : 'Vardiya Sonlandırma'}
              </h3>
              <p className="text-center text-slate-400">Üretim ve zaiyat bilgilerini girin</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-400" />
                    Ürün Seçimi
                  </Label>
                  <Select 
                    value={selectedProductId?.toString() || ''} 
                    onValueChange={(v) => { setSelectedProductId(parseInt(v)); setProductError(''); }}
                  >
                    <SelectTrigger className={cn("bg-slate-700 border-slate-600 h-14", productError && "border-red-500")} data-testid="select-product">
                      <SelectValue placeholder="Ürün seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {factoryProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {productError && (
                    <p className="text-red-400 text-sm" data-testid="text-product-error">{productError}</p>
                  )}
                </div>

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

                {currentStationInfo?.code === 'donut_dough' || currentStationInfo?.name?.toLowerCase().includes('hamur') ? (
                  <div className="space-y-3">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-400" />
                      Fire Kayıtları
                    </Label>
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-xs">Fire Hamuru (kg)</Label>
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={wasteDoughKg}
                        onChange={(e) => setWasteDoughKg(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-xl h-14 text-center"
                        min="0"
                        step="0.01"
                        data-testid="input-waste-dough-kg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-xs">Zaiyat Donut (adet)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={wasteProductCount}
                        onChange={(e) => setWasteProductCount(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-xl h-14 text-center"
                        min="0"
                        data-testid="input-waste-product-count"
                      />
                    </div>
                  </div>
                ) : (
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
                )}

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

                <Separator className="bg-slate-700" />

                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-amber-400" />
                    Üretim Fotoğrafı (Opsiyonel)
                  </Label>
                  {productionPhotoUrl ? (
                    <div className="relative">
                      <img 
                        src={productionPhotoUrl} 
                        alt="Üretim fotoğrafı" 
                        className="w-full h-40 object-cover rounded-lg border border-slate-600"
                        loading="lazy"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => setProductionPhotoUrl(null)}
                        data-testid="button-remove-photo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <ObjectUploader
                      onGetUploadParameters={async () => {
                        const res = await kioskFetch("/api/objects/generate-upload-url", "POST", { prefix: "factory-production", visibility: "public" });
                        const data = await res.json();
                        return { method: "PUT", url: data.uploadUrl };
                      }}
                      onComplete={(result) => {
                        if (result.successful.length > 0) {
                          setProductionPhotoUrl(result.successful[0].uploadURL);
                          toast({ title: "Fotoğraf yüklendi" });
                        }
                      }}
                      buttonClassName="w-full"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-24 bg-slate-700/50 border-slate-600 border-dashed hover:bg-slate-600 hover:border-amber-500 flex flex-col gap-2"
                        data-testid="button-upload-photo"
                      >
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                        <span className="text-slate-300">Fotoğraf Yükle</span>
                      </Button>
                    </ObjectUploader>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600"
                  onClick={() => setStep('worker-home')}
                  data-testid="button-back-production"
                >
                  Vazgeç
                </Button>
                {step === 'log-production' ? (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleLogProductionSubmit}
                    disabled={logProductionMutation.isPending}
                    data-testid="button-submit-log-production"
                  >
                    {logProductionMutation.isPending ? "Kaydediliyor..." : "Üretimi Kaydet"}
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleProductionSubmit}
                    disabled={endShiftMutation.isPending}
                    data-testid="button-submit-production"
                  >
                    {endShiftMutation.isPending ? "Kaydediliyor..." : "Vardiyayı Sonlandır"}
                  </Button>
                )}
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

              {collaborativeScores?.isCollaborative && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Ortak Üretim Skorları
                  </h4>
                  <div className="space-y-2">
                    {collaborativeScores.workers.map((w: any) => (
                      <div key={w.userId} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between" data-testid={`collab-score-${w.userId}`}>
                        <div>
                          <p className={`font-medium ${w.userId === selectedUser?.id ? 'text-amber-400' : 'text-slate-200'}`}>
                            {w.firstName} {w.lastName}
                            {w.userId === selectedUser?.id && ' (Sen)'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {w.activeMinutes} dk aktif / {w.breakMinutes} dk mola
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-amber-400" data-testid={`collab-share-${w.userId}`}>
                            %{w.sharePercentage}
                          </p>
                          <p className="text-xs text-slate-400">Katkı payı</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700">
                <p className="text-slate-500 text-sm mb-3">
                  {autoLogoutCountdown} saniye sonra giriş ekranına dönülecek...
                </p>
                <Button
                  className="w-full bg-amber-600 h-14 text-lg"
                  onClick={resetWorker}
                  data-testid="button-summary-go-home"
                >
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Giriş Ekranına Dön
                </Button>
              </div>
            </div>
          )}

          {step === 'on-break' && (
            <div className="space-y-6 text-center">
              <div className="w-28 h-28 bg-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Coffee className="h-14 w-14 text-white" />
              </div>

              <h3 className="text-2xl font-semibold text-slate-200">
                {selectedBreakReason === 'ozel_ihtiyac' ? 'Özel İhtiyaç Molası' : 'Mola'}
              </h3>

              <div className="text-5xl font-mono font-bold text-blue-400" data-testid="text-break-timer">
                {formatTime(breakElapsed)}
              </div>

              <p className="text-slate-400">
                {selectedUser?.firstName}, moladan döndüğünde aşağıdaki butona bas
              </p>

              <Button
                className="w-full bg-green-600 h-16 text-xl"
                onClick={() => {
                  if (currentBreakLogId) {
                    endBreakMutation.mutate({ breakLogId: currentBreakLogId });
                  } else {
                    setBreakStartTime(null);
                    setBreakElapsed(0);
                    setStep('worker-home');
                  }
                }}
                disabled={endBreakMutation.isPending}
                data-testid="button-return-from-break"
              >
                <Home className="h-6 w-6 mr-2" />
                Ana Sayfaya Dön
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <AlertDialog open={!!pendingPhaseTransition} onOpenChange={(open) => { if (!open) setPendingPhaseTransition(null); }}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-white" data-testid="phase-confirm-title">
              {pendingPhaseTransition === 'uretim' && 'Ön hazırlık tamamlandı mı?'}
              {pendingPhaseTransition === 'temizlik' && 'Üretim tamamlandı mı?'}
              {pendingPhaseTransition === 'tamamlandi' && 'Temizlik tamamlandı mı?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {pendingPhaseTransition === 'uretim' && 'Hazırlık aşamasını tamamladınız. Üretime geçmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'}
              {pendingPhaseTransition === 'temizlik' && 'Üretim aşamasını tamamladınız. Temizliğe geçmek istediğinizden emin misiniz?'}
              {pendingPhaseTransition === 'tamamlandi' && 'Temizlik aşamasını tamamladınız. Görevi bitirmek istediğinizden emin misiniz?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300" data-testid="button-phase-cancel">İptal</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingPhaseTransition === 'uretim' ? 'bg-blue-600 hover:bg-blue-700' :
                pendingPhaseTransition === 'temizlik' ? 'bg-orange-500 hover:bg-orange-600' :
                'bg-green-600 hover:bg-green-700'
              }
              data-testid="button-phase-confirm"
              onClick={async () => {
                if (pendingPhaseTransition) {
                  if (pendingPhaseTransition === 'tamamlandi') {
                    await handlePhaseTransition('tamamlandi');
                    handleStopClick();
                  } else {
                    await handlePhaseTransition(pendingPhaseTransition);
                  }
                }
                setPendingPhaseTransition(null);
              }}
            >
              {pendingPhaseTransition === 'uretim' && 'Evet, Üretime Geç'}
              {pendingPhaseTransition === 'temizlik' && 'Evet, Temizliğe Geç'}
              {pendingPhaseTransition === 'tamamlandi' && 'Evet, Görevi Bitir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KioskBatchSection({ userId, stationId }: { userId: string; stationId: number }) {
  const { toast } = useToast();
  const [batchTimer, setBatchTimer] = useState(0);
  const [completePieces, setCompletePieces] = useState("");
  const [completeWeight, setCompleteWeight] = useState("");
  const [completeWastePieces, setCompleteWastePieces] = useState("");
  const [completeWasteWeight, setCompleteWasteWeight] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const { data: assignment } = useQuery<any>({
    queryKey: ["/api/factory-shifts/my-assignment", userId],
    queryFn: async () => {
      const res = await kioskFetch(`/api/factory-shifts/my-assignment/${userId}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: activeBatches = [] } = useQuery<any[]>({
    queryKey: ["/api/factory-production-batches", "operator", userId, "in_progress"],
    queryFn: async () => {
      const res = await kioskFetch(`/api/factory-production-batches?operatorId=${userId}&status=in_progress`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const activeBatch = activeBatches.length > 0 ? activeBatches[0] : null;

  useEffect(() => {
    if (!activeBatch) {
      setBatchTimer(0);
      return;
    }
    const start = new Date(activeBatch.startTime).getTime();
    const interval = setInterval(() => {
      setBatchTimer(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBatch?.id]);

  const startBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await kioskFetch("/api/factory-production-batches/start", "POST", data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Batch başlatılamadı'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-production-batches", "operator", userId, "in_progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory-shifts/my-assignment", userId] });
      toast({ title: "Batch başlatıldı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const completeBatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await kioskFetch(`/api/factory-production-batches/${id}/complete`, "PUT", data);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Batch tamamlanamadı'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-production-batches", "operator", userId, "in_progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory-batch-verifications/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory-shifts/my-assignment", userId] });
      setShowCompleteForm(false);
      setCompletePieces("");
      setCompleteWeight("");
      setCompleteWastePieces("");
      setCompleteWasteWeight("");
      setCompleteNotes("");
      toast({ title: "Batch tamamlandı", description: "Supervisor doğrulaması bekleniyor" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  function handleStartBatch(production: any) {
    startBatchMutation.mutate({
      shiftProductionId: production.id,
      operatorId: userId,
      machineId: production.machineId || null,
      batchSpecId: production.batchSpecId || null,
    });
  }

  function handleCompleteBatch() {
    if (!activeBatch) return;
    completeBatchMutation.mutate({
      id: activeBatch.id,
      data: {
        actualPieces: completePieces ? parseInt(completePieces) : null,
        actualWeightKg: completeWeight || null,
        wastePieces: completeWastePieces ? parseInt(completeWastePieces) : null,
        wasteWeightKg: completeWasteWeight || null,
        notes: completeNotes || null,
      },
    });
  }

  const formatBatchTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <Separator className="bg-slate-700" />
      <div className="flex items-center gap-2 text-slate-300">
        <Package className="h-5 w-5 text-amber-500" />
        <span className="font-semibold">Batch Üretim</span>
      </div>

      {activeBatch ? (
        <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Aktif Batch #{activeBatch.batchNumber}</p>
              <p className="text-lg font-semibold text-slate-200">{activeBatch.productName || "Üretim"}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono text-green-400" data-testid="text-batch-timer">
                {formatBatchTime(batchTimer)}
              </p>
              {activeBatch.targetDurationMinutes && (
                <p className="text-xs text-slate-400">Hedef: {activeBatch.targetDurationMinutes} dk</p>
              )}
            </div>
          </div>

          {activeBatch.targetPieces && (
            <div className="text-sm text-slate-400">
              Hedef: {activeBatch.targetPieces} adet / {activeBatch.targetWeightKg || "?"} kg
            </div>
          )}

          {!showCompleteForm ? (
            <Button
              className="w-full bg-green-600"
              onClick={() => setShowCompleteForm(true)}
              data-testid="btn-complete-batch"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Batch Tamamla
            </Button>
          ) : (
            <div className="space-y-3 bg-slate-800/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Üretilen Adet</Label>
                  <Input
                    type="number"
                    value={completePieces}
                    onChange={e => setCompletePieces(e.target.value)}
                    placeholder="650"
                    className="bg-slate-700 border-slate-600 text-white"
                    data-testid="input-batch-pieces"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Ağırlık (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={completeWeight}
                    onChange={e => setCompleteWeight(e.target.value)}
                    placeholder="41"
                    className="bg-slate-700 border-slate-600 text-white"
                    data-testid="input-batch-weight"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Fire Adet</Label>
                  <Input
                    type="number"
                    value={completeWastePieces}
                    onChange={e => setCompleteWastePieces(e.target.value)}
                    placeholder="0"
                    className="bg-slate-700 border-slate-600 text-white"
                    data-testid="input-batch-waste-pieces"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Fire (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={completeWasteWeight}
                    onChange={e => setCompleteWasteWeight(e.target.value)}
                    placeholder="0"
                    className="bg-slate-700 border-slate-600 text-white"
                    data-testid="input-batch-waste-weight"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Notlar</Label>
                <Textarea
                  value={completeNotes}
                  onChange={e => setCompleteNotes(e.target.value)}
                  placeholder="Opsiyonel..."
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="input-batch-notes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-slate-600" onClick={() => setShowCompleteForm(false)} data-testid="btn-cancel-complete">
                  İptal
                </Button>
                <Button className="bg-green-600" onClick={handleCompleteBatch} disabled={completeBatchMutation.isPending} data-testid="btn-submit-batch-complete">
                  {completeBatchMutation.isPending ? "Kaydediliyor..." : "Tamamla"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {assignment?.productions?.length > 0 ? (
            assignment.productions
              .filter((p: any) => p.status !== "completed")
              .map((prod: any) => (
                <div key={prod.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between" data-testid={`kiosk-prod-${prod.id}`}>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{prod.productName}</p>
                    <p className="text-xs text-slate-400">
                      {prod.completedBatchCount || 0} / {prod.plannedBatchCount} batch
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600"
                    onClick={() => handleStartBatch(prod)}
                    disabled={startBatchMutation.isPending || (prod.completedBatchCount >= prod.plannedBatchCount)}
                    data-testid={`btn-start-batch-${prod.id}`}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Başlat
                  </Button>
                </div>
              ))
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">Bugün için atanmış üretim planı yok</p>
          )}
        </div>
      )}
    </div>
  );
}
