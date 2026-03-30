import { useState, useEffect, useCallback, Suspense, type ReactNode } from "react";
import { ErrorBoundary, LazyErrorBoundary } from "@/components/error-boundary";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, onLockError, type LockInfo, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { LockedRecordDialog } from "@/components/locked-record-dialog";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { BottomNav } from "@/components/bottom-nav";
import { BreadcrumbNavigation, BreadcrumbProvider } from "@/components/breadcrumb-navigation";
import { GlobalSearch } from "@/components/global-search";

import { AppHeader } from "@/components/app-header";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { GlobalAIAssistant } from "@/components/global-ai-assistant";
import { PushPermissionBanner } from "@/components/push-permission";
import { useAuth } from "@/hooks/useAuth";
import { DobodyFlowProvider } from "@/contexts/dobody-flow-context";
import { DobodyMiniBar } from "@/components/dobody-mini-bar";
import { OfflineBanner } from "@/components/offline-banner";
import { NetworkStatusProvider } from "@/hooks/useNetworkStatus";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { ProtectedRoute } from "@/components/protected-route";
import { ModuleGuard } from "@/components/module-guard";
import { GuidanceWidget } from "@/components/widgets/guidance-widget";
import { RouteModuleSidebar } from "@/components/layout/RouteModuleSidebar";
import { BranchOnboardingWizard } from "@/components/branch-onboarding-wizard";
import { RoleOnboardingWizard } from "@/components/role-onboarding-wizard";
import logoPath from "@assets/IMG_6637_1765138781125.png";

const GUIDANCE_ROLES = [
  "admin", "ceo", "cgo", "coach", "trainer", "muhasebe_ik",
  "satinalma", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur",
  "mudur", "supervisor", "supervisor_buddy",
];

const GUIDANCE_PATHS = ["/", "/dashboard", "/ana-sayfa", "/mission-control"];

function GuidanceWidgetWrapper({ user }: { user: any }) {
  const [location] = useLocation();
  if (!user || !GUIDANCE_ROLES.includes(user.role)) return null;
  if (!GUIDANCE_PATHS.includes(location)) return null;
  return <GuidanceWidget />;
}

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" data-testid="page-loader">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const FaultHub = lazyWithRetry(() => import("@/pages/ariza"));
const FaultDetail = lazyWithRetry(() => import("@/pages/ariza-detay"));
const EquipmentAnalytics = lazyWithRetry(() => import("@/pages/ekipman-analitics"));
const Login = lazyWithRetry(() => import("@/pages/login"));
const Register = lazyWithRetry(() => import("@/pages/register"));
const ForgotPassword = lazyWithRetry(() => import("@/pages/forgot-password"));
const ResetPassword = lazyWithRetry(() => import("@/pages/reset-password"));
const Dashboard = lazyWithRetry(() => import("@/pages/dashboard"));
const ControlDashboard = lazyWithRetry(() => import("@/pages/control-dashboard"));
const HomeScreen = lazyWithRetry(() => import("@/components/home-screen/HomeScreen"));
const Subeler = lazyWithRetry(() => import("@/pages/subeler"));
const SubeDetay = lazyWithRetry(() => import("@/pages/sube-detay"));
const SubeNFCDetay = lazyWithRetry(() => import("@/pages/sube-nfc-detay"));
const PersonelProfil = lazyWithRetry(() => import("@/pages/personel-profil"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/privacy-policy"));
const PersonelDetay = lazyWithRetry(() => import("@/pages/personel-detay"));
const PersonelDuzenle = lazyWithRetry(() => import("@/pages/personel-duzenle"));
const Tasks = lazyWithRetry(() => import("@/pages/tasks"));
const Checklists = lazyWithRetry(() => import("@/pages/checklists"));
const Equipment = lazyWithRetry(() => import("@/pages/equipment"));
const EquipmentDetail = lazyWithRetry(() => import("@/pages/equipment-detail"));
const QRScanner = lazyWithRetry(() => import("@/pages/qr-scanner"));
const NewFaultReport = lazyWithRetry(() => import("@/pages/ariza-yeni"));
const KnowledgeBase = lazyWithRetry(() => import("@/pages/knowledge-base"));
const TrainingAssign = lazyWithRetry(() => import("@/pages/training-assign"));
const Academy = lazyWithRetry(() => import("@/pages/academy"));
const AcademySupervisor = lazyWithRetry(() => import("@/pages/academy-supervisor"));
const AcademyHQ = lazyWithRetry(() => import("@/pages/akademi-hq"));
const ModuleDetail = lazyWithRetry(() => import("@/pages/module-detail"));
const AcademyModuleEditor = lazyWithRetry(() => import("@/pages/academy-module-editor"));
const AcademyAnalytics = lazyWithRetry(() => import("@/pages/academy-analytics"));
const AcademyBadges = lazyWithRetry(() => import("@/pages/academy-badges"));
const AcademyLeaderboard = lazyWithRetry(() => import("@/pages/academy-leaderboard"));
const AcademyQuiz = lazyWithRetry(() => import("@/pages/academy-quiz"));
const AcademyBranchAnalytics = lazyWithRetry(() => import("@/pages/academy-branch-analytics"));
const AcademyTeamCompetitions = lazyWithRetry(() => import("@/pages/academy-team-competitions"));
const AcademyCertificates = lazyWithRetry(() => import("@/pages/academy-certificates"));
const AcademyCohortAnalytics = lazyWithRetry(() => import("@/pages/academy-cohort-analytics"));
const AcademyLearningPaths = lazyWithRetry(() => import("@/pages/academy-learning-paths"));
const AcademyLearningPathDetail = lazyWithRetry(() => import("@/pages/academy-learning-path-detail"));
const AcademyAchievements = lazyWithRetry(() => import("@/pages/academy-achievements"));
const AcademyProgressOverview = lazyWithRetry(() => import("@/pages/academy-progress-overview"));
const AcademyStreakTracker = lazyWithRetry(() => import("@/pages/academy-streak-tracker"));
const AcademyAIAssistant = lazyWithRetry(() => import("@/pages/academy-ai-assistant"));
const AcademyAdaptiveEngine = lazyWithRetry(() => import("@/pages/academy-adaptive-engine"));
const AcademySocialGroups = lazyWithRetry(() => import("@/pages/academy-social-groups"));
const AcademyAdvancedAnalytics = lazyWithRetry(() => import("@/pages/academy-advanced-analytics"));
const EgitimProgrami = lazyWithRetry(() => import("@/pages/egitim-programi"));
const BadgeCollection = lazyWithRetry(() => import("@/pages/badge-collection"));
const GorevDetay = lazyWithRetry(() => import("@/pages/gorev-detay"));
const SubeGorevler = lazyWithRetry(() => import("@/pages/sube-gorevler"));
const IK = lazyWithRetry(() => import("@/pages/ik"));
const LeaveRequests = lazyWithRetry(() => import("@/pages/leave-requests"));
const OvertimeRequests = lazyWithRetry(() => import("@/pages/overtime-requests"));
const Attendance = lazyWithRetry(() => import("@/pages/attendance"));
const HRReports = lazyWithRetry(() => import("@/pages/hr-reports"));
const HQSupport = lazyWithRetry(() => import("@/pages/hq-support"));
const Notifications = lazyWithRetry(() => import("@/pages/notifications"));
const CashReports = lazyWithRetry(() => import("@/pages/cash-reports"));
const E2EReports = lazyWithRetry(() => import("@/pages/e2e-raporlar"));
const Vardiyalar = lazyWithRetry(() => import("@/pages/vardiyalar"));
const VardiyaCheckin = lazyWithRetry(() => import("@/pages/vardiya-checkin"));
const NFCGiris = lazyWithRetry(() => import("@/pages/nfc-giris"));
const VardiyaPlanlama = lazyWithRetry(() => import("@/pages/vardiya-planlama"));
const Vardiyalarim = lazyWithRetry(() => import("@/pages/vardiyalarim"));
const PersonelMusaitlik = lazyWithRetry(() => import("@/pages/personel-musaitlik"));
const Performance = lazyWithRetry(() => import("@/pages/performance"));
const AdminContentManagement = lazyWithRetry(() => import("@/pages/yonetim/icerik"));
const Settings = lazyWithRetry(() => import("@/pages/yonetim/ayarlar"));
const UserCRM = lazyWithRetry(() => import("@/pages/yonetim/kullanicilar"));
const AICostDashboard = lazyWithRetry(() => import("@/pages/yonetim/ai-maliyetler"));
const AdminChecklistManagement = lazyWithRetry(() => import("@/pages/yonetim/checklistler"));
const ChecklistTrackingPage = lazyWithRetry(() => import("@/pages/yonetim/checklist-takip"));
const EquipmentManagement = lazyWithRetry(() => import("@/pages/yonetim/ekipman-yonetimi"));
const AdminAcademy = lazyWithRetry(() => import("@/pages/yonetim/akademi"));
const KaliteDenetimi = lazyWithRetry(() => import("@/pages/kalite-denetimi"));
const CoachSubeDenetim = lazyWithRetry(() => import("@/pages/coach-sube-denetim"));

const PublicStaffRating = lazyWithRetry(() => import("@/pages/public-staff-rating"));
const StaffQrTokensPage = lazyWithRetry(() => import("@/pages/staff-qr-tokens"));
const EmployeeOfMonthPage = lazyWithRetry(() => import("@/pages/employee-of-month"));
const AdvancedReportsPage = lazyWithRetry(() => import("@/pages/advanced-reports"));
const MyPerformancePage = lazyWithRetry(() => import("@/pages/my-performance"));

const FranchiseAcilis = lazyWithRetry(() => import("@/pages/franchise-acilis"));
const FranchiseYatirimcilar = lazyWithRetry(() => import("@/pages/franchise-yatirimcilar"));
const FranchiseYatirimciDetay = lazyWithRetry(() => import("@/pages/franchise-yatirimci-detay"));
const DenetimSablonlari = lazyWithRetry(() => import("@/pages/denetim-sablonlari"));
const DenetimYurutme = lazyWithRetry(() => import("@/pages/denetim-yurutme"));
const Denetimler = lazyWithRetry(() => import("@/pages/denetimler"));
const CapaDetay = lazyWithRetry(() => import("@/pages/capa-detay"));
const BranchFeedback = lazyWithRetry(() => import("@/pages/branch-feedback"));
const KayipEsya = lazyWithRetry(() => import("@/pages/kayip-esya"));
const KayipEsyaHQ = lazyWithRetry(() => import("@/pages/kayip-esya-hq"));
const ReceteDetay = lazyWithRetry(() => import("@/pages/recete-detay"));
const Receteler = lazyWithRetry(() => import("@/pages/receteler"));
const Projeler = lazyWithRetry(() => import("@/pages/projeler"));
const ProjeDetay = lazyWithRetry(() => import("@/pages/proje-detay"));
const ProjeGorevDetay = lazyWithRetry(() => import("@/pages/proje-gorev-detay"));
const YeniSubeProjeler = lazyWithRetry(() => import("@/pages/yeni-sube-projeler"));
const YeniSubeDetay = lazyWithRetry(() => import("@/pages/yeni-sube-detay"));
const Raporlar = lazyWithRetry(() => import("@/pages/raporlar"));
const RaporlarHub = lazyWithRetry(() => import("@/pages/raporlar-hub"));
const Destek = lazyWithRetry(() => import("@/pages/destek"));
const Muhasebe = lazyWithRetry(() => import("@/pages/muhasebe"));
const MaliYonetim = lazyWithRetry(() => import("@/pages/mali-yonetim"));
const FabrikaMegaModule = lazyWithRetry(() => import("@/pages/fabrika/index"));
const FabrikaKiosk = lazyWithRetry(() => import("@/pages/fabrika/kiosk"));
const FabrikaDashboard = lazyWithRetry(() => import("@/pages/fabrika/dashboard"));
const SubeSiparisStok = lazyWithRetry(() => import("@/pages/sube/siparis-stok"));
const SubeKiosk = lazyWithRetry(() => import("@/pages/sube/kiosk"));
const HqKiosk = lazyWithRetry(() => import("@/pages/hq/kiosk"));
const HqStaffDashboard = lazyWithRetry(() => import("@/pages/hq/staff-dashboard"));
const SubeDashboard = lazyWithRetry(() => import("@/pages/sube/dashboard"));
const EmployeeDashboard = lazyWithRetry(() => import("@/pages/sube/employee-dashboard"));
const MerkezDashboard = lazyWithRetry(() => import("@/pages/merkez-dashboard"));
const ChecklistExecutionPage = lazyWithRetry(() => import("@/pages/sube/checklist-execution"));
const HQFabrikaAnalitik = lazyWithRetry(() => import("@/pages/hq-fabrika-analitik"));
const SubeKarsilastirma = lazyWithRetry(() => import("@/pages/sube-karsilastirma"));
const CanliTakip = lazyWithRetry(() => import("@/pages/canli-takip"));
const SubeBordroOzet = lazyWithRetry(() => import("@/pages/sube-bordro-ozet"));
const YoneticiDegerlendirme = lazyWithRetry(() => import("@/pages/admin/yonetici-degerlendirme"));
const BannerEditor = lazyWithRetry(() => import("@/pages/banner-editor"));
const KaliteKontrolDashboard = lazyWithRetry(() => import("@/pages/kalite-kontrol-dashboard"));
const GidaGuvenligiDashboard = lazyWithRetry(() => import("@/pages/gida-guvenligi-dashboard"));
const Setup = lazyWithRetry(() => import("@/pages/setup"));
const MisafirGeriBildirimPublic = lazyWithRetry(() => import("@/pages/misafir-geri-bildirim"));

const NotFound = lazyWithRetry(() => import("@/pages/not-found"));
const MegaModulePage = lazyWithRetry(() => import("@/pages/modul"));
const IcerikStudyosu = lazyWithRetry(() => import("@/pages/icerik-studyosu"));
const RaporlarMegaModule = lazyWithRetry(() => import("@/pages/raporlar-mega"));
const EkipmanMegaModule = lazyWithRetry(() => import("@/pages/ekipman-mega"));
const YeniSubeMegaModule = lazyWithRetry(() => import("@/pages/yeni-sube-mega"));
const OperasyonMegaModule = lazyWithRetry(() => import("@/pages/operasyon-mega"));
const AdminMegaModule = lazyWithRetry(() => import("@/pages/admin-mega"));
const AkademiMegaModule = lazyWithRetry(() => import("@/pages/akademi-mega"));
const AkademiV3 = lazyWithRetry(() => import("@/pages/akademi-v3/index"));
const CRMMegaModule = lazyWithRetry(() => import("@/pages/crm-mega"));
const AjandaPage = lazyWithRetry(() => import("@/pages/ajanda"));
const CEOCommandCenter = lazyWithRetry(() => import("@/pages/ceo-command-center"));
const CGOCommandCenter = lazyWithRetry(() => import("@/pages/cgo-command-center"));
const HQDashboard = lazyWithRetry(() => import("@/pages/hq-dashboard"));
const SatinalmaMega = lazyWithRetry(() => import("@/pages/satinalma-mega"));

const SubeSaglikSkoru = lazyWithRetry(() => import("@/pages/sube-saglik-skoru"));
const HqVardiyaGoruntuleme = lazyWithRetry(() => import("@/pages/hq-vardiya-goruntuleme"));
const HQPersonelIstatistikleri = lazyWithRetry(() => import("@/pages/hq-personel-istatistikleri"));
const MuhasebeRaporlama = lazyWithRetry(() => import("@/pages/muhasebe-raporlama"));
const KullanimKilavuzu = lazyWithRetry(() => import("@/pages/kullanim-kilavuzu"));
const WasteMegaModule = lazyWithRetry(() => import("@/pages/waste-mega"));
const HubPage = lazyWithRetry(() => import("@/pages/hub-page"));
const AgentMerkezi = lazyWithRetry(() => import("@/pages/agent-merkezi"));
const BenimGunum = lazyWithRetry(() => import("@/pages/benim-gunum"));
const SubeOzet = lazyWithRetry(() => import("@/pages/sube-ozet"));
const HQOzet = lazyWithRetry(() => import("@/pages/hq-ozet"));
const KoclukPaneli = lazyWithRetry(() => import("@/pages/kocluk-paneli"));
const FranchiseOzet = lazyWithRetry(() => import("@/pages/franchise-ozet"));
const PdksPage = lazyWithRetry(() => import("@/pages/pdks"));
const PdksIzinGunleri = lazyWithRetry(() => import("@/pages/pdks-izin-gunleri"));
const MaasPage = lazyWithRetry(() => import("@/pages/maas"));
const BordromPage = lazyWithRetry(() => import("@/pages/bordrom"));
const PilotLaunch = lazyWithRetry(() => import("@/pages/pilot-launch"));

const PUBLIC_PATH_PREFIXES = [
  "/login", 
  "/register", 
  "/forgot-password", 
  "/reset-password", 
  "/misafir-geri-bildirim",
  "/setup",
  "/sube/dashboard",
  "/fabrika/kiosk",
  "/hq/kiosk",
  "/sube/kiosk"
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

function FabrikaDashboardRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/fabrika", { replace: true });
  }, [setLocation]);
  return null;
}

function ProfileRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (user?.id) {
      setLocation(`/personel/${user.id}`, { replace: true });
    }
  }, [user, setLocation]);
  return null;
}

// Redirects for shortcut paths used in MC components
function VardiyaRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/vardiya-planlama", { replace: true }); }, [setLocation]);
  return null;
}
function StokRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/sube/siparis-stok", { replace: true }); }, [setLocation]);
  return null;
}
function IletisimRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/iletisim-merkezi", { replace: true }); }, [setLocation]);
  return null;
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
    <LazyErrorBoundary>
    <Suspense fallback={<PageLoader />}>
    <Switch>
      {/* Public routes */}
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/personel-degerlendirme/:token" component={PublicStaffRating} />
      <Route path="/misafir-geri-bildirim/:token" component={MisafirGeriBildirimPublic} />
      <Route path="/fabrika/dashboard" component={FabrikaDashboardRedirect} />
      <Route path="/fabrika/kiosk">{() => <FabrikaKiosk />}</Route>
      <Route path="/hq/kiosk">{() => <HqKiosk />}</Route>
      <Route path="/sube/checklist-execution/:completionId" component={ChecklistExecutionPage} />
      <Route path="/sube/kiosk/:branchId">{() => <SubeKiosk />}</Route>
      <Route path="/sube/kiosk">{() => <SubeKiosk />}</Route>
      <Route path="/sube/employee-dashboard" component={EmployeeDashboard} />
      <Route path="/sube/dashboard" component={SubeDashboard} />

      {/* Auth guard - catch-all for unauthenticated users */}
      {!isAuthenticated && <Route component={AuthCatchAllToLogin} />}

      {/* Protected routes - only rendered when authenticated */}
      {isAuthenticated && (
        <>
          <Route path="/" component={HomeScreen} />
          <Route path="/control" component={ControlDashboard} />
          <Route path="/control-legacy" component={Dashboard} />
          <Route path="/merkez-dashboard" component={MerkezDashboard} />
          <Route path="/modul/:moduleId" component={MegaModulePage} />
          <Route path="/subeler/:id/nfc" component={SubeNFCDetay} />
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/gizlilik-politikasi" component={PrivacyPolicy} />
          <Route path="/profil" component={ProfileRedirect} />
          <Route path="/vardiya" component={VardiyaRedirect} />
          <Route path="/stok" component={StokRedirect} />
          <Route path="/iletisim" component={IletisimRedirect} />
          <Route path="/personel/:id" component={PersonelProfil} />
          <Route path="/personel-detay/:id" component={PersonelDetay} />
          <Route path="/personel-qr-tokenlar" component={StaffQrTokensPage} />
          <Route path="/ayin-elemani" component={EmployeeOfMonthPage} />
          <Route path="/gelismis-raporlar" component={AdvancedReportsPage} />
          <Route path="/performansim" component={MyPerformancePage} />
          <Route path="/personel-duzenle/:id" component={PersonelDuzenle} />
          <Route path="/personel-onboarding">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi/personel-onboarding'; return null; }}</Route>
          <Route path="/onboarding-programlar">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi/onboarding-programlar'; return null; }}</Route>
          <Route path="/vardiyalar">{() => <ModuleGuard moduleKey="vardiya"><Vardiyalar /></ModuleGuard>}</Route>
          <Route path="/vardiya-planlama">{() => <ModuleGuard moduleKey="vardiya"><VardiyaPlanlama /></ModuleGuard>}</Route>
          <Route path="/vardiyalarim">{() => <ModuleGuard moduleKey="vardiya"><Vardiyalarim /></ModuleGuard>}</Route>
          <Route path="/vardiya-checkin">{() => <ModuleGuard moduleKey="vardiya"><VardiyaCheckin /></ModuleGuard>}</Route>
          <Route path="/nfc-giris" component={NFCGiris} />
          <Route path="/personel-musaitlik" component={PersonelMusaitlik} />
          <Route path="/devam-takibi">{() => <ModuleGuard moduleKey="pdks"><Attendance /></ModuleGuard>}</Route>
          <Route path="/sube-vardiya-takibi" component={SubeDashboard} />
          <Route path="/gorevler">{() => <ModuleGuard moduleKey="gorevler"><Tasks /></ModuleGuard>}</Route>
          <Route path="/gorev-detay/:id">{() => <ModuleGuard moduleKey="gorevler"><GorevDetay /></ModuleGuard>}</Route>
          <Route path="/sube-gorevler/:id">{() => <ModuleGuard moduleKey="gorevler"><SubeGorevler /></ModuleGuard>}</Route>
          <Route path="/checklistler">{() => <ModuleGuard moduleKey="checklist"><Checklists /></ModuleGuard>}</Route>
          <Route path="/ekipman-detay/:id">{() => <ModuleGuard moduleKey="ekipman"><EquipmentDetail /></ModuleGuard>}</Route>
          <Route path="/ekipman/:tab?">{() => <ModuleGuard moduleKey="ekipman"><EkipmanMegaModule /></ModuleGuard>}</Route>
          <Route path="/ariza">{() => <ModuleGuard moduleKey="ekipman"><FaultHub /></ModuleGuard>}</Route>
          <Route path="/ariza-detay/:id">{() => <ModuleGuard moduleKey="ekipman"><FaultDetail /></ModuleGuard>}</Route>
          <Route path="/ariza-yeni">{() => <ModuleGuard moduleKey="ekipman"><NewFaultReport /></ModuleGuard>}</Route>
          <Route path="/ekipman-analitics">{() => <ModuleGuard moduleKey="ekipman"><EquipmentAnalytics /></ModuleGuard>}</Route>
          <Route path="/qr-tara" component={QRScanner} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/akademi/*?">{() => <ModuleGuard moduleKey="akademi"><AkademiV3 /></ModuleGuard>}</Route>
          <Route path="/akademi-v3/*?">{() => <ModuleGuard moduleKey="akademi"><AkademiV3 /></ModuleGuard>}</Route>
          <Route path="/akademi-legacy/*?">{() => <ModuleGuard moduleKey="akademi"><AkademiMegaModule /></ModuleGuard>}</Route>
          <Route path="/akademi-modul-editor/:id">{() => <ModuleGuard moduleKey="akademi"><AcademyModuleEditor /></ModuleGuard>}</Route>
          <Route path="/akademi-modul-editor">{() => <ModuleGuard moduleKey="akademi"><AcademyModuleEditor /></ModuleGuard>}</Route>
          <Route path="/akademi-modul/:id">{() => <ModuleGuard moduleKey="akademi"><ModuleDetail /></ModuleGuard>}</Route>
          <Route path="/akademi-quiz/:quizId">{() => <ModuleGuard moduleKey="akademi"><AcademyQuiz /></ModuleGuard>}</Route>
          <Route path="/akademi-rozet-koleksiyonum">{() => <ModuleGuard moduleKey="akademi"><BadgeCollection /></ModuleGuard>}</Route>
          <Route path="/akademi-learning-path/:pathId">{() => <ModuleGuard moduleKey="akademi"><AcademyLearningPathDetail /></ModuleGuard>}</Route>
          <Route path="/egitim-programi/:topicId">{() => <ModuleGuard moduleKey="akademi"><EgitimProgrami /></ModuleGuard>}</Route>
          <Route path="/akademi-hq">{() => <ModuleGuard moduleKey="akademi"><AcademyHQ /></ModuleGuard>}</Route>
          <Route path="/akademi-supervisor">{() => <ModuleGuard moduleKey="akademi"><AcademySupervisor /></ModuleGuard>}</Route>
          <Route path="/akademi-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyAnalytics /></ModuleGuard>}</Route>
          <Route path="/akademi-badges">{() => <ModuleGuard moduleKey="akademi"><AcademyBadges /></ModuleGuard>}</Route>
          <Route path="/akademi-leaderboard">{() => <ModuleGuard moduleKey="akademi"><AcademyLeaderboard /></ModuleGuard>}</Route>
          <Route path="/akademi-certificates">{() => <ModuleGuard moduleKey="akademi"><AcademyCertificates /></ModuleGuard>}</Route>
          <Route path="/akademi-learning-paths">{() => <ModuleGuard moduleKey="akademi"><AcademyLearningPaths /></ModuleGuard>}</Route>
          <Route path="/akademi-ai-assistant">{() => <ModuleGuard moduleKey="akademi"><AcademyAIAssistant /></ModuleGuard>}</Route>
          <Route path="/akademi-team-competitions">{() => <ModuleGuard moduleKey="akademi"><AcademyTeamCompetitions /></ModuleGuard>}</Route>
          <Route path="/akademi-achievements">{() => <ModuleGuard moduleKey="akademi"><AcademyAchievements /></ModuleGuard>}</Route>
          <Route path="/akademi-progress-overview">{() => <ModuleGuard moduleKey="akademi"><AcademyProgressOverview /></ModuleGuard>}</Route>
          <Route path="/akademi-streak-tracker">{() => <ModuleGuard moduleKey="akademi"><AcademyStreakTracker /></ModuleGuard>}</Route>
          <Route path="/akademi-adaptive-engine">{() => <ModuleGuard moduleKey="akademi"><AcademyAdaptiveEngine /></ModuleGuard>}</Route>
          <Route path="/akademi-social-groups">{() => <ModuleGuard moduleKey="akademi"><AcademySocialGroups /></ModuleGuard>}</Route>
          <Route path="/akademi-advanced-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyAdvancedAnalytics /></ModuleGuard>}</Route>
          <Route path="/akademi-branch-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyBranchAnalytics /></ModuleGuard>}</Route>
          <Route path="/akademi-cohort-analytics">{() => <ModuleGuard moduleKey="akademi"><AcademyCohortAnalytics /></ModuleGuard>}</Route>
          <Route path="/receteler" component={Receteler} />
          <Route path="/recete/:id" component={ReceteDetay} />
          <Route path="/egitim/:id" component={ModuleDetail} />
          <Route path="/egitim-ata" component={TrainingAssign} />
          <Route path="/egitim">{() => { if (typeof window !== 'undefined') window.location.href = '/akademi'; return null; }}</Route>
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/icerik-studyosu">{() => <HQOnly><IcerikStudyosu /></HQOnly>}</Route>
          <Route path="/mesajlar">{() => { if (typeof window !== 'undefined') window.location.href = '/bildirimler?tab=mesajlar'; return null; }}</Route>
          <Route path="/proje-gorev/:id" component={ProjeGorevDetay} />
          <Route path="/projeler/:id" component={ProjeDetay} />
          <Route path="/projeler" component={Projeler} />
          <Route path="/yeni-sube-projeler" component={YeniSubeProjeler} />
          <Route path="/yeni-sube-detay/:id" component={YeniSubeDetay} />
          <Route path="/ik/:tab?" component={IK} />
          <Route path="/izin-talepleri" component={LeaveRequests} />
          <Route path="/mesai-talepleri" component={OvertimeRequests} />
          <Route path="/ik-raporlari" component={HRReports} />
          <Route path="/kasa-raporlari" component={CashReports} />
          <Route path="/e2e-raporlar" component={E2EReports} />
          <Route path="/raporlar/:tab?">{() => <ModuleGuard moduleKey="raporlar"><RaporlarMegaModule /></ModuleGuard>}</Route>
          <Route path="/raporlar-hub">{() => <ModuleGuard moduleKey="raporlar"><RaporlarHub /></ModuleGuard>}</Route>
          <Route path="/performans" component={Performance} />
          <Route path="/muhasebe">{() => <ModuleGuard moduleKey="finans"><Muhasebe /></ModuleGuard>}</Route>
          <Route path="/mali-yonetim">{() => <ModuleGuard moduleKey="finans"><MaliYonetim /></ModuleGuard>}</Route>
          <Route path="/fabrika/:tab?" component={FabrikaMegaModule} />
          <Route path="/hq-fabrika-analitik" component={HQFabrikaAnalitik} />
          <Route path="/canli-takip" component={CanliTakip} />
          <Route path="/sube-bordro-ozet" component={SubeBordroOzet} />
          <Route path="/hq-personel-durum" component={HqStaffDashboard} />
          <Route path="/hq-vardiya-goruntuleme" component={HqVardiyaGoruntuleme} />
          <Route path="/hq-personel-istatistikleri" component={HQPersonelIstatistikleri} />
          <Route path="/muhasebe-raporlama" component={MuhasebeRaporlama} />
          <Route path="/kalite-denetimi">{() => <ModuleGuard moduleKey="denetim"><KaliteDenetimi /></ModuleGuard>}</Route>
          <Route path="/coach-sube-denetim">{() => <ModuleGuard moduleKey="denetim"><CoachSubeDenetim /></ModuleGuard>}</Route>
          <Route path="/denetim-sablonlari">{() => <ModuleGuard moduleKey="denetim"><DenetimSablonlari /></ModuleGuard>}</Route>
          <Route path="/denetimler">{() => <ModuleGuard moduleKey="denetim"><Denetimler /></ModuleGuard>}</Route>
          <Route path="/denetim/:id">{() => <ModuleGuard moduleKey="denetim"><DenetimYurutme /></ModuleGuard>}</Route>
          <Route path="/capa/:id">{() => <ModuleGuard moduleKey="denetim"><CapaDetay /></ModuleGuard>}</Route>
          <Route path="/misafir-geri-bildirim">{() => { window.location.replace("/crm?channel=misafir"); return null; }}</Route>
          <Route path="/misafir-memnuniyeti/:tab?">{() => { window.location.replace("/crm?channel=misafir"); return null; }}</Route>
          <Route path="/misafir-memnuniyeti">{() => { window.location.replace("/crm?channel=misafir"); return null; }}</Route>
          <Route path="/sikayetler">{() => { window.location.replace("/crm/ticket-talepler"); return null; }}</Route>
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/kampanya-yonetimi">{() => { window.location.replace("/crm/kampanyalar"); return null; }}</Route>
          <Route path="/franchise-acilis">{() => <ModuleGuard moduleKey="franchise"><FranchiseAcilis /></ModuleGuard>}</Route>
          <Route path="/franchise-yatirimcilar">{() => <ModuleGuard moduleKey="franchise"><FranchiseYatirimcilar /></ModuleGuard>}</Route>
          <Route path="/franchise-yatirimcilar/:id">{() => <ModuleGuard moduleKey="franchise"><FranchiseYatirimciDetay /></ModuleGuard>}</Route>
          <Route path="/yonetim/icerik" component={AdminContentManagement} />
          <Route path="/yonetim/ayarlar" component={Settings} />
          <Route path="/yonetim/kullanicilar" component={UserCRM} />
          <Route path="/yonetim/degerlendirme" component={YoneticiDegerlendirme} />
          <Route path="/yonetim/ai-maliyetler" component={AICostDashboard} />
          <Route path="/yonetim/checklistler" component={AdminChecklistManagement} />
          <Route path="/yonetim/checklist-takip" component={ChecklistTrackingPage} />
          <Route path="/yonetim/ekipman-servis" component={EquipmentManagement} />
          <Route path="/yonetim/servis-talepleri" component={EquipmentManagement} />
          <Route path="/yonetim/ekipman-yonetimi" component={EquipmentManagement} />
                    <Route path="/yonetim/akademi" component={AdminAcademy} />
          <Route path="/muhasebe-geribildirimi" component={BranchFeedback} />
          <Route path="/kayip-esya" component={KayipEsya} />
          <Route path="/kayip-esya-hq" component={KayipEsyaHQ} />
          <Route path="/destek" component={Destek} />
          <Route path="/operasyon/:tab?" component={OperasyonMegaModule} />
          <Route path="/waste/:tab?" component={WasteMegaModule} />
          <Route path="/hub/:sectionId" component={HubPage} />
          <Route path="/yeni-sube/:tab?" component={YeniSubeMegaModule} />
          <Route path="/banner-editor">{() => <AdminOnly><BannerEditor /></AdminOnly>}</Route>
          <Route path="/pilot-baslat">{() => <AdminOnly><PilotLaunch /></AdminOnly>}</Route>
          <Route path="/crm/*?">{() => <ModuleGuard moduleKey="crm"><CRMMegaModule /></ModuleGuard>}</Route>
          <Route path="/ajanda">{() => <ModuleGuard moduleKey="ajanda"><AjandaPage /></ModuleGuard>}</Route>
          <Route path="/admin/*?" component={AdminMegaModule} />
          <Route path="/ceo-command-center">{() => <HQOnly><CEOCommandCenter /></HQOnly>}</Route>
          <Route path="/cgo-command-center">{() => <ExecutiveOnly><CGOCommandCenter /></ExecutiveOnly>}</Route>
          <Route path="/hq-dashboard/:department?">{() => <HQOnly><HQDashboard /></HQOnly>}</Route>
          <Route path="/kalite-kontrol-dashboard">{() => <HQOnly><KaliteKontrolDashboard /></HQOnly>}</Route>
          <Route path="/gida-guvenligi-dashboard">{() => <HQOnly><GidaGuvenligiDashboard /></HQOnly>}</Route>
          <Route path="/satinalma/:tab?" component={SatinalmaMega} />
          <Route path="/urun-sikayet">{() => { window.location.replace("/crm/ticket-talepler"); return null; }}</Route>
          <Route path="/raporlar/sube-saglik" component={SubeSaglikSkoru} />
          <Route path="/sube-saglik-skoru" component={SubeSaglikSkoru} />
          <Route path="/sube-karsilastirma">{() => <HQOnly><SubeKarsilastirma /></HQOnly>}</Route>
          <Route path="/kullanim-kilavuzu" component={KullanimKilavuzu} />
          <Route path="/sube/siparis-stok">{() => <ModuleGuard moduleKey="stok"><SubeSiparisStok /></ModuleGuard>}</Route>
          <Route path="/agent-merkezi" component={AgentMerkezi} />
          <Route path="/benim-gunum" component={BenimGunum} />
          <Route path="/sube-ozet" component={SubeOzet} />
          <Route path="/hq-ozet" component={HQOzet} />
          <Route path="/kocluk-paneli" component={KoclukPaneli} />
          <Route path="/franchise-ozet" component={FranchiseOzet} />
          <Route path="/pdks">{() => <ModuleGuard moduleKey="pdks"><PdksPage /></ModuleGuard>}</Route>
          <Route path="/pdks-izin-gunleri">{() => <ModuleGuard moduleKey="pdks"><PdksIzinGunleri /></ModuleGuard>}</Route>
          <Route path="/maas" component={MaasPage} />
          <Route path="/bordrom" component={BordromPage} />
          <Route path="/iletisim-merkezi" component={CRMMegaModule} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </LazyErrorBoundary>
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

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  // Kiosk rolleri sadece kendi sayfalarında olabilir
  if (user?.role === 'sube_kiosk') {
    const kioskPath = `/sube/kiosk/${user.branchId || ''}`;
    if (!location.startsWith('/sube/kiosk')) {
      setLocation(kioskPath);
      return null;
    }
  }
  if (user?.role === 'fabrika_kiosk') {
    if (!location.startsWith('/fabrika/kiosk')) {
      setLocation('/fabrika/kiosk');
      return null;
    }
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
  const isFullWidthPage = location === "/" || location === "/control";

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
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto">
          <Router />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <OfflineBanner />
      <AppHeader 
        user={user}
        branchName={branchName}
        onQRClick={() => setQrModalOpen(true)}
      />
      
      {/* QR Scanner Modal */}
      <QRScannerModal open={qrModalOpen} onOpenChange={setQrModalOpen} />
      
      {/* Main layout: optional module sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Module-specific sidebar — auto-detected from URL path */}
        {!isFullWidthPage && <RouteModuleSidebar />}
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Breadcrumb Navigation - only on sub-pages */}
          {!isFullWidthPage && (
            <div className="px-2 pt-1">
              <BreadcrumbNavigation />
            </div>
          )}
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto pb-20 md:pb-4">
            <div className="max-w-[1600px] mx-auto w-full">
              {!isFullWidthPage && <GuidanceWidgetWrapper user={user} />}
              <Router />
            </div>
          </main>
          
          {/* Flow Mode Mini-Bar - only on sub-pages */}
          {!isFullWidthPage && <DobodyMiniBar />}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Global Search (Ctrl+K) */}
      <GlobalSearch />
      
      {/* Global AI Assistant */}
      {user && <GlobalAIAssistant />}
    </div>
  );
}

function ForcePasswordChangeDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && (user as any).mustChangePassword) {
      setOpen(true);
    }
  }, [user]);

  const changeMutation = useMutation({
    mutationFn: async () => {
      if (newPw !== confirmPw) throw new Error("Şifreler eşleşmiyor");
      if (newPw.length < 6) throw new Error("Yeni şifre en az 6 karakter olmalıdır");
      const res = await apiRequest("POST", "/api/me/change-password", { currentPassword: currentPw, newPassword: newPw });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Şifre değiştirilemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" data-testid="force-password-dialog">
      <div className="bg-card border rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h2 className="text-lg font-semibold mb-1" data-testid="text-force-password-title">Şifrenizi Değiştirin</h2>
        <p className="text-sm text-muted-foreground mb-4">Güvenliğiniz için lütfen yeni bir şifre belirleyin.</p>
        {error && <p className="text-sm text-destructive mb-3" data-testid="text-password-error">{error}</p>}
        <div className="space-y-3">
          <input type="password" placeholder="Mevcut Şifre" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(""); }}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm" data-testid="input-force-current-pw" />
          <input type="password" placeholder="Yeni Şifre (en az 6 karakter)" value={newPw} onChange={e => { setNewPw(e.target.value); setError(""); }}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm" data-testid="input-force-new-pw" />
          <input type="password" placeholder="Yeni Şifre (Tekrar)" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm" data-testid="input-force-confirm-pw" />
          <button onClick={() => changeMutation.mutate()}
            disabled={changeMutation.isPending || !currentPw || !newPw || !confirmPw}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
            data-testid="button-force-change-pw">
            {changeMutation.isPending ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GlobalLockDialogHost() {
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  useEffect(() => {
    return onLockError((info) => setLockInfo(info));
  }, []);
  const handleClose = useCallback(() => setLockInfo(null), []);
  return (
    <LockedRecordDialog
      open={!!lockInfo}
      onClose={handleClose}
      reason={lockInfo?.reason}
      tableName={lockInfo?.tableName}
      recordId={lockInfo?.recordId}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NetworkStatusProvider>
            <TooltipProvider>
              <DobodyFlowProvider>
                <BreadcrumbProvider>
                    <AppContent />
                </BreadcrumbProvider>
              </DobodyFlowProvider>
              <Toaster />
              <PushPermissionBanner />
              <ForcePasswordChangeDialog />
              <BranchOnboardingWizard />
              <RoleOnboardingWizard />
              <GlobalLockDialogHost />
            </TooltipProvider>
          </NetworkStatusProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
