import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Settings,
  Building2,
  RefreshCw,
  Save,
  XCircle,
  Eye,
  Languages,
  Sparkles,
  Brush,
  Package,
  User,
  Users,
  Image,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Upload,
  ImageIcon,
} from "lucide-react";

interface Branch {
  id: number;
  name: string;
  city: string;
}

interface FormSettings {
  id?: number;
  branchId: number;
  bannerUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  welcomeMessageTr: string;
  welcomeMessageEn: string;
  welcomeMessageZh: string;
  welcomeMessageAr: string;
  welcomeMessageDe: string;
  welcomeMessageKo: string;
  welcomeMessageFr: string;
  showServiceRating: boolean;
  showCleanlinessRating: boolean;
  showProductRating: boolean;
  showStaffRating: boolean;
  showStaffSelection: boolean;
  showPhotoUpload: boolean;
  showFeedbackTypeSelection: boolean;
  showContactPreference: boolean;
  showCommentField: boolean;
  requireComment: boolean;
  allowAnonymous: boolean;
  defaultAnonymous: boolean;
  requireLocationVerification: boolean;
  maxDistanceFromBranch: number;
  availableLanguages: string[];
  defaultLanguage: string;
  isActive: boolean;
}

export default function GuestFormSettings() {
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ["/api/branches"] });

  const loadFormSettings = async (branchId: number) => {
    setSelectedBranchId(branchId);
    try {
      const res = await fetch(`/api/feedback-form-settings/branch/${branchId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFormSettings(data);
      }
    } catch (error) {
      console.error("Form ayarları yüklenemedi:", error);
    }
  };

  const saveFormSettings = async () => {
    if (!selectedBranchId || !formSettings) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/feedback-form-settings/${selectedBranchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formSettings),
      });
      if (res.ok) {
        toast({ title: "Ayarlar kaydedildi" });
      } else {
        toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const updateFormSetting = (key: string, value: any) => {
    if (!formSettings) return;
    setFormSettings({ ...formSettings, [key]: value });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3" data-testid="page-guest-form-settings">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Geri Bildirim Formu Ayarları
            </CardTitle>
            <CardDescription>
              Her şube için geri bildirim formunu özelleştirin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Label className="mb-2 block">Şube Seçin</Label>
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <Button
                      key={branch.id}
                      variant={selectedBranchId === branch.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => loadFormSettings(branch.id)}
                      data-testid={`button-settings-branch-${branch.id}`}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      {branch.name}
                    </Button>
                  ))}
                  {branches.length === 0 && (
                    <p className="text-sm text-muted-foreground">Şube bulunamadı</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {formSettings ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">
                        {branches.find((b) => b.id === selectedBranchId)?.name} Ayarları
                      </h3>
                      <Button onClick={saveFormSettings} disabled={savingSettings} data-testid="button-save-settings">
                        {savingSettings ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Kaydet
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Banner Görseli (16:9)</Label>
                        <div className="space-y-2">
                          {formSettings.bannerUrl && (
                            <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                              <img src={formSettings.bannerUrl} alt="Banner" className="w-full h-full object-cover" loading="lazy" />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => updateFormSetting("bannerUrl", null)}
                                data-testid="button-remove-banner"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <ObjectUploader
                            maxWidthOrHeight={1920}
                            onGetUploadParameters={async () => {
                              const res = await fetch("/api/objects/generate-upload-url", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prefix: "feedback-banners" }),
                              });
                              const data = await res.json();
                              return { method: "PUT", url: data.uploadUrl };
                            }}
                            onComplete={(result) => {
                              if (result.successful?.[0]?.uploadURL) {
                                updateFormSetting("bannerUrl", result.successful[0].uploadURL);
                              }
                            }}
                            buttonClassName="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Banner Yükle
                          </ObjectUploader>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="space-y-2">
                          {formSettings.logoUrl && (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted mx-auto">
                              <img src={formSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" loading="lazy" />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1"
                                onClick={() => updateFormSetting("logoUrl", null)}
                                data-testid="button-remove-logo"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <ObjectUploader
                            maxWidthOrHeight={512}
                            onGetUploadParameters={async () => {
                              const res = await fetch("/api/objects/generate-upload-url", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prefix: "feedback-logos" }),
                              });
                              const data = await res.json();
                              return { method: "PUT", url: data.uploadUrl };
                            }}
                            onComplete={(result) => {
                              if (result.successful?.[0]?.uploadURL) {
                                updateFormSetting("logoUrl", result.successful[0].uploadURL);
                              }
                            }}
                            buttonClassName="w-full"
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Logo Yükle
                          </ObjectUploader>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ana Renk</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formSettings.primaryColor}
                            onChange={(e) => updateFormSetting("primaryColor", e.target.value)}
                            className="w-14 h-9 p-1"
                            data-testid="input-primary-color"
                          />
                          <Input
                            value={formSettings.primaryColor}
                            onChange={(e) => updateFormSetting("primaryColor", e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Arka Plan Rengi</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formSettings.backgroundColor}
                            onChange={(e) => updateFormSetting("backgroundColor", e.target.value)}
                            className="w-14 h-9 p-1"
                            data-testid="input-background-color"
                          />
                          <Input
                            value={formSettings.backgroundColor}
                            onChange={(e) => updateFormSetting("backgroundColor", e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Soru Görünürlük Ayarları
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: "showServiceRating", label: "Hizmet Puanı", icon: <Sparkles className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showCleanlinessRating", label: "Temizlik Puanı", icon: <Brush className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showProductRating", label: "Ürün Kalitesi Puanı", icon: <Package className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showStaffRating", label: "Personel Puanı", icon: <User className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showStaffSelection", label: "Personel Seçimi", icon: <Users className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showPhotoUpload", label: "Fotoğraf Yükleme", icon: <Image className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showFeedbackTypeSelection", label: "Şikayet/Geri Bildirim Seçimi", icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showContactPreference", label: "Cevap Bekliyorum Seçeneği", icon: <MessageSquare className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showCommentField", label: "Yorum Alanı", icon: <MessageSquare className="h-4 w-4 text-muted-foreground" /> },
                          { key: "requireComment", label: "Yorum Zorunlu", icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              {item.icon}
                              <span>{item.label}</span>
                            </div>
                            <Switch
                              checked={(formSettings as any)[item.key]}
                              onCheckedChange={(v) => updateFormSetting(item.key, v)}
                              data-testid={`switch-${item.key}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Karşılama Mesajları
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Türkçe</Label>
                          <Input
                            value={formSettings.welcomeMessageTr}
                            onChange={(e) => updateFormSetting("welcomeMessageTr", e.target.value)}
                            data-testid="input-welcome-tr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">English</Label>
                          <Input
                            value={formSettings.welcomeMessageEn}
                            onChange={(e) => updateFormSetting("welcomeMessageEn", e.target.value)}
                            data-testid="input-welcome-en"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Deutsch</Label>
                          <Input
                            value={formSettings.welcomeMessageDe}
                            onChange={(e) => updateFormSetting("welcomeMessageDe", e.target.value)}
                            data-testid="input-welcome-de"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Diğer Ayarlar</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: "allowAnonymous", label: "Anonim Gönderime İzin Ver" },
                          { key: "defaultAnonymous", label: "Varsayılan Anonim" },
                          { key: "requireLocationVerification", label: "Konum Doğrulama Zorunlu" },
                          { key: "isActive", label: "Form Aktif" },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                            <span>{item.label}</span>
                            <Switch
                              checked={(formSettings as any)[item.key]}
                              onCheckedChange={(v) => updateFormSetting(item.key, v)}
                              data-testid={`switch-${item.key}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Label>Maksimum Uzaklık (metre)</Label>
                        <Input
                          type="number"
                          value={formSettings.maxDistanceFromBranch}
                          onChange={(e) => updateFormSetting("maxDistanceFromBranch", parseInt(e.target.value) || 500)}
                          data-testid="input-max-distance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Varsayılan Dil</Label>
                        <Select value={formSettings.defaultLanguage} onValueChange={(v) => updateFormSetting("defaultLanguage", v)}>
                          <SelectTrigger data-testid="select-default-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tr">Türkçe</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                            <SelectItem value="ko">한국어</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Şube Seçin</h3>
                    <p className="text-sm text-muted-foreground">
                      Form ayarlarını düzenlemek için soldaki listeden bir şube seçin
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
