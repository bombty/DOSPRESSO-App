import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Mail, Upload, Image, Bell } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

type SiteSetting = {
  id: number;
  key: string;
  value: string | null;
  type: string;
  category: string;
  description: string | null;
  isPublic: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export default function Settings() {
  const { toast } = useToast();

  // Fetch all settings
  const { data: settings, isLoading, isError, refetch } = useQuery<SiteSetting[]>({
    queryKey: ["/api/admin/settings"],
  });

  // Group settings by category
  const settingsByCategory = (settings || []).reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = {};
    }
    acc[setting.category][setting.key] = setting.value || "";
    return acc;
  }, {} as Record<string, Record<string, string>>);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    site_title: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: "",
    working_hours: "",
  });

  // SMTP settings state
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "",
  });

  // Theme settings state
  const [themeSettings, setThemeSettings] = useState({
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    font_family: "",
    border_radius: "",
  });

  // Branding settings state
  const [brandingSettings, setBrandingSettings] = useState({
    logo_url: "",
    favicon_url: "",
    banner_url: "",
    banner_carousel_enabled: "true",
  });

  // Content settings state
  const [contentSettings, setContentSettings] = useState({
    about_us_content: "",
    privacy_policy_content: "",
    terms_of_service_content: "",
  });

  // Populate form states when settings load
  useEffect(() => {
    if (settings && settings.length > 0) {
      const general = settingsByCategory["general"] || {};
      setGeneralSettings({
        site_title: general["site_title"] || "",
        contact_email: general["contact_email"] || "",
        contact_phone: general["contact_phone"] || "",
        address: general["address"] || "",
        instagram_url: general["instagram_url"] || "",
        facebook_url: general["facebook_url"] || "",
        twitter_url: general["twitter_url"] || "",
        working_hours: general["working_hours"] || "",
      });

      const smtp = settingsByCategory["smtp"] || {};
      setSmtpSettings({
        smtp_host: smtp["smtp_host"] || "",
        smtp_port: smtp["smtp_port"] || "",
        smtp_user: smtp["smtp_user"] || "",
        smtp_password: smtp["smtp_password"] || "",
        smtp_from_email: smtp["smtp_from_email"] || "",
        smtp_from_name: smtp["smtp_from_name"] || "",
      });

      const theme = settingsByCategory["theme"] || {};
      setThemeSettings({
        primary_color: theme["primary_color"] || "",
        secondary_color: theme["secondary_color"] || "",
        accent_color: theme["accent_color"] || "",
        font_family: theme["font_family"] || "",
        border_radius: theme["border_radius"] || "",
      });

      const branding = settingsByCategory["branding"] || {};
      setBrandingSettings({
        logo_url: branding["logo_url"] || "",
        favicon_url: branding["favicon_url"] || "",
        banner_url: branding["banner_url"] || "",
        banner_carousel_enabled: branding["banner_carousel_enabled"] || "true",
      });

      const content = settingsByCategory["content"] || {};
      setContentSettings({
        about_us_content: content["about_us_content"] || "",
        privacy_policy_content: content["privacy_policy_content"] || "",
        terms_of_service_content: content["terms_of_service_content"] || "",
      });
    }
  }, [settings]);

  // Generic mutation for updating settings
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("PATCH", `/api/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Başarılı", description: "Ayarlar kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    },
  });

  // Save general settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [key, value] of Object.entries(generalSettings)) {
      await updateSettingMutation.mutateAsync({ key, value });
    }
  };

  // Save SMTP settings
  const handleSaveSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [key, value] of Object.entries(smtpSettings)) {
      await updateSettingMutation.mutateAsync({ key, value });
    }
  };

  // Save theme settings
  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [key, value] of Object.entries(themeSettings)) {
      await updateSettingMutation.mutateAsync({ key, value });
    }
  };

  // Save branding settings
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [key, value] of Object.entries(brandingSettings)) {
      await updateSettingMutation.mutateAsync({ key, value });
    }
  };

  // Save content settings
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [key, value] of Object.entries(contentSettings)) {
      await updateSettingMutation.mutateAsync({ key, value });
    }
  };

  if (isLoading) {
    

  return (
      <div className="container py-6 flex items-center justify-center" data-testid="text-loading">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6" data-testid="text-page-title">
        Ayarlar
      </h1>

      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="w-full" data-testid="tabs-settings">
          <TabsTrigger value="genel" data-testid="tab-trigger-genel">Genel</TabsTrigger>
          <TabsTrigger value="mail" data-testid="tab-trigger-mail">Mail Ayarları</TabsTrigger>
          <TabsTrigger value="tema" data-testid="tab-trigger-tema">Tema</TabsTrigger>
          <TabsTrigger value="gorsel" data-testid="tab-trigger-gorsel">Görsel</TabsTrigger>
          <TabsTrigger value="icerik" data-testid="tab-trigger-icerik">İçerik</TabsTrigger>
          <TabsTrigger value="bildirim" data-testid="tab-trigger-bildirim">
            <Bell className="w-3.5 h-3.5 mr-1" />
            Bildirim
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 - Genel */}
        <TabsContent value="genel">
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveGeneral} className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="site_title">Site Başlığı</Label>
                  <Input
                    id="site_title"
                    value={generalSettings.site_title}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, site_title: e.target.value })}
                    placeholder="DOSPRESSO"
                    data-testid="input-site-title"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="contact_email">İletişim Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={generalSettings.contact_email}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, contact_email: e.target.value })}
                    placeholder="info@dospresso.com"
                    data-testid="input-contact-email"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="contact_phone">İletişim Telefon</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={generalSettings.contact_phone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, contact_phone: e.target.value })}
                    placeholder="+90 555 123 4567"
                    data-testid="input-contact-phone"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                    placeholder="Şirket adresi"
                    rows={3}
                    data-testid="textarea-address"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="instagram_url">Instagram URL</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={generalSettings.instagram_url}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/dospresso"
                    data-testid="input-instagram-url"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="facebook_url">Facebook URL</Label>
                  <Input
                    id="facebook_url"
                    type="url"
                    value={generalSettings.facebook_url}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/dospresso"
                    data-testid="input-facebook-url"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="twitter_url">Twitter URL</Label>
                  <Input
                    id="twitter_url"
                    type="url"
                    value={generalSettings.twitter_url}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/dospresso"
                    data-testid="input-twitter-url"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="working_hours">Çalışma Saatleri</Label>
                  <Input
                    id="working_hours"
                    value={generalSettings.working_hours}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, working_hours: e.target.value })}
                    placeholder="Pzt-Cum: 09:00 - 18:00"
                    data-testid="input-working-hours"
                  />
                </div>

                <Button type="submit" disabled={updateSettingMutation.isPending} data-testid="button-save-general">
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 - Mail Ayarları */}
        <TabsContent value="mail">
          <Card>
            <CardHeader>
              <CardTitle>Mail Ayarları (SMTP)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSMTP} className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={smtpSettings.smtp_host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    data-testid="input-smtp-host"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={smtpSettings.smtp_port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                    placeholder="587"
                    data-testid="input-smtp-port"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="smtp_user">SMTP Kullanıcı</Label>
                  <Input
                    id="smtp_user"
                    value={smtpSettings.smtp_user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                    placeholder="user@gmail.com"
                    data-testid="input-smtp-user"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="smtp_password">SMTP Şifre</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={smtpSettings.smtp_password}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_password: e.target.value })}
                    placeholder="••••••••"
                    data-testid="input-smtp-password"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="smtp_from_email">Gönderen Email</Label>
                  <Input
                    id="smtp_from_email"
                    type="email"
                    value={smtpSettings.smtp_from_email}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from_email: e.target.value })}
                    placeholder="noreply@dospresso.com"
                    data-testid="input-smtp-from-email"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="smtp_from_name">Gönderen İsim</Label>
                  <Input
                    id="smtp_from_name"
                    value={smtpSettings.smtp_from_name}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from_name: e.target.value })}
                    placeholder="DOSPRESSO"
                    data-testid="input-smtp-from-name"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateSettingMutation.isPending} data-testid="button-save-smtp">
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                  <Button type="button" variant="outline" data-testid="button-test-email">
                    <Mail className="w-4 h-4 mr-2" />
                    Test Email Gönder
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3 - Tema */}
        <TabsContent value="tema">
          <Card>
            <CardHeader>
              <CardTitle>Tema Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTheme} className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="primary_color">Ana Renk (Primary Color)</Label>
                  <Input
                    id="primary_color"
                    type="text"
                    value={themeSettings.primary_color}
                    onChange={(e) => setThemeSettings({ ...themeSettings, primary_color: e.target.value })}
                    placeholder="#1a202c"
                    data-testid="input-primary-color"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="secondary_color">İkincil Renk (Secondary Color)</Label>
                  <Input
                    id="secondary_color"
                    type="text"
                    value={themeSettings.secondary_color}
                    onChange={(e) => setThemeSettings({ ...themeSettings, secondary_color: e.target.value })}
                    placeholder="#f5f5dc"
                    data-testid="input-secondary-color"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="accent_color">Vurgu Renk (Accent Color)</Label>
                  <Input
                    id="accent_color"
                    type="text"
                    value={themeSettings.accent_color}
                    onChange={(e) => setThemeSettings({ ...themeSettings, accent_color: e.target.value })}
                    placeholder="#ef4444"
                    data-testid="input-accent-color"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="font_family">Font Ailesi</Label>
                  <Select
                    value={themeSettings.font_family}
                    onValueChange={(value) => setThemeSettings({ ...themeSettings, font_family: value })}
                  >
                    <SelectTrigger id="font_family" data-testid="select-font-family">
                      <SelectValue placeholder="Font seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label>Kenar Yuvarlama (Border Radius)</Label>
                  <RadioGroup
                    value={themeSettings.border_radius}
                    onValueChange={(value) => setThemeSettings({ ...themeSettings, border_radius: value })}
                    data-testid="radio-border-radius"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sm" id="radius-sm" data-testid="radio-radius-sm" />
                      <Label htmlFor="radius-sm">Küçük (sm)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="md" id="radius-md" data-testid="radio-radius-md" />
                      <Label htmlFor="radius-md">Orta (md)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lg" id="radius-lg" data-testid="radio-radius-lg" />
                      <Label htmlFor="radius-lg">Büyük (lg)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <p className="text-sm text-muted-foreground">
                  Not: Değişiklikler sayfa yenilendikten sonra uygulanacaktır
                </p>

                <Button type="submit" disabled={updateSettingMutation.isPending} data-testid="button-save-theme">
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4 - Görsel */}
        <TabsContent value="gorsel">
          <Card>
            <CardHeader>
              <CardTitle>Görsel / Marka Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBranding} className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="logo_url">Logo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo_url"
                      type="url"
                      value={brandingSettings.logo_url}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, logo_url: e.target.value })}
                      placeholder="URL girin veya dosya yükleyin"
                      data-testid="input-logo-url"
                      className="flex-1"
                    />
                    <ObjectUploader
                      testId="logo"
                      onGetUploadParameters={async () => {
                        const res = await fetch("/api/objects/upload", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ folder: "public/branding", filename: `logo-${Date.now()}.jpg` }),
                        });
                        if (!res.ok) throw new Error("Upload URL alınamadı");
                        const data = await res.json();
                        return { method: "PUT" as const, url: data.url };
                      }}
                      onComplete={(result) => {
                        if (result.successful?.[0]?.uploadURL) {
                          setBrandingSettings({ ...brandingSettings, logo_url: result.successful[0].uploadURL });
                        }
                      }}
                      maxWidthOrHeight={400}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Yükle
                    </ObjectUploader>
                  </div>
                  {brandingSettings.logo_url && (
                    <img
                      src={brandingSettings.logo_url}
                      alt="Logo Preview"
                      className="max-w-xs h-auto border rounded-md mt-2"
                      data-testid="img-logo-preview"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="favicon_url">Favicon</Label>
                  <div className="flex gap-2">
                    <Input
                      id="favicon_url"
                      type="url"
                      value={brandingSettings.favicon_url}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, favicon_url: e.target.value })}
                      placeholder="URL girin veya dosya yükleyin"
                      data-testid="input-favicon-url"
                      className="flex-1"
                    />
                    <ObjectUploader
                      testId="favicon"
                      onGetUploadParameters={async () => {
                        const res = await fetch("/api/objects/upload", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ folder: "public/branding", filename: `favicon-${Date.now()}.jpg` }),
                        });
                        if (!res.ok) throw new Error("Upload URL alınamadı");
                        const data = await res.json();
                        return { method: "PUT" as const, url: data.url };
                      }}
                      onComplete={(result) => {
                        if (result.successful?.[0]?.uploadURL) {
                          setBrandingSettings({ ...brandingSettings, favicon_url: result.successful[0].uploadURL });
                        }
                      }}
                      maxWidthOrHeight={64}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Yükle
                    </ObjectUploader>
                  </div>
                  {brandingSettings.favicon_url && (
                    <img
                      src={brandingSettings.favicon_url}
                      alt="Favicon Preview"
                      className="w-8 h-8 border rounded mt-2"
                      data-testid="img-favicon-preview"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="banner_url">Ana Sayfa Banner</Label>
                  <div className="flex gap-2">
                    <Input
                      id="banner_url"
                      type="url"
                      value={brandingSettings.banner_url}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, banner_url: e.target.value })}
                      placeholder="URL girin veya dosya yükleyin"
                      data-testid="input-banner-url"
                      className="flex-1"
                    />
                    <ObjectUploader
                      testId="banner"
                      onGetUploadParameters={async () => {
                        const res = await fetch("/api/objects/upload", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ folder: "public/branding", filename: `banner-${Date.now()}.jpg` }),
                        });
                        if (!res.ok) throw new Error("Upload URL alınamadı");
                        const data = await res.json();
                        return { method: "PUT" as const, url: data.url };
                      }}
                      onComplete={(result) => {
                        if (result.successful?.[0]?.uploadURL) {
                          setBrandingSettings({ ...brandingSettings, banner_url: result.successful[0].uploadURL });
                        }
                      }}
                      maxWidthOrHeight={1920}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Yükle
                    </ObjectUploader>
                  </div>
                  {brandingSettings.banner_url && (
                    <img
                      src={brandingSettings.banner_url}
                      alt="Banner Preview"
                      className="max-w-full h-auto border rounded-md mt-2"
                      data-testid="img-banner-preview"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="banner_carousel_enabled" className="text-base font-medium">
                        Banner Carousel
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ana sayfadaki banner carousel'i açık veya kapalı tutun
                      </p>
                    </div>
                    <Switch
                      id="banner_carousel_enabled"
                      checked={brandingSettings.banner_carousel_enabled === "true"}
                      onCheckedChange={(checked) => 
                        setBrandingSettings({ ...brandingSettings, banner_carousel_enabled: checked ? "true" : "false" })
                      }
                      data-testid="switch-banner-carousel"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kapalı olduğunda banner alanı tamamen kaldırılır
                  </p>
                </div>

                <Button type="submit" disabled={updateSettingMutation.isPending} data-testid="button-save-branding">
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5 - İçerik */}
        <TabsContent value="icerik">
          <Card>
            <CardHeader>
              <CardTitle>İçerik Sayfaları</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveContent} className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="about_us_content">Hakkımızda</Label>
                  <Textarea
                    id="about_us_content"
                    value={contentSettings.about_us_content}
                    onChange={(e) => setContentSettings({ ...contentSettings, about_us_content: e.target.value })}
                    placeholder="Şirket hakkında bilgi..."
                    rows={5}
                    data-testid="textarea-about-us"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="privacy_policy_content">Gizlilik Politikası</Label>
                  <Textarea
                    id="privacy_policy_content"
                    value={contentSettings.privacy_policy_content}
                    onChange={(e) => setContentSettings({ ...contentSettings, privacy_policy_content: e.target.value })}
                    placeholder="Gizlilik politikası metni..."
                    rows={5}
                    data-testid="textarea-privacy-policy"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Label htmlFor="terms_of_service_content">Kullanım Koşulları</Label>
                  <Textarea
                    id="terms_of_service_content"
                    value={contentSettings.terms_of_service_content}
                    onChange={(e) => setContentSettings({ ...contentSettings, terms_of_service_content: e.target.value })}
                    placeholder="Kullanım koşulları metni..."
                    rows={5}
                    data-testid="textarea-terms-of-service"
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  Not: Bu sayfalar halka açık web sitesinde gösterilir
                </p>

                <Button type="submit" disabled={updateSettingMutation.isPending} data-testid="button-save-content">
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bildirim">
          <NotificationPoliciesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const POLICY_ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'ceo', label: 'CEO' },
  { key: 'cgo', label: 'CGO' },
  { key: 'coach', label: 'Koç' },
  { key: 'trainer', label: 'Eğitmen' },
  { key: 'mudur', label: 'Müdür' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'barista', label: 'Barista' },
];

const POLICY_CATEGORIES = [
  { key: 'tasks', label: 'Görevler' },
  { key: 'crm', label: 'CRM' },
  { key: 'stock', label: 'Stok' },
  { key: 'dobody', label: 'Mr. Dobody' },
  { key: 'faults', label: 'Arızalar' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'training', label: 'Eğitim' },
  { key: 'hr', label: 'İK' },
];

interface NotificationPolicy {
  id: number;
  role: string;
  category: string;
  defaultFrequency: string;
}

function NotificationPoliciesPanel() {
  const { toast } = useToast();
  const [localPolicies, setLocalPolicies] = useState<Record<string, string>>({});

  const { data: policies, isLoading } = useQuery<NotificationPolicy[]>({
    queryKey: ['/api/notification-policies'],
  });

  useEffect(() => {
    if (policies) {
      const map: Record<string, string> = {};
      policies.forEach(p => {
        map[`${p.role}__${p.category}`] = p.defaultFrequency;
      });
      setLocalPolicies(map);
    }
  }, [policies]);

  const bulkMutation = useMutation({
    mutationFn: async (items: Array<{ role: string; category: string; defaultFrequency: string }>) => {
      await apiRequest('PUT', '/api/notification-policies/bulk', items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-policies'] });
      toast({ title: "Başarılı", description: "Bildirim politikaları güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Politikalar güncellenemedi", variant: "destructive" });
    },
  });

  const handleChange = (role: string, category: string, frequency: string) => {
    setLocalPolicies(prev => ({ ...prev, [`${role}__${category}`]: frequency }));
  };

  const getFrequency = (role: string, category: string) => {
    return localPolicies[`${role}__${category}`] || 'instant';
  };

  const handleSave = () => {
    const items: Array<{ role: string; category: string; defaultFrequency: string }> = [];
    for (const [key, val] of Object.entries(localPolicies)) {
      const [role, category] = key.split('__');
      items.push({ role, category, defaultFrequency: val });
    }
    if (items.length === 0) {
      POLICY_ROLES.forEach(r => {
        POLICY_CATEGORIES.forEach(c => {
          items.push({ role: r.key, category: c.key, defaultFrequency: 'instant' });
        });
      });
    }
    bulkMutation.mutate(items);
  };

  if (isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base" data-testid="text-policy-title">Bildirim Politikaları</CardTitle>
        <p className="text-sm text-muted-foreground">
          Her rol için varsayılan bildirim sıklığını belirleyin. Kullanıcılar kendi tercihlerini değiştirebilir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto" data-testid="policy-matrix">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground min-w-[100px]">Rol</th>
                {POLICY_CATEGORIES.map(c => (
                  <th key={c.key} className="text-center py-2 px-1 font-medium text-muted-foreground min-w-[90px]">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POLICY_ROLES.map(r => (
                <tr key={r.key} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-medium">{r.label}</td>
                  {POLICY_CATEGORIES.map(c => (
                    <td key={c.key} className="py-2 px-1 text-center">
                      <Select
                        value={getFrequency(r.key, c.key)}
                        onValueChange={(v) => handleChange(r.key, c.key, v)}
                      >
                        <SelectTrigger
                          className="w-full text-xs"
                          data-testid={`policy-${r.key}-${c.key}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Anında</SelectItem>
                          <SelectItem value="daily_digest">Günlük Özet</SelectItem>
                          <SelectItem value="off">Kapalı</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          onClick={handleSave}
          disabled={bulkMutation.isPending}
          data-testid="button-save-policies"
        >
          {bulkMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Politikaları Kaydet
        </Button>
      </CardContent>
    </Card>
  );
}
