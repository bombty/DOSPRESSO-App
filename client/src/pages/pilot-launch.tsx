import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, Rocket, Shield, Database, Trash2,
  Users, Building2, Package, ClipboardList, ChevronRight,
  CheckCircle2, XCircle, Lock, RefreshCw,
} from "lucide-react";

const CLEAN_CATEGORIES = [
  { key: "notifications", label: "Bildirimler", description: "Tüm kullanıcı bildirimleri silinir", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "audit_logs", label: "Audit Logları", description: "Tüm sistem denetim kayıtları silinir", icon: <Database className="w-4 h-4" /> },
  { key: "performance_scores", label: "Performans Skorları", description: "Çalışan performans puanları sıfırlanır", icon: <ClipboardList className="w-4 h-4" /> },
  { key: "performance_metrics", label: "Performans Metrikleri", description: "Geçmiş performans ölçümleri silinir", icon: <ClipboardList className="w-4 h-4" /> },
  { key: "checklist_history", label: "Checklist Geçmişleri", description: "Tamamlanmış checklist kayıtları silinir", icon: <ClipboardList className="w-4 h-4" /> },
  { key: "crm_scores", label: "CRM / Denetim Skorları", description: "Şube denetim skorları ve denetim madde puanları sıfırlanır", icon: <Database className="w-4 h-4" /> },
  { key: "sla_history", label: "SLA İhlal Geçmişi", description: "Müşteri geri bildirimlerindeki SLA ihlal bayrakları sıfırlanır", icon: <AlertTriangle className="w-4 h-4" /> },
];

const PRESERVED_DATA = [
  { label: "Kullanıcılar & Roller", icon: <Users className="w-4 h-4" /> },
  { label: "Şube Bilgileri & Atamaları", icon: <Building2 className="w-4 h-4" /> },
  { label: "Fabrika Ürünleri & Reçeteleri", icon: <Package className="w-4 h-4" /> },
  { label: "Modül Konfigürasyonları", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Menü Tanımları", icon: <ClipboardList className="w-4 h-4" /> },
];

export default function PilotLaunchPage() {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [resetPasswords, setResetPasswords] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    if (selectedCategories.length === CLEAN_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(CLEAN_CATEGORIES.map(c => c.key));
    }
  };

  const [backfillResult, setBackfillResult] = useState<{ total: number; created: number; skipped: number; failed: number } | null>(null);

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/pdks/backfill-attendance", {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Backfill başarısız");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setBackfillResult(data);
      toast({
        title: "Backfill Tamamlandı",
        description: `${data.created} yeni kayıt oluşturuldu, ${data.skipped} mevcut, ${data.failed} başarısız.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Backfill Hatası", description: err.message, variant: "destructive" });
    },
  });

  const pilotMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/pilot-launch", {
        categories: selectedCategories,
        resetPasswords,
        defaultPassword: resetPasswords ? defaultPassword : undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Pilot başlatma başarısız");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pilot Başlatma Tamamlandı",
        description: `${Object.keys(data.results).length} kategori temizlendi. ${data.passwordResetCount > 0 ? `${data.passwordResetCount} kullanıcı şifresi sıfırlandı.` : ''}`,
      });
      setConfirmStep(0);
      setConfirmText("");
      setSelectedCategories([]);
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const canProceed = selectedCategories.length > 0 || (resetPasswords && defaultPassword.length >= 6);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Rocket className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pilot-launch-title">Pilot Başlat</h1>
          <p className="text-sm text-muted-foreground">Sistemi pilot kullanıma hazırlayın</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <CardTitle className="text-lg">Sıfırlanacak Veriler</CardTitle>
          </div>
          <CardDescription>Pilot başlatma sırasında temizlenecek veri kategorilerini seçin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all-categories">
              {selectedCategories.length === CLEAN_CATEGORIES.length ? "Tümünü Kaldır" : "Tümünü Seç"}
            </Button>
            <Badge variant="secondary">{selectedCategories.length} / {CLEAN_CATEGORIES.length} seçili</Badge>
          </div>
          {CLEAN_CATEGORIES.map(cat => (
            <label
              key={cat.key}
              className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover-elevate"
              data-testid={`checkbox-category-${cat.key}`}
            >
              <Checkbox
                checked={selectedCategories.includes(cat.key)}
                onCheckedChange={() => toggleCategory(cat.key)}
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {cat.icon}
                <div>
                  <span className="font-medium text-sm">{cat.label}</span>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-lg">Korunan Veriler</CardTitle>
          </div>
          <CardDescription>Bu veriler pilot başlatma sırasında kesinlikle değiştirilmez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESERVED_DATA.map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/30 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <CardTitle className="text-lg">Şifre Sıfırlama</CardTitle>
          </div>
          <CardDescription>Tüm kullanıcı şifrelerini varsayılan şifreye sıfırlayın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={resetPasswords}
              onCheckedChange={(v) => setResetPasswords(!!v)}
              data-testid="checkbox-reset-passwords"
            />
            <span className="text-sm font-medium">Tüm kullanıcı şifrelerini sıfırla</span>
          </label>
          {resetPasswords && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="default-password" className="text-sm">Varsayılan Şifre (en az 6 karakter)</Label>
              <Input
                id="default-password"
                type="password"
                value={defaultPassword}
                onChange={e => setDefaultPassword(e.target.value)}
                placeholder="Varsayılan şifre"
                data-testid="input-default-password"
              />
              <p className="text-xs text-muted-foreground">
                Tüm aktif kullanıcıların şifresi bu şifreyle değiştirilir ve ilk girişte yeni şifre belirlemeleri istenir.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg">PDKS Devam Kaydı Backfill</CardTitle>
          </div>
          <CardDescription>
            Kiosk girişi yapılmış ama shift_attendance kaydı oluşturulmamış session'ları tamamlar.
            Tarihi kayıtlar için tek seferlik çalıştırın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {backfillResult && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/30 text-center">
                <div className="font-bold text-green-700 dark:text-green-300">{backfillResult.created}</div>
                <div className="text-xs text-muted-foreground">Oluşturuldu</div>
              </div>
              <div className="p-2 rounded-md bg-secondary/50 text-center">
                <div className="font-bold">{backfillResult.skipped}</div>
                <div className="text-xs text-muted-foreground">Mevcut</div>
              </div>
              <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/30 text-center">
                <div className="font-bold text-red-700 dark:text-red-300">{backfillResult.failed}</div>
                <div className="text-xs text-muted-foreground">Başarısız</div>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            data-testid="button-pdks-backfill"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${backfillMutation.isPending ? 'animate-spin' : ''}`} />
            {backfillMutation.isPending ? "Çalışıyor..." : "Backfill Başlat"}
          </Button>
        </CardContent>
      </Card>

      {confirmStep === 0 && (
        <Button
          className="w-full"
          size="lg"
          disabled={!canProceed}
          onClick={() => setConfirmStep(1)}
          data-testid="button-pilot-launch-step1"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Pilot Başlat
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}

      {confirmStep === 1 && (
        <Card className="border-destructive">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">Bu İşlem Geri Alınamaz!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seçilen {selectedCategories.length} kategori temizlenecek
                  {resetPasswords && ", tüm kullanıcı şifreleri sıfırlanacak"}.
                  Devam etmek için aşağıya <strong>"PILOT BAŞLAT"</strong> yazın.
                </p>
              </div>
            </div>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder='Onaylamak için "PILOT BAŞLAT" yazın'
              data-testid="input-confirm-pilot"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setConfirmStep(0); setConfirmText(""); }}
                data-testid="button-cancel-pilot"
              >
                <XCircle className="w-4 h-4 mr-2" />
                İptal
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={confirmText !== "PILOT BAŞLAT" || pilotMutation.isPending}
                onClick={() => pilotMutation.mutate()}
                data-testid="button-confirm-pilot"
              >
                {pilotMutation.isPending ? "İşleniyor..." : "Onayla ve Başlat"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pilotMutation.isSuccess && (
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Pilot başlatma başarıyla tamamlandı!</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
