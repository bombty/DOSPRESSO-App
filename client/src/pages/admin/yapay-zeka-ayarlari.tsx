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
  Brain
} from "lucide-react";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI", icon: Sparkles, color: "text-green-500" },
  { value: "gemini", label: "Google Gemini", icon: Zap, color: "text-blue-500" },
  { value: "anthropic", label: "Anthropic Claude", icon: Brain, color: "text-purple-500" },
];

const OPENAI_MODELS = {
  chat: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  embedding: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
  vision: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
};

const GEMINI_MODELS = {
  chat: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  embedding: ["text-embedding-004", "embedding-001"],
  vision: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro-vision"],
};

const ANTHROPIC_MODELS = {
  chat: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  vision: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
};

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
}

export default function AdminYapayZekaAyarlari() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
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
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: settings, isLoading } = useQuery<AISettings>({
    queryKey: ["/api/admin/ai-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        openaiApiKey: settings.openaiApiKey ? "********" : "",
        geminiApiKey: settings.geminiApiKey ? "********" : "",
        anthropicApiKey: settings.anthropicApiKey ? "********" : "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AISettings>) =>
      apiRequest("POST", "/api/admin/ai-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
      toast({ title: "AI ayarları kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    },
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await apiRequest("POST", "/api/admin/ai-settings/test", {
        provider: formData.provider,
      });
      const result = await response.json();
      setTestResult({ success: result.success, message: result.message });
    } catch (error) {
      setTestResult({ success: false, message: "Bağlantı testi başarısız" });
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

  const currentProvider = AI_PROVIDERS.find(p => p.value === formData.provider);

  const renderApiKeyField = (provider: string, field: keyof AISettings, label: string) => {
    const value = formData[field] as string || "";
    const isHidden = value === "********";
    
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
              <div className="grid grid-cols-3 gap-3">
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
                          {OPENAI_MODELS.chat.map(model => (
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
                          {OPENAI_MODELS.embedding.map(model => (
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
                          {OPENAI_MODELS.vision.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                          {GEMINI_MODELS.chat.map(model => (
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
                          {GEMINI_MODELS.embedding.map(model => (
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
                          {GEMINI_MODELS.vision.map(model => (
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
                          {ANTHROPIC_MODELS.chat.map(model => (
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
                          {ANTHROPIC_MODELS.vision.map(model => (
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
                  <div className={`flex items-center gap-2 ${testResult.success ? "text-green-600" : "text-destructive"}`}>
                    {testResult.success ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
