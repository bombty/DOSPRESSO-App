import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Clock, FileText, Upload, CheckCircle, Image } from "lucide-react";

interface GeneratedModulePreview {
  title?: string;
  description?: string;
  estimatedDuration?: number;
  learningObjectives?: string[];
  steps?: { stepNumber: number; title: string; content: string }[];
  quiz?: { questionText: string; options?: string[]; correctOptionIndex?: number }[];
  scenarioTasks?: { title: string; description: string }[];
  supervisorChecklist?: { title: string; description: string }[];
}

interface AIModuleCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIModuleCreator({ open, onOpenChange }: AIModuleCreatorProps) {
  const { toast } = useToast();
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [inputText, setInputText] = useState("");
  const [roleLevel, setRoleLevel] = useState("Stajyer");
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [generatedModule, setGeneratedModule] = useState<GeneratedModulePreview | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);

  const resetWizard = () => {
    setWizardStep(1);
    setInputText("");
    setRoleLevel("Stajyer");
    setEstimatedMinutes(15);
    setGeneratedModule(null);
    setInputMode("text");
    setSelectedFile(null);
    setIsExtractingText(false);
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setIsExtractingText(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/training/generate/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Dosya işlenemedi');
      }
      const result = await response.json();
      setInputText(result.extractedText);
      toast({ title: `Metin çıkarıldı: ${result.fileName}` });
    } catch (error: unknown) {
      toast({ title: "Dosya İşleme Hatası", description: (error as Error).message || "Dosyadan metin çıkarılamadı", variant: "destructive" });
      setSelectedFile(null);
    } finally {
      setIsExtractingText(false);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate", {
        inputText, roleLevel, estimatedMinutes,
      });
      return await response.json() as { success: boolean; module: GeneratedModulePreview };
    },
    onSuccess: (data) => {
      setGeneratedModule(data.module);
      setWizardStep(2);
      toast({ title: "Modül başarıyla oluşturuldu!" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message || "AI modül oluşturma başarısız", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate/save", {
        module: generatedModule, roleLevel,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Modül veritabanına kaydedildi!" });
      onOpenChange(false);
      resetWizard();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error) => {
      toast({ title: "Kaydetme Hatası", description: error.message || "Modül kaydedilemedi", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetWizard(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <GraduationCap className="w-5 h-5" />
            AI Modül Oluşturucu
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${wizardStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
            <div className={`flex-1 h-1 ${wizardStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${wizardStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
            <div className={`flex-1 h-1 ${wizardStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${wizardStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Metin Gir</span>
            <span>AI Önizleme</span>
            <span>Kaydet</span>
          </div>
        </DialogHeader>

        {wizardStep === 1 && (
          <div className="w-full space-y-2 sm:space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Nasıl Çalışır?</p>
              <p className="text-muted-foreground">Metin yapıştırın veya PDF/fotoğraf yükleyin. AI, içeriği otomatik olarak yapılandırılmış bir eğitim modülüne dönüştürecek.</p>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button type="button" variant={inputMode === "text" ? "default" : "ghost"} className="flex-1" onClick={() => setInputMode("text")} data-testid="button-text-mode">
                <FileText className="w-4 h-4 mr-2" /> Metin Gir
              </Button>
              <Button type="button" variant={inputMode === "file" ? "default" : "ghost"} className="flex-1" onClick={() => setInputMode("file")} data-testid="button-file-mode">
                <Upload className="w-4 h-4 mr-2" /> Dosya Yükle
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Hedef Rol</label>
                <Select value={roleLevel} onValueChange={setRoleLevel}>
                  <SelectTrigger data-testid="select-role-level"><SelectValue placeholder="Rol seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stajyer">Stajyer</SelectItem>
                    <SelectItem value="Bar Buddy">Bar Buddy</SelectItem>
                    <SelectItem value="Barista">Barista</SelectItem>
                    <SelectItem value="Supervisor Buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tahmini Süre (dk)</label>
                <Input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 15)} min={5} max={120} data-testid="input-estimated-duration" />
              </div>
            </div>

            {inputMode === "file" && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <label className="text-sm font-medium mb-1 block">PDF veya Fotoğraf Yükle</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => document.getElementById('ai-file-upload-input')?.click()}>
                  <input id="ai-file-upload-input" type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} data-testid="input-file-upload" />
                  {isExtractingText ? (
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Metin çıkarılıyor...</p>
                    </div>
                  ) : selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setInputText(""); }}>Dosyayı Kaldır</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <Image className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">PDF veya fotoğraf yüklemek için tıklayın</p>
                      <p className="text-xs text-muted-foreground">Maksimum 10 MB</p>
                    </div>
                  )}
                </div>
                {inputText && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Çıkarılan Metin</label>
                    <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="h-40" data-testid="textarea-extracted-ai-text" />
                    <p className="text-xs text-muted-foreground mt-1">{inputText.length} karakter</p>
                  </div>
                )}
              </div>
            )}

            {inputMode === "text" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Eğitim İçeriği Metni</label>
                <Textarea placeholder="Eğitim konusu hakkında metin yapıştırın... (en az 50 karakter)" value={inputText} onChange={(e) => setInputText(e.target.value)} className="h-64" data-testid="textarea-ai-input" />
                <p className="text-xs text-muted-foreground mt-1">{inputText.length} karakter {inputText.length < 50 && "(min. 50 karakter gerekli)"}</p>
              </div>
            )}

            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || inputText.length < 50 || isExtractingText} className="w-full" data-testid="button-generate-module">
              {generateMutation.isPending ? (
                <><Clock className="w-4 h-4 mr-2 animate-spin" /> AI Modül Oluşturuyor...</>
              ) : (
                <><GraduationCap className="w-4 h-4 mr-2" /> AI ile Modül Oluştur</>
              )}
            </Button>
          </div>
        )}

        {wizardStep === 2 && generatedModule && (
          <div className="w-full space-y-2 sm:space-y-3">
            <div className="bg-green-500/10 dark:bg-green-500/10 p-3 rounded-lg border border-green-500/30">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Modül başarıyla oluşturuldu!</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto">
              <div>
                <h4 className="font-semibold text-lg">{generatedModule.title}</h4>
                <p className="text-sm text-muted-foreground">{generatedModule.description}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline">{roleLevel}</Badge>
                  <Badge variant="outline">{generatedModule.estimatedDuration} dk</Badge>
                </div>
              </div>

              {generatedModule.learningObjectives && generatedModule.learningObjectives.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Öğrenme Hedefleri ({generatedModule.learningObjectives.length})</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {generatedModule.learningObjectives.map((obj: string, i: number) => (
                      <li key={i} className="text-muted-foreground">{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedModule.steps && generatedModule.steps.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Eğitim Adımları ({generatedModule.steps.length})</h5>
                  <div className="flex flex-col gap-2">
                    {generatedModule.steps.map((step, i: number) => (
                      <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                        <p className="font-medium">{step.stepNumber}. {step.title}</p>
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{step.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedModule.quiz && generatedModule.quiz.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Quiz Soruları ({generatedModule.quiz.length})</h5>
                  <div className="flex flex-col gap-2">
                    {generatedModule.quiz.map((q, i: number) => (
                      <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                        <p className="font-medium">{q.questionText}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {q.options?.map((opt: string, j: number) => (
                            <Badge key={j} variant={j === q.correctOptionIndex ? "default" : "outline"} className="text-xs">{opt}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedModule.scenarioTasks && generatedModule.scenarioTasks.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Senaryolar ({generatedModule.scenarioTasks.length})</h5>
                  <div className="flex flex-col gap-2">
                    {generatedModule.scenarioTasks.map((s, i: number) => (
                      <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                        <p className="font-medium">{s.title}</p>
                        <p className="text-muted-foreground text-xs">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1" data-testid="button-back">Geri Dön</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1" data-testid="button-save-module">
                {saveMutation.isPending ? "Kaydediliyor..." : "Modülü Kaydet"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
