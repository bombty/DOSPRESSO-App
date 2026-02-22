import { useState, useEffect, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { BottomNav } from "@/components/bottom-nav";
import { BreadcrumbNavigation, BreadcrumbProvider } from "@/components/breadcrumb-navigation";
import { InboxDialog } from "@/components/inbox-dialog";
import { AppHeader } from "@/components/app-header";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { GlobalAIAssistant } from "@/components/global-ai-assistant";
import { useAuth } from "@/hooks/useAuth";
import { useLanguageSync } from "@/hooks/useLanguageSync";
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
import PrivacyPolicy from "@/pages/privacy-policy";
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
import AcademyModuleEditor from "@/pages/academy-module-editor";
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
import EgitimProgrami from "@/pages/egitim-programi";
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
import Performance from "@/pages/performance";
import AdminSeed from "@/pages/admin-seed";
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
import KaliteDenetimi from "@/pages/kalite-denetimi";
import CoachSubeDenetim from "@/pages/coach-sube-denetim";
import Sikayetler from "@/pages/sikayetler";
import PublicStaffRating from "@/pages/public-staff-rating";
import StaffQrTokensPage from "@/pages/staff-qr-tokens";
import EmployeeOfMonthPage from "@/pages/employee-of-month";
import AdvancedReportsPage from "@/pages/advanced-reports";
import MyPerformancePage from "@/pages/my-performance";
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
import Receteler from "@/pages/receteler";
import Projeler from "@/pages/projeler";
import ProjeDetay from "@/pages/proje-detay";
import ProjeGorevDetay from "@/pages/proje-gorev-detay";
import YeniSubeProjeler from "@/pages/yeni-sube-projeler";
import YeniSubeDetay from "@/pages/yeni-sube-detay";
import Raporlar from "@/pages/raporlar";
import RaporlarHub from "@/pages/raporlar-hub";
import Destek from "@/pages/destek";
import Muhasebe from "@/pages/muhasebe";
import MaliYonetim from "@/pages/mali-yonetim";
import FabrikaMegaModule from "@/pages/fabrika/index";
import FabrikaKiosk from "@/pages/fabrika/kiosk";
import FabrikaDashboard from "@/pages/fabrika/dashboard";
import FabrikaKaliteKontrol from "@/pages/fabrika/kalite-kontrol";
import FabrikaPerformans from "@/pages/fabrika/performans";
import FabrikaAIRaporlar from "@/pages/fabrika/ai-raporlar";
import FabrikaUretimPlanlama from "@/pages/fabrika/uretim-planlama";
import FabrikaVardiyaUyumluluk from "@/pages/fabrika/vardiya-uyumluluk";
import SubeKiosk from "@/pages/sube/kiosk";
import HqKiosk from "@/pages/hq/kiosk";
import HqStaffDashboard from "@/pages/hq/staff-dashboard";
import SubeDashboard from "@/pages/sube/dashboard";
import EmployeeDashboard from "@/pages/sube/employee-dashboard";
import MerkezDashboard from "@/pages/merkez-dashboard";
import ChecklistExecutionPage from "@/pages/sube/checklist-execution";
import HQFabrikaAnalitik from "@/pages/hq-fabrika-analitik";
import CanliTakip from "@/pages/canli-takip";
import AdminDashboard from "@/pages/admin/index";
import AdminYetkilendirme from "@/pages/admin/yetkilendirme";
import YoneticiDegerlendirme from "@/pages/admin/yonetici-degerlendirme";
import AdminAktiviteLoglar from "@/pages/admin/aktivite-loglari";
import AdminYedekleme from "@/pages/admin/yedekleme";
import AdminKullanicilar from "@/pages/admin/kullanicilar";
import AdminEmailAyarlari from "@/pages/admin/email-ayarlari";
import AdminServisMailAyarlari from "@/pages/admin/servis-mail-ayarlari";
import AdminBannerlar from "@/pages/admin/bannerlar";
import BannerEditor from "@/pages/banner-editor";
import AdminDuyurular from "@/pages/admin/duyurular";
import AdminYapayZekaAyarlari from "@/pages/admin/yapay-zeka-ayarlari";
import AdminKaliteDenetimSablonuDuzenle from "@/pages/admin/kalite-denetim-sablonu-duzenle";
import AdminTopluVeriYonetimi from "@/pages/admin/toplu-veri-yonetimi";
import AdminFabrikaIstasyonlar from "@/pages/admin/fabrika-istasyonlar";
import AdminFabrikaFireSebepleri from "@/pages/admin/fabrika-fire-sebepleri";
import AdminFabrikaPinYonetimi from "@/pages/admin/fabrika-pin-yonetimi";
import AdminFabrikaKaliteKriterleri from "@/pages/admin/fabrika-kalite-kriterleri";
import KaliteKontrolDashboard from "@/pages/kalite-kontrol-dashboard";
import GidaGuvenligiDashboard from "@/pages/gida-guvenligi-dashboard";
import Setup from "@/pages/setup";
import MisafirGeriBildirimPublic from "@/pages/misafir-geri-bildirim";
import MisafirMemnuniyeti from "@/pages/misafir-memnuniyeti";
import NotFound from "@/pages/not-found";
import MegaModulePage from "@/pages/modul";
import IcerikStudyosu from "@/pages/icerik-studyosu";
import RaporlarMegaModule from "@/pages/raporlar-mega";
import EkipmanMegaModule from "@/pages/ekipman-mega";
import YeniSubeMegaModule from "@/pages/yeni-sube-mega";
import OperasyonMegaModule from "@/pages/operasyon-mega";
import AdminMegaModule from "@/pages/admin-mega";
import AkademiMegaModule from "@/pages/akademi-mega";
import CRMMegaModule from "@/pages/crm-mega";
import CEOCommandCenter from "@/pages/ceo-command-center";
import CGOCommandCenter from "@/pages/cgo-command-center";
import HQDashboard from "@/pages/hq-dashboard";
import SatinalmaMega from "@/pages/satinalma-mega";
import UrunSikayet from "@/pages/urun-sikayet";
import SubeSaglikSkoru from "@/pages/sube-saglik-skoru";
import HqVardiyaGoruntuleme from "@/pages/hq-vardiya-goruntuleme";
import HQPersonelIstatistikleri from "@/pages/hq-personel-istatistikleri";
import MuhasebeRaporlama from "@/pages/muhasebe-raporlama";
import KullanimKilavuzu from "@/pages/kullanim-kilavuzu";
import WasteMegaModule from "@/pages/waste-mega";

const PUBLIC_PATH_PREFIXES = [
  "/login", 
  "/register", 
  "/forgot-password", 
  "/reset-password", 
  "/misafir-geri-bildirim",
  "/setup",
  "/sube/dashboard",
  "/sube/kiosk",
  "/fabrika/dashboard",
  "/fabrika/kiosk",
  "/hq/kiosk"
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

function ExecutiveOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["admin", "ceo", "cgo", "coach", "trainer", "muhasebe", "muhasebe_ik", "satinalma", "teknik", "destek", "fabrika", "yatirimci_hq"]}>{children}</ProtectedRoute>;
}

function CEOOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={["ceo", "cgo"]} strictRoles>{children}</ProtectedRoute>;
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
      <Route path="/personel-degerlendirme/:token" component={PublicStaffRating} />
      <Route path="/misafir-geri-bildirim/:token" component={MisafirGeriBildirimPublic} />
      <Route path="/fabrika/dashboard" component={FabrikaDashboard} />
      <Route path="/fabrika/kiosk" component={FabrikaKiosk} />
      <Route path="/hq/kiosk" component={HqKiosk} />
      <Route path="/sube/checklist-execution/:completionId" component={ChecklistExecutionPage} />
      <Route path="/sube/kiosk/:branchId" component={SubeKiosk} />
      <Route path="/sube/kiosk" component={SubeKiosk} />
      <Route path="/sube/employee-dashboard" component={EmployeeDashboard} />
      <Route path="/sube/dashboard" component={SubeDashboard} />

      {/* Auth guard - catch-all for unauthenticated users */}
      {!isAuthenticated && <Route component={AuthCatchAllToLogin} />}

      {/* Protected routes - only rendered when authenticated */}
      {isAuthenticated && (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/merkez-dashboard" component={MerkezDashboard} />
          <Route path="/modul/:moduleId" component={MegaModulePage} />
          <Route path="/subeler/:id/nfc" component={SubeNFCDetay} />
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/gizlilik-politikasi" component={PrivacyPolicy} />
          <Route path="/personel/:id" component={PersonelProfil} />
          <Route path="/personel-detay/:id" component={PersonelDetay} />
          <Route path="/personel-qr-tokenlar" component={StaffQrTokensPage} />
          <Route path="/ayin-elemani" component={EmployeeOfMonthPage} />
          <Route path="/gelismis-raporlar" component={AdvancedReportsPage} />
          <Route path="/performansim" component={MyPerformancePage} />
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
          <Route path="/ekipman-detay/:id" component={EquipmentDetail} />
          <Route path="/ekipman/:tab?" component={EkipmanMegaModule} />
          <Route path="/ariza" component={FaultHub} />
          <Route path="/ariza-detay/:id" component={FaultDetail} />
          <Route path="/ariza-yeni" component={NewFaultReport} />
          <Route path="/ekipman-analitics" component={EquipmentAnalytics} />
          <Route path="/qr-tara" component={QRScanner} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/akademi/*?" component={AkademiMegaModule} />
          <Route path="/akademi-modul-editor/:id" component={AcademyModuleEditor} />
          <Route path="/akademi-modul-editor" component={AcademyModuleEditor} />
          <Route path="/akademi-modul/:id" component={ModuleDetail} />
          <Route path="/akademi-quiz/:quizId" component={AcademyQuiz} />
          <Route path="/akademi-rozet-koleksiyonum" component={BadgeCollection} />
          <Route path="/akademi-learning-path/:pathId" component={AcademyLearningPathDetail} />
          <Route path="/egitim-programi/:topicId" component={EgitimProgrami} />
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
          <Route path="/receteler" component={Receteler} />
          <Route path="/recete/:id" component={ReceteDetay} />
          <Route path="/egitim/:id" component={ModuleDetail} />
          <Route path="/egitim-ata" component={TrainingAssign} />
          <Route path="/egitim">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi-hq'; return null; }}</Route>
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/icerik-studyosu">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
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
          <Route path="/raporlar/:tab?" component={RaporlarMegaModule} />
          <Route path="/raporlar-hub" component={RaporlarHub} />
          <Route path="/performans" component={Performance} />
          <Route path="/muhasebe" component={Muhasebe} />
          <Route path="/mali-yonetim" component={MaliYonetim} />
          <Route path="/fabrika/:tab?" component={FabrikaMegaModule} />
          <Route path="/hq-fabrika-analitik" component={HQFabrikaAnalitik} />
          <Route path="/canli-takip" component={CanliTakip} />
          <Route path="/hq-personel-durum" component={HqStaffDashboard} />
          <Route path="/hq-vardiya-goruntuleme" component={HqVardiyaGoruntuleme} />
          <Route path="/hq-personel-istatistikleri" component={HQPersonelIstatistikleri} />
          <Route path="/muhasebe-raporlama" component={MuhasebeRaporlama} />
          <Route path="/kalite-denetimi" component={KaliteDenetimi} />
          <Route path="/coach-sube-denetim" component={CoachSubeDenetim} />
          <Route path="/denetim-sablonlari" component={DenetimSablonlari} />
          <Route path="/denetimler" component={Denetimler} />
          <Route path="/denetim/:id" component={DenetimYurutme} />
          <Route path="/capa/:id" component={CapaDetay} />
          <Route path="/misafir-geri-bildirim" component={MisafirMemnuniyeti} />
          <Route path="/misafir-memnuniyeti" component={MisafirMemnuniyeti} />
          <Route path="/sikayetler" component={Sikayetler} />
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/kampanya-yonetimi" component={KampanyaYonetimi} />
          <Route path="/franchise-acilis" component={FranchiseAcilis} />
          <Route path="/yonetim/icerik" component={AdminContentManagement} />
          <Route path="/yonetim/ayarlar" component={Settings} />
          <Route path="/yonetim/kullanicilar" component={UserCRM} />
          <Route path="/yonetim/degerlendirme" component={YoneticiDegerlendirme} />
          <Route path="/yonetim/ai-maliyetler" component={AICostDashboard} />
          <Route path="/yonetim/checklistler" component={AdminChecklistManagement} />
          <Route path="/yonetim/checklist-takip" component={ChecklistTrackingPage} />
          <Route path="/yonetim/ekipman-servis" component={EkipmanServis} />
          <Route path="/yonetim/servis-talepleri" component={ServiceRequestsManagement} />
          <Route path="/yonetim/ekipman-yonetimi" component={EquipmentManagement} />
                    <Route path="/yonetim/akademi" component={AdminAcademy} />
          <Route path="/muhasebe-geribildirimi" component={BranchFeedback} />
          <Route path="/kayip-esya" component={KayipEsya} />
          <Route path="/kayip-esya-hq" component={KayipEsyaHQ} />
          <Route path="/destek" component={Destek} />
          <Route path="/operasyon/:tab?" component={OperasyonMegaModule} />
          <Route path="/waste/:tab?" component={WasteMegaModule} />
          <Route path="/yeni-sube/:tab?" component={YeniSubeMegaModule} />
          <Route path="/banner-editor">{() => <AdminOnly><BannerEditor /></AdminOnly>}</Route>
          <Route path="/crm/*?" component={CRMMegaModule} />
          <Route path="/admin/*?" component={AdminMegaModule} />
          <Route path="/ceo-command-center">{() => <HQOnly><CEOCommandCenter /></HQOnly>}</Route>
          <Route path="/cgo-command-center">{() => <ExecutiveOnly><CGOCommandCenter /></ExecutiveOnly>}</Route>
          <Route path="/hq-dashboard/:department?">{() => <HQOnly><HQDashboard /></HQOnly>}</Route>
          <Route path="/kalite-kontrol-dashboard">{() => <HQOnly><KaliteKontrolDashboard /></HQOnly>}</Route>
          <Route path="/gida-guvenligi-dashboard">{() => <HQOnly><GidaGuvenligiDashboard /></HQOnly>}</Route>
          <Route path="/satinalma/:tab?" component={SatinalmaMega} />
          <Route path="/urun-sikayet" component={UrunSikayet} />
          <Route path="/sube-saglik-skoru" component={SubeSaglikSkoru} />
          <Route path="/kullanim-kilavuzu" component={KullanimKilavuzu} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  useLanguageSync();
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
      "ceo": "CEO",
      "cgo": "CGO",
      "muhasebe_ik": "Muhasebe & İK",
      "satinalma": "Satın Alma",
      "coach": "Coach",
      "marketing": "Marketing",
      "trainer": "Trainer (Eğitmen)",
      "kalite_kontrol": "Kalite Kontrol",
      "fabrika_mudur": "Fabrika Müdürü",
      "muhasebe": "Muhasebe",
      "teknik": "Teknik",
      "destek": "Destek",
      "fabrika": "Fabrika",
      "yatirimci_hq": "Yatırımcı HQ",
      "stajyer": "Stajyer",
      "bar_buddy": "Bar Buddy",
      "barista": "Barista",
      "supervisor_buddy": "Supervisor Buddy",
      "supervisor": "Supervisor",
      "mudur": "Müdür",
      "yatirimci_branch": "Yatırımcı",
      "fabrika_operator": "Fabrika Operatör",
      "fabrika_sorumlu": "Fabrika Sorumlu",
      "fabrika_personel": "Fabrika Personel",
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

  const isStandaloneDashboard = location.startsWith("/merkez-dashboard") || 
    location.startsWith("/sube/dashboard") || 
    location.startsWith("/sube/employee-dashboard") ||
    location.startsWith("/fabrika/dashboard") ||
    location.startsWith("/hq/kiosk") ||
    location.startsWith("/sube/kiosk") ||
    location.startsWith("/fabrika/kiosk");

  if (isStandaloneDashboard) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>
    );
  }

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
      
      {/* Breadcrumb Navigation */}
      <div className="px-2 pt-1">
        <BreadcrumbNavigation />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Router />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Global AI Assistant */}
      {user && <GlobalAIAssistant />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <BreadcrumbProvider>
              <AppContent />
            </BreadcrumbProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
