import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  ClipboardCheck, 
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  BarChart3,
  Calculator,
  CreditCard,
  ClipboardList
} from "lucide-react";

import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import StokYonetimi from "./satinalma/stok-yonetimi";
import TedarikciYonetimi from "./satinalma/tedarikci-yonetimi";
import SiparisYonetimi from "./satinalma/siparis-yonetimi";
import MalKabul from "./satinalma/mal-kabul";
import SatinalmaDashboard from "./satinalma/satinalma-dashboard";
import CariTakip from "./satinalma/cari-takip";
import MaliyetYonetimi from "./fabrika/maliyet-yonetimi";
import SayimYonetimi from "./satinalma/sayim-yonetimi";
import FabrikaYonetimSkoru from "./fabrika/fabrika-yonetim-skoru";

const TrendAnalizi = lazy(() => import("./satinalma/trend-analizi"));

interface TabConfig {
  id: string;
  label: string;
  icon: any;
  restrictedToRoles?: string[];
}

const ALL_TABS: TabConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "stok", label: "Stok Yönetimi", icon: Package },
  { id: "tedarikci", label: "Tedarikçiler", icon: Users },
  { id: "siparis", label: "Siparişler", icon: ShoppingCart },
  { id: "mal-kabul", label: "Mal Kabul", icon: ClipboardCheck },
  { id: "sayim", label: "Sayım", icon: ClipboardList, restrictedToRoles: ['admin', 'ceo', 'cgo', 'fabrika_mudur', 'fabrika', 'fabrika_operator', 'fabrika_sorumlu', 'satinalma'] },
  { id: "fabrika-skor", label: "Fabrika Skoru", icon: BarChart3, restrictedToRoles: ['admin', 'ceo', 'cgo', 'fabrika_mudur'] },
  { id: "cari-takip", label: "Cari Takip", icon: CreditCard, restrictedToRoles: ['admin', 'muhasebe', 'muhasebe_ik', 'satinalma', 'ceo'] },
  { id: "urun-maliyetleri", label: "Ürün Maliyetleri", icon: Calculator, restrictedToRoles: ['admin', 'muhasebe', 'muhasebe_ik', 'satinalma', 'ceo'] },
  { id: "trend-analizi", label: "Trend Analizi", icon: TrendingUp },
];

export default function SatinalmaMega() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const tabs = useMemo(() => {
    return ALL_TABS.filter(tab => {
      if (!tab.restrictedToRoles) return true;
      return tab.restrictedToRoles.includes(user?.role || '');
    });
  }, [user?.role]);
  
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <SatinalmaDashboard />;
      case "stok":
        return <StokYonetimi />;
      case "tedarikci":
        return <TedarikciYonetimi />;
      case "siparis":
        return <SiparisYonetimi />;
      case "mal-kabul":
        return <MalKabul />;
      case "sayim":
        return <SayimYonetimi />;
      case "fabrika-skor":
        return <FabrikaYonetimSkoru />;
      case "cari-takip":
        return <CariTakip />;
      case "urun-maliyetleri":
        return <MaliyetYonetimi />;
      case "trend-analizi":
        return (
          <Suspense fallback={<div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>}>
            <TrendAnalizi />
          </Suspense>
        );
      default:
        return <SatinalmaDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Satınalma Yönetimi</h1>
              <p className="text-muted-foreground text-sm">Stok, tedarikçi ve sipariş yönetimi</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
