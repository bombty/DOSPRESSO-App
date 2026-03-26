import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Users, FileSpreadsheet, CheckCircle2,
  AlertCircle, ChevronRight, ChevronLeft, Upload, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BranchSetupData {
  branch: { id: number; name: string; setupComplete: boolean; isActive: boolean };
  staffCount: number;
  hasManager: boolean;
  totalUsers: number;
  gaps: any[];
  completionPercentage: number;
}

export function BranchOnboardingWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const onboardingQuery = useQuery<{ needsOnboarding: boolean; branchId: number; branchName: string }>({
    queryKey: ["/api/admin/onboarding-status"],
    enabled: !!user,
  });

  const branchId = onboardingQuery.data?.branchId;

  const setupQuery = useQuery<BranchSetupData>({
    queryKey: ["/api/admin/branch-setup-status", branchId],
    enabled: !!branchId && onboardingQuery.data?.needsOnboarding === true,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/branch-setup-complete/${branchId}`);
      if (!res.ok) throw new Error("İşlem başarısız");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kurulum Tamamlandı", description: "Şube kurulumu başarıyla tamamlandı olarak işaretlendi." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-status"] });
    },
  });
  if (!onboardingQuery.data?.needsOnboarding) return null;
  if (!setupQuery.data) return null;

  const data = setupQuery.data;
  const steps = [
    { title: "Personel Yükleme", icon: <Users className="w-5 h-5" /> },
    { title: "Eksik Veriler", icon: <AlertCircle className="w-5 h-5" /> },
    { title: "Kurulumu Tamamla", icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" data-testid="branch-onboarding-wizard">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-wizard-title">
                Şube Kurulum Sihirbazı
              </h2>
              <p className="text-sm text-muted-foreground">
                {data.branch.name} şubesi kuruluma hazır
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                  i === step ? "bg-primary/10 text-primary" : i < step ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                }`}>
                  {s.icon}
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
                {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4" data-testid="wizard-step-personnel">
              <h3 className="font-semibold">Personel Listesini Yükleyin</h3>
              <p className="text-sm text-muted-foreground">
                {data.branch.name} şubesindeki tüm personeli Excel dosyası ile sisteme ekleyin.
                Mevcut personel: <strong>{data.staffCount} kişi</strong>
              </p>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Excel Şablonunda Olması Gereken Alanlar:</h4>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Ad, Soyad</span>
                    <span>TC Kimlik No</span>
                    <span>Net Maaş</span>
                    <span>Yıllık İzin Hakkı</span>
                    <span>Kalan İzin</span>
                    <span>Yazılı Uyarılar</span>
                    <span>Tutanaklar</span>
                    <span>İşe Giriş Tarihi</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href="/ik" data-testid="link-hr-import">
                    <Upload className="w-4 h-4 mr-2" />
                    İK Sayfasından Excel Yükle
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>

              {data.staffCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{data.staffCount} personel zaten kayıtlı</span>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4" data-testid="wizard-step-gaps">
              <h3 className="font-semibold">Eksik Verilerin Özeti</h3>
              <div className="flex items-center gap-2 mb-2">
                <Progress value={data.completionPercentage} className="flex-1" />
                <span className="text-sm font-medium">{data.completionPercentage}%</span>
              </div>

              {data.gaps.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-3 rounded-md bg-green-50 dark:bg-green-950/30">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Tüm temel veriler tamamlanmış!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.gaps.map((gap: any) => (
                    <div key={gap.id} className="flex items-start gap-3 p-3 rounded-md border">
                      <Badge variant={gap.severity === "critical" ? "destructive" : "secondary"} className="shrink-0 mt-0.5">
                        {gap.severity === "critical" ? "Kritik" : gap.severity === "high" ? "Yüksek" : "Orta"}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{gap.title}</p>
                        <p className="text-xs text-muted-foreground">{gap.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={gap.deepLink}>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="wizard-step-complete">
              <h3 className="font-semibold">Kurulumu Tamamla</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {data.hasManager ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span>Şube Yöneticisi: {data.hasManager ? "Atanmış" : "Atanmamış"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {data.staffCount >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span>Personel Sayısı: {data.staffCount} kişi {data.staffCount < 2 ? "(en az 2 gerekli)" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {data.gaps.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <span>Eksik Veri: {data.gaps.length} eksik {data.gaps.length > 0 ? "(kurulumu tamamladıktan sonra da giderilebilir)" : ""}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                data-testid="button-complete-setup"
              >
                {completeMutation.isPending ? "Tamamlanıyor..." : "Kurulumu Tamamla"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Eksik veriler daha sonra da tamamlanabilir. Bu sihirbaz bir daha gösterilmeyecek.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            data-testid="button-wizard-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Geri
          </Button>
          <span className="text-xs text-muted-foreground">Adım {step + 1} / {steps.length}</span>
          {step < steps.length - 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step + 1)}
              data-testid="button-wizard-next"
            >
              İleri
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
