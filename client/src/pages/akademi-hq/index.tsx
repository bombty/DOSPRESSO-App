import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { hasPermission, type UserRoleType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GraduationCap, ListChecks, Video, BarChart3, Building2, Clock, Award, Eye } from "lucide-react";
import { RoleDashboard } from "./components/RoleDashboard";
import { SinavTalepleriTab } from "./SinavTalepleriTab";
import { ModullerTab } from "./ModullerTab";
import { QuizYonetimTab } from "./QuizYonetimTab";
import { WebinarTab } from "./WebinarTab";
import { IstatistiklerTab } from "./IstatistiklerTab";
import { SubeAnalizTab } from "./SubeAnalizTab";
import { SertifikaTab } from "./SertifikaTab";

export default function AcademyHQ() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const VALID_TABS = ["training", "quiz", "webinar", "stats", "branch", "exams", "certs"];
    if (tabParam && VALID_TABS.includes(tabParam)) {
      return tabParam;
    }
    return "training";
  });

  const canManageTraining = user && hasPermission(user.role as UserRoleType, 'training', 'edit');

  if (user && !canManageTraining) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Yetkisiz Erişim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <Button onClick={() => window.location.href = "/"} className="mt-4 w-full" data-testid="button-go-home">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="icon"
            data-testid="button-back"
            title="Geri Dön"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Akademi - HQ Yönetim Paneli</h1>
            <p className="text-xs text-muted-foreground">Modül yönetimi, sınav talepleri ve atamalar</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/akademi?preview=true')}
          className="shrink-0 gap-1.5"
          data-testid="button-student-preview"
        >
          <Eye className="h-4 w-4" />
          Öğrenci Görünümü
        </Button>
      </div>

      <RoleDashboard
        onNavigateTab={setActiveTab}
        onCertSettings={() => setActiveTab("certs")}
        onOpenAiOnboarding={() => setActiveTab("training")}
        onOpenAiProgram={() => setActiveTab("training")}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex overflow-x-auto scrollbar-hidden gap-1" data-testid="academy-hq-tabs">
          <TabsTrigger value="training" className="flex-1 min-w-fit" data-testid="tab-training">
            <GraduationCap className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Modüller</span>
            <span className="sm:hidden">Modül</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex-1 min-w-fit" data-testid="tab-quiz">
            <ListChecks className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Quiz Yönetimi</span>
            <span className="sm:hidden">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="webinar" className="flex-1 min-w-fit" data-testid="tab-webinar">
            <Video className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Webinarlar</span>
            <span className="sm:hidden">Web.</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 min-w-fit" data-testid="tab-stats">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">İstatistikler</span>
            <span className="sm:hidden">İst.</span>
          </TabsTrigger>
          <TabsTrigger value="branch" className="flex-1 min-w-fit" data-testid="tab-branch">
            <Building2 className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Şube Analiz</span>
            <span className="sm:hidden">Şube</span>
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex-1 min-w-fit" data-testid="tab-exams">
            <Clock className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Sınav Talepleri</span>
            <span className="sm:hidden">Sınav</span>
          </TabsTrigger>
          <TabsTrigger value="certs" className="flex-1 min-w-fit" data-testid="tab-certs">
            <Award className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Sertifikalar</span>
            <span className="sm:hidden">Sert.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="w-full mt-3">
          <ModullerTab />
        </TabsContent>

        <TabsContent value="quiz" className="w-full mt-3">
          <QuizYonetimTab />
        </TabsContent>

        <TabsContent value="webinar" className="w-full mt-3">
          <WebinarTab />
        </TabsContent>

        <TabsContent value="stats" className="w-full mt-3">
          <IstatistiklerTab />
        </TabsContent>

        <TabsContent value="branch" className="w-full mt-3">
          <SubeAnalizTab />
        </TabsContent>

        <TabsContent value="exams" className="w-full mt-3">
          <SinavTalepleriTab />
        </TabsContent>

        <TabsContent value="certs" className="w-full mt-3">
          <SertifikaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
