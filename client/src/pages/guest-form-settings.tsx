import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Plus,
  Trash2,
  Globe,
  Shield,
  Star,
  GripVertical,
  Loader2,
  ExternalLink,
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

interface CustomQuestion {
  id: number;
  branchId: number;
  questionTr: string;
  questionEn: string | null;
  questionDe: string | null;
  questionAr: string | null;
  questionZh: string | null;
  questionKo: string | null;
  questionFr: string | null;
  questionType: string;
  isActive: boolean;
  sortOrder: number;
}

interface IpBlock {
  id: number;
  ipAddress: string;
  branchId: number | null;
  reason: string | null;
  blockedUntil: string | null;
  createdAt: string;
}

function FormPreviewDialog({ formSettings, branchName, customQuestions }: {
  formSettings: FormSettings;
  branchName: string;
  customQuestions: CustomQuestion[];
}) {
  const activeQuestions = customQuestions.filter(q => q.isActive);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-preview-form">
          <Eye className="h-4 w-4 mr-1.5" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
        <div
          className="min-h-[500px] rounded-lg overflow-hidden"
          style={{ backgroundColor: formSettings.backgroundColor }}
        >
          {formSettings.bannerUrl && (
            <div className="aspect-video w-full overflow-hidden">
              <img src={formSettings.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              {formSettings.logoUrl && (
                <img src={formSettings.logoUrl} alt="Logo" className="h-12 w-12 mx-auto object-contain" />
              )}
              <h2 className="text-lg font-bold" style={{ color: formSettings.primaryColor }}>
                {branchName}
              </h2>
              <p className="text-sm" style={{ color: `${formSettings.primaryColor}aa` }}>
                {formSettings.welcomeMessageTr}
              </p>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-xs font-medium" style={{ color: `${formSettings.primaryColor}cc` }}>
                Genel Degerlendirme
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="h-8 w-8 cursor-pointer"
                    style={{ color: s <= 4 ? '#facc15' : `${formSettings.primaryColor}40` }}
                    fill={s <= 4 ? '#facc15' : 'transparent'}
                  />
                ))}
              </div>
            </div>

            {(formSettings.showServiceRating || formSettings.showCleanlinessRating ||
              formSettings.showProductRating || formSettings.showStaffRating) && (
              <div className="space-y-3">
                <p className="text-xs font-medium" style={{ color: `${formSettings.primaryColor}cc` }}>
                  Detayli Puanlama
                </p>
                {formSettings.showServiceRating && (
                  <PreviewRatingRow label="Hizmet Kalitesi" color={formSettings.primaryColor} value={4} />
                )}
                {formSettings.showCleanlinessRating && (
                  <PreviewRatingRow label="Temizlik" color={formSettings.primaryColor} value={5} />
                )}
                {formSettings.showProductRating && (
                  <PreviewRatingRow label="Urun Kalitesi" color={formSettings.primaryColor} value={4} />
                )}
                {formSettings.showStaffRating && (
                  <PreviewRatingRow label="Personel" color={formSettings.primaryColor} value={3} />
                )}
              </div>
            )}

            {activeQuestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium" style={{ color: `${formSettings.primaryColor}cc` }}>
                  Ek Sorular
                </p>
                {activeQuestions.map((q) => (
                  <div key={q.id}>
                    {q.questionType === 'rating' ? (
                      <PreviewRatingRow label={q.questionTr} color={formSettings.primaryColor} value={4} />
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs" style={{ color: `${formSettings.primaryColor}bb` }}>{q.questionTr}</p>
                        <div
                          className="w-full h-8 rounded-md border opacity-50"
                          style={{ borderColor: `${formSettings.primaryColor}30`, backgroundColor: `${formSettings.primaryColor}08` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {formSettings.showCommentField && (
              <div className="space-y-1">
                <p className="text-xs" style={{ color: `${formSettings.primaryColor}bb` }}>
                  Yorumunuz {formSettings.requireComment ? '(Zorunlu)' : '(Opsiyonel)'}
                </p>
                <div
                  className="w-full h-20 rounded-md border opacity-50"
                  style={{ borderColor: `${formSettings.primaryColor}30`, backgroundColor: `${formSettings.primaryColor}08` }}
                />
              </div>
            )}

            <button
              className="w-full py-3 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: formSettings.primaryColor }}
              disabled
            >
              Gonder
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRatingRow({ label, color, value }: { label: string; color: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: `${color}bb` }}>{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className="h-4 w-4"
            style={{ color: s <= value ? '#facc15' : `${color}30` }}
            fill={s <= value ? '#facc15' : 'transparent'}
          />
        ))}
      </div>
    </div>
  );
}

export default function GuestFormSettings() {
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newQuestionTr, setNewQuestionTr] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("rating");
  const [translatingId, setTranslatingId] = useState<number | null>(null);

  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ["/api/branches"] });

  const { data: customQuestions = [], refetch: refetchQuestions } = useQuery<CustomQuestion[]>({
    queryKey: ["/api/feedback-custom-questions", selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await fetch(`/api/feedback-custom-questions/${selectedBranchId}`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedBranchId,
  });

  const { data: ipBlocks = [], refetch: refetchIpBlocks } = useQuery<IpBlock[]>({
    queryKey: ["/api/feedback-ip-blocks"],
    enabled: !!selectedBranchId,
  });

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

  const addCustomQuestion = async () => {
    if (!selectedBranchId || !newQuestionTr.trim()) return;
    try {
      const res = await apiRequest("POST", "/api/feedback-custom-questions", {
        branchId: selectedBranchId,
        questionTr: newQuestionTr.trim(),
        questionType: newQuestionType,
      });
      if (res.ok) {
        const question = await res.json();
        setNewQuestionTr("");
        toast({ title: "Soru eklendi" });
        refetchQuestions();

        setTranslatingId(question.id);
        try {
          await apiRequest("POST", `/api/feedback-custom-questions/${question.id}/translate`, {});
          toast({ title: "Ceviri tamamlandi", description: "AI tum dillere cevirdi" });
        } catch {
          toast({ title: "Ceviri yapilamadi", description: "Soruyu elle cevirebilirsiniz", variant: "destructive" });
        }
        setTranslatingId(null);
        refetchQuestions();
      }
    } catch {
      toast({ title: "Hata", description: "Soru eklenemedi", variant: "destructive" });
    }
  };

  const toggleQuestion = async (q: CustomQuestion) => {
    try {
      await apiRequest("PUT", `/api/feedback-custom-questions/${q.id}`, { isActive: !q.isActive });
      refetchQuestions();
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const deleteQuestion = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/feedback-custom-questions/${id}`);
      refetchQuestions();
      toast({ title: "Soru silindi" });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const translateQuestion = async (id: number) => {
    setTranslatingId(id);
    try {
      await apiRequest("POST", `/api/feedback-custom-questions/${id}/translate`, {});
      toast({ title: "Ceviri tamamlandi" });
      refetchQuestions();
    } catch {
      toast({ title: "Ceviri yapilamadi", variant: "destructive" });
    }
    setTranslatingId(null);
  };

  const removeIpBlock = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/feedback-ip-blocks/${id}`);
      refetchIpBlocks();
      toast({ title: "IP engeli kaldirildi" });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3" data-testid="page-guest-form-settings">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Geri Bildirim Formu Ayarlari
            </CardTitle>
            <CardDescription>
              Her sube icin geri bildirim formunu ozellestirin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Label className="mb-2 block">Sube Secin</Label>
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
                    <p className="text-sm text-muted-foreground">Sube bulunamadi</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {formSettings ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">
                        {branches.find((b) => b.id === selectedBranchId)?.name} Ayarlari
                      </h3>
                      <div className="flex items-center gap-2">
                        <FormPreviewDialog
                          formSettings={formSettings}
                          branchName={branches.find((b) => b.id === selectedBranchId)?.name || ""}
                          customQuestions={customQuestions}
                        />
                        <Button onClick={saveFormSettings} disabled={savingSettings} data-testid="button-save-settings">
                          {savingSettings ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Kaydet
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Banner Gorseli (16:9)</Label>
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
                            Banner Yukle
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
                            Logo Yukle
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
                        Soru Gorunurluk Ayarlari
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: "showServiceRating", label: "Hizmet Puani", icon: <Sparkles className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showCleanlinessRating", label: "Temizlik Puani", icon: <Brush className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showProductRating", label: "Urun Kalitesi Puani", icon: <Package className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showStaffRating", label: "Personel Puani", icon: <User className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showStaffSelection", label: "Personel Secimi", icon: <Users className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showPhotoUpload", label: "Fotograf Yukleme", icon: <Image className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showFeedbackTypeSelection", label: "Sikayet/Geri Bildirim Secimi", icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showContactPreference", label: "Cevap Bekliyorum Secenegi", icon: <MessageSquare className="h-4 w-4 text-muted-foreground" /> },
                          { key: "showCommentField", label: "Yorum Alani", icon: <MessageSquare className="h-4 w-4 text-muted-foreground" /> },
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

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Ozel Sorular
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Sube icin ozel sorular ekleyin. Eklenen sorular otomatik olarak AI tarafindan tum dillere cevrilir.
                      </p>

                      <div className="flex gap-2 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <Label className="text-xs">Soru (Turkce)</Label>
                          <Input
                            value={newQuestionTr}
                            onChange={(e) => setNewQuestionTr(e.target.value)}
                            placeholder="Ornegin: Ambiyans nasil buldunuz?"
                            data-testid="input-new-question"
                          />
                        </div>
                        <div className="w-[130px] space-y-1">
                          <Label className="text-xs">Tip</Label>
                          <Select value={newQuestionType} onValueChange={setNewQuestionType}>
                            <SelectTrigger data-testid="select-question-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rating">Puan (1-5)</SelectItem>
                              <SelectItem value="text">Metin</SelectItem>
                              <SelectItem value="yesno">Evet/Hayir</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={addCustomQuestion} disabled={!newQuestionTr.trim()} data-testid="button-add-question">
                          <Plus className="h-4 w-4 mr-1" />
                          Ekle
                        </Button>
                      </div>

                      {customQuestions.length > 0 && (
                        <div className="space-y-2">
                          {customQuestions.map((q) => (
                            <div key={q.id} className="flex items-center gap-3 p-3 border rounded-lg">
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{q.questionTr}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {q.questionType === 'rating' ? 'Puan' : q.questionType === 'text' ? 'Metin' : 'Evet/Hayir'}
                                  </Badge>
                                  {q.questionEn && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <Globe className="h-2.5 w-2.5 mr-0.5" />
                                      Cevirildi
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => translateQuestion(q.id)}
                                  disabled={translatingId === q.id}
                                  data-testid={`button-translate-${q.id}`}
                                >
                                  {translatingId === q.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Languages className="h-4 w-4" />
                                  )}
                                </Button>
                                <Switch
                                  checked={q.isActive}
                                  onCheckedChange={() => toggleQuestion(q)}
                                  data-testid={`switch-question-${q.id}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteQuestion(q.id)}
                                  data-testid={`button-delete-question-${q.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Karsilama Mesajlari
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Turkce</Label>
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
                      <h4 className="font-medium">Diger Ayarlar</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: "allowAnonymous", label: "Anonim Gonderime Izin Ver" },
                          { key: "defaultAnonymous", label: "Varsayilan Anonim" },
                          { key: "requireLocationVerification", label: "Konum Dogrulama Zorunlu" },
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
                        <Label>Maksimum Uzaklik (metre)</Label>
                        <Input
                          type="number"
                          value={formSettings.maxDistanceFromBranch}
                          onChange={(e) => updateFormSetting("maxDistanceFromBranch", parseInt(e.target.value) || 500)}
                          data-testid="input-max-distance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Varsayilan Dil</Label>
                        <Select value={formSettings.defaultLanguage} onValueChange={(v) => updateFormSetting("defaultLanguage", v)}>
                          <SelectTrigger data-testid="select-default-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tr">Turkce</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                            <SelectItem value="ko">Korean</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Suistimal Korumasi
                      </h4>
                      <div className="space-y-3">
                        <Card className="border-dashed">
                          <CardContent className="p-4 space-y-2">
                            <p className="text-sm font-medium">Otomatik Koruma Katmanlari</p>
                            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>Ayni cihaz + ayni sube = 24 saat icinde tekrar yorum yapilamaz</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>Konum dogrulamasi (GPS uzaklik kontrolu)</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>Ayni IP'den 1 saatte 3+ gonderim = otomatik 24 saat IP engeli</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>Supheli isaret: Ayni IP coklu gonderim, 30sn'den hizli, tum 5 yildiz yorumsuz</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>Supheli isaret: Farkli subelere ayni haftada gonderim</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {ipBlocks.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Engellenen IP Adresleri ({ipBlocks.length})</p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {ipBlocks.map((block) => (
                                <div key={block.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono text-xs">{block.ipAddress}</span>
                                    {block.reason && (
                                      <p className="text-xs text-muted-foreground truncate">{block.reason}</p>
                                    )}
                                    {block.blockedUntil && (
                                      <p className="text-xs text-muted-foreground">
                                        Bitis: {new Date(block.blockedUntil).toLocaleString('tr-TR')}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeIpBlock(block.id)}
                                    data-testid={`button-remove-ip-${block.id}`}
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sube Secin</h3>
                    <p className="text-sm text-muted-foreground">
                      Form ayarlarini duzenlemek icin soldaki listeden bir sube secin
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
