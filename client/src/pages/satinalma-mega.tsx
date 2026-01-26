import { useState } from "react";
import { useLocation } from "wouter";
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
  CreditCard
} from "lucide-react";

import StokYonetimi from "./satinalma/stok-yonetimi";
import TedarikciYonetimi from "./satinalma/tedarikci-yonetimi";
import SiparisYonetimi from "./satinalma/siparis-yonetimi";
import MalKabul from "./satinalma/mal-kabul";
import SatinalmaDashboard from "./satinalma/satinalma-dashboard";
import CariTakip from "./satinalma/cari-takip";
import MaliyetYonetimi from "./fabrika/maliyet-yonetimi";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "stok", label: "Stok Yönetimi", icon: Package },
  { id: "tedarikci", label: "Tedarikçiler", icon: Users },
  { id: "siparis", label: "Siparişler", icon: ShoppingCart },
  { id: "mal-kabul", label: "Mal Kabul", icon: ClipboardCheck },
  { id: "cari-takip", label: "Cari Takip", icon: CreditCard },
  { id: "urun-maliyetleri", label: "Ürün Maliyetleri", icon: Calculator },
];

export default function SatinalmaMega() {
  const [, setLocation] = useLocation();
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
      case "cari-takip":
        return <CariTakip />;
      case "urun-maliyetleri":
        return <MaliyetYonetimi />;
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
