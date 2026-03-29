import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronRight, 
  LayoutDashboard,
  ClipboardCheck,
  Wrench,
  Users,
  GraduationCap,
  Factory,
  BarChart3,
  Building2,
  Settings,
  CheckSquare,
  Calendar,
  Clock,
  Award,
  FileText,
  Tablet,
  Star,
  Layers,
  ShieldCheck,
  FileBarChart,
  Wallet,
  FileSearch,
  Heart,
  TrendingUp,
  FolderKanban,
  Store,
  Megaphone,
  Shield,
  Database,
  Bell,
  MessageSquare,
  Headphones,
  BookOpen,
  Bot,
  AlertTriangle,
  Coffee,
  Briefcase,
  MapPin,
  Calculator,
  QrCode,
  User,
  Route,
  Trophy,
  FileQuestion,
  Menu,
  Palette,
  Image,
  Cog,
  MessageCircle
} from "lucide-react";
import { MODULES, MEGA_MODULES, getModulesByMegaModule, type MegaModuleId } from "@shared/modules-registry";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, ClipboardCheck, Wrench, Users, GraduationCap, Factory, BarChart3,
  Building2, Settings, CheckSquare, Calendar, Clock, Award, FileText, Tablet, Star,
  Layers, ShieldCheck, FileBarChart, Wallet, FileSearch, Heart, TrendingUp, FolderKanban,
  Store, Megaphone, Shield, Database, Bell, MessageSquare, Headphones, BookOpen, Bot,
  AlertTriangle, Coffee, Briefcase, MapPin, Calculator, QrCode, User, Route, Trophy,
  FileQuestion, Menu, Palette, Image, Cog, MessageCircle
};

interface ModuleHubPageProps {
  megaModuleId: MegaModuleId;
  title?: string;
  description?: string;
  showStats?: boolean;
  customHeader?: React.ReactNode;
}

export function ModuleHubPage({ 
  megaModuleId, 
  title,
  description,
  showStats = false,
  customHeader 
}: ModuleHubPageProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const megaModule = MEGA_MODULES[megaModuleId];
  const modules = getModulesByMegaModule(megaModuleId);
  
  const displayTitle = title || megaModule?.title || "Modül Hub";
  const displayDescription = description || `${displayTitle} modüllerine buradan erişebilirsiniz`;
  
  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Coffee;
  };
  
  const bgColorMap: Record<string, string> = {
    'bg-slate-500': 'bg-muted',
    'bg-green-500': 'bg-green-500',
    'bg-orange-500': 'bg-orange-500',
    'bg-pink-500': 'bg-pink-500',
    'bg-blue-500': 'bg-blue-500',
    'bg-indigo-600': 'bg-indigo-600',
    'bg-cyan-500': 'bg-cyan-500',
    'bg-violet-600': 'bg-violet-600',
    'bg-slate-600': 'bg-muted-foreground',
  };

  if (!megaModule) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Modül bulunamadı
        </div>
      </div>
    );
  }

  const MegaIcon = getIcon(megaModule.icon);
  const bgColor = bgColorMap[megaModule.color] || 'bg-muted';

  return (
    <div className="min-h-screen bg-background">
      {customHeader || (
        <div className={`${bgColor} text-white`}>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-card/20 rounded-xl">
                <MegaIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{displayTitle}</h1>
                <p className="text-white/80 text-sm">{displayDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => {
            const ModuleIcon = getIcon(module.icon);
            
            return (
              <Card 
                key={module.moduleKey}
                className="group cursor-pointer hover-elevate transition-all duration-200"
                onClick={() => module.route && setLocation(module.route)}
                data-testid={`card-module-${module.moduleKey}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg ${bgColor} text-white`}>
                      <ModuleIcon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base mb-1">{module.moduleName}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {module.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12">
            <div className={`mx-auto w-16 h-16 rounded-full ${bgColor} flex items-center justify-center mb-4`}>
              <MegaIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Henüz modül yok
            </h3>
            <p className="text-muted-foreground text-sm">
              Bu bölüme yakında yeni modüller eklenecek
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ModuleHubSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
