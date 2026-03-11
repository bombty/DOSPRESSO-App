import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  ArrowLeft, 
  Save, 
  Server, 
  Send,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

export default function AdminServisMailAyarlari() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "cowork@dospresso.com",
    smtpFromName: "DOSPRESSO Teknik",
    smtpSecure: false,
    isActive: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/admin/service-email-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword || "",
        smtpFromEmail: settings.smtpFromEmail || "cowork@dospresso.com",
        smtpFromName: settings.smtpFromName || "DOSPRESSO Teknik",
        smtpSecure: settings.smtpSecure || false,
        isActive: settings.isActive !== false,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiRequest("POST", "/api/admin/service-email-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-email-settings"] });
      setHasChanges(false);
      toast({ title: "Servis mail ayarları kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/service-email-settings/test", {}),
    onSuccess: () => {
      toast({ title: "Test e-postası gönderildi", description: "Servis adresini kontrol edin" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Test e-postası gönderilemedi", variant: "destructive" });
    },
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const host = formData.smtpHost.trim();
    if (!host || /^\d+$/.test(host)) {
      toast({ title: "Hata", description: "Geçerli bir SMTP sunucu adresi girin (örn: smtp.example.com)", variant: "destructive" });
      return;
    }

    const port = Number(formData.smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast({ title: "Hata", description: "SMTP portu 1-65535 arasında bir tam sayı olmalıdır", variant: "destructive" });
      return;
    }

    if (!formData.smtpFromEmail || !formData.smtpFromEmail.includes("@")) {
      toast({ title: "Hata", description: "Geçerli bir gönderen e-posta adresi girin (@ işareti içermelidir)", variant: "destructive" });
      return;
    }

    saveMutation.mutate(formData);
  };

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 pb-24 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Servis Mail Ayarları
            </h1>
            <p className="text-sm text-muted-foreground">
              Arıza/Bakım servise iletim için SMTP yapılandırması
            </p>
          </div>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-service-settings">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        )}
      </div>

      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-600 dark:text-orange-400">Servis Talep Sistemi</p>
              <p className="text-muted-foreground mt-1">
                Bu ayarlar, HQ'nun servis firmalarına arıza/bakım taleplerini e-posta ile iletmesi için kullanılır.
                Varsayılan gönderen adresi: <span className="font-mono text-xs">cowork@dospresso.com</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            SMTP Sunucu Ayarları
          </CardTitle>
          <CardDescription>
            Servis firmalarına e-posta göndermek için SMTP sunucu bilgilerini girin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Sunucu</Label>
              <Input
                id="smtpHost"
                placeholder="smtp.ionos.de"
                value={formData.smtpHost}
                onChange={(e) => handleChange("smtpHost", e.target.value)}
                data-testid="input-service-smtp-host"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">Port</Label>
              <Input
                id="smtpPort"
                type="number"
                placeholder="587"
                value={formData.smtpPort}
                onChange={(e) => handleChange("smtpPort", parseInt(e.target.value) || 587)}
                data-testid="input-service-smtp-port"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Kullanıcı Adı</Label>
              <Input
                id="smtpUser"
                placeholder="cowork@dospresso.com"
                value={formData.smtpUser}
                onChange={(e) => handleChange("smtpUser", e.target.value)}
                data-testid="input-service-smtp-user"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">Şifre</Label>
              <div className="relative">
                <Input
                  id="smtpPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.smtpPassword}
                  onChange={(e) => handleChange("smtpPassword", e.target.value)}
                  className="pr-10"
                  data-testid="input-service-smtp-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Gönderen Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpFromEmail">Gönderen E-posta</Label>
              <Input
                id="smtpFromEmail"
                placeholder="cowork@dospresso.com"
                value={formData.smtpFromEmail}
                onChange={(e) => handleChange("smtpFromEmail", e.target.value)}
                data-testid="input-service-from-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpFromName">Gönderen Adı</Label>
              <Input
                id="smtpFromName"
                placeholder="DOSPRESSO Teknik"
                value={formData.smtpFromName}
                onChange={(e) => handleChange("smtpFromName", e.target.value)}
                data-testid="input-service-from-name"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>TLS/SSL Kullan</Label>
              <p className="text-xs text-muted-foreground">Güvenli bağlantı için etkinleştirin</p>
            </div>
            <Switch
              checked={formData.smtpSecure}
              onCheckedChange={(checked) => handleChange("smtpSecure", checked)}
              data-testid="switch-service-smtp-secure"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Servis Mail Aktif</Label>
              <p className="text-xs text-muted-foreground">Devre dışı bırakıldığında servis mailleri gönderilmez</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => handleChange("isActive", checked)}
              data-testid="switch-service-email-active"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test</CardTitle>
          <CardDescription>
            Ayarların doğru çalıştığını test etmek için bir test e-postası gönderin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings?.isActive ? (
                <Badge className="bg-green-500/10 text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Pasif
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !formData.smtpHost}
              data-testid="button-test-service-email"
            >
              <Send className="h-4 w-4 mr-2" />
              {testMutation.isPending ? "Gönderiliyor..." : "Test E-postası Gönder"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
