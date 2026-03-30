import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
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
  
  const [step, setStep] = useState<KioskStep>('password');
  const [kioskPassword, setKioskPassword] = useState('');
  const [kioskUsername, setKioskUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [userChecklists, setUserChecklists] = useState<Checklist[]>([]);
  const [teamStatus, setTeamStatus] = useState<any[]>([]);
  const [kioskNotifications, setKioskNotifications] = useState<any[]>([]);
  const [kioskAnnouncements, setKioskAnnouncements] = useState<any[]>([]);
  const [pdksAnomalyUsers, setPdksAnomalyUsers] = useState<any[]>([]);
  const [lobbyData, setLobbyData] = useState<any>(null);
  const [displayQr, setDisplayQr] = useState<any>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_MS = 3 * 60 * 1000; // 3 dakika

  const resetInactivityTimer = useCallback(() => {

  // Offline/Online durumu takip et
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
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
            if (data.activeSession) {
              setCurrentSession(data.activeSession);
            }
            if (data.tasks) setUserTasks(data.tasks);
            if (data.checklists) setUserChecklists(data.checklists);
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
  const [sessionLoading, setSessionLoading] = useState(false);
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
      setStep('working');
      toast({ title: "Giriş başarılı", description: `Hoş geldin ${data.user?.firstName}` });
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
    const todayStart = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 8, 0);
    const todayEnd = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 22, 0);
    const totalMs = todayEnd.getTime() - todayStart.getTime();
    const pct = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const t = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), h, m);
      return Math.max(0, Math.min(100, ((t.getTime() - todayStart.getTime()) / totalMs) * 100));
    };
    const nowPct = Math.max(0, Math.min(100, ((now2.getTime() - todayStart.getTime()) / totalMs) * 100));
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
      width: 158, height: 48, flexShrink: 0 as const, borderRadius: 8, padding: '0 8px',
      display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: 'none',
      ...(s === 'active' ? { background: '#1a6b2e', boxShadow: '0 0 0 1px rgba(74,222,128,0.4)' } :
         s === 'on_break' ? { background: '#7a4a0a', boxShadow: '0 0 0 1px rgba(251,191,36,0.4)' } :
         s === 'late' || s === 'missing' ? { background: '#8b1c1c', boxShadow: '0 0 0 1px rgba(248,113,113,0.5)' } :
         s === 'scheduled' ? { background: '#1a3a6b', boxShadow: '0 0 0 1px rgba(147,197,253,0.4)' } :
         { background: '#1e2a38', boxShadow: '0 0 0 1px rgba(255,255,255,0.12)' })
    });
    const statusColor = (s: string) => s === 'active' ? '#86efac' : s === 'on_break' ? '#fde68a' : s === 'late' || s === 'missing' ? '#fca5a5' : s === 'scheduled' ? '#bfdbfe' : 'rgba(255,255,255,0.35)';
    const statusTxt = (staff: any) => {
      const s = staff.shiftStatus;
      if (s === 'active') return 'Çalışıyor';
      if (s === 'on_break') return `Molada${staff.lateMinutes ? ` · ${staff.lateMinutes}dk` : ''}`;
      if (s === 'late') return `${staff.lateMinutes}dk geç!`;
      if (s === 'missing') return 'Gelmedi!';
      if (s === 'scheduled' && staff.shiftStartTime) return `${staff.shiftStartTime.slice(0,5)}-${staff.shiftEndTime?.slice(0,5)||'?'}`;
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
        <div style={{ background: '#c0392b', padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
          </div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 220px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '10px 14px 6px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', paddingLeft: 162, marginBottom: 7 }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                  {['08','10','12','14','16','18','20','22'].map(t => (
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
                {offAll.map(staff => (<div key={staff.id} style={{ opacity: 0.5 }}><PersonRow staff={staff} bar={<NowLine />} /></div>))}
              </>)}
              {noShift.length > 0 && (<>
                <SecHead label="Vardiya planlanmamis" count={noShift.length} color="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.05)" />
                {noShift.map(staff => (<div key={staff.id} style={{ opacity: 0.35 }}><PersonRow staff={staff} bar={<NowLine />} /></div>))}
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
              <button onClick={resetKiosk} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>Kiosk'tan çık</button>
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
                <div style={{ width: 90, height: 90, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  const renderWorkingStep = () => (
    <div className="flex flex-col h-screen bg-[#f8f6f3] dark:bg-[#0a1628] overflow-hidden">
      {/* Kompakt header */}
      <div className="bg-[#c0392b] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={selectedUser?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-white/20 text-white text-sm">
              {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{selectedUser?.firstName} {selectedUser?.lastName}</p>
            <Badge variant={currentSession?.status === 'on_break' ? 'secondary' : currentSession ? 'default' : 'outline'} className="text-xs h-4">
              {currentSession?.status === 'on_break' ? 'Molada' : currentSession ? 'Çalışıyor' : 'Giriş Yapıldı'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 h-8" onClick={resetWorker} data-testid="button-home">
            <Store className="h-4 w-4 mr-1" /> Ana Ekran
          </Button>
          <Button variant="ghost" size="sm" className="text-white/60 hover:bg-white/10 h-8" onClick={resetWorker} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mola modunda — büyük uyarı bandı */}
      {currentSession?.status === 'on_break' && (
        <div className="bg-amber-600 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-white" />
            <span className="text-white font-semibold text-sm">
              Molada — {currentSession.breakMinutes > 0 ? `${currentSession.breakMinutes} dk` : ''}
            </span>
          </div>
          <Button
            size="sm"
            className="bg-white text-amber-700 hover:bg-amber-50 h-9 px-4 font-semibold"
            onClick={() => breakEndMutation.mutate(currentSession?.id || 0)}
            disabled={breakEndMutation.isPending}
            data-testid="button-end-break-top"
          >
            {breakEndMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
            Molayı Bitir — Geri Dön
          </Button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-2 p-2 overflow-hidden" style={{gridTemplateRows: '1fr 1fr', minHeight: 0}}>
        <Card className="flex flex-col overflow-hidden min-h-0">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              Vardiya Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3 px-4 pb-3">
            {sessionLoading && !currentSession ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
                <p className="text-muted-foreground text-sm">Vardiya durumu yükleniyor...</p>
              </div>
            ) : !currentSession ? (
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

                <div className="flex flex-col gap-2">
                  {currentSession.status === 'on_break' ? (
                    <>
                      <Button
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 h-16 text-base font-semibold"
                        onClick={() => breakEndMutation.mutate(currentSession?.id || 0)}
                        disabled={breakEndMutation.isPending}
                        data-testid="button-end-break"
                      >
                        {breakEndMutation.isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
                        Molayı Bitir — Geri Dön
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="w-full h-12 opacity-80"
                        onClick={handleEndShiftClick}
                        disabled={endShiftMutation.isPending}
                        data-testid="button-end-shift-from-break"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Vardiyayı Bitir
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full h-12"
                        onClick={handleBreakStartClick}
                        disabled={breakStartMutation.isPending}
                        data-testid="button-start-break"
                      >
                        <Coffee className="h-5 w-5 mr-2" />
                        Mola Al
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="w-full h-12"
                        onClick={handleEndShiftClick}
                        disabled={endShiftMutation.isPending}
                        data-testid="button-end-shift"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Vardiyayı Bitir
                      </Button>
                    </>
                  )}
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

        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-2 pt-3 px-4 shrink-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListTodo className="h-4 w-4 text-amber-600" />
              Görevlerim
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 px-4 pb-3">
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

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowKioskFaultReport(true)}
            data-testid="button-kiosk-report-fault"
          >
            <AlertOctagon className="h-4 w-4 text-orange-500" />
            Sorun Bildir
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={() => setShowOvertimeRequest(true)}
            data-testid="button-overtime-request"
          >
            <Timer className="h-4 w-4" />
            Mesai Talep Et
          </Button>
        </div>

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

        {/* PDKS Anomali Banner */}
        {pdksAnomalyUsers.length > 0 && (
          <div className="col-span-full flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800" data-testid="pdks-anomaly-banner">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">Mola Süresi Aşıldı</p>
              <div className="mt-1 space-y-1">
                {pdksAnomalyUsers.map((m: any) => (
                  <p key={m.userId} className="text-sm text-red-600 dark:text-red-400">
                    {m.firstName} {m.lastName} — {m.breakMinutes} dk molada (limit: {m.maxBreakMinutes} dk)
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ekip Durumu */}
        {teamStatus.length > 0 && (
          <Card data-testid="card-team-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Ekip Durumu
                <Badge variant="secondary" className="ml-auto">{teamStatus.length} kişi</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {teamStatus.map((member: any) => (
                  <div key={member.userId} className="flex items-center gap-2 p-2 rounded-lg bg-muted" data-testid={`team-member-${member.userId}`}>
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      member.isBreakAnomaly ? 'bg-red-500' :
                      member.status === 'on_break' ? 'bg-amber-400' : 'bg-green-500'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.status === 'on_break'
                          ? `Molada ${member.breakMinutes > 0 ? `(${member.breakMinutes} dk)` : ''}`
                          : 'Çalışıyor'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bildirimler + Duyurular */}
        {(kioskNotifications.length > 0 || kioskAnnouncements.length > 0) && (
          <Card data-testid="card-kiosk-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Bildirimler & Duyurular
                {kioskNotifications.length > 0 && (
                  <Badge className="ml-auto bg-purple-600">{kioskNotifications.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {kioskAnnouncements.slice(0, 3).map((ann: any) => (
                <div key={`ann-${ann.id}`} className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800" data-testid={`announcement-${ann.id}`}>
                  <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ann.title}</p>
                    {ann.summary && <p className="text-xs text-muted-foreground line-clamp-2">{ann.summary}</p>}
                  </div>
                  {ann.isPinned && <Badge variant="outline" className="text-xs shrink-0">Sabitli</Badge>}
                </div>
              ))}
              {kioskNotifications.slice(0, 5).map((notif: any) => (
                <div key={`notif-${notif.id}`} className="flex items-start gap-2 p-2 rounded-lg bg-muted" data-testid={`notification-${notif.id}`}>
                  <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{notif.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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

      {/* Offline uyarı bandı */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          İnternet bağlantısı kesildi — İşlemler kaydedilemiyor
        </div>
      )}

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

