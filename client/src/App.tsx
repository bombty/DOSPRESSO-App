import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InboxDialog } from "@/components/inbox-dialog";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
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
import KnowledgeBase from "@/pages/knowledge-base";
import Training from "@/pages/training";
import TrainingDetail from "@/pages/training-detail";
import IK from "@/pages/ik";
import HQSupport from "@/pages/hq-support";
import Notifications from "@/pages/notifications";
import Announcements from "@/pages/announcements";
import CashReports from "@/pages/cash-reports";
import AIAssistant from "@/pages/ai-assistant";
import Performance from "@/pages/performance";
import AdminSeed from "@/pages/admin-seed";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/subeler/:id" component={SubeDetay} />
          <Route path="/subeler" component={Subeler} />
          <Route path="/gorevler" component={Tasks} />
          <Route path="/checklistler" component={Checklists} />
          <Route path="/ekipman/:id" component={EquipmentDetail} />
          <Route path="/ekipman" component={Equipment} />
          <Route path="/ekipman-arizalari" component={EquipmentFaults} />
          <Route path="/bilgi-bankasi" component={KnowledgeBase} />
          <Route path="/egitim/:id" component={TrainingDetail} />
          <Route path="/egitim" component={Training} />
          <Route path="/ik" component={IK} />
          <Route path="/bildirimler" component={Notifications} />
          <Route path="/duyurular" component={Announcements} />
          <Route path="/kasa-raporlari" component={CashReports} />
          <Route path="/hq-destek" component={HQSupport} />
          <Route path="/ai-asistan" component={AIAssistant} />
          <Route path="/performans" component={Performance} />
          <Route path="/admin/seed" component={AdminSeed} />
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
