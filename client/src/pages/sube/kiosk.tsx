import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useParams } from "wouter";
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
  Store, 
  LogIn, 
  LogOut, 
  Play, 
  Timer, 
  User,
  Lock,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  ChevronLeft,
  AlertTriangle,
  QrCode,
  Camera,
  Scan,
  UserCheck,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

type KioskStep = 'password' | 'select-user' | 'enter-pin' | 'working' | 'end-shift-summary' | 'qr-scan' | 'qr-action';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
  hasPin: boolean;
}

interface Session {
  id: number;
  userId: string;
  branchId: number;
  checkInTime: string;
  checkOutTime: string | null;
  workMinutes: number;
  breakMinutes: number;
  netWorkMinutes: number;
  status: string;
}

interface Checklist {
  id: number;
  name: string;
  pendingTasks: number;
  completedTasks: number;
  totalTasks: number;
  assignmentId?: number;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}

const KIOSK_HQ_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'muhasebe', 'satinalma', 'teknik', 'destek', 'fabrika', 'yatirimci_hq', 'sube_kiosk'];

export default function BranchKiosk() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  
  const [branchAuth, setBranchAuth] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const { data: allowedRolesData } = useQuery<{ roles: string[] }>({
    queryKey: ["/api/branch-dashboard-allowed-roles"],
    queryFn: async () => {
      const res = await fetch("/api/branch-dashboard-allowed-roles");
      if (!res.ok) return { roles: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user?.role === 'sube_kiosk' && user.branchId) {
        setBranchAuth({ id: user.branchId, username: user.username });
        setStep('select-user');
        setAuthChecked(true);
        return;
      }
      const branchAuthStr = sessionStorage.getItem('branchAuth');
      if (branchAuthStr) {
        try {
          const parsed = JSON.parse(branchAuthStr);
          setBranchAuth(parsed);
          setStep('select-user');
        } catch (e) {
          console.error('Failed to parse branchAuth', e);
        }
      }
      setAuthChecked(true);
    }
  }, [user]);

  useEffect(() => {
    if (!authChecked || branchAuth) return;
    const allowedRoles = allowedRolesData?.roles || [];
    if (user && !KIOSK_HQ_ROLES.includes(user.role || '') && !allowedRoles.includes(user.role || '')) {
      setLocation("/");
    }
  }, [authChecked, branchAuth, user, allowedRolesData, setLocation]);
  
  // Use branchAuth.id if available, otherwise fall back to route params or default
  const branchId = branchAuth?.id || (params.branchId ? parseInt(params.branchId) : 1);
  
  const [step, setStep] = useState<KioskStep>('password');
  const [kioskPassword, setKioskPassword] = useState('');
  const [kioskUsername, setKioskUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [userChecklists, setUserChecklists] = useState<Checklist[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(15);
  const [startingChecklistId, setStartingChecklistId] = useState<number | null>(null);
  
  // Double confirmation dialogs state
  const [showEndShiftConfirm1, setShowEndShiftConfirm1] = useState(false);
  const [showEndShiftConfirm2, setShowEndShiftConfirm2] = useState(false);
  const [showBreakConfirm1, setShowBreakConfirm1] = useState(false);
  const [showBreakConfirm2, setShowBreakConfirm2] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [showKioskFaultReport, setShowKioskFaultReport] = useState(false);
  const [kioskFaultCategory, setKioskFaultCategory] = useState("");
  const [kioskFaultDesc, setKioskFaultDesc] = useState("");
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [kioskMode, setKioskMode] = useState<'pin' | 'qr'>('pin');
  const [qrScannedUser, setQrScannedUser] = useState<{ id: string; firstName: string; lastName: string; profileImageUrl?: string | null } | null>(null);
  const [qrUserStatus, setQrUserStatus] = useState<{ hasActiveShift: boolean; currentStatus: string; session?: Session | null }>({ hasActiveShift: false, currentStatus: 'none' });
  const [qrScanResult, setQrScanResult] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [qrScanMessage, setQrScanMessage] = useState('');
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastQrData = useRef<string>('');
  const qrContainerId = "kiosk-qr-scanner";

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLocationStatus('granted');
        },
        () => setLocationStatus('denied'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationStatus('denied');
    }
  }, []);

  useEffect(() => {
    fetch(`/api/branches/${branchId}/kiosk/settings`)
      .then(r => r.json())
      .then(data => {
        if (data?.kioskMode === 'qr') {
          setKioskMode('qr');
          if (step === 'password') setStep('qr-scan');
        }
      })
      .catch(() => {});
  }, [branchId]);

  useEffect(() => {
    if (step !== 'qr-scan') {
      if (qrScannerRef.current) {
        try { qrScannerRef.current.clear(); } catch {}
        qrScannerRef.current = null;
      }
      return;
    }
    const timer = setTimeout(() => {
      const container = document.getElementById(qrContainerId);
      if (!container) return;
      setQrScanResult('idle');
      setQrScanMessage('');
      try {
        const scanner = new Html5QrcodeScanner(
          qrContainerId,
          { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1 },
          false
        );
        scanner.render(
          (decodedText) => {
            handleQrScanned(decodedText);
            scanner.pause();
          },
          () => {}
        );
        qrScannerRef.current = scanner;
      } catch (e) {
        console.error("QR scanner init error:", e);
      }
    }, 200);

  return () => {
      clearTimeout(timer);
      if (qrScannerRef.current) {
        try { qrScannerRef.current.clear(); } catch {}
      }
    };
  }, [step]);

  const handleQrScanned = useCallback(async (decodedText: string) => {
    setQrScanResult('processing');
    setQrScanMessage('QR kod dogrulanıyor...');
    lastQrData.current = decodedText;
    try {
      const qrData = JSON.parse(decodedText);
      if (!qrData.userId || !qrData.hmac) {
        setQrScanResult('error');
        setQrScanMessage('Gecersiz QR kod formati');
        setTimeout(resumeQrScanner, 3000);
        return;
      }
      const statusRes = await fetch(`/api/kiosk/qr-status/${qrData.userId}/${branchId}`);
      const statusData = await statusRes.json();
      if (!statusData.user) {
        setQrScanResult('error');
        setQrScanMessage('Kullanıcı bulunamadı');
        setTimeout(resumeQrScanner, 3000);
        return;
      }
      setQrScannedUser(statusData.user);
      setQrUserStatus({
        hasActiveShift: statusData.hasActiveShift,
        currentStatus: statusData.currentStatus,
        session: statusData.activeSession,
      });
      setQrScanResult('success');
      setQrScanMessage(`${statusData.user.firstName} ${statusData.user.lastName}`);
      setTimeout(() => {
        setStep('qr-action');
      }, 800);
    } catch (e) {
      setQrScanResult('error');
      setQrScanMessage('QR kod okunamadı');
      setTimeout(resumeQrScanner, 3000);
    }
  }, [branchId]);

  const resumeQrScanner = () => {
    setQrScanResult('idle');
    setQrScanMessage('');
    if (qrScannerRef.current) {
      try { qrScannerRef.current.resume(); } catch {}
    }
  };

  const qrActionMutation = useMutation({
    mutationFn: async (data: { qrData: string; action: string }) => {
      const res = await apiRequest('POST', '/api/kiosk/qr-checkin', {
        qrData: data.qrData,
        branchId,
        action: data.action,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.session) {
        setCurrentSession(data.session);
      }
      if (data.summary) {
        setShiftSummary(data.summary);
      }
      toast({ title: "Başarılı", description: getActionMessage(data.action) });
      if (data.action === 'shift_ended') {
        setStep('end-shift-summary');
      } else {
        setTimeout(() => setStep('qr-scan'), 3000);
      }
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const getActionMessage = (action: string) => {
    switch (action) {
      case 'shift_started': return 'Vardiya baslatildi!';
      case 'shift_ended': return 'Vardiya sonlandirildi!';
      case 'break_started': return 'Mola baslatildi!';
      case 'break_ended': return 'Mola sonlandirildi!';
      case 'already_active': return 'Zaten aktif vardiyaniz var';
      default: return 'Islem tamamlandi';
    }
  };

  const { data: staffList = [], isLoading: loadingStaff, refetch: refetchStaff, isError } = useQuery<StaffMember[]>({
    queryKey: ['/api/branches', branchId, 'kiosk', 'staff'],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/kiosk/staff`);
      return res.json();
    },
    enabled: step === 'select-user',
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/verify-password`, { username: data.username, password: data.password });
      return res.json();
    },
    onSuccess: () => {
      setStep('select-user');
      refetchStaff();
      toast({ title: "Kiosk açıldı", description: "Personel seçin" });
    },
    onError: (error: any) => {
      toast({ title: "Hatalı parola", description: error.message, variant: "destructive" });
      setKioskPassword('');
    setKioskUsername('');
    },
  });
  const startChecklistMutation = useMutation({
    mutationFn: async (data: { assignmentId: number; checklistId: number }) => {
      const res = await apiRequest('POST', '/api/checklist-completions/start', {
        assignmentId: data.assignmentId,
        checklistId: data.checklistId,
        branchId: branchId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setStartingChecklistId(null);
      setLocation(`/sube/checklist-execution/${data.id}`);
    },
    onError: (error: any) => {
      setStartingChecklistId(null);
      toast({ title: "Hata", description: error.message || "Checklist başlatılamadı", variant: "destructive" });
    },
  });

  const handleStartChecklist = (checklist: Checklist) => {
    if (!checklist.assignmentId) {
      toast({ title: "Hata", description: "Atama bilgisi bulunamadı", variant: "destructive" });
      return;
    }
    setStartingChecklistId(checklist.id);
    startChecklistMutation.mutate({
      assignmentId: checklist.assignmentId,
      checklistId: checklist.id,
    });
  };


  const loginMutation = useMutation({
    mutationFn: async (data: { userId: string; pin: string }) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/login`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
        fetchSessionDetails(data.user.id);
      }
      setStep('working');
      toast({ title: "Giriş başarılı", description: `Hoş geldin ${data.user.firstName}` });
    },
    onError: (error: any) => {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
      setPinInput('');
    },
  });

  const startShiftMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/shift-start`, {
        userId,
        ...(userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : {}),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      toast({ title: "Vardiya başladı", description: "İyi çalışmalar!" });
    },
    onError: (error: any) => {
      toast({ title: "Vardiya başlatılamadı", description: error.message, variant: "destructive" });
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/break-start`, { sessionId });
      return res.json();
    },
    onSuccess: () => {
      if (currentSession) {
        setCurrentSession({ ...currentSession, status: 'on_break' });
      }
      toast({ title: "Mola başladı", description: "İyi dinlenmeler!" });
    },
    onError: (error: any) => {
      toast({ title: "Mola başlatılamadı", description: error.message, variant: "destructive" });
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/break-end`, { sessionId });
      return res.json();
    },
    onSuccess: () => {
      if (currentSession) {
        setCurrentSession({ ...currentSession, status: 'active' });
      }
      toast({ title: "Mola bitti", description: "Çalışmaya devam" });
    },
    onError: (error: any) => {
      toast({ title: "Mola bitirilemedi", description: error.message, variant: "destructive" });
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/shift-end`, {
        sessionId,
        ...(userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : {}),
      });
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

  const kioskFaultMutation = useMutation({
    mutationFn: async (body: { category: string; description: string }) => {
      const res = await apiRequest("POST", "/api/faults", {
        description: `[Kiosk] [${body.category}] ${body.description}`,
        equipmentName: body.category,
        priority: "orta",
        branchId: Number(branchId),
        reportedById: selectedUser?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sorun bildirildi", description: "Yöneticinize iletilecek." });
      setShowKioskFaultReport(false);
      setKioskFaultCategory("");
      setKioskFaultDesc("");
    },
    onError: (error: any) => {
      toast({ title: "Bildirilemedi", description: error.message, variant: "destructive" });
    },
  });

  const fetchSessionDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/branches/${branchId}/kiosk/session/${userId}`);
      const data = await res.json();
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
      }
      if (data.tasks) {
        setUserTasks(data.tasks);
      }
      if (data.checklists) {
        setUserChecklists(data.checklists);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentSession && currentSession.status !== 'completed') {
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
    if (step === 'end-shift-summary') {
      interval = setInterval(() => {
        setAutoLogoutCountdown(prev => {
          if (prev <= 1) {
            resetWorker();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const resetWorker = () => {
    setStep('select-user');
    setSelectedUser(null);
    setPinInput('');
    setCurrentSession(null);
    setUserTasks([]);
    setElapsedTime(0);
    setShiftSummary(null);
    setAutoLogoutCountdown(15);
    setQrScannedUser(null);
    setQrScanResult('idle');
    setQrScanMessage('');
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
    setStep(kioskMode === 'qr' ? 'qr-scan' : 'password');
    setKioskPassword('');
    setKioskUsername('');
    setSelectedUser(null);
    setPinInput('');
    setCurrentSession(null);
    setUserTasks([]);
    setElapsedTime(0);
    setShiftSummary(null);
    setAutoLogoutCountdown(15);
    setQrScannedUser(null);
    setQrScanResult('idle');
    setQrScanMessage('');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} saat ${mins} dakika`;
    }
    return `${mins} dakika`;
  };

  const handlePinSubmit = () => {
    if (selectedUser && pinInput.length === 4) {
      loginMutation.mutate({ userId: selectedUser.id, pin: pinInput });
    }
  };

  const handleStartShift = () => {
    if (selectedUser) {
      startShiftMutation.mutate(selectedUser.id);
    }
  };
  
  // Double confirmation handlers for shift end
  const handleEndShiftClick = () => {
    setShowEndShiftConfirm1(true);
  };
  
  const handleEndShiftFirstConfirm = () => {
    setShowEndShiftConfirm1(false);
    setShowEndShiftConfirm2(true);
  };
  
  const handleEndShiftFinalConfirm = () => {
    setShowEndShiftConfirm2(false);
    if (currentSession) {
      endShiftMutation.mutate(currentSession.id);
    }
  };
  
  // Double confirmation handlers for break start
  const handleBreakStartClick = () => {
    setShowBreakConfirm1(true);
  };
  
  const handleBreakFirstConfirm = () => {
    setShowBreakConfirm1(false);
    setShowBreakConfirm2(true);
  };
  
  const handleBreakFinalConfirm = () => {
    setShowBreakConfirm2(false);
    if (currentSession) {
      breakStartMutation.mutate(currentSession.id);
    }
  };

  const renderPasswordStep = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-amber-100 dark:bg-amber-900">
            <Store className="h-12 w-12 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Şube Kiosk</CardTitle>
          <CardDescription>Şube kullanıcı adı ve parolasını girin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Şube Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="örn: ışıklar"
                  value={kioskUsername}
                  onChange={(e) => setKioskUsername(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  data-testid="input-kiosk-username"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Parola (4 haneli)</label>
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                      kioskPassword.length > i
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/50'
                        : 'border-muted'
                    }`}
                  >
                    {kioskPassword[i] ? '•' : ''}
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
                  className="h-14 text-xl"
                  disabled={num === '' || !kioskUsername.trim()}
                  data-testid={`keypad-${num}`}
                  onClick={() => {
                    if (num === 'del') {
                      setKioskPassword(prev => prev.slice(0, -1));
                    } else if (typeof num === 'number' && kioskPassword.length < 4) {
                      const newPass = kioskPassword + num;
                      setKioskPassword(newPass);
                      if (newPass.length === 4 && kioskUsername.trim()) {
                        verifyPasswordMutation.mutate({ username: kioskUsername, password: newPass });
                      }
                    }
                  }}
                >
                  {num === 'del' ? '⌫' : num}
                </Button>
              ))}
            </div>
            
            {!kioskUsername.trim() && (
              <p className="text-sm text-muted-foreground text-center">
                Lütfen önce şube kullanıcı adını girin
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  const renderSelectUserStep = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={resetKiosk} data-testid="button-back">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Personel Seçin</h1>
      </div>
      
      {loadingStaff ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {staffList.map((staff) => (
            <Card
              key={staff.id}
              className={`cursor-pointer transition-all hover-elevate ${
                !staff.hasPin ? 'opacity-50' : ''
              }`}
              onClick={() => {
                if (staff.hasPin) {
                  setSelectedUser(staff);
                  setStep('enter-pin');
                } else {
                  toast({
                    title: "PIN Gerekli",
                    description: "Bu personelin PIN'i ayarlanmamış. Yöneticinize başvurun.",
                    variant: "destructive",
                  });
                }
              }}
              data-testid={`staff-card-${staff.id}`}
            >
              <CardContent className="flex flex-col items-center p-4">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarImage src={staff.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xl bg-amber-100 text-amber-700">
                    {staff.firstName?.[0]}{staff.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-center">{staff.firstName} {staff.lastName}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {staff.role}
                </Badge>
                {!staff.hasPin && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    PIN Yok
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderEnterPinStep = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => {
              setSelectedUser(null);
              setPinInput('');
              setStep('select-user');
            }}
            data-testid="button-back-pin"
          >
            <ChevronLeft className="h-5 w-5 mr-1" /> Geri
          </Button>
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage src={selectedUser?.profileImageUrl || undefined} />
            <AvatarFallback className="text-2xl bg-amber-100 text-amber-700">
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
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-muted'
                  }`}
                >
                  {pinInput.length > i ? '•' : ''}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((num, idx) => (
                <Button
                  key={idx}
                  variant={num === '' ? 'ghost' : 'outline'}
                  size="lg"
                  className="h-14 text-xl"
                  disabled={num === '' || loginMutation.isPending}
                  data-testid={`pin-keypad-${num}`}
                  onClick={() => {
                    if (num === 'del') {
                      setPinInput(prev => prev.slice(0, -1));
                    } else if (typeof num === 'number' && pinInput.length < 4) {
                      const newPin = pinInput + num;
                      setPinInput(newPin);
                      if (newPin.length === 4) {
                        loginMutation.mutate({ userId: selectedUser!.id, pin: newPin });
                      }
                    }
                  }}
                >
                  {num === 'del' ? '⌫' : num}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderWorkingStep = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={selectedUser?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-amber-100 text-amber-700">
              {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{selectedUser?.firstName} {selectedUser?.lastName}</p>
            <Badge variant={currentSession?.status === 'on_break' ? 'secondary' : 'default'}>
              {currentSession?.status === 'on_break' ? 'Molada' : 'Çalışıyor'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={resetWorker} data-testid="button-logout">
          <LogOut className="h-4 w-4 mr-2" /> Çıkış
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Vardiya Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!currentSession ? (
              <div className="text-center py-8">
                <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Vardiya başlatılmadı</p>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleStartShift}
                  disabled={startShiftMutation.isPending}
                  data-testid="button-start-shift"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Vardiya Başlat
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold text-amber-600 mb-2">
                    {formatTime(elapsedTime)}
                  </div>
                  <p className="text-muted-foreground">Çalışma Süresi</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  {currentSession.status === 'on_break' ? (
                    <Button
                      size="lg"
                      className="col-span-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => breakEndMutation.mutate(currentSession.id)}
                      disabled={breakEndMutation.isPending}
                      data-testid="button-end-break"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Molayı Bitir
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={handleBreakStartClick}
                      disabled={breakStartMutation.isPending}
                      data-testid="button-start-break"
                    >
                      <Coffee className="h-5 w-5 mr-2" />
                      Mola
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleEndShiftClick}
                    disabled={endShiftMutation.isPending || currentSession.status === 'on_break'}
                    data-testid="button-end-shift"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Vardiya Bitir
                  </Button>
                </div>

                {currentSession.breakMinutes > 0 && (
                  <div className="text-center text-muted-foreground">
                    Toplam mola: {formatMinutes(currentSession.breakMinutes)}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-amber-600" />
              Görevlerim
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>Bekleyen görev yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    data-testid={`task-item-${task.id}`}
                  >
                    <div className={`p-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-600' :
                      task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {task.priority === 'high' ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <ListTodo className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      task.status === 'pending' ? 'secondary' :
                      task.status === 'in_progress' ? 'default' : 'outline'
                    }>
                      {task.status === 'pending' ? 'Bekliyor' :
                       task.status === 'in_progress' ? 'Devam Ediyor' : task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowKioskFaultReport(true)}
          data-testid="button-kiosk-report-fault"
        >
          <AlertOctagon className="h-5 w-5 text-orange-500" />
          Sorun Bildir
        </Button>

        <Dialog open={showKioskFaultReport} onOpenChange={setShowKioskFaultReport}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Sorun Bildir</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {["Ekipman", "Hijyen", "Stok", "Diğer"].map((cat) => (
                  <Button
                    key={cat}
                    variant={kioskFaultCategory === cat ? "default" : "outline"}
                    className="toggle-elevate"
                    onClick={() => setKioskFaultCategory(cat)}
                    data-testid={`button-fault-cat-${cat.toLowerCase()}`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder="Sorunu kısaca açıklayın..."
                value={kioskFaultDesc}
                onChange={(e) => setKioskFaultDesc(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-kiosk-fault-desc"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => kioskFaultMutation.mutate({ category: kioskFaultCategory, description: kioskFaultDesc })}
                disabled={!kioskFaultCategory || !kioskFaultDesc.trim() || kioskFaultMutation.isPending}
                data-testid="button-kiosk-fault-submit"
              >
                {kioskFaultMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Gönder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <KioskBranchTasks />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Checklistlerim
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userChecklists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>Atanmış checklist yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userChecklists.map((checklist) => (
                  <div
                    key={checklist.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover-elevate"
                    data-testid={`checklist-item-${checklist.id}`}
                    onClick={() => handleStartChecklist(checklist)}
                  >
                    <div className={`p-2 rounded-full ${checklist.pendingTasks === 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {startingChecklistId === checklist.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : checklist.pendingTasks === 0 ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ListTodo className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{checklist.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {checklist.completedTasks}/{checklist.totalTasks} tamamlandı
                      </p>
                    </div>
                    <Badge variant={checklist.pendingTasks === 0 ? 'default' : 'secondary'}>
                      {checklist.pendingTasks === 0 ? 'Tamamlandı' : `${checklist.pendingTasks} bekliyor`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEndShiftSummary = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Vardiya Tamamlandı!</CardTitle>
          <CardDescription>
            {selectedUser?.firstName} {selectedUser?.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shiftSummary && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{formatMinutes(shiftSummary.totalWorkMinutes)}</p>
                <p className="text-sm text-muted-foreground">Toplam Süre</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{formatMinutes(shiftSummary.breakMinutes)}</p>
                <p className="text-sm text-muted-foreground">Mola</p>
              </div>
              <div className="col-span-2 p-4 rounded-lg bg-green-100 dark:bg-green-900">
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatMinutes(shiftSummary.netWorkMinutes)}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Net Çalışma</p>
              </div>
            </div>
          )}

          <div className="text-center text-muted-foreground">
            <p>{autoLogoutCountdown} saniye sonra otomatik çıkış yapılacak</p>
          </div>

          <Button
            className="w-full"
            onClick={resetWorker}
            data-testid="button-finish"
          >
            Tamam ({autoLogoutCountdown}s)
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderQrScanStep = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-amber-100 dark:bg-amber-900">
            <Scan className="h-8 w-8 text-amber-700 dark:text-amber-300" />
          </div>
          <CardTitle className="text-xl" data-testid="title-qr-scan">QR Kod Okutun</CardTitle>
          <CardDescription>Telefonunuzdaki QR kodu kameraya gosterin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-md overflow-hidden bg-black/5">
            <div id={qrContainerId} style={{ width: '100%' }} />
          </div>

          {qrScanResult === 'processing' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{qrScanMessage}</p>
            </div>
          )}

          {qrScanResult === 'success' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{qrScanMessage}</p>
            </div>
          )}

          {qrScanResult === 'error' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{qrScanMessage}</p>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            Personel telefonundan Vardiyalarim &gt; QR Giris sekmesindeki QR kodu okutun
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderQrActionStep = () => {
    if (!qrScannedUser) return null;
    const { hasActiveShift, currentStatus } = qrUserStatus;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3">
              <Avatar className="h-16 w-16 mx-auto">
                <AvatarImage src={qrScannedUser.profileImageUrl || undefined} />
                <AvatarFallback className="text-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                  {qrScannedUser.firstName?.[0]}{qrScannedUser.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl" data-testid="title-qr-user">
              {qrScannedUser.firstName} {qrScannedUser.lastName}
            </CardTitle>
            <CardDescription>
              {hasActiveShift
                ? currentStatus === 'on_break'
                  ? 'Molada'
                  : 'Aktif vardiyada'
                : 'Aktif vardiya yok'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasActiveShift && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  qrActionMutation.mutate({ qrData: lastQrData.current || '', action: 'shift_start' });
                }}
                disabled={qrActionMutation.isPending}
                data-testid="button-qr-shift-start"
              >
                <Play className="w-5 h-5 mr-2" />
                Vardiya Baslat
              </Button>
            )}

            {hasActiveShift && currentStatus === 'active' && (
              <>
                <Button
                  className="w-full"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    qrActionMutation.mutate({ qrData: lastQrData.current || '', action: 'break_start' });
                  }}
                  disabled={qrActionMutation.isPending}
                  data-testid="button-qr-break-start"
                >
                  <Coffee className="w-5 h-5 mr-2" />
                  Molaya Cik
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  size="lg"
                  onClick={() => {
                    qrActionMutation.mutate({ qrData: lastQrData.current || '', action: 'shift_end' });
                  }}
                  disabled={qrActionMutation.isPending}
                  data-testid="button-qr-shift-end"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Vardiya Bitir
                </Button>
              </>
            )}

            {hasActiveShift && currentStatus === 'on_break' && (
              <>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    qrActionMutation.mutate({ qrData: lastQrData.current || '', action: 'break_end' });
                  }}
                  disabled={qrActionMutation.isPending}
                  data-testid="button-qr-break-end"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Moladan Don
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  size="lg"
                  onClick={() => {
                    qrActionMutation.mutate({ qrData: lastQrData.current || '', action: 'shift_end' });
                  }}
                  disabled={qrActionMutation.isPending}
                  data-testid="button-qr-shift-end-break"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Vardiya Bitir
                </Button>
              </>
            )}

            <Separator />

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setQrScannedUser(null);
                setQrScanResult('idle');
                setStep('qr-scan');
              }}
              data-testid="button-qr-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Geri Don
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'password':
        return renderPasswordStep();
      case 'select-user':
        return renderSelectUserStep();
      case 'enter-pin':
        return renderEnterPinStep();
      case 'working':
        return renderWorkingStep();
      case 'end-shift-summary':
        return renderEndShiftSummary();
      case 'qr-scan':
        return renderQrScanStep();
      case 'qr-action':
        return renderQrActionStep();
      default:
        return kioskMode === 'qr' ? renderQrScanStep() : renderPasswordStep();
    }
  };
  
  return (
    <>
      {renderContent()}

      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        onClick={handleKioskExit}
        data-testid="button-kiosk-exit"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Kiosk'tan Cik
      </Button>
      
      {/* First confirmation dialog for ending shift */}
      <AlertDialog open={showEndShiftConfirm1} onOpenChange={setShowEndShiftConfirm1}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Vardiya Sonlandırma
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vardiyayı sonlandırmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-end-shift-1">İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndShiftFirstConfirm}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-end-shift-1"
            >
              Evet, Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Second confirmation dialog for ending shift */}
      <AlertDialog open={showEndShiftConfirm2} onOpenChange={setShowEndShiftConfirm2}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Son Onay
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Bu işlem geri alınamaz! Vardiyayı kesinlikle sonlandırmak istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-end-shift-2">Vazgeç</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndShiftFinalConfirm}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-end-shift-2"
            >
              Evet, Vardiyayı Bitir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* First confirmation dialog for break start */}
      <AlertDialog open={showBreakConfirm1} onOpenChange={setShowBreakConfirm1}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-blue-500" />
              Mola Başlatma
            </AlertDialogTitle>
            <AlertDialogDescription>
              Molaya çıkmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-break-1">İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBreakFirstConfirm}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-break-1"
            >
              Evet, Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Second confirmation dialog for break start */}
      <AlertDialog open={showBreakConfirm2} onOpenChange={setShowBreakConfirm2}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <Coffee className="h-5 w-5" />
              Son Onay
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Mola süreniz kayıt altına alınacaktır. Molaya çıkmak istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-break-2">Vazgeç</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBreakFinalConfirm}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-break-2"
            >
              Evet, Molaya Çık
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function KioskBranchTasks() {
  const { toast } = useToast();
  const { data: instances, isLoading } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/kiosk/instances"],
    queryFn: () => fetch("/api/branch-tasks/kiosk/instances", {
      headers: { "x-kiosk-token": localStorage.getItem("kiosk-token") || "" },
    }).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
  });

  const claimMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/branch-tasks/kiosk/${id}/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kiosk-token": localStorage.getItem("kiosk-token") || "",
      },
    }).then(r => { if (!r.ok) throw new Error("Sahiplenilemedi"); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/kiosk/instances"] });
      toast({ title: "Görev sahiplenildi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/branch-tasks/kiosk/${id}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kiosk-token": localStorage.getItem("kiosk-token") || "",
      },
    }).then(r => { if (!r.ok) throw new Error("Tamamlanamadı"); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/kiosk/instances"] });
      toast({ title: "Görev tamamlandı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return null;
  if (!instances || instances.length === 0) return null;

  const openTasks = instances.filter((t: any) => t.status !== "completed");
  if (openTasks.length === 0) return null;

  return (
    <Card data-testid="card-kiosk-branch-tasks">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-teal-600" />
          Şube Görevleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {openTasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card" data-testid={`kiosk-branch-task-${task.id}`}>
              <div className={`p-2 rounded-full ${task.is_overdue ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"}`}>
                {task.is_overdue ? <AlertCircle className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.category}
                  {task.claimed_first && ` | ${task.claimed_first} ${task.claimed_last}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {task.status === "pending" && (
                  <Button size="sm" onClick={() => claimMutation.mutate(task.id)} disabled={claimMutation.isPending} data-testid={`button-kiosk-claim-${task.id}`}>
                    Sahiplen
                  </Button>
                )}
                {task.status === "claimed" && (
                  <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => completeMutation.mutate(task.id)} disabled={completeMutation.isPending} data-testid={`button-kiosk-complete-${task.id}`}>
                    Tamamla
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

