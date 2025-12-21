import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
import { InboxDialog } from "@/components/inbox-dialog";
import { AppHeader } from "@/components/app-header";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/IMG_6637_1765138781125.png";
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
import SubeNFCDetay from "@/pages/sube-nfc-detay";
import PersonelProfil from "@/pages/personel-profil";
import PersonelDetay from "@/pages/personel-detay";
import PersonelDuzenle from "@/pages/personel-duzenle";
import Tasks from "@/pages/tasks";
import Checklists from "@/pages/checklists";
import Equipment from "@/pages/equipment";
import EquipmentDetail from "@/pages/equipment-detail";
import QRScanner from "@/pages/qr-scanner";
import NewFaultReport from "@/pages/ariza-yeni";
import KnowledgeBase from "@/pages/knowledge-base";
import TrainingAssign from "@/pages/training-assign";
import Academy from "@/pages/academy";
import AcademySupervisor from "@/pages/academy-supervisor";
import AcademyHQ from "@/pages/academy-hq";
import ModuleDetail from "@/pages/module-detail";
import AcademyAnalytics from "@/pages/academy-analytics";
import AcademyBadges from "@/pages/academy-badges";
import AcademyLeaderboard from "@/pages/academy-leaderboard";
import AcademyQuiz from "@/pages/academy-quiz";
import AcademyBranchAnalytics from "@/pages/academy-branch-analytics";
import AcademyTeamCompetitions from "@/pages/academy-team-competitions";
import AcademyCertificates from "@/pages/academy-certificates";
import AcademyCohortAnalytics from "@/pages/academy-cohort-analytics";
import AcademyLearningPaths from "@/pages/academy-learning-paths";
import AcademyLearningPathDetail from "@/pages/academy-learning-path-detail";
import AcademyAchievements from "@/pages/academy-achievements";
import AcademyProgressOverview from "@/pages/academy-progress-overview";
import AcademyStreakTracker from "@/pages/academy-streak-tracker";
import AcademyAIAssistant from "@/pages/academy-ai-assistant";
import AcademyAdaptiveEngine from "@/pages/academy-adaptive-engine";
import AcademySocialGroups from "@/pages/academy-social-groups";
import AcademyAdvancedAnalytics from "@/pages/academy-advanced-analytics";
import AcademySuite from "@/pages/academy-suite";
import BadgeCollection from "@/pages/badge-collection";
import GorevDetay from "@/pages/gorev-detay";
import SubeGorevler from "@/pages/sube-gorevler";
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
import E2EReports from "@/pages/e2e-raporlar";
import Vardiyalar from "@/pages/vardiyalar";
import VardiyaCheckin from "@/pages/vardiya-checkin";
import NFCGiris from "@/pages/nfc-giris";
import VardiyaPlanlama from "@/pages/vardiya-planlama";
import Vardiyalarim from "@/pages/vardiyalarim";
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
import AdminAcademy from "@/pages/yonetim/akademi";
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
import CapaDetay from "@/pages/capa-detay";
import BranchFeedback from "@/pages/branch-feedback";
import KayipEsya from "@/pages/kayip-esya";
import KayipEsyaHQ from "@/pages/kayip-esya-hq";
import ReceteDetay from "@/pages/recete-detay";
import Projeler from "@/pages/projeler";
import ProjeDetay from "@/pages/proje-detay";
import ProjeGorevDetay from "@/pages/proje-gorev-detay";
import YeniSubeProjeler from "@/pages/yeni-sube-projeler";
import YeniSubeDetay from "@/pages/yeni-sube-detay";
import Raporlar from "@/pages/raporlar";
import Destek from "@/pages/destek";
import Muhasebe from "@/pages/muhasebe";
import AdminDashboard from "@/pages/admin/index";
import AdminYetkilendirme from "@/pages/admin/yetkilendirme";
import AdminAktiviteLoglar from "@/pages/admin/aktivite-loglari";
import AdminYedekleme from "@/pages/admin/yedekleme";
import AdminKullanicilar from "@/pages/admin/kullanicilar";
import AdminEmailAyarlari from "@/pages/admin/email-ayarlari";
import AdminServisMailAyarlari from "@/pages/admin/servis-mail-ayarlari";
import AdminBannerlar from "@/pages/admin/bannerlar";
import AdminYapayZekaAyarlari from "@/pages/admin/yapay-zeka-ayarlari";
import AdminKaliteDenetimSablonlari from "@/pages/admin/kalite-denetim-şablonları";
import AdminKaliteDenetimSablonuDuzenle from "@/pages/admin/kalite-denetim-sablonu-duzenle";
import Setup from "@/pages/setup";
import NotFound from "@/pages/not-found";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [redirected, setRedirected] = useState(false);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !redirected) {
      const next = encodeURIComponent(location);
      sessionStorage.setItem("postLoginRedirect", location);
      setRedirected(true);
      setLocation(`/login?next=${next}`);
    }
  }, [isLoading, isAuthenticated, location, setLocation, redirected]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/feedback" component={MusteriFeedbackPublic} />

      {/* Protected routes - wrapped with AuthGuard */}
      <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/subeler/:id/nfc">{() => <ProtectedRoute component={SubeNFCDetay} />}</Route>
      <Route path="/subeler/:id">{() => <ProtectedRoute component={SubeDetay} />}</Route>
      <Route path="/subeler">{() => <ProtectedRoute component={Subeler} />}</Route>
      <Route path="/personel/:id">{() => <ProtectedRoute component={PersonelProfil} />}</Route>
      <Route path="/personel-detay/:id">{() => <ProtectedRoute component={PersonelDetay} />}</Route>
      <Route path="/personel-duzenle/:id">{() => <ProtectedRoute component={PersonelDuzenle} />}</Route>
      <Route path="/personel-onboarding">{() => <ProtectedRoute component={PersonelOnboarding} />}</Route>
      <Route path="/vardiyalar">{() => <ProtectedRoute component={Vardiyalar} />}</Route>
      <Route path="/vardiya-planlama">{() => <ProtectedRoute component={VardiyaPlanlama} />}</Route>
      <Route path="/vardiyalarim">{() => <ProtectedRoute component={Vardiyalarim} />}</Route>
      <Route path="/vardiya-checkin">{() => <ProtectedRoute component={VardiyaCheckin} />}</Route>
      <Route path="/nfc-giris">{() => <ProtectedRoute component={NFCGiris} />}</Route>
      <Route path="/personel-musaitlik">{() => <ProtectedRoute component={PersonelMusaitlik} />}</Route>
      <Route path="/devam-takibi">{() => <ProtectedRoute component={Attendance} />}</Route>
      <Route path="/gorevler">{() => <ProtectedRoute component={Tasks} />}</Route>
      <Route path="/gorev-detay/:id">{() => <ProtectedRoute component={GorevDetay} />}</Route>
      <Route path="/sube-gorevler/:id">{() => <ProtectedRoute component={SubeGorevler} />}</Route>
      <Route path="/checklistler">{() => <ProtectedRoute component={Checklists} />}</Route>
      <Route path="/ekipman/:id">{() => <ProtectedRoute component={EquipmentDetail} />}</Route>
      <Route path="/ekipman">{() => <ProtectedRoute component={Equipment} />}</Route>
      <Route path="/ariza">{() => <ProtectedRoute component={FaultHub} />}</Route>
      <Route path="/ariza-detay/:id">{() => <ProtectedRoute component={FaultDetail} />}</Route>
      <Route path="/ariza-yeni">{() => <ProtectedRoute component={NewFaultReport} />}</Route>
      <Route path="/ekipman-analitics">{() => <ProtectedRoute component={EquipmentAnalytics} />}</Route>
      <Route path="/qr-tara">{() => <ProtectedRoute component={QRScanner} />}</Route>
      <Route path="/bilgi-bankasi">{() => <ProtectedRoute component={KnowledgeBase} />}</Route>
      <Route path="/akademi">{() => <ProtectedRoute component={AcademySuite} />}</Route>
      <Route path="/akademi-modul/:id">{() => <ProtectedRoute component={ModuleDetail} />}</Route>
      <Route path="/akademi-quiz/:quizId">{() => <ProtectedRoute component={AcademyQuiz} />}</Route>
      <Route path="/akademi-rozet-koleksiyonum">{() => <ProtectedRoute component={BadgeCollection} />}</Route>
      <Route path="/akademi-learning-path/:pathId">{() => <ProtectedRoute component={AcademyLearningPathDetail} />}</Route>
      <Route path="/akademi-hq">{() => <ProtectedRoute component={AcademyHQ} />}</Route>
      <Route path="/akademi-supervisor">{() => <ProtectedRoute component={AcademySupervisor} />}</Route>
      <Route path="/akademi-analytics">{() => <ProtectedRoute component={AcademyAnalytics} />}</Route>
      <Route path="/akademi-badges">{() => <ProtectedRoute component={AcademyBadges} />}</Route>
      <Route path="/akademi-leaderboard">{() => <ProtectedRoute component={AcademyLeaderboard} />}</Route>
      <Route path="/akademi-certificates">{() => <ProtectedRoute component={AcademyCertificates} />}</Route>
      <Route path="/akademi-learning-paths">{() => <ProtectedRoute component={AcademyLearningPaths} />}</Route>
      <Route path="/akademi-ai-assistant">{() => <ProtectedRoute component={AcademyAIAssistant} />}</Route>
      <Route path="/akademi-team-competitions">{() => <ProtectedRoute component={AcademyTeamCompetitions} />}</Route>
      <Route path="/akademi-achievements">{() => <ProtectedRoute component={AcademyAchievements} />}</Route>
      <Route path="/akademi-progress-overview">{() => <ProtectedRoute component={AcademyProgressOverview} />}</Route>
      <Route path="/akademi-streak-tracker">{() => <ProtectedRoute component={AcademyStreakTracker} />}</Route>
      <Route path="/akademi-adaptive-engine">{() => <ProtectedRoute component={AcademyAdaptiveEngine} />}</Route>
      <Route path="/akademi-social-groups">{() => <ProtectedRoute component={AcademySocialGroups} />}</Route>
      <Route path="/akademi-advanced-analytics">{() => <ProtectedRoute component={AcademyAdvancedAnalytics} />}</Route>
      <Route path="/akademi-branch-analytics">{() => <ProtectedRoute component={AcademyBranchAnalytics} />}</Route>
      <Route path="/akademi-cohort-analytics">{() => <ProtectedRoute component={AcademyCohortAnalytics} />}</Route>
      <Route path="/recete/:id">{() => <ProtectedRoute component={ReceteDetay} />}</Route>
      <Route path="/egitim/:id">{() => <ProtectedRoute component={ModuleDetail} />}</Route>
      <Route path="/egitim-ata">{() => <ProtectedRoute component={TrainingAssign} />}</Route>
      <Route path="/egitim">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi-hq'; return null; }}</Route>
      <Route path="/bildirimler">{() => <ProtectedRoute component={Notifications} />}</Route>
      <Route path="/duyurular">{() => <ProtectedRoute component={Announcements} />}</Route>
      <Route path="/mesajlar">{() => <ProtectedRoute component={Mesajlar} />}</Route>
      <Route path="/proje-gorev/:id">{() => <ProtectedRoute component={ProjeGorevDetay} />}</Route>
      <Route path="/projeler/:id">{() => <ProtectedRoute component={ProjeDetay} />}</Route>
      <Route path="/projeler">{() => <ProtectedRoute component={Projeler} />}</Route>
      <Route path="/yeni-sube-projeler">{() => <ProtectedRoute component={YeniSubeProjeler} />}</Route>
      <Route path="/yeni-sube-detay/:id">{() => <ProtectedRoute component={YeniSubeDetay} />}</Route>
      <Route path="/ik">{() => <ProtectedRoute component={IK} />}</Route>
      <Route path="/izin-talepleri">{() => <ProtectedRoute component={LeaveRequests} />}</Route>
      <Route path="/mesai-talepleri">{() => <ProtectedRoute component={OvertimeRequests} />}</Route>
      <Route path="/ik-raporlari">{() => <ProtectedRoute component={HRReports} />}</Route>
      <Route path="/kasa-raporlari">{() => <ProtectedRoute component={CashReports} />}</Route>
      <Route path="/e2e-raporlar">{() => <ProtectedRoute component={E2EReports} />}</Route>
      <Route path="/raporlar">{() => <ProtectedRoute component={Raporlar} />}</Route>
      <Route path="/performans">{() => <ProtectedRoute component={Performance} />}</Route>
      <Route path="/muhasebe">{() => <ProtectedRoute component={Muhasebe} />}</Route>
      <Route path="/kalite-denetimi">{() => <ProtectedRoute component={KaliteDenetimi} />}</Route>
      <Route path="/denetim-sablonlari">{() => <ProtectedRoute component={DenetimSablonlari} />}</Route>
      <Route path="/denetimler">{() => <ProtectedRoute component={Denetimler} />}</Route>
      <Route path="/denetim/:id">{() => <ProtectedRoute component={DenetimYurutme} />}</Route>
      <Route path="/capa/:id">{() => <ProtectedRoute component={CapaDetay} />}</Route>
      <Route path="/misafir-geri-bildirim">{() => <ProtectedRoute component={MisafirGeriBildirim} />}</Route>
      <Route path="/sikayetler">{() => <ProtectedRoute component={Sikayetler} />}</Route>
      <Route path="/hq-destek">{() => <ProtectedRoute component={HQSupport} />}</Route>
      <Route path="/ai-asistan">{() => <ProtectedRoute component={AIAssistant} />}</Route>
      <Route path="/kampanya-yonetimi">{() => <ProtectedRoute component={KampanyaYonetimi} />}</Route>
      <Route path="/franchise-acilis">{() => <ProtectedRoute component={FranchiseAcilis} />}</Route>
      <Route path="/yonetim/menu">{() => <ProtectedRoute component={AdminMenuManagement} />}</Route>
      <Route path="/yonetim/icerik">{() => <ProtectedRoute component={AdminContentManagement} />}</Route>
      <Route path="/yonetim/ayarlar">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/yonetim/kullanicilar">{() => <ProtectedRoute component={UserCRM} />}</Route>
      <Route path="/yonetim/ai-maliyetler">{() => <ProtectedRoute component={AICostDashboard} />}</Route>
      <Route path="/yonetim/checklistler">{() => <ProtectedRoute component={AdminChecklistManagement} />}</Route>
      <Route path="/yonetim/ekipman-servis">{() => <ProtectedRoute component={EkipmanServis} />}</Route>
      <Route path="/yonetim/servis-talepleri">{() => <ProtectedRoute component={ServiceRequestsManagement} />}</Route>
      <Route path="/yonetim/ekipman-yonetimi">{() => <ProtectedRoute component={EquipmentManagement} />}</Route>
      <Route path="/yonetim/rol-yetkileri">{() => <ProtectedRoute component={RolYetkileri} />}</Route>
      <Route path="/yonetim/akademi">{() => <ProtectedRoute component={AdminAcademy} />}</Route>
      <Route path="/muhasebe-geribildirimi">{() => <ProtectedRoute component={BranchFeedback} />}</Route>
      <Route path="/kayip-esya">{() => <ProtectedRoute component={KayipEsya} />}</Route>
      <Route path="/kayip-esya-hq">{() => <ProtectedRoute component={KayipEsyaHQ} />}</Route>
      <Route path="/destek">{() => <ProtectedRoute component={Destek} />}</Route>
      <Route path="/admin/yetkilendirme">{() => <ProtectedRoute component={AdminYetkilendirme} />}</Route>
      <Route path="/admin/aktivite-loglari">{() => <ProtectedRoute component={AdminAktiviteLoglar} />}</Route>
      <Route path="/admin/yedekleme">{() => <ProtectedRoute component={AdminYedekleme} />}</Route>
      <Route path="/admin/kullanicilar">{() => <ProtectedRoute component={AdminKullanicilar} />}</Route>
      <Route path="/admin/email-ayarlari">{() => <ProtectedRoute component={AdminEmailAyarlari} />}</Route>
      <Route path="/admin/servis-mail-ayarlari">{() => <ProtectedRoute component={AdminServisMailAyarlari} />}</Route>
      <Route path="/admin/bannerlar">{() => <ProtectedRoute component={AdminBannerlar} />}</Route>
      <Route path="/admin/yapay-zeka-ayarlari">{() => <ProtectedRoute component={AdminYapayZekaAyarlari} />}</Route>
      <Route path="/admin/kalite-denetim-sablonlari">{() => <ProtectedRoute component={AdminKaliteDenetimSablonlari} />}</Route>
      <Route path="/admin/kalite-denetim-sablonu/:id">{() => <ProtectedRoute component={AdminKaliteDenetimSablonuDuzenle} />}</Route>
      <Route path="/admin/seed">{() => <ProtectedRoute component={AdminSeed} />}</Route>
      <Route path="/admin">{() => <ProtectedRoute component={AdminDashboard} />}</Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: isAuthenticated && !!user,
  });

  // Get unread notifications count
  const { data: notificationData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  const getRoleLabel = (role: string | undefined) => {
    const roleMap: Record<string, string> = {
      "admin": "Admin",
      "supervisor": "Supervisor",
      "barista": "Barista",
      "supervisor_buddy": "Supervisor Buddy",
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
    const branch = branches?.find((b) => b.id === branchId);
    return branch?.name || `Şube ${branchId}`;
  };

  const isHomePage = location === "/";

  const branchName = getBranchName(user?.branchId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Global Header */}
      <AppHeader 
        notificationCount={notificationData?.count || 0}
        user={user}
        branchName={branchName}
        onQRClick={() => setQrModalOpen(true)}
      />
      
      {/* QR Scanner Modal */}
      <QRScannerModal open={qrModalOpen} onOpenChange={setQrModalOpen} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Router />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (e) {
    console.error("App error:", e);
    return <div style={{ padding: "20px", color: "red" }}>Hata: {String(e)}</div>;
  }
}
