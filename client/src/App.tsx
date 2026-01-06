import { useState, useEffect, type ReactNode } from "react";
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
import { ProtectedRoute } from "@/components/protected-route";
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
import ChecklistTrackingPage from "@/pages/yonetim/checklist-takip";
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
import Fabrika from "@/pages/fabrika";
import FabrikaKiosk from "@/pages/fabrika/kiosk";
import FabrikaDashboard from "@/pages/fabrika/dashboard";
import FabrikaKaliteKontrol from "@/pages/fabrika/kalite-kontrol";
import FabrikaPerformans from "@/pages/fabrika/performans";
import FabrikaAIRaporlar from "@/pages/fabrika/ai-raporlar";
import FabrikaUretimPlanlama from "@/pages/fabrika/uretim-planlama";
import FabrikaVardiyaUyumluluk from "@/pages/fabrika/vardiya-uyumluluk";
import SubeKiosk from "@/pages/sube/kiosk";
import SubeDashboard from "@/pages/sube/dashboard";
import ChecklistExecutionPage from "@/pages/sube/checklist-execution";
import HQFabrikaAnalitik from "@/pages/hq-fabrika-analitik";
import CanliTakip from "@/pages/canli-takip";
import AdminDashboard from "@/pages/admin/index";
import AdminYetkilendirme from "@/pages/admin/yetkilendirme";
import AdminAktiviteLoglar from "@/pages/admin/aktivite-loglari";
import AdminYedekleme from "@/pages/admin/yedekleme";
import AdminKullanicilar from "@/pages/admin/kullanicilar";
import AdminEmailAyarlari from "@/pages/admin/email-ayarlari";
import AdminServisMailAyarlari from "@/pages/admin/servis-mail-ayarlari";
import AdminBannerlar from "@/pages/admin/bannerlar";
import BannerEditor from "@/pages/banner-editor";
import AdminDuyurular from "@/pages/admin/duyurular";
import AdminYapayZekaAyarlari from "@/pages/admin/yapay-zeka-ayarlari";
import AdminKaliteDenetimSablonlari from "@/pages/admin/kalite-denetim-şablonları";
import AdminKaliteDenetimSablonuDuzenle from "@/pages/admin/kalite-denetim-sablonu-duzenle";
import AdminTopluVeriYonetimi from "@/pages/admin/toplu-veri-yonetimi";
import AdminFabrikaIstasyonlar from "@/pages/admin/fabrika-istasyonlar";
import AdminFabrikaFireSebepleri from "@/pages/admin/fabrika-fire-sebepleri";
import AdminFabrikaPinYonetimi from "@/pages/admin/fabrika-pin-yonetimi";
import AdminFabrikaKaliteKriterleri from "@/pages/admin/fabrika-kalite-kriterleri";
import Setup from "@/pages/setup";
import MisafirGeriBildirimPublic from "@/pages/misafir-geri-bildirim";
import MisafirMemnuniyeti from "@/pages/misafir-memnuniyeti";
import NotFound from "@/pages/not-found";
import MegaModulePage from "@/pages/modul";

const PUBLIC_PATH_PREFIXES = [
  "/login", 
  "/register", 
  "/forgot-password", 
  "/reset-password", 
  "/feedback", 
  "/misafir-geri-bildirim",
  "/setup",
  "/sube/dashboard",
  "/sube/kiosk",
  "/fabrika/kiosk"
];

function isPublicPath(path: string) {
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function AdminOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>;
}

function HQOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedGroups={["admin", "hq"]}>{children}</ProtectedRoute>;
}

function FabrikaOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedGroups={["admin", "hq", "fabrika"]}>{children}</ProtectedRoute>;
}

function AuthCatchAllToLogin() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isPublicPath(location)) return;
    
    sessionStorage.setItem("postLoginRedirect", location);
    const next = encodeURIComponent(location);
    setLocation(`/login?next=${next}`);
  }, [location, setLocation]);

  return null;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Don't show loading spinner for public paths - they should render immediately
  const isPublic = isPublicPath(location);
  
  if (isLoading && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/feedback" component={MusteriFeedbackPublic} />
      <Route path="/misafir-geri-bildirim/:token" component={MisafirGeriBildirimPublic} />
      <Route path="/fabrika/kiosk" component={FabrikaKiosk} />
      <Route path="/sube/checklist-execution/:completionId" component={ChecklistExecutionPage} />
      <Route path="/sube/kiosk/:branchId" component={SubeKiosk} />
      <Route path="/sube/kiosk" component={SubeKiosk} />
      <Route path="/sube/dashboard" component={SubeDashboard} />

      {/* Auth guard - catch-all for unauthenticated users */}
      {!isAuthenticated && <Route component={AuthCatchAllToLogin} />}

      {/* Protected routes - only rendered when authenticated */}
      {isAuthenticated && (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/modul/:moduleId" component={MegaModulePage} />
          <Route path="/subeler/:id/nfc" component={SubeNFCDetay} />
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/personel/:id" component={PersonelProfil} />
          <Route path="/personel-detay/:id" component={PersonelDetay} />
          <Route path="/personel-duzenle/:id" component={PersonelDuzenle} />
          <Route path="/personel-onboarding" component={PersonelOnboarding} />
          <Route path="/vardiyalar" component={Vardiyalar} />
          <Route path="/vardiya-planlama" component={VardiyaPlanlama} />
          <Route path="/vardiyalarim" component={Vardiyalarim} />
          <Route path="/vardiya-checkin" component={VardiyaCheckin} />
          <Route path="/nfc-giris" component={NFCGiris} />
          <Route path="/personel-musaitlik" component={PersonelMusaitlik} />
          <Route path="/devam-takibi" component={Attendance} />
          <Route path="/sube-vardiya-takibi" component={SubeDashboard} />
          <Route path="/gorevler" component={Tasks} />
          <Route path="/gorev-detay/:id" component={GorevDetay} />
          <Route path="/sube-gorevler/:id" component={SubeGorevler} />
          <Route path="/checklistler" component={Checklists} />
          <Route path="/ekipman/:id" component={EquipmentDetail} />
          <Route path="/ekipman" component={Equipment} />
          <Route path="/ariza" component={FaultHub} />
          <Route path="/ariza-detay/:id" component={FaultDetail} />
          <Route path="/ariza-yeni" component={NewFaultReport} />
          <Route path="/ekipman-analitics" component={EquipmentAnalytics} />
          <Route path="/qr-tara" component={QRScanner} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/akademi" component={AcademySuite} />
          <Route path="/akademi-modul/:id" component={ModuleDetail} />
          <Route path="/akademi-quiz/:quizId" component={AcademyQuiz} />
          <Route path="/akademi-rozet-koleksiyonum" component={BadgeCollection} />
          <Route path="/akademi-learning-path/:pathId" component={AcademyLearningPathDetail} />
          <Route path="/akademi-hq" component={AcademyHQ} />
          <Route path="/akademi-supervisor" component={AcademySupervisor} />
          <Route path="/akademi-analytics" component={AcademyAnalytics} />
          <Route path="/akademi-badges" component={AcademyBadges} />
          <Route path="/akademi-leaderboard" component={AcademyLeaderboard} />
          <Route path="/akademi-certificates" component={AcademyCertificates} />
          <Route path="/akademi-learning-paths" component={AcademyLearningPaths} />
          <Route path="/akademi-ai-assistant" component={AcademyAIAssistant} />
          <Route path="/akademi-team-competitions" component={AcademyTeamCompetitions} />
          <Route path="/akademi-achievements" component={AcademyAchievements} />
          <Route path="/akademi-progress-overview" component={AcademyProgressOverview} />
          <Route path="/akademi-streak-tracker" component={AcademyStreakTracker} />
          <Route path="/akademi-adaptive-engine" component={AcademyAdaptiveEngine} />
          <Route path="/akademi-social-groups" component={AcademySocialGroups} />
          <Route path="/akademi-advanced-analytics" component={AcademyAdvancedAnalytics} />
          <Route path="/akademi-branch-analytics" component={AcademyBranchAnalytics} />
          <Route path="/akademi-cohort-analytics" component={AcademyCohortAnalytics} />
          <Route path="/recete/:id" component={ReceteDetay} />
          <Route path="/egitim/:id" component={ModuleDetail} />
          <Route path="/egitim-ata" component={TrainingAssign} />
          <Route path="/egitim">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi-hq'; return null; }}</Route>
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular" component={Announcements} />
          <Route path="/mesajlar" component={Mesajlar} />
          <Route path="/proje-gorev/:id" component={ProjeGorevDetay} />
          <Route path="/projeler/:id" component={ProjeDetay} />
          <Route path="/projeler" component={Projeler} />
          <Route path="/yeni-sube-projeler" component={YeniSubeProjeler} />
          <Route path="/yeni-sube-detay/:id" component={YeniSubeDetay} />
          <Route path="/ik" component={IK} />
          <Route path="/izin-talepleri" component={LeaveRequests} />
          <Route path="/mesai-talepleri" component={OvertimeRequests} />
          <Route path="/ik-raporlari" component={HRReports} />
          <Route path="/kasa-raporlari" component={CashReports} />
          <Route path="/e2e-raporlar" component={E2EReports} />
          <Route path="/raporlar" component={Raporlar} />
          <Route path="/performans" component={Performance} />
          <Route path="/muhasebe" component={Muhasebe} />
          <Route path="/fabrika" component={Fabrika} />
          <Route path="/fabrika/dashboard" component={FabrikaDashboard} />
          <Route path="/fabrika/kalite-kontrol" component={FabrikaKaliteKontrol} />
          <Route path="/fabrika/performans" component={FabrikaPerformans} />
          <Route path="/fabrika/ai-raporlar" component={FabrikaAIRaporlar} />
          <Route path="/fabrika/uretim-planlama" component={FabrikaUretimPlanlama} />
          <Route path="/fabrika/vardiya-uyumluluk" component={FabrikaVardiyaUyumluluk} />
          <Route path="/hq-fabrika-analitik" component={HQFabrikaAnalitik} />
          <Route path="/canli-takip" component={CanliTakip} />
          <Route path="/kalite-denetimi" component={KaliteDenetimi} />
          <Route path="/denetim-sablonlari" component={DenetimSablonlari} />
          <Route path="/denetimler" component={Denetimler} />
          <Route path="/denetim/:id" component={DenetimYurutme} />
          <Route path="/capa/:id" component={CapaDetay} />
          <Route path="/misafir-geri-bildirim" component={MisafirGeriBildirim} />
          <Route path="/misafir-memnuniyeti" component={MisafirMemnuniyeti} />
          <Route path="/sikayetler" component={Sikayetler} />
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/ai-asistan" component={AIAssistant} />
          <Route path="/kampanya-yonetimi" component={KampanyaYonetimi} />
          <Route path="/franchise-acilis" component={FranchiseAcilis} />
          <Route path="/yonetim/menu" component={AdminMenuManagement} />
          <Route path="/yonetim/icerik" component={AdminContentManagement} />
          <Route path="/yonetim/ayarlar" component={Settings} />
          <Route path="/yonetim/kullanicilar" component={UserCRM} />
          <Route path="/yonetim/ai-maliyetler" component={AICostDashboard} />
          <Route path="/yonetim/checklistler" component={AdminChecklistManagement} />
          <Route path="/yonetim/checklist-takip" component={ChecklistTrackingPage} />
          <Route path="/yonetim/ekipman-servis" component={EkipmanServis} />
          <Route path="/yonetim/servis-talepleri" component={ServiceRequestsManagement} />
          <Route path="/yonetim/ekipman-yonetimi" component={EquipmentManagement} />
          <Route path="/yonetim/rol-yetkileri" component={RolYetkileri} />
          <Route path="/yonetim/akademi" component={AdminAcademy} />
          <Route path="/muhasebe-geribildirimi" component={BranchFeedback} />
          <Route path="/kayip-esya" component={KayipEsya} />
          <Route path="/kayip-esya-hq" component={KayipEsyaHQ} />
          <Route path="/destek" component={Destek} />
          <Route path="/admin/yetkilendirme">{() => <AdminOnly><AdminYetkilendirme /></AdminOnly>}</Route>
          <Route path="/admin/aktivite-loglari">{() => <AdminOnly><AdminAktiviteLoglar /></AdminOnly>}</Route>
          <Route path="/admin/yedekleme">{() => <AdminOnly><AdminYedekleme /></AdminOnly>}</Route>
          <Route path="/admin/kullanicilar">{() => <AdminOnly><AdminKullanicilar /></AdminOnly>}</Route>
          <Route path="/admin/email-ayarlari">{() => <AdminOnly><AdminEmailAyarlari /></AdminOnly>}</Route>
          <Route path="/admin/servis-mail-ayarlari">{() => <AdminOnly><AdminServisMailAyarlari /></AdminOnly>}</Route>
          <Route path="/admin/bannerlar">{() => <AdminOnly><AdminBannerlar /></AdminOnly>}</Route>
          <Route path="/admin/banner-editor">{() => <AdminOnly><BannerEditor /></AdminOnly>}</Route>
          <Route path="/admin/duyurular">{() => <AdminOnly><AdminDuyurular /></AdminOnly>}</Route>
          <Route path="/admin/yapay-zeka-ayarlari">{() => <AdminOnly><AdminYapayZekaAyarlari /></AdminOnly>}</Route>
          <Route path="/admin/kalite-denetim-sablonlari">{() => <AdminOnly><AdminKaliteDenetimSablonlari /></AdminOnly>}</Route>
          <Route path="/admin/kalite-denetim-sablonu/:id">{() => <AdminOnly><AdminKaliteDenetimSablonuDuzenle /></AdminOnly>}</Route>
          <Route path="/admin/toplu-veri-yonetimi">{() => <AdminOnly><AdminTopluVeriYonetimi /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-istasyonlar">{() => <AdminOnly><AdminFabrikaIstasyonlar /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-fire-sebepleri">{() => <AdminOnly><AdminFabrikaFireSebepleri /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-pin-yonetimi">{() => <AdminOnly><AdminFabrikaPinYonetimi /></AdminOnly>}</Route>
          <Route path="/admin/fabrika-kalite-kriterleri">{() => <AdminOnly><AdminFabrikaKaliteKriterleri /></AdminOnly>}</Route>
          <Route path="/admin/seed">{() => <AdminOnly><AdminSeed /></AdminOnly>}</Route>
          <Route path="/admin">{() => <AdminOnly><AdminDashboard /></AdminOnly>}</Route>
        </>
      )}
      
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
