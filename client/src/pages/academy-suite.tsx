import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  GraduationCap, BookOpen, Settings, BarChart3, Award, Trophy, 
  FileCheck, Route, Bot, Users, Eye, ArrowLeft, Lock
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { isHQRole } from "@shared/schema";

import Academy from "./academy";
import AcademyHQ from "./academy-hq";
import AcademyAnalytics from "./academy-analytics";
import AcademyBadges from "./academy-badges";
import AcademyCertificates from "./academy-certificates";
import AcademyLeaderboard from "./academy-leaderboard";
import AcademyQuiz from "./academy-quiz";
import AcademyLearningPaths from "./academy-learning-paths";
import AcademyAIAssistant from "./academy-ai-assistant";
import AcademySupervisor from "./academy-supervisor";
import AcademyTeamCompetitions from "./academy-team-competitions";

type AcademySection = {
  key: string;
  label: string;
  icon: any;
  permissionKey: string;
  component: React.ComponentType<any>;
  requiresHQ?: boolean;
};

const ACADEMY_SECTIONS: AcademySection[] = [
  { key: "general", label: "Eğitimler", icon: BookOpen, permissionKey: "academy.general", component: Academy },
  { key: "hq", label: "HQ Yönetim", icon: Settings, permissionKey: "academy.hq", component: AcademyHQ, requiresHQ: true },
  { key: "analytics", label: "Analitik", icon: BarChart3, permissionKey: "academy.analytics", component: AcademyAnalytics },
  { key: "badges", label: "Rozetler", icon: Award, permissionKey: "academy.badges", component: AcademyBadges },
  { key: "certificates", label: "Sertifikalar", icon: FileCheck, permissionKey: "academy.certificates", component: AcademyCertificates },
  { key: "leaderboard", label: "Sıralama", icon: Trophy, permissionKey: "academy.leaderboard", component: AcademyLeaderboard },
  { key: "quizzes", label: "Quizler", icon: GraduationCap, permissionKey: "academy.quizzes", component: AcademyQuiz },
  { key: "learning_paths", label: "Yollar", icon: Route, permissionKey: "academy.learning_paths", component: AcademyLearningPaths },
  { key: "ai", label: "AI Asistan", icon: Bot, permissionKey: "academy.ai", component: AcademyAIAssistant },
  { key: "social", label: "Takımlar", icon: Users, permissionKey: "academy.social", component: AcademyTeamCompetitions },
  { key: "supervisor", label: "Supervisor", icon: Eye, permissionKey: "academy.supervisor", component: AcademySupervisor },
];

export default function AcademySuite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("general");
  
  const { data: userPermissions = [] } = useQuery<any[]>({
    queryKey: ["/api/user/permissions"],
    queryFn: async () => {
      const res = await fetch("/api/user/permissions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const permissionMap = new Map<string, { canView: boolean; canEdit: boolean }>();
  userPermissions.forEach((p: any) => {
    permissionMap.set(p.module, { canView: p.canView || false, canEdit: p.canEdit || false });
  });

  const hasPermission = (permKey: string): boolean => {
    if (user?.role === "admin") return true;
    const perm = permissionMap.get(permKey);
    return perm?.canView || false;
  };

  const canEditPermission = (permKey: string): boolean => {
    if (user?.role === "admin") return true;
    const perm = permissionMap.get(permKey);
    return perm?.canEdit || false;
  };

  const visibleSections = ACADEMY_SECTIONS.filter(section => {
    if (section.requiresHQ && user && !isHQRole(user.role as any) && user.role !== "admin") {
      return false;
    }
    return hasPermission(section.permissionKey);
  });

  useEffect(() => {
    if (visibleSections.length > 0 && !visibleSections.find(s => s.key === activeSection)) {
      setActiveSection(visibleSections[0].key);
    }
  }, [visibleSections, activeSection]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Giriş Gerekli</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (visibleSections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Erişim Yetkiniz Yok</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Akademi modüllerine erişim izniniz bulunmuyor. Lütfen yöneticinizle iletişime geçin.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ana Sayfaya Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ActiveComponent = visibleSections.find(s => s.key === activeSection)?.component || Academy;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-3 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">DOSPRESSO Akademi</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {visibleSections.length} Bölüm
          </Badge>
        </div>
        
        <ScrollArea className="w-full">
          <div className="flex px-3 pb-2 gap-1">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.key;
              return (
                <Button
                  key={section.key}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSection(section.key)}
                  className="flex items-center gap-1.5 whitespace-nowrap"
                  data-testid={`tab-academy-${section.key}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
