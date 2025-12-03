import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  ArrowLeft, CheckCircle2, Camera, FileText, Star,
  Save, Send, AlertCircle, Loader2, XCircle 
} from "lucide-react";

type AuditTemplateItem = {
  id: number;
  itemText: string;
  itemType: string | null;
  weight: number | null;
  requiresPhoto: boolean | null;
  aiCheckEnabled: boolean | null;
  aiPrompt: string | null;
  sortOrder: number;
  options: string[] | null; // For multiple choice questions
  correctAnswer: string | null; // Correct answer for test questions
};

type AuditInstanceItem = {
  id: number;
  instanceId: number;
  templateItemId: number;
  response: string | null;
  score: number | null;
  notes: string | null;
  photoUrl: string | null;
  aiAnalysisStatus: string | null;
  templateItem: AuditTemplateItem;
};

type AuditInstance = {
  id: number;
  templateId: number;
  auditType: string;
  branchId: number | null;
  userId: string | null;
  auditorId: string;
  auditDate: string;
  status: string;
  totalScore: number | null;
  maxScore: number | null;
  notes: string | null;
  template: {
    id: number;
    title: string;
    description: string | null;
    category: string;
  };
  items: AuditInstanceItem[];
};

export default function DenetimYurutmePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const auditId = parseInt(id || "0");
  const [overallNotes, setOverallNotes] = useState("");
  const [overallActionItems, setOverallActionItems] = useState("");

  // Fetch audit instance
  const { data: audit, isLoading } = useQuery<AuditInstance>({
    queryKey: ['/api/audit-instances', auditId],
    queryFn: () => fetch(`/api/audit-instances/${auditId}`, { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('Denetim yüklenemedi');
      return res.json();
    }),
    enabled: !!auditId,
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ templateItemId, updates }: { templateItemId: number; updates: any }) => {
      return await apiRequest('PATCH', `/api/audit-instances/${auditId}/items/${templateItemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-instances', auditId] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Madde güncellenemedi",
        variant: "destructive"
      });
    },
  });

  // Complete audit mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/audit-instances/${auditId}/complete`, {
        notes: overallNotes || null,
        actionItems: overallActionItems || null,
        followUpRequired: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Denetim tamamlandı", description: "Denetim başarıyla kaydedildi." });
      setLocation('/denetimler');
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Denetim tamamlanamadı",
        variant: "destructive"
      });
    },
  });

  const handleResponseChange = (templateItemId: number, response: string, itemType: string, weight?: number | null, correctAnswer?: string | null) => {
    // Guard: Block mutations on completed audits
    if (isCompleted) return;

    // Calculate base score (0-100) based on response and item type
    let baseScore: number = 0;
    if (itemType === 'checkbox') {
      baseScore = response === 'yes' ? 100 : 0;
    } else if (itemType === 'rating') {
      const rating = parseInt(response);
      baseScore = (rating / 5) * 100;
    } else if (itemType === 'multiple_choice') {
      // For multiple choice: 100 if correct, 0 if incorrect
      baseScore = response === correctAnswer ? 100 : 0;
    } else {
      // For text/photo responses, default to neutral score
      baseScore = 50;
    }

    // Store percentage score (0-100)
    // Weighted aggregation is handled by backend completeAuditInstance using leftJoin on template weights
    // Weight parameter is available for future client-side preview features
    const score = baseScore;

    updateItemMutation.mutate({
      templateItemId,
      updates: { response, score },
    });
  };

  const handleNotesChange = (templateItemId: number, notes: string) => {
    // Guard: Block mutations on completed audits
    if (isCompleted) return;
    
    updateItemMutation.mutate({
      templateItemId,
      updates: { notes },
    });
  };

  const handlePhotoUpload = (templateItemId: number, uploadURL: string) => {
    // Guard: Block mutations on completed audits
    if (isCompleted) return;
    
    updateItemMutation.mutate({
      templateItemId,
      updates: { photoUrl: uploadURL },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center h-full grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <p className="text-lg text-muted-foreground">Denetim bulunamadı</p>
        <Link href="/denetimler">
          <Button>Denetimlere Dön</Button>
        </Link>
      </div>
    );
  }

  // Check if audit is completed (read-only mode)
  const isCompleted = audit.status === 'completed';

  // Calculate progress
  const answeredItems = audit.items.filter(item => item.response !== null).length;
  const totalItems = audit.items.length;
  const progress = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;

  // Calculate current weighted average score (matches backend completeAuditInstance logic)
  const scoresWithValues = audit.items.filter(item => item.score !== null);
  let currentScore = 0;
  
  if (scoresWithValues.length > 0) {
    const weightedSum = scoresWithValues.reduce((sum, item) => {
      const weight = item.templateItem.weight ?? 1; // Default weight to 1 if null
      return sum + (item.score || 0) * weight;
    }, 0);
    
    const totalWeight = scoresWithValues.reduce((sum, item) => {
      return sum + (item.templateItem.weight ?? 1);
    }, 0);
    
    currentScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/denetimler">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{audit.template.title}</h1>
          <p className="text-muted-foreground">{audit.template.description}</p>
        </div>
        <Badge 
          variant={audit.status === 'completed' ? 'default' : 'secondary'}
          data-testid="badge-status"
        >
          {audit.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
        </Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            İlerleme ve Skor
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Tamamlanan Maddeler</p>
              <p className="text-2xl font-bold">{answeredItems} / {totalItems}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mevcut Skor</p>
              <p className="text-2xl font-bold text-primary">{currentScore}/100</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-audit" />
        </CardContent>
      </Card>

      {/* Audit Items */}
      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <h2 className="text-xl font-semibold">Denetim Maddeleri</h2>
        
        {audit.items.map((item, index) => {
          const itemType = item.templateItem.itemType || 'checkbox';
          const requiresPhoto = item.templateItem.requiresPhoto || false;

          return (
            <Card key={item.id} data-testid={`card-audit-item-${index}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  {item.templateItem.itemText}
                  {requiresPhoto && (
                    <Badge variant="outline" className="ml-auto">
                      <Camera className="h-3 w-3 mr-1" />
                      Fotoğraf Gerekli
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                {/* Response Input */}
                {itemType === 'checkbox' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight)}
                    data-testid={`radio-group-${index}`}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`yes-${item.id}`} disabled={isCompleted} data-testid={`radio-yes-${index}`} />
                      <Label htmlFor={`yes-${item.id}`}>Evet / Uygun</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`no-${item.id}`} disabled={isCompleted} data-testid={`radio-no-${index}`} />
                      <Label htmlFor={`no-${item.id}`}>Hayır / Uygun Değil</Label>
                    </div>
                  </RadioGroup>
                )}

                {itemType === 'rating' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight)}
                    className="flex gap-2"
                    data-testid={`rating-group-${index}`}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center space-x-1">
                        <RadioGroupItem value={String(rating)} id={`rating-${item.id}-${rating}`} disabled={isCompleted} data-testid={`rating-${index}-${rating}`} />
                        <Label htmlFor={`rating-${item.id}-${rating}`}>{rating}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {itemType === 'text' && (
                  <Textarea
                    value={item.response || ''}
                    onChange={(e) => handleResponseChange(item.templateItemId, e.target.value, itemType, item.templateItem.weight)}
                    disabled={isCompleted}
                    placeholder="Cevabınızı girin..."
                    data-testid={`textarea-response-${index}`}
                  />
                )}

                {itemType === 'multiple_choice' && (
                  <>
                    <RadioGroup
                      value={item.response || ''}
                      onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight, item.templateItem.correctAnswer)}
                      data-testid={`radio-group-mc-${index}`}
                    >
                      {(item.templateItem.options || []).map((option: string, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={option} 
                            id={`option-${item.id}-${optionIndex}`} 
                            disabled={isCompleted}
                            data-testid={`radio-option-${index}-${optionIndex}`} 
                          />
                          <Label htmlFor={`option-${item.id}-${optionIndex}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {/* Feedback for completed audits */}
                    {isCompleted && item.response && item.templateItem.correctAnswer && (
                      <div className={`flex items-center gap-2 p-3 rounded-md ${
                        item.response === item.templateItem.correctAnswer 
                          ? 'bg-green-50 dark:bg-green-950/20' 
                          : 'bg-red-50 dark:bg-red-950/20'
                      }`} data-testid={`feedback-mc-${index}`}>
                        {item.response === item.templateItem.correctAnswer ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Doğru cevap!
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-red-700 dark:text-red-400 block">
                                Yanlış cevap
                              </span>
                              <span className="text-sm text-red-600 dark:text-red-400">
                                Doğru cevap: <strong>{item.templateItem.correctAnswer}</strong>
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Photo Upload */}
                {requiresPhoto && !isCompleted && (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Label>Fotoğraf {requiresPhoto && '*'}</Label>
                    <ObjectUploader
                      onGetUploadParameters={async () => {
                        const res = await fetch('/api/objects/upload', { 
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            fileName: `audit-${auditId}-item-${item.templateItemId}-${Date.now()}.jpg`,
                            contentType: 'image/jpeg',
                            path: '.private/audits'
                          })
                        });
                        const data = await res.json();
                        return { method: "PUT" as const, url: data.url };
                      }}
                      onComplete={(result: any) => {
                        const uploadURL = result.successful?.[0]?.uploadURL;
                        if (uploadURL) {
                          handlePhotoUpload(item.templateItemId, uploadURL);
                        }
                      }}
                      buttonClassName="w-full"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {item.photoUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}
                    </ObjectUploader>
                  </div>
                )}
                {requiresPhoto && item.photoUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Fotoğraf yüklendi
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label>Notlar (Opsiyonel)</Label>
                  <Textarea
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(item.templateItemId, e.target.value)}
                    disabled={isCompleted}
                    placeholder="Ekstra not veya açıklama..."
                    className="h-20"
                    data-testid={`textarea-notes-${index}`}
                  />
                </div>

                {/* Score Display */}
                {item.score !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={item.score >= 70 ? 'default' : item.score >= 40 ? 'secondary' : 'destructive'}>
                      Skor: {item.score}/100
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall Notes and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Genel Değerlendirme</CardTitle>
          <CardDescription>Denetim sonucu genel notlar ve aksiyon öğeleri</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="overall-notes">Genel Notlar</Label>
            <Textarea
              id="overall-notes"
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              disabled={isCompleted}
              placeholder="Denetim hakkında genel gözlemler..."
              className="h-24"
              data-testid="textarea-overall-notes"
            />
          </div>
          <div>
            <Label htmlFor="action-items">Aksiyon Öğeleri</Label>
            <Textarea
              id="action-items"
              value={overallActionItems}
              onChange={(e) => setOverallActionItems(e.target.value)}
              disabled={isCompleted}
              placeholder="Yapılması gerekenler (satır satır)..."
              className="h-24"
              data-testid="textarea-action-items"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex gap-2 sm:gap-3 justify-end sticky bottom-4 bg-background p-3 rounded-lg border">
          <Link href="/denetimler">
            <Button variant="outline" data-testid="button-cancel">
              İptal
            </Button>
          </Link>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || answeredItems < totalItems}
            data-testid="button-complete"
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Denetimi Tamamla
              </>
            )}
          </Button>
        </div>
      )}

      {/* Warning if incomplete */}
      {answeredItems < totalItems && audit.status !== 'completed' && (
        <Card className="border-orange-500">
          <CardContent className="flex items-center gap-2 py-3">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <p className="text-sm">
              Denetimi tamamlamak için tüm maddeleri cevaplamanız gerekiyor.
              ({totalItems - answeredItems} madde kaldı)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
