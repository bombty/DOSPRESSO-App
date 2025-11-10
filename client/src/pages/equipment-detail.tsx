import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { EQUIPMENT_METADATA, insertEquipmentCommentSchema, type EquipmentMaintenanceLog, type EquipmentFault, type EquipmentComment, FAULT_STAGES, type FaultStageType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Settings, Calendar, Wrench, AlertTriangle, MessageSquare, DollarSign, User } from "lucide-react";

interface EquipmentDetailResponse {
  id: number;
  branchId: number;
  equipmentType: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyEndDate: string | null;
  maintenanceResponsible: string;
  faultProtocol: string;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  maintenanceIntervalDays: number | null;
  qrCodeUrl: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  maintenanceLogs: EquipmentMaintenanceLog[];
  faults: EquipmentFault[];
  comments: EquipmentComment[];
}

const commentFormSchema = insertEquipmentCommentSchema.pick({ comment: true });
type CommentFormData = z.infer<typeof commentFormSchema>;

export default function EquipmentDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const equipmentId = parseInt(id!);

  const { data: equipment, isLoading } = useQuery<EquipmentDetailResponse>({
    queryKey: ['/api/equipment', equipmentId],
    enabled: !!equipmentId,
  });

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      comment: "",
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      await apiRequest(`/api/equipment/${equipmentId}/comments`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', equipmentId] });
      toast({ title: "Başarılı", description: "Yorum eklendi" });
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Yorum eklenemedi",
        variant: "destructive",
      });
    },
  });

  const stageLabels: Record<FaultStageType, string> = {
    [FAULT_STAGES.BEKLIYOR]: "Bekliyor",
    [FAULT_STAGES.ISLEME_ALINDI]: "İşleme Alındı",
    [FAULT_STAGES.SERVIS_CAGRILDI]: "Servis Çağrıldı",
    [FAULT_STAGES.KARGOYA_VERILDI]: "Kargoya Verildi",
    [FAULT_STAGES.TESLIM_ALINDI]: "Teslim Alındı",
    [FAULT_STAGES.TAKIP_EDILIYOR]: "Takip Ediliyor",
    [FAULT_STAGES.KAPATILDI]: "Kapatıldı",
  };

  const maintenanceTypeLabels: Record<string, string> = {
    routine: "Rutin Bakım",
    repair: "Onarım",
    calibration: "Kalibrasyon",
    cleaning: "Temizlik",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="space-y-6">
        <Link href="/ekipman" asChild>
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Ekipman bulunamadı</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = EQUIPMENT_METADATA[equipment.equipmentType as keyof typeof EQUIPMENT_METADATA];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ekipman" asChild>
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Button>
        </Link>
      </div>

      <Card data-testid="card-equipment-header">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Settings className="h-6 w-6" />
                {metadata?.nameTr || equipment.equipmentType}
              </CardTitle>
              <CardDescription className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Seri No:</span>
                  <span data-testid="text-serial-number">{equipment.serialNumber || "Belirtilmemiş"}</span>
                </div>
              </CardDescription>
            </div>
            <Badge variant="outline" data-testid="badge-equipment-type">
              {equipment.equipmentType}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {equipment.purchaseDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Satın Alma Tarihi</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-purchase-date">
                    {new Date(equipment.purchaseDate).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            )}
            
            {equipment.warrantyEndDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Garanti Bitiş Tarihi</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-warranty-end">
                    {new Date(equipment.warrantyEndDate).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Bakım Sorumlusu</p>
                <p className="text-sm text-muted-foreground" data-testid="text-maintenance-responsible">
                  {equipment.maintenanceResponsible === 'branch' ? 'Şube' : 'Merkez'}
                </p>
              </div>
            </div>

            {equipment.nextMaintenanceDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Sonraki Bakım Tarihi</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-next-maintenance">
                    {new Date(equipment.nextMaintenanceDate).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {equipment.notes && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-1">Notlar</p>
              <p className="text-sm text-muted-foreground" data-testid="text-notes">
                {equipment.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList data-testid="tabs-equipment-detail">
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">
            Bakım Geçmişi
          </TabsTrigger>
          <TabsTrigger value="faults" data-testid="tab-faults">
            Arızalar
          </TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments">
            Yorumlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bakım Geçmişi</CardTitle>
              <CardDescription>
                Bu ekipmana yapılan tüm bakım kayıtları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.maintenanceLogs.length > 0 ? (
                <div className="space-y-4">
                  {equipment.maintenanceLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 pb-4 border-b last:border-0" data-testid={`maintenance-log-${log.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wrench className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium" data-testid={`text-maintenance-type-${log.id}`}>
                              {maintenanceTypeLabels[log.maintenanceType] || log.maintenanceType}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-maintenance-date-${log.id}`}>
                              {new Date(log.performedAt).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {log.cost && (
                            <Badge variant="outline" data-testid={`badge-cost-${log.id}`}>
                              <DollarSign className="h-3 w-3 mr-1" />
                              ₺{parseFloat(log.cost).toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-maintenance-description-${log.id}`}>
                          {log.description}
                        </p>
                        {log.nextScheduledDate && (
                          <p className="text-xs text-muted-foreground">
                            Sonraki bakım: {new Date(log.nextScheduledDate).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Henüz bakım kaydı yok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Arıza Kayıtları</CardTitle>
              <CardDescription>
                Bu ekipmana bildirilen arızalar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.faults.length > 0 ? (
                <div className="space-y-4">
                  {equipment.faults.map((fault) => (
                    <div key={fault.id} className="flex gap-4 pb-4 border-b last:border-0" data-testid={`fault-${fault.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium" data-testid={`text-fault-equipment-${fault.id}`}>
                              {fault.equipmentName}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-fault-date-${fault.id}`}>
                              {new Date(fault.createdAt!).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              fault.currentStage === FAULT_STAGES.KAPATILDI
                                ? "default"
                                : fault.currentStage === FAULT_STAGES.BEKLIYOR
                                ? "secondary"
                                : "outline"
                            }
                            data-testid={`badge-fault-stage-${fault.id}`}
                          >
                            {stageLabels[fault.currentStage as FaultStageType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-fault-description-${fault.id}`}>
                          {fault.description}
                        </p>
                        {fault.photoUrl && (
                          <img 
                            src={fault.photoUrl} 
                            alt="Arıza fotoğrafı" 
                            className="rounded-md max-h-48 object-cover mt-2"
                            data-testid={`img-fault-photo-${fault.id}`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Henüz arıza bildirimi yok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yorumlar</CardTitle>
              <CardDescription>
                Bu ekipman hakkında yorumlar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {equipment.comments.length > 0 && (
                <div className="space-y-4">
                  {equipment.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 pb-4 border-b" data-testid={`comment-${comment.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-muted-foreground" data-testid={`text-comment-date-${comment.id}`}>
                          {new Date(comment.createdAt!).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm" data-testid={`text-comment-content-${comment.id}`}>
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createCommentMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeni Yorum Ekle</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Yorumunuzu buraya yazın..."
                              data-testid="input-comment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={createCommentMutation.isPending}
                        data-testid="button-submit-comment"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {createCommentMutation.isPending ? "Ekleniyor..." : "Yorum Ekle"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
