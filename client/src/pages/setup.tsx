import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Database, 
  Mail, 
  Shield, 
  Globe, 
  Settings,
  Server,
  ArrowRight,
  AlertTriangle
} from "lucide-react";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

export default function Setup() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    domain: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "",
    companyName: "DOSPRESSO",
  });

  const steps: SetupStep[] = [
    { id: "welcome", title: "Hoş Geldiniz", description: "Kurulum sihirbazına başlayın", icon: Settings, completed: currentStep > 0 },
    { id: "domain", title: "Domain Ayarları", description: "Web adresinizi yapılandırın", icon: Globe, completed: currentStep > 1 },
    { id: "admin", title: "Yönetici Hesabı", description: "Admin hesabı oluşturun", icon: Shield, completed: currentStep > 2 },
    { id: "smtp", title: "E-posta Ayarları", description: "SMTP sunucusu yapılandırın", icon: Mail, completed: currentStep > 3 },
    { id: "database", title: "Veritabanı", description: "Bağlantıyı test edin", icon: Database, completed: currentStep > 4 },
    { id: "complete", title: "Tamamlandı", description: "Kurulum hazır", icon: CheckCircle2, completed: currentStep > 5 },
  ];

  const progress = (currentStep / (steps.length - 1)) * 100;

  const testDbMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", "/api/system-health-check");
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Veritabanı bağlantısı aktif" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Veritabanı bağlantısı kurulamadı", variant: "destructive" });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/test-smtp", {
        host: config.smtpHost,
        port: parseInt(config.smtpPort),
        user: config.smtpUser,
        password: config.smtpPassword,
        to: config.adminEmail,
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Test e-postası gönderildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "SMTP bağlantısı kurulamadı", variant: "destructive" });
    },
  });

  const completeSetupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/complete-setup", config);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Kurulum tamamlandı!" });
      window.location.href = "/login";
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kurulum tamamlanamadı", variant: "destructive" });
    },
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <Server className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">DOSPRESSO Kurulum Sihirbazı</h2>
              <p className="text-muted-foreground mt-2">
                Franchise yönetim sisteminizi birkaç adımda yapılandırın.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <h3 className="font-semibold mb-2">Bu kurulum sırasında:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Domain ve SSL ayarlarını yapılandıracaksınız
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Yönetici hesabı oluşturacaksınız
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  E-posta ayarlarını yapılandıracaksınız
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Veritabanı bağlantısını test edeceksiniz
                </li>
              </ul>
            </div>
            <Button onClick={handleNext} className="w-full" data-testid="button-start-setup">
              Kuruluma Başla
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Domain Ayarları</h2>
              <p className="text-muted-foreground">Web adresinizi ve firma bilgilerinizi girin</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="domain">Domain Adı</Label>
                <Input
                  id="domain"
                  placeholder="ornek.dospresso.com"
                  value={config.domain}
                  onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                  data-testid="input-domain"
                />
                <p className="text-xs text-muted-foreground mt-1">SSL sertifikası otomatik olarak oluşturulacak</p>
              </div>
              <div>
                <Label htmlFor="companyName">Firma Adı</Label>
                <Input
                  id="companyName"
                  placeholder="DOSPRESSO"
                  value={config.companyName}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  data-testid="input-company-name"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Yönetici Hesabı</h2>
              <p className="text-muted-foreground">Sistem yöneticisi hesabı oluşturun</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="adminEmail">E-posta Adresi</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@ornek.com"
                  value={config.adminEmail}
                  onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <Label htmlFor="adminPassword">Şifre</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="En az 8 karakter"
                  value={config.adminPassword}
                  onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })}
                  data-testid="input-admin-password"
                />
              </div>
              <div>
                <Label htmlFor="adminPasswordConfirm">Şifre Tekrar</Label>
                <Input
                  id="adminPasswordConfirm"
                  type="password"
                  placeholder="Şifreyi tekrar girin"
                  value={config.adminPasswordConfirm}
                  onChange={(e) => setConfig({ ...config, adminPasswordConfirm: e.target.value })}
                  data-testid="input-admin-password-confirm"
                />
                {config.adminPassword && config.adminPasswordConfirm && 
                  config.adminPassword !== config.adminPasswordConfirm && (
                  <p className="text-xs text-destructive mt-1">Şifreler eşleşmiyor</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">E-posta Ayarları</h2>
              <p className="text-muted-foreground">Bildirimler için SMTP sunucusu yapılandırın</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Sunucu</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.ionos.de"
                    value={config.smtpHost}
                    onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                    data-testid="input-smtp-host"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input
                    id="smtpPort"
                    placeholder="587"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({ ...config, smtpPort: e.target.value })}
                    data-testid="input-smtp-port"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="smtpUser">Kullanıcı Adı</Label>
                <Input
                  id="smtpUser"
                  placeholder="mail@ornek.com"
                  value={config.smtpUser}
                  onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                  data-testid="input-smtp-user"
                />
              </div>
              <div>
                <Label htmlFor="smtpPassword">Şifre</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  placeholder="SMTP şifresi"
                  value={config.smtpPassword}
                  onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                  data-testid="input-smtp-password"
                />
              </div>
              <div>
                <Label htmlFor="smtpFromEmail">Gönderen E-posta</Label>
                <Input
                  id="smtpFromEmail"
                  placeholder="noreply@ornek.com"
                  value={config.smtpFromEmail}
                  onChange={(e) => setConfig({ ...config, smtpFromEmail: e.target.value })}
                  data-testid="input-smtp-from"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => testSmtpMutation.mutate()}
                disabled={testSmtpMutation.isPending}
                data-testid="button-test-smtp"
              >
                {testSmtpMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Mail className="h-4 w-4 mr-2" />
                Test E-postası Gönder
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Veritabanı Kontrolü</h2>
              <p className="text-muted-foreground">PostgreSQL bağlantısını test edin</p>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">PostgreSQL Veritabanı</p>
                      <p className="text-sm text-muted-foreground">Bağlantı durumunu kontrol edin</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => testDbMutation.mutate()}
                    disabled={testDbMutation.isPending}
                    data-testid="button-test-db"
                  >
                    {testDbMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Bağlantıyı Test Et
                  </Button>
                </div>
              </CardContent>
            </Card>
            {testDbMutation.isSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Veritabanı bağlantısı başarılı!</span>
              </div>
            )}
            {testDbMutation.isError && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Bağlantı hatası. Lütfen ayarları kontrol edin.</span>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Kurulum Tamamlandı!</h2>
              <p className="text-muted-foreground mt-2">
                DOSPRESSO sisteminiz kullanıma hazır.
              </p>
            </div>
            <Card className="bg-muted/50 text-left">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Yapılandırma Özeti:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domain:</span>
                    <span className="font-medium">{config.domain || "Ayarlanmadı"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yönetici:</span>
                    <span className="font-medium">{config.adminEmail || "Ayarlanmadı"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMTP:</span>
                    <span className="font-medium">{config.smtpHost || "Ayarlanmadı"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button 
              onClick={() => completeSetupMutation.mutate()} 
              className="w-full"
              disabled={completeSetupMutation.isPending}
              data-testid="button-complete-setup"
            >
              {completeSetupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kurulumu Tamamla ve Giriş Yap
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">DOSPRESSO</h1>
            <Badge variant="outline">Kurulum Sihirbazı</Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {steps.map((step, idx) => (
              <div 
                key={step.id} 
                className={`flex items-center gap-1 ${idx <= currentStep ? 'text-primary' : ''}`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : idx === currentStep ? (
                  <Circle className="h-3 w-3 fill-primary" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {renderStepContent()}
            
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <div className="flex justify-between mt-8 pt-4 border-t">
                <Button variant="outline" onClick={handleBack} data-testid="button-back">
                  Geri
                </Button>
                <Button onClick={handleNext} data-testid="button-next">
                  İleri
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
