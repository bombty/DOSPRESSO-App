import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InboxDialog } from "@/components/inbox-dialog";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Branches from "@/pages/branches";
import Subeler from "@/pages/subeler";
import SubeDetay from "@/pages/sube-detay";
import Tasks from "@/pages/tasks";
import Checklists from "@/pages/checklists";
import Equipment from "@/pages/equipment";
import EquipmentDetail from "@/pages/equipment-detail";
import EquipmentFaults from "@/pages/equipment-faults";
import QRScanner from "@/pages/qr-scanner";
import KnowledgeBase from "@/pages/knowledge-base";
import Training from "@/pages/training";
import TrainingDetail from "@/pages/training-detail";
import IK from "@/pages/ik";
import LeaveRequests from "@/pages/leave-requests";
import Attendance from "@/pages/attendance";
import HRReports from "@/pages/hr-reports";
import HQSupport from "@/pages/hq-support";
import Notifications from "@/pages/notifications";
import Announcements from "@/pages/announcements";
import CashReports from "@/pages/cash-reports";
import Vardiyalar from "@/pages/vardiyalar";
import VardiyaCheckin from "@/pages/vardiya-checkin";
import VardiyaSablonlari from "@/pages/vardiya-sablonlari";
import AIAssistant from "@/pages/ai-assistant";
import Performance from "@/pages/performance";
import AdminSeed from "@/pages/admin-seed";
import AdminMenuManagement from "@/pages/yonetim/menu";
import AdminContentManagement from "@/pages/yonetim/icerik";
import Settings from "@/pages/yonetim/ayarlar";
import UserCRM from "@/pages/yonetim/kullanicilar";
import AICostDashboard from "@/pages/yonetim/ai-maliyetler";
import KaliteDenetimi from "@/pages/kalite-denetimi";
import MusteriGeribildirimi from "@/pages/musteri-geribildirimi";
import KampanyaYonetimi from "@/pages/kampanya-yonetimi";
import FranchiseAcilis from "@/pages/franchise-acilis";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/gorevler" component={Tasks} />
          <Route path="/checklistler" component={Checklists} />
          <Route path="/ekipman/:id" component={EquipmentDetail} />
          <Route path="/equipment/:id" component={EquipmentDetail} />
          <Route path="/ekipman" component={Equipment} />
          <Route path="/ekipman-arizalari" component={EquipmentFaults} />
          <Route path="/qr-tara" component={QRScanner} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/egitim/:id" component={TrainingDetail} />
          <Route path="/egitim" component={Training} />
          <Route path="/ik" component={IK} />
          <Route path="/izin-talepleri" component={LeaveRequests} />
          <Route path="/devam-takibi" component={Attendance} />
          <Route path="/ik-raporlari" component={HRReports} />
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular" component={Announcements} />
          <Route path="/kasa-raporlari" component={CashReports} />
          <Route path="/vardiyalar" component={Vardiyalar} />
          <Route path="/vardiya-checkin" component={VardiyaCheckin} />
          <Route path="/vardiya-sablonlari" component={VardiyaSablonlari} />
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/ai-asistan" component={AIAssistant} />
          <Route path="/performans" component={Performance} />
          <Route path="/kalite-denetimi" component={KaliteDenetimi} />
          <Route path="/musteri-geribildirimi" component={MusteriGeribildirimi} />
          <Route path="/kampanya-yonetimi" component={KampanyaYonetimi} />
          <Route path="/franchise-acilis" component={FranchiseAcilis} />
          <Route path="/admin/seed" component={AdminSeed} />
          <Route path="/yonetim/menu" component={AdminMenuManagement} />
          <Route path="/yonetim/icerik" component={AdminContentManagement} />
          <Route path="/yonetim/ayarlar" component={Settings} />
          <Route path="/yonetim/kullanicilar" component={UserCRM} />
          <Route path="/yonetim/ai-maliyetler" component={AICostDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <InboxDialog />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
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
