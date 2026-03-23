import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/contexts/theme-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Sun, 
  Moon, 
  Monitor,
  Type,
  Check,
  LayoutDashboard,
  Rocket
} from "lucide-react";

export default function GorunumAyarlari() {
  const { theme, fontSize, setTheme, setFontSize, effectiveTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Açık", icon: Sun, description: "Açık tema" },
    { value: "dark", label: "Koyu", icon: Moon, description: "Koyu tema" },
    { value: "system", label: "Sistem", icon: Monitor, description: "Cihaz ayarına göre" }
  ];

  const fontOptions = [
    { value: "small", label: "Küçük", size: "text-sm" },
    { value: "medium", label: "Orta", size: "text-base" },
    { value: "large", label: "Büyük", size: "text-lg" }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Type className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Görünüm Ayarları</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {effectiveTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Tema Seçimi
          </CardTitle>
          <CardDescription className="text-xs">
            Uygulama temasını seçin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  data-testid={`theme-${option.value}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Font Boyutu
          </CardTitle>
          <CardDescription className="text-xs">
            Metin boyutunu ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {fontOptions.map((option) => {
              const isSelected = fontSize === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFontSize(option.value as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  data-testid={`font-${option.value}`}
                >
                  <span className={`font-medium ${option.size}`}>Aa</span>
                  <span className="text-xs font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Önizleme:</p>
            <p className={fontOptions.find(f => f.value === fontSize)?.size}>
              Bu örnek metin seçilen font boyutunda görüntülenir.
            </p>
          </div>
        </CardContent>
      </Card>

      <DashboardLayoutCard />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Aktif tema:</span>
            <span className="font-medium capitalize">{effectiveTheme === "dark" ? "Koyu" : "Açık"}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Font boyutu:</span>
            <span className="font-medium">{fontOptions.find(f => f.value === fontSize)?.label}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardLayoutCard() {
  const { toast } = useToast();
  const { data: configData } = useQuery<{ defaultLayout: string }>({
    queryKey: ["/api/admin/default-dashboard-layout"],
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: async (layout: string) => {
      const res = await apiRequest("PATCH", "/api/admin/default-dashboard-layout", { layout });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/default-dashboard-layout"] });
      toast({ title: "Varsayılan dashboard güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata oluştu", variant: "destructive" });
    },
  });

  const currentDefault = configData?.defaultLayout || "classic";

  const options = [
    { value: "classic", label: "Klasik", icon: LayoutDashboard, description: "Mevcut kart tabanlı dashboard" },
    { value: "mission-control", label: "Mission Control", icon: Rocket, description: "KPI odaklı yeni dashboard" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard Görünüm
        </CardTitle>
        <CardDescription className="text-xs">
          Tüm kullanıcılar için varsayılan dashboard görünümünü seçin. Her kullanıcı kendi tercihini değiştirebilir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = currentDefault === option.value;
            return (
              <button
                key={option.value}
                onClick={() => mutation.mutate(option.value)}
                disabled={mutation.isPending}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                data-testid={`dashboard-layout-${option.value}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-[10px] text-muted-foreground">{option.description}</span>
                {isSelected && <Check className="h-3 w-3 text-primary" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
