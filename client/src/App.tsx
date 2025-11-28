import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InboxDialog } from "@/components/inbox-dialog";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/IMG_5044_1764274022052.jpeg";
import FaultHub from "@/pages/ariza";
import FaultDetail from "@/pages/ariza-detay";
import EquipmentAnalytics from "@/pages/ekipman-analitics";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Subeler from "@/pages/subeler";
import SubeDetay from "@/pages/sube-detay";
import PersonelProfil from "@/pages/personel-profil.tsx";
import PersonelDetay from "@/pages/personel-detay";
import Tasks from "@/pages/tasks";
import Checklists from "@/pages/checklists";
import Equipment from "@/pages/equipment";
import EquipmentDetail from "@/pages/equipment-detail";
import QRScanner from "@/pages/qr-scanner";
import NewFaultReport from "@/pages/ariza-yeni";
import KnowledgeBase from "@/pages/knowledge-base";
import Training from "@/pages/training";
import TrainingDetail from "@/pages/training-detail";
import TrainingAssign from "@/pages/training-assign";
import Academy from "@/pages/academy";
import GorevDetay from "@/pages/gorev-detay";
import IK from "@/pages/ik";
import PersonelOnboarding from "@/pages/personel-onboarding";
import LeaveRequests from "@/pages/leave-requests";
import OvertimeRequests from "@/pages/overtime-requests";
import Attendance from "@/pages/attendance";
import HRReports from "@/pages/hr-reports";
import HQSupport from "@/pages/hq-support";
import Notifications from "@/pages/notifications";
import Announcements from "@/pages/announcements";
import Mesajlar from "@/pages/mesajlar";
import CashReports from "@/pages/cash-reports";
import Vardiyalar from "@/pages/vardiyalar";
import VardiyaCheckin from "@/pages/vardiya-checkin";
import VardiyaSablonlari from "@/pages/vardiya-sablonlari";
import PersonelMusaitlik from "@/pages/personel-musaitlik";
import AIAssistant from "@/pages/ai-assistant";
import Performance from "@/pages/performance";
import AdminSeed from "@/pages/admin-seed";
import AdminMenuManagement from "@/pages/yonetim/menu";
import AdminContentManagement from "@/pages/yonetim/icerik";
import Settings from "@/pages/yonetim/ayarlar";
import UserCRM from "@/pages/yonetim/kullanicilar";
import AICostDashboard from "@/pages/yonetim/ai-maliyetler";
import AdminChecklistManagement from "@/pages/yonetim/checklistler";
import ServiceRequestsManagement from "@/pages/yonetim/servis-talepleri";
import EquipmentManagement from "@/pages/yonetim/ekipman-yonetimi";
import EkipmanServis from "@/pages/yonetim/ekipman-servis";
import RolYetkileri from "@/pages/rol-yetkileri";
import KaliteDenetimi from "@/pages/kalite-denetimi";
import MisafirGeriBildirim from "@/pages/musteri-geribildirimi";
import Sikayetler from "@/pages/sikayetler";
import MusteriFeedbackPublic from "@/pages/musteri-feedback-public";
import KampanyaYonetimi from "@/pages/kampanya-yonetimi";
import FranchiseAcilis from "@/pages/franchise-acilis";
import DenetimSablonlari from "@/pages/denetim-sablonlari";
import DenetimYurutme from "@/pages/denetim-yurutme";
import Denetimler from "@/pages/denetimler";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/feedback" component={MusteriFeedbackPublic} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          {/* Ana Sayfa */}
          <Route path="/" component={Dashboard} />

          {/* Personel & Vardiya */}
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/personel/:id" component={PersonelProfil} />
          <Route path="/personel-detay/:id" component={PersonelDetay} />
          <Route path="/personel-onboarding" component={PersonelOnboarding} />
          <Route path="/vardiyalar" component={Vardiyalar} />
          <Route path="/vardiya-checkin" component={VardiyaCheckin} />
          <Route path="/vardiya-sablonlari" component={VardiyaSablonlari} />
          <Route path="/personel-musaitlik" component={PersonelMusaitlik} />
          <Route path="/devam-takibi" component={Attendance} />

          {/* Operasyon & Görevler */}
          <Route path="/gorevler" component={Tasks} />
          <Route path="/gorev-detay/:id" component={GorevDetay} />
          <Route path="/checklistler" component={Checklists} />

          {/* Ekipman & Bakım */}
          <Route path="/ekipman/:id" component={EquipmentDetail} />
          <Route path="/ekipman" component={Equipment} />
          <Route path="/ariza" component={FaultHub} />
          <Route path="/ariza-detay/:id" component={FaultDetail} />
          <Route path="/ariza-yeni" component={NewFaultReport} />
          <Route path="/ekipman-analitics" component={EquipmentAnalytics} />

          {/* Bilgi & İletişim */}
          <Route path="/qr-tara" component={QRScanner} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/akademi" component={Academy} />
          <Route path="/egitim/:id" component={TrainingDetail} />
          <Route path="/egitim" component={Training} />
          <Route path="/egitim-ata" component={TrainingAssign} />
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular" component={Announcements} />
          <Route path="/mesajlar" component={Mesajlar} />

          {/* İK & Raporlar */}
          <Route path="/ik" component={IK} />
          <Route path="/izin-talepleri" component={LeaveRequests} />
          <Route path="/mesai-talepleri" component={OvertimeRequests} />
          <Route path="/ik-raporlari" component={HRReports} />
          <Route path="/kasa-raporlari" component={CashReports} />
          <Route path="/performans" component={Performance} />

          {/* Kalite & Denetim */}
          <Route path="/kalite-denetimi" component={KaliteDenetimi} />
          <Route path="/denetim-sablonlari" component={DenetimSablonlari} />
          <Route path="/denetimler" component={Denetimler} />
          <Route path="/denetim/:id" component={DenetimYurutme} />

          {/* Müşteri İlişkileri */}
          <Route path="/misafir-geri-bildirim" component={MisafirGeriBildirim} />
          <Route path="/sikayetler" component={Sikayetler} />

          {/* Yönetim (HQ-only) */}
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/ai-asistan" component={AIAssistant} />
          <Route path="/kampanya-yonetimi" component={KampanyaYonetimi} />
          <Route path="/franchise-acilis" component={FranchiseAcilis} />
          <Route path="/admin/seed" component={AdminSeed} />
          <Route path="/yonetim/menu" component={AdminMenuManagement} />
          <Route path="/yonetim/icerik" component={AdminContentManagement} />
          <Route path="/yonetim/ayarlar" component={Settings} />
          <Route path="/yonetim/kullanicilar" component={UserCRM} />
          <Route path="/yonetim/ai-maliyetler" component={AICostDashboard} />
          <Route path="/yonetim/checklistler" component={AdminChecklistManagement} />
          <Route path="/yonetim/ekipman-servis" component={EkipmanServis} />
          <Route path="/yonetim/servis-talepleri" component={ServiceRequestsManagement} />
          <Route path="/yonetim/ekipman-yonetimi" component={EquipmentManagement} />
          <Route path="/yonetim/rol-yetkileri" component={RolYetkileri} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: isAuthenticated && !!user,
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  const getRoleLabel = (role: string | undefined) => {
    const roleMap: Record<string, string> = {
      "admin": "Admin",
      "supervisor": "Süpervizör",
      "barista": "Barista",
      "supervisor_buddy": "Süpervizör Buddy",
      "muhasebe": "Muhasebe",
      "coach": "Coach",
      "teknik": "Teknik",
      "destek": "Destek",
      "satinalma": "Satın Alma",
      "fabrika": "Fabrika",
      "yatirimci_hq": "Yatırımcı HQ",
      "yatirimci_sube": "Yatırımcı Şube",
      "hq_staff": "HQ Staff",
    };
    return role ? roleMap[role] || role : "";
  };

  const getBranchName = (branchId: number | null | undefined) => {
    if (!branchId) return null;
    const branch = branches?.find((b: any) => b.id === branchId);
    return branch?.name || `Şube ${branchId}`;
  };

  const userDisplayInfo = user ? (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="header-user-info">
      <span className="font-medium">
        {user.branchId ? getBranchName(user.branchId) : "Merkez"}
      </span>
      {user.role && (
        <>
          <span>-</span>
          <span>{getRoleLabel(user.role)}</span>
        </>
      )}
      {(user.firstName || user.lastName) && (
        <>
          <span>|</span>
          <span className="text-foreground font-medium">
            {user.firstName} {user.lastName?.charAt(0)}.
          </span>
        </>
      )}
    </div>
  ) : null;

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <img 
                src={logoPath} 
                alt="DOSPRESSO" 
                className="h-8 md:h-10 object-contain cursor-pointer hover:opacity-75 transition-opacity" 
                onClick={() => setLocation("/")}
                data-testid="logo-header" 
              />
              <div className="hidden sm:block">{userDisplayInfo}</div>
            </div>
            <InboxDialog />
          </header>
          <main className="flex-1 overflow-auto p-3 md:p-6 bg-background">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
