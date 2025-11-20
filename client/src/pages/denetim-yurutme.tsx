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
  Save, Send, AlertCircle, Loader2 
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

  const handleResponseChange = (templateItemId: number, response: string, itemType: string) => {
    // Calculate score based on response and item type
    let score: number = 0;
    if (itemType === 'checkbox') {
      score = response === 'yes' ? 100 : 0;
    } else if (itemType === 'rating') {
      const rating = parseInt(response);
      score = (rating / 5) * 100;
    } else {
      // For text/photo responses, default to neutral score
      score = 50;
    }

    updateItemMutation.mutate({
      templateItemId,
      updates: { response, score },
    });
  };

  const handleNotesChange = (templateItemId: number, notes: string) => {
    updateItemMutation.mutate({
      templateItemId,
      updates: { notes },
    });
  };

  const handlePhotoUpload = (templateItemId: number, uploadURL: string) => {
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
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-lg text-muted-foreground">Denetim bulunamadı</p>
        <Link href="/denetimler">
          <Button>Denetimlere Dön</Button>
        </Link>
      </div>
    );
  }

  // Calculate progress
  const answeredItems = audit.items.filter(item => item.response !== null).length;
  const totalItems = audit.items.length;
  const progress = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;

  // Calculate current average score
  const scoresWithValues = audit.items.filter(item => item.score !== null);
  const currentScore = scoresWithValues.length > 0
    ? Math.round(scoresWithValues.reduce((sum, item) => sum + (item.score || 0), 0) / scoresWithValues.length)
    : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/denetimler">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
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
            <Star className="h-5 w-5 text-primary" />
            İlerleme ve Skor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
      <div className="space-y-4">
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
              <CardContent className="space-y-4">
                {/* Response Input */}
                {itemType === 'checkbox' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType)}
                    data-testid={`radio-group-${index}`}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`yes-${item.id}`} data-testid={`radio-yes-${index}`} />
                      <Label htmlFor={`yes-${item.id}`}>Evet / Uygun</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`no-${item.id}`} data-testid={`radio-no-${index}`} />
                      <Label htmlFor={`no-${item.id}`}>Hayır / Uygun Değil</Label>
                    </div>
                  </RadioGroup>
                )}

                {itemType === 'rating' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType)}
                    className="flex gap-2"
                    data-testid={`rating-group-${index}`}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center space-x-1">
                        <RadioGroupItem value={String(rating)} id={`rating-${item.id}-${rating}`} data-testid={`rating-${index}-${rating}`} />
                        <Label htmlFor={`rating-${item.id}-${rating}`}>{rating}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {itemType === 'text' && (
                  <Textarea
                    value={item.response || ''}
                    onChange={(e) => handleResponseChange(item.templateItemId, e.target.value, itemType)}
                    placeholder="Cevabınızı girin..."
                    data-testid={`textarea-response-${index}`}
                  />
                )}

                {/* Photo Upload */}
                {requiresPhoto && (
                  <div className="space-y-2">
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
                    {item.photoUrl && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Fotoğraf yüklendi
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label>Notlar (Opsiyonel)</Label>
                  <Textarea
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(item.templateItemId, e.target.value)}
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
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="overall-notes">Genel Notlar</Label>
            <Textarea
              id="overall-notes"
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
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
              placeholder="Yapılması gerekenler (satır satır)..."
              className="h-24"
              data-testid="textarea-action-items"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end sticky bottom-4 bg-background p-4 rounded-lg border">
        <Link href="/denetimler">
          <Button variant="outline" data-testid="button-cancel">
            İptal
          </Button>
        </Link>
        <Button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending || audit.status === 'completed' || answeredItems < totalItems}
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

      {/* Warning if incomplete */}
      {answeredItems < totalItems && audit.status !== 'completed' && (
        <Card className="border-orange-500">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-orange-500" />
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
