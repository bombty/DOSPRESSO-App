import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { KvkkAydinlatma, KvkkFooterLink } from "@/components/kvkk-aydinlatma";  // Sprint 12 P-22: KVKK 6698
// Aslan 10 May 2026: Yeni KVKK per-user modal + mola sayaç + dönüş özeti
import { KvkkPerUserModal } from "@/components/kvkk-per-user-modal";
import { BreakCountdown } from "@/components/break-countdown";
import { BreakReturnSummary } from "@/components/break-return-summary";
import { QRCodeSVG } from "qrcode.react";
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
  Bell,
  Megaphone,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

type KioskStep = 'password' | 'select-user' | 'enter-pin' | 'announcements' | 'working' | 'end-shift-summary' | 'qr-scan' | 'qr-action';

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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState<KioskStep>('password');
  const [kioskPassword, setKioskPassword] = useState('');
  const [kioskUsername, setKioskUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [userChecklists, setUserChecklists] = useState<Checklist[]>([]);
  const [teamStatus, setTeamStatus] = useState<any[]>([]);
  const [pendingAnnouncements, setPendingAnnouncements] = useState<any[]>([]);
  const [quizMode, setQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [kioskNotifications, setKioskNotifications] = useState<any[]>([]);
  const [kioskAnnouncements, setKioskAnnouncements] = useState<any[]>([]);
  const [pdksAnomalyUsers, setPdksAnomalyUsers] = useState<any[]>([]);
  const [kioskBranchTasks, setKioskBranchTasks] = useState<any[]>([]);
  const [userScore, setUserScore] = useState<{ score: number; details: { total: number; completed: number; overdue: number; rate: number } } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitPasswordInput, setExitPasswordInput] = useState('');
  const [lobbyData, setLobbyData] = useState<any>(null);
  const [displayQr, setDisplayQr] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  // Aslan 10 May 2026: KVKK per-user + mola sayaç state
  const [showKvkkModal, setShowKvkkModal] = useState(false);
  const [pendingPostLoginAction, setPendingPostLoginAction] = useState<(() => void) | null>(null);
  const [breakReturnSummary, setBreakReturnSummary] = useState<{
    userName: string;
    breakStartTime: string;
    breakEndTime: string;
    plannedMinutes: number;
    overtimeMinutes: number;
    newWarningsToday: number;
  } | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_MS = 3 * 60 * 1000; // 3 dakika
  
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
        // Şube adını API'den al
        fetch(`/api/branches/${user.branchId}`)
          .then(r => r.json())
          .then(b => setBranchAuth({ id: user.branchId, username: user.username, name: b?.name || '' }))
          .catch(() => setBranchAuth({ id: user.branchId, username: user.username, name: '' }));
        setBranchAuth({ id: user.branchId, username: user.username, name: '' });
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
  

  // Offline/Online durumu takip et
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      resetWorker();
    }, INACTIVITY_MS);
  }, []);

  // Working ekranında hareket algıla
  useEffect(() => {
    if (step !== 'working') {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      return;
    }
    const events = ['touchstart', 'mousedown', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [step, resetInactivityTimer]);


  // TEK SESSION KAYNAĞI — sync sadece günceller, asla silmez
  useEffect(() => {
    if (step !== 'working' || !selectedUser?.id || !branchId) return;
    let cancelled = false;
    const userId = selectedUser.id;
    const token = () => localStorage.getItem('kiosk-token') || '';

    const loadAll = async (isFirstLoad = false) => {
      try {
        const res = await fetch(
          `/api/branches/${branchId}/kiosk/session/${userId}`,
          { credentials: 'include', headers: { 'x-kiosk-token': token() } }
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (!cancelled) {
            // Sadece activeSession varsa güncelle — null gelirse mevcut state'e dokunma
            if (data.activeSession) {
              setCurrentSession(data.activeSession);
            }
            // İlk yüklemede null gelirse de loading'i kapat (vardiya yok durumu)
            if (data.tasks) setUserTasks(data.tasks);
            if (data.checklists) setUserChecklists(data.checklists);
            if (data.branchTasks) {
              setKioskBranchTasks(data.branchTasks);
              // Kullanıcı skorunu havuzdaki görevlerden dinamik hesapla
              // (kiosk-auth /api/branch-tasks/score erişemiyor - public endpoint değil)
              const myCompleted = data.branchTasks.filter((t: any) =>
                t.completedByUserId === userId || t.completedBy === userId
              ).length;
              const myClaimed = data.branchTasks.filter((t: any) =>
                (t.claimedByUserId === userId || t.assignedToUserId === userId) && !t.completedByUserId
              ).length;
              const myOverdue = data.branchTasks.filter((t: any) =>
                (t.claimedByUserId === userId || t.assignedToUserId === userId) && t.isOverdue && !t.completedByUserId
              ).length;
              const total = myCompleted + myClaimed;
              const score = total > 0 ? Math.round((myCompleted / Math.max(total, 1)) * 100) : 0;
              setUserScore({
                score,
                details: { total, completed: myCompleted, overdue: myOverdue, rate: score / 100 }
              });
            }
          }
        }
      } catch {}
      if (isFirstLoad && !cancelled) setSessionLoading(false);
      if (isFirstLoad) {
        try {
          const t = await fetch(`/api/branches/${branchId}/kiosk/team-status`,
            { credentials: 'include', headers: { 'x-kiosk-token': token() } });
          if (t.ok && !cancelled) {
            const td = await t.json();
            const team = Array.isArray(td.team) ? td.team : [];
            setTeamStatus(team);
            setPdksAnomalyUsers(team.filter((m: any) => m.isBreakAnomaly && m.userId !== userId));
          }
        } catch {}
        try {
          const n = await fetch(`/api/branches/${branchId}/kiosk/notifications/${userId}`,
            { credentials: 'include', headers: { 'x-kiosk-token': token() } });
          if (n.ok && !cancelled) { const nd = await n.json(); setKioskNotifications(Array.isArray(nd) ? nd : []); }
        } catch {}
        try {
          const a = await fetch(`/api/branches/${branchId}/kiosk/announcements`,
            { credentials: 'include', headers: { 'x-kiosk-token': token() } });
          if (a.ok && !cancelled) { const ad = await a.json(); setKioskAnnouncements(Array.isArray(ad) ? ad : []); }
        } catch {}
      }
    };

    setSessionLoading(true);
    loadAll(true);
    const loadingFallback = setTimeout(() => setSessionLoading(false), 4000);
    const interval = setInterval(() => loadAll(false), 10000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(loadingFallback); };
  }, [step, selectedUser?.id, branchId]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(15);
  const [startingChecklistId, setStartingChecklistId] = useState<number | null>(null);
  
  // Double confirmation dialogs state
  const [showEndShiftConfirm1, setShowEndShiftConfirm1] = useState(false);
  const [showEndShiftConfirm2, setShowEndShiftConfirm2] = useState(false);
  const [showBreakConfirm1, setShowBreakConfirm1] = useState(false);
  const [showBreakConfirm2, setShowBreakConfirm2] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [overtimeNote, setOvertimeNote] = useState('');
  const [overtimeManagerName, setOvertimeManagerName] = useState('');
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
          // sube_kiosk rolü direkt select-user'a gider — QR'a atlatma
          if (user?.role !== 'sube_kiosk') {
            setStep(prev => prev === 'password' ? 'qr-scan' : prev);
          }
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
    staleTime: 300000,
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
    onSuccess: async (data) => {
      if (data.kioskToken) localStorage.setItem("kiosk-token", data.kioskToken);
      if (data.user) {
        setSelectedUser((prev: any) => ({ ...(prev || {}), ...data.user }));
      }
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
      }

      // Login sonrası yapılacak akış (KVKK sonrası veya direkt çalıştırılır)
      const continueAfterKvkk = async () => {
        // Vardiya başı zorunlu duyuru kontrolü
        try {
          const userId = data.user?.id || selectedUser?.id;
          if (userId && branchId) {
            const annRes = await fetch(`/api/branches/${branchId}/kiosk/pending-announcements/${userId}`, { credentials: 'include' });
            if (annRes.ok) {
              const pending = await annRes.json();
              if (Array.isArray(pending) && pending.length > 0) {
                setPendingAnnouncements(pending);
                setStep('announcements');
                toast({ title: "Duyuru", description: `${pending.length} onay bekleyen duyuru var` });
                return;
              }
            }
          }
        } catch (e) { /* skip — duyuru kontrolü başarısız olsa da vardiya başlasın */ }
        setStep('working');
        toast({ title: "Giriş başarılı", description: `Hoş geldin ${data.user?.firstName}` });
      };

      // Aslan 10 May 2026: KVKK per-user kontrolü
      // İlk giriş yapan kullanıcının aydınlatma metnini onaylaması zorunlu
      try {
        const kvkkRes = await fetch('/api/kvkk/my-status', { credentials: 'include' });
        if (kvkkRes.ok) {
          const kvkkStatus = await kvkkRes.json();
          if (kvkkStatus.requiresApproval) {
            // KVKK onayı gerekli — modal aç, sonra devam et
            setPendingPostLoginAction(() => continueAfterKvkk);
            setShowKvkkModal(true);
            return;
          }
        }
      } catch (e) { /* skip — KVKK kontrolü başarısız olsa bile devam et */ }

      // KVKK onayı varsa direkt devam
      await continueAfterKvkk();
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
      const data = await res.json();
      if (!res.ok) throw { message: data.message, session: data.session };
      return data;
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      toast({ title: "Vardiya başladı", description: "İyi çalışmalar!" });
    },
    onError: (error: any) => {
      if (error?.session) {
        setCurrentSession(error.session);
        toast({ title: "Aktif vardiya bulundu", description: "Mevcut vardiyenize devam edebilirsiniz." });
      } else {
        toast({ title: "Vardiya başlatılamadı", description: error.message, variant: "destructive" });
      }
    },
  });

  const overtimeRequestMutation = useMutation({
    mutationFn: async (data: { reason: string; note: string; managerName: string }) => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);
      const endTime = `${String(now.getHours() + 2).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const fullReason = data.reason === 'Yönetici Talebi' && data.managerName
        ? `${data.reason} (${data.managerName}): ${data.note}`
        : `${data.reason}: ${data.note}`;
      const res = await apiRequest('POST', '/api/overtime-requests', {
        userId: selectedUser?.id,
        branchId,
        overtimeDate: todayStr,
        startTime: currentTime,
        endTime,
        requestedMinutes: 120,
        reason: fullReason,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mesai talebi gönderildi", description: "Supervisor onayı bekleniyor." });
      setShowOvertimeRequest(false);
      setOvertimeReason('');
      setOvertimeNote('');
      setOvertimeManagerName('');
    },
    onError: (error: any) => {
      toast({ title: "Talep gönderilemedi", description: error.message, variant: "destructive" });
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
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/break-end`, {
        sessionId,
        userId: selectedUser?.id,
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Aslan 10 May 2026: Mola dönüş özeti göster
      if (currentSession?.breakStartTime) {
        const breakStart = new Date(currentSession.breakStartTime);
        const breakEnd = new Date();
        const actualMin = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
        const plannedMin = 60;
        const overtime = Math.max(0, actualMin - plannedMin);

        setBreakReturnSummary({
          userName: selectedUser?.firstName || "Kullanıcı",
          breakStartTime: currentSession.breakStartTime,
          breakEndTime: breakEnd.toISOString(),
          plannedMinutes: plannedMin,
          overtimeMinutes: overtime,
          newWarningsToday: data?.warningsToday || 0,
        });
      }

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
        priority: "medium",
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
      const res = await fetch(`/api/branches/${branchId}/kiosk/session/${userId}`, { credentials: 'include', headers: { 'x-kiosk-token': localStorage.getItem('kiosk-token') || '' } });
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

    // Ekip durumu
    try {
      const teamRes = await fetch(`/api/branches/${branchId}/kiosk/team-status`, { credentials: 'include', headers: { 'x-kiosk-token': localStorage.getItem('kiosk-token') || '' } });
      const teamData = await teamRes.json();
      const team = Array.isArray(teamData.team) ? teamData.team : [];
      setTeamStatus(team);
      setPdksAnomalyUsers(team.filter((m: any) => m.isBreakAnomaly && m.userId !== selectedUser?.id));
    } catch (err) {
      console.error("Error fetching team status:", err);
    }

    // Kullanıcı bildirimleri
    try {
      const notifRes = await fetch(`/api/branches/${branchId}/kiosk/notifications/${userId}`, { credentials: 'include', headers: { 'x-kiosk-token': localStorage.getItem('kiosk-token') || '' } });
      const notifData = await notifRes.json();
      setKioskNotifications(Array.isArray(notifData) ? notifData : []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }

    // Duyurular
    try {
      const annRes = await fetch(`/api/branches/${branchId}/kiosk/announcements`, { credentials: 'include', headers: { 'x-kiosk-token': localStorage.getItem('kiosk-token') || '' } });
      const annData = await annRes.json();
      setKioskAnnouncements(Array.isArray(annData) ? annData : []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
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

  // Lobby verisi — select-user ekranında 60sn'de bir yenile
  useEffect(() => {
    if (step !== 'select-user' || !branchId) return;

    const fetchLobby = async () => {
      try {
        const res = await fetch(`/api/branches/${branchId}/kiosk/lobby`);
        if (res.ok) {
          const data = await res.json();
          setLobbyData(data);
          // QR de lobby'den gelsin
          if (data.displayQr) setDisplayQr(data.displayQr);
        }
      } catch (err) {
        console.error('Lobby fetch error:', err);
      }
    };

    fetchLobby();
    const lobbyInterval = setInterval(fetchLobby, 60000);

    // QR 30sn'de yenile (45sn geçerli, rahat margin)
    const fetchQr = async () => {
      try {
        const res = await fetch(`/api/branches/${branchId}/kiosk/display-qr`, { credentials: 'include', headers: { 'x-kiosk-token': localStorage.getItem('kiosk-token') || '' } });
        if (res.ok) setDisplayQr(await res.json());
        else console.error('display-qr error:', res.status);
      } catch (e) { console.error('display-qr fetch fail:', e); }
    };
    fetchQr();
    const qrInterval = setInterval(fetchQr, 30000);

    return () => { clearInterval(lobbyInterval); clearInterval(qrInterval); };
  }, [step, branchId]);

  // QR ile giren personeli tespit et — 5sn'de bir aktif session kontrol
  useEffect(() => {
    if (step !== 'select-user' || !branchId) return;

    let lastActiveIds = new Set<string>();

    const pollSessions = async () => {
      try {
        const res = await fetch(`/api/branches/${branchId}/kiosk/team-status`, { credentials: 'include', headers: { 'x-kiosk-token': localStorage.getItem('kiosk-token') || '' } });
        if (!res.ok) return;
        const data = await res.json();
        const team: any[] = Array.isArray(data.team) ? data.team : [];
        const currentIds = new Set(team.map((m: any) => m.userId));

        // Yeni giriş yapan biri var mı?
        const newEntrant = team.find((m: any) =>
          m.status === 'active' && !lastActiveIds.has(m.userId)
        );

        if (newEntrant && lastActiveIds.size > 0) {
          // QR ile yeni giriş — o kişinin ekranına geç
          setSelectedUser({
            id: newEntrant.userId,
            firstName: newEntrant.firstName,
            lastName: newEntrant.lastName,
            profileImageUrl: newEntrant.profileImageUrl,
            role: newEntrant.role,
            hasPin: true,
          });
          await fetchSessionDetails(newEntrant.userId);
          setStep('working');
        }

        lastActiveIds = currentIds;
        setTeamStatus(team);
      } catch {}
    };

    pollSessions();
    const interval = setInterval(pollSessions, 5000);
    return () => clearInterval(interval);
  }, [step, branchId]);

  const resetWorker = () => {
    setStep('select-user');
    setSelectedUser(null);
    setPinInput('');
    setCurrentSession(null);
    setUserTasks([]);
    setUserChecklists([]);
    setTeamStatus([]);
    setKioskNotifications([]);
    setKioskAnnouncements([]);
    setPdksAnomalyUsers([]);
    setElapsedTime(0);
    setShiftSummary(null);
    setAutoLogoutCountdown(15);
    setQrScannedUser(null);
    setQrScanResult('idle');
    setQrScanMessage('');
  };

  const handleKioskExit = async () => {
    try {
      const verifyRes = await fetch(`/api/branches/${branchId}/kiosk/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: exitPasswordInput }),
        credentials: 'include',
      });
      if (!verifyRes.ok) {
        toast({ title: "Hatalı şifre", description: "Kiosk çıkış şifresi yanlış", variant: "destructive" });
        setExitPasswordInput('');
        return;
      }
    } catch {
      toast({ title: "Doğrulama hatası", description: "Şifre kontrol edilemedi", variant: "destructive" });
      setExitPasswordInput('');
      return;
    }
    setShowExitConfirm(false);
    setExitPasswordInput('');
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

  const handleClaimBranchTask = async (taskId: number) => {
    try {
      await apiRequest('POST', `/api/tasks/${taskId}/claim`, { userId: selectedUser?.id });
    } catch {}
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

  const renderSelectUserStep = () => {
    const staffList2: any[] = lobbyData?.staff || staffList;
    const active = staffList2.filter((s: any) => s.shiftStatus === 'active');
    const onBreak = staffList2.filter((s: any) => s.shiftStatus === 'on_break');
    const late = staffList2.filter((s: any) => s.shiftStatus === 'late' || s.shiftStatus === 'missing');
    const scheduled = staffList2.filter((s: any) => s.shiftStatus === 'scheduled');
    const offAll = staffList2.filter((s: any) => s.shiftStatus === 'off');
    const noShift = staffList2.filter((s: any) => !s.shiftStatus || s.shiftStatus === 'not_scheduled');
    const activeAndBreak = [...active, ...onBreak];
    const now2 = new Date();
    // Timeline: 07:00 - 03:00 (ertesi gün) = 20 saat
    const START_HOUR = 7;
    const TOTAL_HOURS = 20;
    const pct = (timeStr: string) => {
      let [h, m] = timeStr.split(':').map(Number);
      if (h < START_HOUR) h += 24; // gece yarısı sonrası
      const minutesFromStart = (h - START_HOUR) * 60 + m;
      return Math.max(0, Math.min(100, (minutesFromStart / (TOTAL_HOURS * 60)) * 100));
    };
    const nowH = now2.getHours() < START_HOUR ? now2.getHours() + 24 : now2.getHours();
    const nowPct = Math.max(0, Math.min(100, ((nowH - START_HOUR) * 60 + now2.getMinutes()) / (TOTAL_HOURS * 60) * 100));
    const timeStr2 = now2.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const dateStr2 = now2.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    const handlePerson = (staff: any) => {
      setSelectedUser(staff);
      setStep('enter-pin');
      if (!staff.hasPin) toast({ title: "PIN Tanımlı Değil", description: "Yöneticinizden PIN tanımlamasını isteyin.", variant: "destructive" });
    };
    const gridLines = [12.5, 25, 37.5, 50, 62.5, 75, 87.5].map(p => (
      <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: '0.5px', background: 'rgba(255,255,255,0.05)', zIndex: 1 }} />
    ));
    const NowLine = () => <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`, width: 2, background: '#ef4444', zIndex: 3 }} />;
    const pbStyle = (s: string): React.CSSProperties => ({
      width: 164, height: 48, flexShrink: 0 as const, borderRadius: 10, padding: '0 10px',
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
      ...(s === 'active'   ? { background: '#16a34a', boxShadow: '0 2px 10px rgba(22,163,74,0.35)' } :
         s === 'on_break'  ? { background: '#d97706', boxShadow: '0 2px 10px rgba(217,119,6,0.35)' } :
         s === 'late' || s === 'missing' ? { background: '#dc2626', boxShadow: '0 2px 10px rgba(220,38,38,0.35)' } :
         s === 'scheduled' ? { background: '#1d4ed8', boxShadow: '0 2px 10px rgba(29,78,216,0.3)' } :
         { background: '#142030', boxShadow: '0 0 0 1px rgba(255,255,255,0.15)' })
    });
    const statusColor = (s: string) => '#fff';
    const statusTxt = (staff: any) => {
      const s = staff.shiftStatus;
      const now = new Date();
      if (s === 'active') {
        // Kalan süre hesapla
        if (staff.shiftEndTime) {
          const [eh, em] = staff.shiftEndTime.split(':').map(Number);
          let endMin = eh * 60 + em;
          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (endMin < nowMin) endMin += 24 * 60; // gece yarısı
          const remaining = endMin - nowMin;
          if (remaining > 0) {
            const rh = Math.floor(remaining / 60);
            const rm = remaining % 60;
            return rh > 0 ? `Çalışıyor · ${rh}sa ${rm}dk kaldı` : `Çalışıyor · ${rm}dk kaldı`;
          }
        }
        return 'Çalışıyor';
      }
      if (s === 'on_break') {
        // Aslan 10 May 2026: Kalan mola süresini hesapla (1 saat default)
        const breakMin = staff.breakMinutes || 0;
        const remaining = Math.max(0, 60 - breakMin);
        if (remaining > 0) {
          return `Molada · ${breakMin}dk yapıldı · ${remaining}dk kaldı`;
        }
        if (breakMin > 60) {
          return `🔴 MOLA AŞIM · ${breakMin}dk (+${breakMin - 60}dk)`;
        }
        return `Molada · ${breakMin}dk yapıldı · süre doldu`;
      }
      if (s === 'late') return `${staff.lateMinutes}dk geç — ${staff.shiftStartTime?.slice(0,5)||''}`;
      if (s === 'missing') return `Gelmedi — ${staff.shiftStartTime?.slice(0,5)||''}`;
      if (s === 'scheduled' && staff.shiftStartTime) {
        const [sh, sm] = staff.shiftStartTime.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const diff = startMin - nowMin;
        if (diff > 0) {
          const dh = Math.floor(diff / 60);
          const dm = diff % 60;
          const label = dh > 0 ? `${dh}sa ${dm}dk sonra` : `${dm}dk sonra`;
          return `${staff.shiftStartTime.slice(0,5)} — ${label}`;
        }
        return `${staff.shiftStartTime.slice(0,5)}-${staff.shiftEndTime?.slice(0,5)||'?'}`;
      }
      return 'İzinli';
    };
    const PersonRow = ({ staff, bar }: { staff: any; bar: React.ReactNode }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, marginBottom: 4 }}>
        <button style={pbStyle(staff.shiftStatus || 'off')} onClick={() => handlePerson(staff)} data-testid={`staff-btn-${staff.id}`}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
            {staff.firstName?.[0]}{staff.lastName?.[0]}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 94 }}>{staff.firstName} {staff.lastName?.[0]}.</div>
            <div style={{ fontSize: 8, color: statusColor(staff.shiftStatus || 'off'), whiteSpace: 'nowrap' }}>{statusTxt(staff)}</div>
          </div>
        </button>
        <div style={{ flex: 1, height: 48, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
          {gridLines}{bar}
        </div>
      </div>
    );
    const SecHead = ({ label, count, color, bg }: any) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 5px' }}>
        <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: 11, fontWeight: 500, color, whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: bg, color }}>{count}</span>
        <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.1)' }} />
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0c1a2e', overflow: 'hidden' }}>
        <div style={{ background: '#ef4444', padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>{branchAuth?.name || 'Şube Kiosk'}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{dateStr2} - {timeStr2}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            {activeAndBreak.length > 0 && <span style={{ color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />{active.length} aktif{onBreak.length > 0 ? ` - ${onBreak.length} mola` : ''}</span>}
            {late.length > 0 && <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />{late.length} gecikmeli</span>}
            {scheduled.length > 0 && <span style={{ color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#93c5fd', display: 'inline-block' }} />{scheduled.length} bekliyor</span>}
            {offAll.length > 0 && <span style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />{offAll.length} izinli</span>}
            {noShift.length > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'inline-block' }} />{noShift.length} plansız</span>}
            <button
              onClick={() => { setShowExitConfirm(true); setExitPasswordInput(''); }}
              style={{ marginLeft: 8, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, color: 'rgba(255,255,255,0.7)', padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
              data-testid="btn-kiosk-exit-header"
            >
              🔒 Çık
            </button>
          </div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 220px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '10px 14px 6px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', paddingLeft: 162, marginBottom: 7 }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                  {['07','09','11','13','15','17','19','21','23','01','03'].map(t => (
                    <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: 1, height: 6, background: 'rgba(255,255,255,0.2)' }} />
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              {activeAndBreak.length > 0 && (<>
                <SecHead label="Aktif & molada" count={activeAndBreak.length} color="#4ade80" bg="rgba(34,197,94,0.15)" />
                {activeAndBreak.map(staff => (<PersonRow key={staff.id} staff={staff} bar={<>
                  <NowLine />
                  {staff.checkInTime && <div style={{ position: 'absolute', top: 0, height: '100%', left: `${pct(new Date(staff.checkInTime).toTimeString().slice(0,5))}%`, width: `${Math.max(1, nowPct - pct(new Date(staff.checkInTime).toTimeString().slice(0,5)))}%`, background: 'rgba(34,197,94,0.6)', borderRadius: 3, display:'flex', alignItems:'center', paddingLeft:4 }}>
                    <span style={{fontSize:8,color:'rgba(255,255,255,0.8)',whiteSpace:'nowrap'}}>{new Date(staff.checkInTime).toTimeString().slice(0,5)}</span>
                  </div>}
                  {staff.shiftStartTime && staff.shiftEndTime && <div style={{ position: 'absolute', top: 0, height: '100%', left: `${pct(staff.shiftStartTime)}%`, width: `${Math.max(1, pct(staff.shiftEndTime) - pct(staff.shiftStartTime))}%`, background: 'rgba(59,130,246,0.2)', border: '0.5px dashed rgba(147,197,253,0.5)', borderRadius: 3, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4px' }}>
                    <span style={{fontSize:8,color:'rgba(147,197,253,0.8)'}}>{staff.shiftStartTime.slice(0,5)}</span>
                    <span style={{fontSize:8,color:'rgba(147,197,253,0.8)'}}>{staff.shiftEndTime.slice(0,5)}</span>
                  </div>}
                </>} />))}
              </>)}
              {late.length > 0 && (<>
                <SecHead label="Gecikmeli" count={late.length} color="#f87171" bg="rgba(239,68,68,0.2)" />
                {late.map(staff => (<PersonRow key={staff.id} staff={staff} bar={<>
                  <NowLine />
                  {staff.shiftStartTime && <div style={{ position: 'absolute', top: 0, height: '100%', left: `${pct(staff.shiftStartTime)}%`, width: `${Math.max(1, nowPct - pct(staff.shiftStartTime))}%`, background: 'rgba(239,68,68,0.55)', borderRadius: 3, display:'flex', alignItems:'center', paddingLeft:4 }}>
                    <span style={{fontSize:8,color:'rgba(255,255,255,0.8)'}}>gelmedi</span>
                  </div>}
                  {staff.shiftStartTime && staff.shiftEndTime && <div style={{ position: 'absolute', top: 0, height: '100%', left: `${nowPct}%`, width: `${Math.max(0, pct(staff.shiftEndTime) - nowPct)}%`, background: 'rgba(59,130,246,0.2)', border: '0.5px dashed rgba(147,197,253,0.5)', borderRadius: 3, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:4 }}>
                    <span style={{fontSize:8,color:'rgba(147,197,253,0.8)'}}>{staff.shiftEndTime.slice(0,5)}</span>
                  </div>}
                </>} />))}
              </>)}
              {scheduled.length > 0 && (<>
                <SecHead label="Sonraki vardiya" count={scheduled.length} color="#93c5fd" bg="rgba(59,130,246,0.15)" />
                {scheduled.map(staff => (<PersonRow key={staff.id} staff={staff} bar={<>
                  <NowLine />
                  {staff.shiftStartTime && staff.shiftEndTime && <div style={{ position: 'absolute', top: 0, height: '100%', left: `${pct(staff.shiftStartTime)}%`, width: `${Math.max(1, pct(staff.shiftEndTime) - pct(staff.shiftStartTime))}%`, background: 'rgba(59,130,246,0.28)', border: '0.5px dashed rgba(147,197,253,0.55)', borderRadius: 3, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4px' }}>
                    <span style={{fontSize:8,color:'rgba(147,197,253,0.9)'}}>{staff.shiftStartTime.slice(0,5)}</span>
                    <span style={{fontSize:8,color:'rgba(147,197,253,0.9)'}}>{staff.shiftEndTime.slice(0,5)}</span>
                  </div>}
                </>} />))}
              </>)}
              {offAll.length > 0 && (<>
                <SecHead label="İzinli bugün" count={offAll.length} color="rgba(255,255,255,0.45)" bg="rgba(255,255,255,0.08)" />
                {offAll.map(staff => (<div key={staff.id} style={{ opacity: 0.55 }}><PersonRow staff={staff} bar={<NowLine />} /></div>))}
              </>)}
              {noShift.length > 0 && (<>
                <SecHead label="Vardiya planlanmamış" count={noShift.length} color="rgba(255,255,255,0.5)" bg="rgba(255,255,255,0.05)" />
                {noShift.map(staff => (<div key={staff.id} style={{ opacity: 0.55 }}><PersonRow staff={staff} bar={<NowLine />} /></div>))}
              </>)}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10, paddingBottom: 4 }}>
                {[{c:'rgba(34,197,94,0.4)',l:'Çalışıldı'},{c:'rgba(245,158,11,0.45)',l:'Mola'},{c:'rgba(59,130,246,0.18)',l:'Planlı',d:true},{c:'rgba(239,68,68,0.4)',l:'Gecikmeli'}].map(x=>(
                  <div key={x.l} style={{ display:'flex',alignItems:'center',gap:3 }}>
                    <div style={{ width:9,height:6,borderRadius:2,background:x.c,...(x.d?{border:'0.5px dashed rgba(147,197,253,0.5)'}:{}) }} />
                    <span style={{ fontSize:8,color:'rgba(255,255,255,0.3)' }}>{x.l}</span>
                  </div>
                ))}
                <div style={{ display:'flex',alignItems:'center',gap:3 }}><div style={{ width:2,height:10,background:'#ef4444' }}/><span style={{ fontSize:8,color:'rgba(255,255,255,0.3)' }}>Su an</span></div>
              </div>
            </div>
            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '6px 14px', textAlign: 'right', flexShrink: 0 }}>
              <button onClick={() => { setShowExitConfirm(true); setExitPasswordInput(''); }} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}>Kiosk'tan çık</button>
            </div>
          </div>
          <div style={{ borderLeft: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Telefonunla tara</div>
              {displayQr ? (
                <div style={{ background: '#fff', borderRadius: 8, padding: 7, width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCodeSVG value={JSON.stringify(displayQr)} size={74} level="M" />
                </div>
              ) : (
                <div style={{ width: 90, height: 90, background: 'rgba(255,255,255,0.04)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>Vardiya - Mola - Cikis<br/>45sn yenilenir</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>veya ismine tikla PIN</div>
            </div>
            <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' }}>
              {lobbyData?.announcements?.length > 0 && (<>
                <p style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duyurular</p>
                {lobbyData.announcements.slice(0,3).map((ann: any) => (
                  <div key={`ann-${ann.id}`} style={{ borderRadius: 6, padding: '6px 8px', background: 'rgba(59,130,246,0.1)', borderLeft: '2px solid #3b82f6' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{ann.title}</div>
                  </div>
                ))}
              </>)}
              {late.length > 0 && (<>
                <p style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Uyarilar</p>
                {late.map((s: any) => (
                  <div key={`late-${s.id}`} style={{ borderRadius: 6, padding: '6px 8px', background: 'rgba(239,68,68,0.12)', borderLeft: '2px solid #ef4444' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{s.firstName} {s.lastName}</div>
                    <div style={{ fontSize: 9, color: '#fca5a5', marginTop: 1 }}>{s.shiftStatus === 'missing' ? 'Gelmedi' : `${s.lateMinutes}dk gec`}</div>
                  </div>
                ))}
              </>)}
              {lobbyData?.notifications?.length > 0 && (<>
                <p style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Bildirimler</p>
                {lobbyData.notifications.slice(0,3).map((n: any) => (
                  <div key={`notif-${n.id}`} style={{ borderRadius: 6, padding: '6px 8px', background: 'rgba(245,158,11,0.1)', borderLeft: '2px solid #f59e0b' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{n.title}</div>
                  </div>
                ))}
              </>)}
            </div>
          </div>
        </div>
      </div>
    );
  };


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


  const renderWorkingStep = () => {
    const isOnBreak = currentSession?.status === 'on_break';
    const hasSession = !!currentSession;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0c0f14', overflow: 'hidden' }}>

        {/* Dobody Uyarısı — kritik bildirimler */}
        {kioskNotifications.filter((n: any) => n.type === 'dobody_alert' || n.priority === 'critical').slice(0, 1).map((n: any) => (
          <div key={n.id} style={{ margin: '8px 12px 0', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(127,119,221,0.18)', borderLeft: '3px solid #7F77DD' }}>
            <span style={{ color: '#a5a0f0', fontSize: 14 }}>◈</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#a5a0f0' }}>{n.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{n.message}</div>
            </div>
          </div>
        ))}

        {/* Header */}
        <div style={{ background: '#ef4444', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 14 }}>
              {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>{selectedUser?.firstName} {selectedUser?.lastName}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>
                {isOnBreak ? 'Molada' : hasSession ? 'Çalışıyor' : 'Vardiya bekleniyor'}
              </p>
            </div>
          </div>
          <button onClick={resetWorker} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            🏠 Ana Ekran
          </button>
        </div>

        {/* Mola bandı */}
        {isOnBreak && (
          <div style={{ background: '#d97706', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>☕ Molada{currentSession?.breakMinutes ? ` — ${currentSession.breakMinutes} dk` : ''}</span>
            <button
              onClick={() => breakEndMutation.mutate(currentSession?.id || 0)}
              disabled={breakEndMutation.isPending}
              data-testid="button-end-break-top"
              style={{ background: '#fff', border: 'none', borderRadius: 8, color: '#d97706', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              {breakEndMutation.isPending ? '...' : '▶ Molayı Bitir'}
            </button>
          </div>
        )}

        {/* İçerik */}
        <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>

          {/* Vardiya Durumu */}
          <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>⏱ Vardiya Durumu</p>

            {sessionLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Yükleniyor...</p>
              </div>
            ) : !hasSession ? (
              <div style={{ padding: '12px 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 14 }}>Vardiya başlatılmadı</p>
                <button
                  onClick={handleStartShift}
                  disabled={startShiftMutation.isPending}
                  data-testid="button-start-shift"
                  style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: startShiftMutation.isPending ? 0.7 : 1 }}
                >
                  {startShiftMutation.isPending ? 'Başlatılıyor...' : 'Vardiya Başlat'}
                </button>
              </div>
            ) : isOnBreak ? (
              <div>
                {/* Aslan 10 May 2026: Yeni BreakCountdown — geri sayım + alarm */}
                {currentSession?.breakStartTime ? (
                  <div className="mb-3">
                    <BreakCountdown
                      breakStartTime={currentSession.breakStartTime}
                      plannedMinutes={60}
                      context="sube"
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 44, fontWeight: 700, fontFamily: 'monospace', color: '#f59e0b', letterSpacing: 2 }}>{formatTime(elapsedTime)}</div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Mola Süresi (eski sayaç)</p>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => breakEndMutation.mutate(currentSession?.id || 0)}
                    disabled={breakEndMutation.isPending}
                    data-testid="button-end-break"
                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '15px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: breakEndMutation.isPending ? 0.7 : 1 }}
                  >
                    {breakEndMutation.isPending ? 'İşleniyor...' : 'Molayı Bitir'}
                  </button>
                  <button
                    onClick={handleEndShiftClick}
                    disabled={endShiftMutation.isPending}
                    data-testid="button-end-shift-from-break"
                    style={{ background: 'transparent', color: 'rgba(239,68,68,0.7)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%' }}
                  >
                    Vardiyayı Bitir
                  </button>
                </div>
                {currentSession.breakMinutes > 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 10 }}>Toplam mola bugün: {formatMinutes(currentSession.breakMinutes)}</p>
                )}
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 44, fontWeight: 700, fontFamily: 'monospace', color: '#fbbf24', letterSpacing: 2 }}>{formatTime(elapsedTime)}</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Çalışma Süresi</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={handleBreakStartClick}
                    disabled={breakStartMutation.isPending}
                    data-testid="button-start-break"
                    style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', opacity: breakStartMutation.isPending ? 0.7 : 1 }}
                  >
                    Mola Al
                  </button>
                  <button
                    onClick={handleEndShiftClick}
                    disabled={endShiftMutation.isPending}
                    data-testid="button-end-shift"
                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', opacity: endShiftMutation.isPending ? 0.7 : 1 }}
                  >
                    {endShiftMutation.isPending ? 'Kaydediliyor...' : 'Vardiyayı Bitir'}
                  </button>
                </div>
                {currentSession.breakMinutes > 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 10 }}>Toplam mola: {formatMinutes(currentSession.breakMinutes)}</p>
                )}
              </div>
            )}
          </div>

          {/* Görevlerim */}
          <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14, overflow: 'auto' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>📋 Görevlerim</p>
            {userTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Bekleyen görev yok</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userTasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, fontSize: 13 }}>
                    <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{task.title}</p>
                    {task.dueDate && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{new Date(task.dueDate).toLocaleDateString('tr-TR')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sorun Bildir + Mesai */}
          <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setShowKioskFaultReport(true)} data-testid="button-kiosk-report-fault"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '16px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              Sorun Bildir
            </button>
            <button onClick={() => setShowOvertimeRequest(true)} data-testid="button-overtime-request"
              style={{ background: 'rgba(245,158,11,0.06)', border: '0.5px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '16px 8px', cursor: 'pointer', color: '#d97706', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⏱</span>
              Mesai Talep Et
            </button>
          </div>

          {/* Şube Görev Havuzu — isteyen üstlenir, skor kazanır */}
          <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14, overflow: 'auto', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                📌 Şube Görev Havuzu
                {kioskBranchTasks.length > 0 && (
                  <span style={{ marginLeft: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {kioskBranchTasks.filter((t: any) => !t.assignedTo && !t.claimedBy).length} açık
                  </span>
                )}
              </p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                💡 Sahiplenen kişiye puan eklenir
              </span>
            </div>
            {kioskBranchTasks.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                Açık görev yok — Tüm işler tamamlanmış 👍
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {kioskBranchTasks.slice(0, 12).map((task: any) => {
                  const isClaimed = !!(task.assignedTo || task.claimedBy);
                  const isMine = task.claimedByUserId === selectedUser?.id || task.assignedToUserId === selectedUser?.id;
                  return (
                    <div key={task.id} style={{
                      padding: '10px 12px',
                      background: isMine ? 'rgba(34,197,94,0.08)' : isClaimed ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.06)',
                      borderRadius: 8,
                      border: isMine ? '1px solid rgba(34,197,94,0.3)' : isClaimed ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(239,68,68,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: 13, margin: 0, lineHeight: 1.3 }}>{task.title}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                            {task.category}
                          </span>
                          {task.photoRequired && (
                            <span style={{ color: '#fbbf24', fontSize: 10, background: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                              📷 Foto
                            </span>
                          )}
                          {isMine && (
                            <span style={{ color: '#22c55e', fontSize: 10, background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                              ✓ Sende
                            </span>
                          )}
                        </div>
                      </div>
                      {!isClaimed ? (
                        <button
                          onClick={() => handleClaimBranchTask(task.id)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
                          data-testid={`btn-claim-task-${task.id}`}
                        >
                          🙋 Üstlen
                        </button>
                      ) : isMine ? (
                        <button
                          onClick={() => handleClaimBranchTask(task.id)}
                          style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
                          data-testid={`btn-complete-task-${task.id}`}
                        >
                          ✅ Tamamla
                        </button>
                      ) : (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center', fontStyle: 'italic' }}>
                          {task.claimedByName || task.assignedToName || 'Birisi'} üstlendi
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bugünkü Skorum — kullanıcı motivasyonu için */}
          <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              ⭐ Bugünkü Skorum
            </p>
            {/* S-UX Pilot Day-1 Banner (21 Nis 2026) - demotivasyon önleme */}
            {(() => {
              const pilotStart = new Date('2026-04-28T00:00:00');
              const now = new Date();
              const daysSincePilot = Math.floor((now.getTime() - pilotStart.getTime()) / (1000 * 60 * 60 * 24));
              // Pilot ilk 7 gün: skor toplama dönemi banner'ı göster
              if (daysSincePilot >= 0 && daysSincePilot < 7) {
                return (
                  <div style={{
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    marginBottom: 12
                  }}>
                    <p style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600, margin: 0 }}>
                      🎯 Pilot İlk Hafta
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: '2px 0 0', lineHeight: 1.4 }}>
                      Skor toplama dönemi. Değerler stabil değil, 7 gün sonra normalleşir.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            {userScore ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: userScore.score >= 80 ? '#22c55e' : userScore.score >= 50 ? '#fbbf24' : '#ef4444' }}>
                    {Math.round(userScore.score)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>/ 100</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 6 }}>
                    <p style={{ color: '#22c55e', fontSize: 18, fontWeight: 700, margin: 0 }}>{userScore.details?.completed || 0}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>Tamamlanan</p>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
                    <p style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, margin: 0 }}>{userScore.details?.overdue || 0}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>Gecikmiş</p>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 8, textAlign: 'center' }}>
                  Son 30 gün
                </p>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                Henüz görev üstlenmediniz<br/>
                <span style={{ fontSize: 11 }}>Üstte "Üstlen" butonu ile başlayın</span>
              </p>
            )}
          </div>

          {/* Telefonundan Aç bilgi kutusu */}
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 14 }}>
            <p style={{ color: '#3b82f6', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              📱 Telefonundan Aç
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '0 0 8px', lineHeight: 1.4 }}>
              Quiz, eğitim ve detaylı görevlerin için <strong style={{ color: '#fff' }}>Benim Günüm</strong> sayfasını kullan.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>
              Mola sırasında veya vardiya bitiminde aç.
            </p>
          </div>

          {/* Ekip Durumu */}
          <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              👥 Ekip Durumu
              {teamStatus.length > 0 && <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '2px 8px', fontSize: 12 }}>{teamStatus.length} kişi</span>}
            </p>
            {pdksAnomalyUsers.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                <p style={{ color: '#ef4444', fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>⚠ Mola Süresi Aşıldı</p>
                {pdksAnomalyUsers.map((m: any) => (
                  <p key={m.userId} style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>{m.name} — {m.breakMinutes} dk molada (limit: 90 dk)</p>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teamStatus.filter((m: any) => m.userId !== selectedUser?.id).map((member: any) => (
                <div key={member.userId} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: member.status === 'active' ? '#22c55e' : member.status === 'on_break' ? '#f59e0b' : '#6b7280', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{member.firstName} {member.lastName}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{member.status === 'active' ? 'Çalışıyor' : member.status === 'on_break' ? `Molada (${member.breakMinutes || 0} dk)` : ''}</p>
                  </div>
                </div>
              ))}
              {teamStatus.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Yükleniyor...</p>}
            </div>
          </div>

          {/* Bildirimler & Duyurular */}
          {(kioskNotifications.length > 0 || kioskAnnouncements.length > 0) && (
            <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                🔔 Bildirimler & Duyurular
                {kioskNotifications.length > 0 && <span style={{ marginLeft: 8, background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>{kioskNotifications.length}</span>}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {kioskAnnouncements.slice(0,2).map((ann: any) => (
                  <div key={`ann-${ann.id}`} style={{ padding: '8px 10px', background: 'rgba(59,130,246,0.08)', borderLeft: '3px solid #3b82f6', borderRadius: '0 8px 8px 0' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{ann.title}</p>
                  </div>
                ))}
                {kioskNotifications.slice(0,3).map((n: any) => (
                  <div key={`notif-${n.id}`} style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{n.title}</p>
                    {n.message && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklistlerim */}
          {userChecklists.length > 0 && (
            <div style={{ background: '#141820', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 14 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>✅ Checklistlerim</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userChecklists.map((cl: any) => {
                  const pct = cl.totalTasks > 0 ? Math.round((cl.completedTasks / cl.totalTasks) * 100) : 0;
                  return (
                    <div key={cl.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{cl.name}</p>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{cl.completedTasks}/{cl.totalTasks}</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#ef4444', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* CSS animasyon */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  };


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
            variant="outline"
            className="w-full gap-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={() => setShowOvertimeRequest(true)}
            data-testid="button-overtime-request"
          >
            <Timer className="h-4 w-4" />
            Mesai Talep Et
          </Button>

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

  // Tüm duyurular onaylandığında otomatik çalışmaya geç
  useEffect(() => {
    if (step === 'announcements' && pendingAnnouncements.length === 0) {
      setStep('working');
      toast({ title: "Giriş başarılı", description: "Tüm duyurular onaylandı" });
    }
  }, [pendingAnnouncements.length, step]);

  // Duyuru onaylama — kiosk içi (selectedUser.id gönder — session user değil personel onaylasın)
  const acknowledgeAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: number) => {
      const res = await apiRequest('POST', `/api/announcements/${announcementId}/acknowledge`, { userId: selectedUser?.id });
      return res.json();
    },
    onSuccess: (_, announcementId) => {
      // PILOT: Quiz akışı kiosktan kaldırıldı (Aslan kararı 21 Nis 2026)
      // Kiosk paylaşımlı cihaz - quiz kişisel deneyim. Kullanıcı kendi cep
      // dashboard'undan (benim-gunum.tsx) quiz'i tamamlar.
      // Onay alındı, duyuru listeden kaldır - quiz akışına girme.
      setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId));

      // Quiz'li duyuru ise toast ile telefonda tamamlanması gerektiğini bildir
      const current = pendingAnnouncements.find(a => a.id === announcementId);
      if (current?.quizRequired && !current?.quizPassed) {
        toast({
          title: "📱 Quiz telefonunuzdan tamamlanmalı",
          description: "Vardiya bitimine kadar Benim Günüm sayfasından quiz'i çözmeyi unutmayın.",
          duration: 5000,
        });
      }
    },
  });

  const fetchQuizQuestions = async (announcementId: number) => {
    try {
      const res = await fetch(`/api/announcements/${announcementId}/quiz`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.hasQuiz && data.questions.length > 0) {
          setQuizQuestions(data.questions);
          setQuizAnswers({});
          setQuizResult(null);
          setQuizMode(true);
          return;
        }
      }
    } catch (e) { /* skip */ }
    setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId));
  };

  const submitQuizMutation = useMutation({
    mutationFn: async ({ announcementId, answers }: { announcementId: number; answers: any[] }) => {
      const res = await apiRequest('POST', `/api/announcements/${announcementId}/quiz-submit`, { userId: selectedUser?.id, answers });
      return res.json();
    },
    onSuccess: (result, { announcementId }) => {
      setQuizResult(result);
      if (result.passed) {
        setTimeout(() => {
          setPendingAnnouncements(prev => prev.filter(a => a.id !== announcementId));
          setQuizMode(false); setQuizResult(null); setQuizQuestions([]); setQuizAnswers({});
        }, 2500);
      }
    },
  });

  const renderAnnouncementsStep = () => {
    if (pendingAnnouncements.length === 0) return null;
    const current = pendingAnnouncements[0];
    const remaining = pendingAnnouncements.length - 1;

    // Quiz sonuç ekranı
    if (quizMode && quizResult) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-2">
              <div className={`mx-auto mb-2 p-3 rounded-full ${quizResult.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {quizResult.passed ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <AlertCircle className="h-8 w-8 text-red-600" />}
              </div>
              <CardTitle className="text-lg">{quizResult.passed ? 'Tebrikler! Quiz Geçildi' : 'Quiz Geçilemedi'}</CardTitle>
              <CardDescription>
                {quizResult.correctAnswers}/{quizResult.totalQuestions} doğru — %{quizResult.score}
                {!quizResult.passed && ` (Geçme notu: %${quizResult.passScore})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizResult.passed ? (
                <p className="text-center text-sm text-green-600">Sonraki adıma geçiliyor...</p>
              ) : (
                <Button className="w-full h-12 bg-amber-600 hover:bg-amber-700" onClick={() => { setQuizMode(false); setQuizResult(null); setQuizQuestions([]); setQuizAnswers({}); }}>
                  Duyuruyu Tekrar Oku ve Dene
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Quiz soruları
    if (quizMode && quizQuestions.length > 0) {
      const allAnswered = quizQuestions.every((_, i) => quizAnswers[i] !== undefined);
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Mini Quiz — {current.title}</CardTitle>
              <CardDescription>{quizQuestions.length} soru</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
              {quizQuestions.map((q: any, qi: number) => (
                <div key={qi} className="space-y-2 p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{qi + 1}. {q.question}</p>
                  <div className="space-y-1.5">
                    {q.options?.map((opt: string, oi: number) => (
                      <button key={oi} className={`w-full text-left p-2.5 rounded-md text-sm transition-all ${quizAnswers[qi] === oi ? 'bg-blue-600 text-white' : 'bg-background border hover:bg-muted'}`}
                        onClick={() => setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}>
                        {String.fromCharCode(65 + oi)}) {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-4 pt-0">
              <Button className="w-full h-12 bg-green-600 hover:bg-green-700" disabled={!allAnswered || submitQuizMutation.isPending}
                onClick={() => { submitQuizMutation.mutate({ announcementId: current.id, answers: quizQuestions.map((_, i) => ({ questionIndex: i, selectedIndex: quizAnswers[i] })) }); }}>
                {submitQuizMutation.isPending ? 'Kontrol ediliyor...' : `Cevapları Gönder (${Object.keys(quizAnswers).length}/${quizQuestions.length})`}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    // Duyuru okuma ekranı
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <Megaphone className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-lg" data-testid="title-announcement">Zorunlu Duyuru</CardTitle>
            <CardDescription>Vardiyaya başlamadan önce okumanız gereken {pendingAnnouncements.length} duyuru var</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {current.bannerImageUrl && (<div className="rounded-lg overflow-hidden"><img src={current.bannerImageUrl} alt={current.title} className="w-full h-40 object-cover" /></div>)}
            <div className="space-y-2">
              <h3 className="font-semibold text-base">{current.title}</h3>
              {current.category && (
                <Badge variant="outline" className="text-xs">
                  {current.category === 'recipe' ? 'Reçete Değişikliği' : current.category === 'policy' ? 'Kanuni/Politika' : current.category === 'campaign' ? 'Kampanya' : current.category === 'training' ? 'Eğitim' : current.category === 'product' ? 'Yeni Ürün' : current.category}
                </Badge>
              )}
              {current.quizRequired && <Badge variant="destructive" className="text-xs ml-1">Quiz Var</Badge>}
              <p className="text-sm text-muted-foreground leading-relaxed">{current.message}</p>
            </div>
            <Button className="w-full h-14 text-lg bg-green-600 hover:bg-green-700" onClick={() => acknowledgeAnnouncementMutation.mutate(current.id)} disabled={acknowledgeAnnouncementMutation.isPending} data-testid="button-acknowledge-announcement">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {current.quizRequired ? "Okudum — Quiz'e Geç" : 'Okudum ve Anladım'}
            </Button>
            {remaining > 0 && <p className="text-center text-xs text-muted-foreground">{remaining} duyuru daha kaldı</p>}
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
      case 'announcements':
        return renderAnnouncementsStep();
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

      {/* Offline uyarı bandı */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          İnternet bağlantısı kesildi — İşlemler kaydedilemiyor
        </div>
      )}

      {/* Exit confirmation dialog */}
      <Dialog open={showExitConfirm} onOpenChange={(o) => { setShowExitConfirm(o); setExitPasswordInput(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-[#ef4444]" />
              Kiosk'tan Çık
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Kiosk'tan çıkmak için kiosk şifresini girin.</p>
            <Input
              type="password"
              placeholder="Kiosk şifresi..."
              value={exitPasswordInput}
              onChange={(e) => setExitPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleKioskExit()}
              className="h-12 text-base"
              data-testid="input-exit-password"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowExitConfirm(false); setExitPasswordInput(''); }}>
              İptal
            </Button>
            <Button
              variant="destructive"
              disabled={!exitPasswordInput}
              onClick={handleKioskExit}
              data-testid="btn-confirm-exit"
            >
              Çık
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Mesai Talebi Dialog */}
      <Dialog open={showOvertimeRequest} onOpenChange={setShowOvertimeRequest}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-500" />
              Mesai Talep Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Mesai nedeni</p>
              <div className="grid grid-cols-1 gap-2">
                {['Gelmeyen Personel', 'Yoğun Talep (Rush Time)', 'Yönetici Talebi', 'Diğer'].map((reason) => (
                  <Button
                    key={reason}
                    variant={overtimeReason === reason ? 'default' : 'outline'}
                    className="justify-start text-sm h-10"
                    onClick={() => setOvertimeReason(reason)}
                    data-testid={`btn-overtime-reason-${reason}`}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            {overtimeReason === 'Yönetici Talebi' && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Yönetici adı</p>
                <Input
                  placeholder="Yöneticinin adı soyadı..."
                  value={overtimeManagerName}
                  onChange={(e) => setOvertimeManagerName(e.target.value)}
                  className="h-10"
                  data-testid="input-overtime-manager"
                />
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-1">Açıklama (opsiyonel)</p>
              <Textarea
                placeholder="Kısa açıklama..."
                value={overtimeNote}
                onChange={(e) => setOvertimeNote(e.target.value)}
                className="min-h-[70px]"
                data-testid="input-overtime-note"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Talep supervisor onayına gönderilecektir. Onaylanmadan bordronuza yansımaz.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOvertimeRequest(false)}
            >
              İptal
            </Button>
            <Button
              disabled={!overtimeReason || overtimeRequestMutation.isPending || (overtimeReason === 'Yönetici Talebi' && !overtimeManagerName.trim())}
              onClick={() => overtimeRequestMutation.mutate({ reason: overtimeReason, note: overtimeNote, managerName: overtimeManagerName })}
              data-testid="button-overtime-submit"
            >
              {overtimeRequestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Talep Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aslan 10 May 2026: KVKK Per-User Modal (PIN sonrası açılır, DB tabanlı) */}
      <KvkkPerUserModal
        open={showKvkkModal}
        approvalMethod="kiosk_pin"
        branchId={String(branchId || "")}
        required={true}
        onApproved={() => {
          setShowKvkkModal(false);
          // KVKK onay sonrası bekleyen action'ı çalıştır (duyuru kontrolü vs.)
          if (pendingPostLoginAction) {
            pendingPostLoginAction();
            setPendingPostLoginAction(null);
          }
        }}
      />

      {/* Aslan 10 May 2026: Mola Dönüş Özeti modal */}
      {breakReturnSummary && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <BreakReturnSummary
            userName={breakReturnSummary.userName}
            breakStartTime={breakReturnSummary.breakStartTime}
            breakEndTime={breakReturnSummary.breakEndTime}
            plannedMinutes={breakReturnSummary.plannedMinutes}
            totalDailyBreakMinutes={undefined}
            newWarningsToday={breakReturnSummary.newWarningsToday}
            onReturnToShift={() => setBreakReturnSummary(null)}
          />
        </div>
      )}

      {/* Footer'da her zaman erişilebilir KVKK linki */}
      <div className="fixed bottom-2 right-2 z-10 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border shadow-sm">
        <KvkkFooterLink context="sube" />
      </div>
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
                  <Button size="default" className="h-11" onClick={() => claimMutation.mutate(task.id)} disabled={claimMutation.isPending} data-testid={`button-kiosk-claim-${task.id}`}>
                    Sahiplen
                  </Button>
                )}
                {task.status === "claimed" && (
                  <Button size="default" className="bg-green-600 hover:bg-green-700 h-11" onClick={() => completeMutation.mutate(task.id)} disabled={completeMutation.isPending} data-testid={`button-kiosk-complete-${task.id}`}>
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

