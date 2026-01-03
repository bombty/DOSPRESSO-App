import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
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
  ChevronLeft
} from "lucide-react";

type KioskStep = 'password' | 'select-user' | 'enter-pin' | 'working' | 'end-shift-summary';

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

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}

export default function BranchKiosk() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const branchId = params.branchId ? parseInt(params.branchId) : 1;
  
  const [step, setStep] = useState<KioskStep>('password');
  const [kioskPassword, setKioskPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(15);

  const { data: staffList = [], isLoading: loadingStaff, refetch: refetchStaff } = useQuery<StaffMember[]>({
    queryKey: ['/api/branches', branchId, 'kiosk', 'staff'],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/kiosk/staff`);
      return res.json();
    },
    enabled: step === 'select-user',
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/verify-password`, { password });
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
    },
  });

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
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/shift-start`, { userId });
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
      const res = await apiRequest('POST', `/api/branches/${branchId}/kiosk/shift-end`, { sessionId });
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
      const res = await fetch(`/api/branches/${branchId}/kiosk/session/${userId}`);
      const data = await res.json();
      if (data.activeSession) {
        setCurrentSession(data.activeSession);
      }
      if (data.tasks) {
        setUserTasks(data.tasks);
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
    setStep('password');
    setKioskPassword('');
    setSelectedUser(null);
    setPinInput('');
    setCurrentSession(null);
    setUserTasks([]);
    setElapsedTime(0);
    setShiftSummary(null);
    setAutoLogoutCountdown(15);
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

  const renderPasswordStep = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-amber-100 dark:bg-amber-900">
            <Store className="h-12 w-12 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Şube Kiosk</CardTitle>
          <CardDescription>Kiosk parolasını girin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((num, idx) => (
                <Button
                  key={idx}
                  variant={num === '' ? 'ghost' : 'outline'}
                  size="lg"
                  className="h-14 text-xl"
                  disabled={num === ''}
                  data-testid={`keypad-${num}`}
                  onClick={() => {
                    if (num === 'del') {
                      setKioskPassword(prev => prev.slice(0, -1));
                    } else if (typeof num === 'number' && kioskPassword.length < 4) {
                      const newPass = kioskPassword + num;
                      setKioskPassword(newPass);
                      if (newPass.length === 4) {
                        verifyPasswordMutation.mutate(newPass);
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
        <Button variant="outline" onClick={resetKiosk} data-testid="button-logout">
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
                      onClick={() => breakStartMutation.mutate(currentSession.id)}
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
                    onClick={() => endShiftMutation.mutate(currentSession.id)}
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
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
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
            onClick={resetKiosk}
            data-testid="button-finish"
          >
            Tamam ({autoLogoutCountdown}s)
          </Button>
        </CardContent>
      </Card>
    </div>
  );

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
    default:
      return renderPasswordStep();
  }
}
