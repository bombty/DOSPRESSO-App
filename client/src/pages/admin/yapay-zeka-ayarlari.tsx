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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, 
  Bot, 
  Save, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Loader2,
  Sparkles,
  Zap,
  Brain,
  RefreshCw,
  AlertTriangle,
  Database,
  Clock,
  Activity,
  Info
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI", icon: Sparkles, color: "text-green-500" },
  { value: "gemini", label: "Google Gemini", icon: Zap, color: "text-blue-500" },
  { value: "anthropic", label: "Anthropic Claude", icon: Brain, color: "text-purple-500" },
];

const FALLBACK_MODELS: Record<string, { chat: string[], vision: string[], embedding: string[] }> = {
  openai: {
    chat: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4-turbo", "gpt-3.5-turbo", "o3-mini"],
    vision: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4-turbo"],
    embedding: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
  },
  gemini: {
    chat: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    vision: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    embedding: ["text-embedding-004"],
  },
  anthropic: {
    chat: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    vision: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
    embedding: [],
  },
};

interface ModelsResponse {
  provider: string;
  source: string;
  models: { chat: string[]; vision: string[]; embedding: string[] };
  availableCount?: number;
  lastUpdated?: string;
}

interface TestConnectionResult {
  ok: boolean;
  provider: string;
  requestedModel?: string;
  actualModel?: string;
  latencyMs?: number;
  message?: string;
  error?: string;
  hint?: string;
}

interface AISettings {
  id: number;
  provider: string;
  isActive: boolean;
  openaiApiKey: string | null;
  openaiChatModel: string;
  openaiEmbeddingModel: string;
  openaiVisionModel: string;
  geminiApiKey: string | null;
  geminiChatModel: string;
  geminiEmbeddingModel: string;
  geminiVisionModel: string;
  anthropicApiKey: string | null;
  anthropicChatModel: string;
  anthropicVisionModel: string;
  temperature: number;
  maxTokens: number;
  rateLimitPerMinute: number;
  monthlyBudgetUsd: number;
  budgetEnforcementEnabled: boolean;
  budgetAlertThresholdPct: number;
  needsReembed: boolean;
  lastEmbeddingProvider: string | null;
}

interface BudgetStatus {
  enforcementEnabled: boolean;
  monthlyBudgetUsd: number;
  monthToDateCost: number;
  percentUsed: number;
  remainingUsd: number;
  exceeded: boolean;
  alertThresholdPct: number;
  monthKey: string;
}

export default function AdminYapayZekaAyarlari() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isReEmbedding, setIsReEmbedding] = useState(false);
  const [reEmbedResult, setReEmbedResult] = useState<{ success: boolean; message: string; processed?: number; failed?: number; total?: number } | null>(null);
  const [savedProvider, setSavedProvider] = useState<string | null>(null);
  const [autoReEmbed, setAutoReEmbed] = useState(true);
  
  const [formData, setFormData] = useState<Partial<AISettings>>({
    provider: "openai",
    isActive: true,
    openaiApiKey: "",
    openaiChatModel: "gpt-4o-mini",
    openaiEmbeddingModel: "text-embedding-3-small",
    openaiVisionModel: "gpt-4o",
    geminiApiKey: "",
    geminiChatModel: "gemini-1.5-pro",
    geminiEmbeddingModel: "text-embedding-004",
    geminiVisionModel: "gemini-1.5-pro",
    anthropicApiKey: "",
    anthropicChatModel: "claude-3-5-sonnet-20241022",
    anthropicVisionModel: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
    maxTokens: 2000,
    rateLimitPerMinute: 60,
    monthlyBudgetUsd: 50,
    budgetEnforcementEnabled: true,
    budgetAlertThresholdPct: 80,
  });

  const { data: settings, isLoading, isError, refetch } = useQuery<AISettings>({
    queryKey: ["/api/admin/ai-settings"],
  });

  const { data: budgetStatus } = useQuery<BudgetStatus>({
    queryKey: ["/api/admin/ai-budget"],
    refetchInterval: 60000,
  });

  const { data: dynamicModels } = useQuery<ModelsResponse>({
    queryKey: ["/api/admin/ai/models", formData.provider],
    queryFn: async () => {
      const resp = await fetch(`/api/admin/ai/models?provider=${formData.provider}`);
      if (!resp.ok) return null;
      return resp.json();
    },
    enabled: !!formData.provider,
    staleTime: 6 * 60 * 60 * 1000,
  });

  const getModels = (provider: string, type: "chat" | "vision" | "embedding"): string[] => {
    if (dynamicModels?.provider === provider && dynamicModels.models?.[type]?.length) {
      return dynamicModels.models[type];
    }
    return FALLBACK_MODELS[provider]?.[type] || [];
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        openaiApiKey: settings.openaiApiKey ? "********" : "",
        geminiApiKey: settings.geminiApiKey ? "********" : "",
        anthropicApiKey: settings.anthropicApiKey ? "********" : "",
      });
      setSavedProvider(settings.provider);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AISettings>) =>
      apiRequest("POST", "/api/admin/ai-settings", data),
    onSuccess: () => {
      const providerWasChanged = savedProvider !== null && formData.provider !== savedProvider;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-budget"] });
      setSavedProvider(formData.provider || null);
      if (providerWasChanged && autoReEmbed) {
        toast({ title: "AI ayarları kaydedildi", description: "Vektörler otomatik yenileniyor..." });
        handleReEmbed();
      } else {
        toast({ title: "AI ayarları kaydedildi" });
      }
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    },
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await apiRequest("POST", "/api/admin/ai-settings/test", {
        provider: formData.provider,
      });
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ ok: false, provider: formData.provider || "unknown", error: "Bağlantı testi başarısız" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const dataToSave = { ...formData };
    if (dataToSave.openaiApiKey === "********") delete dataToSave.openaiApiKey;
    if (dataToSave.geminiApiKey === "********") delete dataToSave.geminiApiKey;
    if (dataToSave.anthropicApiKey === "********") delete dataToSave.anthropicApiKey;
    saveMutation.mutate(dataToSave);
  };

  const handleReEmbed = async () => {
    setIsReEmbedding(true);
    setReEmbedResult(null);
    try {
      const response = await apiRequest("POST", "/api/admin/ai/re-embed");
      const result = await response.json();
      setReEmbedResult(result);
      if (result.success) {
        toast({ title: "Vektörler yenilendi", description: result.message });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
      } else {
        toast({ title: "Kısmi başarı", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      setReEmbedResult({ success: false, message: "Vektör yenileme işlemi başarısız oldu" });
      toast({ title: "Hata", description: "Vektör yenileme başarısız", variant: "destructive" });
    } finally {
      setIsReEmbedding(false);
    }
  };

  const providerChanged = (savedProvider !== null && formData.provider !== savedProvider) || (settings?.needsReembed === true);

  const currentProvider = AI_PROVIDERS.find(p => p.value === formData.provider);

  const renderApiKeyField = (provider: string, field: keyof AISettings, label: string) => {
    const value = formData[field] as string || "";
    const isHidden = value === "********";
    
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showApiKey[provider] ? "text" : "password"}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
              placeholder={isHidden ? "Değiştirmek için yeni anahtar girin" : "API anahtarını girin"}
              data-testid={`input-${provider}-api-key`}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
          >
            {showApiKey[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {isHidden && (
          <p className="text-xs text-muted-foreground">
            Mevcut anahtar ayarlı. Değiştirmek için yeni anahtar girin.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Yapay Zeka Ayarları
            </h1>
            <p className="text-sm text-muted-foreground">
              AI sağlayıcı ve model yapılandırması
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savedProvider !== null && formData.provider !== savedProvider && (
            <div className="flex items-center gap-2">
              <Switch
                checked={autoReEmbed}
                onCheckedChange={setAutoReEmbed}
                data-testid="switch-auto-reembed"
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Vektörleri de yenile</Label>
            </div>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            data-testid="button-save-ai-settings"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Kaydet
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aktif Sağlayıcı</CardTitle>
              <CardDescription>
                Sistemde kullanılacak AI sağlayıcısını seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AI_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  const isSelected = formData.provider === provider.value;
                  return (
                    <Card 
                      key={provider.value}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "ring-2 ring-primary" : "hover-elevate"
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, provider: provider.value }))}
                      data-testid={`provider-card-${provider.value}`}
                    >
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <Icon className={`h-8 w-8 ${provider.color}`} />
                        <span className="font-medium text-sm">{provider.label}</span>
                        {isSelected && (
                          <Badge variant="default" className="mt-1">Aktif</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>AI Sistemi Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    Devre dışı bırakılırsa AI özellikleri çalışmaz
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-ai-active"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="openai" value={formData.provider} onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}>
            <TabsList className="w-full">
              <TabsTrigger value="openai" className="flex-1">OpenAI</TabsTrigger>
              <TabsTrigger value="gemini" className="flex-1">Gemini</TabsTrigger>
              <TabsTrigger value="anthropic" className="flex-1">Claude</TabsTrigger>
            </TabsList>

            <TabsContent value="openai">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-500" />
                    OpenAI Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderApiKeyField("openai", "openaiApiKey", "OpenAI API Anahtarı")}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Chat Modeli</Label>
                      <Select 
                        value={formData.openaiChatModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, openaiChatModel: v }))}
                      >
                        <SelectTrigger data-testid="select-openai-chat-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("openai", "chat").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Embedding Modeli</Label>
                      <Select 
                        value={formData.openaiEmbeddingModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, openaiEmbeddingModel: v }))}
                      >
                        <SelectTrigger data-testid="select-openai-embedding-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("openai", "embedding").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vision Modeli</Label>
                      <Select 
                        value={formData.openaiVisionModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, openaiVisionModel: v }))}
                      >
                        <SelectTrigger data-testid="select-openai-vision-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("openai", "vision").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {dynamicModels?.source === "live_api" && dynamicModels.provider === "openai" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                      <Activity className="h-3 w-3" />
                      <span>API&apos;den {dynamicModels.availableCount} model bulundu, filtrelendi</span>
                      {dynamicModels.lastUpdated && (
                        <span>({new Date(dynamicModels.lastUpdated).toLocaleTimeString("tr-TR")})</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gemini">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Google Gemini Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderApiKeyField("gemini", "geminiApiKey", "Gemini API Anahtarı")}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Chat Modeli</Label>
                      <Select 
                        value={formData.geminiChatModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, geminiChatModel: v }))}
                      >
                        <SelectTrigger data-testid="select-gemini-chat-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("gemini", "chat").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Embedding Modeli</Label>
                      <Select 
                        value={formData.geminiEmbeddingModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, geminiEmbeddingModel: v }))}
                      >
                        <SelectTrigger data-testid="select-gemini-embedding-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("gemini", "embedding").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vision Modeli</Label>
                      <Select 
                        value={formData.geminiVisionModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, geminiVisionModel: v }))}
                      >
                        <SelectTrigger data-testid="select-gemini-vision-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("gemini", "vision").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anthropic">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Anthropic Claude Ayarları
                  </CardTitle>
                  <CardDescription>
                    Not: Claude embedding desteklememektedir. Embedding için OpenAI veya Gemini kullanılacaktır.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderApiKeyField("anthropic", "anthropicApiKey", "Anthropic API Anahtarı")}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Chat Modeli</Label>
                      <Select 
                        value={formData.anthropicChatModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, anthropicChatModel: v }))}
                      >
                        <SelectTrigger data-testid="select-anthropic-chat-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("anthropic", "chat").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vision Modeli</Label>
                      <Select 
                        value={formData.anthropicVisionModel} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, anthropicVisionModel: v }))}
                      >
                        <SelectTrigger data-testid="select-anthropic-vision-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getModels("anthropic", "vision").map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Genel Ayarlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Sıcaklık (Temperature)</Label>
                  <span className="text-sm font-medium">{formData.temperature}</span>
                </div>
                <Slider
                  value={[formData.temperature || 0.7]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, temperature: v }))}
                  min={0}
                  max={2}
                  step={0.1}
                  data-testid="slider-temperature"
                />
                <p className="text-xs text-muted-foreground">
                  Düşük değer = daha tutarlı, Yüksek değer = daha yaratıcı
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maksimum Token</Label>
                  <Input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2000 }))}
                    data-testid="input-max-tokens"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dakika Başına İstek Limiti</Label>
                  <Input
                    type="number"
                    value={formData.rateLimitPerMinute}
                    onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) || 60 }))}
                    data-testid="input-rate-limit"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-budget">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Aylık Harcama Tavanı
              </CardTitle>
              <CardDescription>
                AI sağlayıcıya yapılan tüm çağrıların aylık toplam maliyeti bu tavana ulaştığında çağrılar otomatik 503 ile durdurulur. Eşik aşıldığında admin'lere bildirim gider.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgetStatus && (
                <div className="rounded-md border p-3 space-y-2" data-testid="ai-budget-status">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Bu ay ({budgetStatus.monthKey})</span>
                    <span className="text-sm font-medium" data-testid="text-ai-budget-used">
                      ${budgetStatus.monthToDateCost.toFixed(2)} / ${budgetStatus.monthlyBudgetUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${budgetStatus.exceeded ? "bg-destructive" : budgetStatus.percentUsed >= budgetStatus.alertThresholdPct ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, budgetStatus.percentUsed).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span data-testid="text-ai-budget-pct">%{budgetStatus.percentUsed.toFixed(1)} kullanıldı</span>
                    <span>Kalan: ${budgetStatus.remainingUsd.toFixed(2)}</span>
                  </div>
                  {budgetStatus.exceeded && (
                    <div className="flex items-center gap-2 text-xs text-destructive" data-testid="text-ai-budget-exceeded">
                      <AlertCircle className="h-3 w-3" />
                      <span>Tavan aşıldı — yapay zeka çağrıları geçici olarak durduruldu.</span>
                    </div>
                  )}
                  {!budgetStatus.enforcementEnabled && (
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <Info className="h-3 w-3" />
                      <span>Tavan zorlama kapalı — sadece izleme yapılıyor.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aylık Tavan (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.monthlyBudgetUsd ?? 50}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyBudgetUsd: parseFloat(e.target.value) || 0 }))}
                    data-testid="input-monthly-budget"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Uyarı Eşiği (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.budgetAlertThresholdPct ?? 80}
                    onChange={(e) => setFormData(prev => ({ ...prev, budgetAlertThresholdPct: parseInt(e.target.value) || 80 }))}
                    data-testid="input-budget-alert-threshold"
                  />
                  <p className="text-xs text-muted-foreground">Bu yüzdeye ulaşıldığında admin'lere bildirim gönderilir.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Tavan Zorlama Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    Kapalıyken sadece uyarı yapılır, AI çağrıları durdurulmaz.
                  </p>
                </div>
                <Switch
                  checked={formData.budgetEnforcementEnabled !== false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, budgetEnforcementEnabled: checked }))}
                  data-testid="switch-budget-enforcement"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bağlantı Testi</CardTitle>
              <CardDescription>
                Aktif sağlayıcının çalışıp çalışmadığını test edin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  data-testid="button-test-connection"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Test ediliyor...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Bağlantıyı Test Et
                    </>
                  )}
                </Button>

                {testResult && (
                  <div className="space-y-2 flex-1">
                    <div className={`flex items-center gap-2 ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                      {testResult.ok ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {testResult.ok ? `${AI_PROVIDERS.find(p => p.value === testResult.provider)?.label || testResult.provider} bağlantısı başarılı` : (testResult.error || "Bağlantı başarısız")}
                      </span>
                    </div>
                    {testResult.ok && (
                      <div className="flex flex-wrap gap-2">
                        {testResult.latencyMs && (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {testResult.latencyMs}ms
                          </Badge>
                        )}
                        {testResult.actualModel && (
                          <Badge variant="secondary" className="gap-1">
                            <Bot className="h-3 w-3" />
                            {testResult.actualModel}
                          </Badge>
                        )}
                      </div>
                    )}
                    {testResult.hint && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Info className="h-3 w-3" />
                        <span>{testResult.hint}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {providerChanged && (
            <Card className="border-amber-500/50" data-testid="card-provider-change-warning">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm" data-testid="text-provider-change-title">
                      {settings?.needsReembed ? "Vektör Yenileme Gerekli" : "AI Sağlayıcı Değişikliği Algılandı"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {settings?.needsReembed ? (
                        "AI sağlayıcı değiştirildi. Bilgi bankası vektörlerini yeniden oluşturmanız gerekiyor, aksi takdirde AI aramaları doğru çalışmayabilir."
                      ) : (
                        <>
                          Sağlayıcıyı <span className="font-medium">{AI_PROVIDERS.find(p => p.value === savedProvider)?.label}</span>'dan{" "}
                          <span className="font-medium">{AI_PROVIDERS.find(p => p.value === formData.provider)?.label}</span>'a değiştirdiniz.
                          Kaydettikten sonra bilgi bankası vektörlerini yeniden oluşturmanız gerekir, aksi takdirde AI aramaları doğru çalışmayabilir.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Bilgi Bankası Vektörleri
              </CardTitle>
              <CardDescription>
                AI sağlayıcı değiştirdiğinizde, bilgi bankasındaki tüm içeriklerin vektörlerini yeniden oluşturmanız gerekir.
                Bu işlem mevcut bilgileri silmez, sadece yeni AI ile uyumlu hale getirir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={providerChanged ? "default" : "outline"}
                  onClick={handleReEmbed}
                  disabled={isReEmbedding}
                  data-testid="button-re-embed"
                >
                  {isReEmbedding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Vektörler yenileniyor...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Vektörleri Yeniden Oluştur
                    </>
                  )}
                </Button>

                {reEmbedResult && (
                  <div className={`flex items-center gap-2 ${reEmbedResult.success ? "text-green-600" : "text-destructive"}`} data-testid="text-re-embed-result">
                    {reEmbedResult.success ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{reEmbedResult.message}</span>
                  </div>
                )}
              </div>

              {reEmbedResult && reEmbedResult.total !== undefined && (
                <div className="flex flex-wrap gap-2" data-testid="badges-re-embed-stats">
                  <Badge variant="secondary">Toplam: {reEmbedResult.total}</Badge>
                  <Badge variant="default">{reEmbedResult.processed} Başarılı</Badge>
                  {(reEmbedResult.failed || 0) > 0 && (
                    <Badge variant="destructive">{reEmbedResult.failed} Başarısız</Badge>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Bu işlem bilgi bankasındaki tüm makalelerin embedding vektörlerini aktif AI sağlayıcı ile yeniden oluşturur.
                Makale sayısına göre birkaç dakika sürebilir.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
