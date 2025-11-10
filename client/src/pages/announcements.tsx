import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isHQRole, insertAnnouncementSchema, type Announcement, type InsertAnnouncement, type Branch } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, AlertCircle, Calendar, User, Paperclip } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const priorityLabels: Record<string, string> = {
  normal: "Normal",
  urgent: "Acil",
};

type AnnouncementWithUser = Announcement & {
  createdBy: {
    fullName: string;
  };
};

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const isHQ = user?.role && isHQRole(user.role as any);

  const { data: announcements, isLoading } = useQuery<AnnouncementWithUser[]>({
    queryKey: ['/api/announcements'],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const form = useForm<InsertAnnouncement>({
    resolver: zodResolver(insertAnnouncementSchema),
    defaultValues: {
      title: "",
      message: "",
      priority: "normal",
      targetRoles: null,
      targetBranches: null,
      expiresAt: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAnnouncement) => {
      await apiRequest('POST', '/api/announcements', { ...data, attachments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Başarılı",
        description: "Duyuru yayınlandı",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      setAttachments([]);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Duyuru yayınlanamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertAnnouncement) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Duyurular
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Şirket geneli duyuru ve bildirimler
          </p>
        </div>

        {isHQ && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-announcement">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Duyuru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Yeni Duyuru Yayınla</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Duyuru başlığı" data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mesaj</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Duyuru içeriği..."
                            rows={4}
                            data-testid="input-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Öncelik</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="urgent">Acil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Acil duyurular kırmızı renkle gösterilir
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetRoles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hedef Roller (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={(value) => {
                              const current = field.value || [];
                              if (value === 'all') {
                                field.onChange(null);
                              } else if (current.includes(value)) {
                                field.onChange(current.filter((r: string) => r !== value));
                              } else {
                                field.onChange([...current, value]);
                              }
                            }}
                            value={field.value?.[0] || ''}
                          >
                            <SelectTrigger data-testid="select-target-roles">
                              <SelectValue placeholder={field.value && field.value.length > 0 ? `${field.value.length} rol seçildi` : "Tüm roller"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tüm Roller</SelectItem>
                              <SelectItem value="supervisor">Supervisorler</SelectItem>
                              <SelectItem value="barista">Baristalar</SelectItem>
                              <SelectItem value="stajyer">Stajyerler</SelectItem>
                              <SelectItem value="coach">Coach'lar (HQ)</SelectItem>
                              <SelectItem value="muhasebe">Muhasebe (HQ)</SelectItem>
                              <SelectItem value="teknik">Teknik (HQ)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Boş bırakırsan tüm rollere gönderilir
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetBranches"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hedef Şubeler (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={(value) => {
                              const current = field.value || [];
                              if (value === 'all') {
                                field.onChange(null);
                              } else {
                                const branchId = parseInt(value);
                                if (current.includes(branchId)) {
                                  field.onChange(current.filter((id: number) => id !== branchId));
                                } else {
                                  field.onChange([...current, branchId]);
                                }
                              }
                            }}
                            value={field.value?.[0]?.toString() || ''}
                          >
                            <SelectTrigger data-testid="select-target-branches">
                              <SelectValue placeholder={field.value && field.value.length > 0 ? `${field.value.length} şube seçildi` : "Tüm şubeler"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tüm Şubeler</SelectItem>
                              {branches?.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Boş bırakırsan tüm şubelere gönderilir
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Son Geçerlilik Tarihi (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                            data-testid="input-expires-at"
                          />
                        </FormControl>
                        <FormDescription>
                          Boş bırakılırsa duyuru süresiz aktif kalır
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div>
                      <FormLabel>Dosya Ekle (Opsiyonel)</FormLabel>
                      <div className="mt-2">
                        <ObjectUploader
                          maxFileSize={10 * 1024 * 1024}
                          maxNumberOfFiles={5}
                          onGetUploadParameters={async () => {
                            const response = await apiRequest('POST', '/api/object-storage/presigned-url', {
                              filename: `announcement-${Date.now()}.file`,
                              contentType: 'application/octet-stream',
                            });
                            const data = await response.json();
                            return { method: 'PUT' as const, url: data.url };
                          }}
                          onComplete={(result) => {
                            const urls = result.successful.map(f => f.uploadURL || '');
                            setAttachments([...attachments, ...urls]);
                            toast({ title: "Başarılı", description: `${urls.length} dosya yüklendi` });
                          }}
                        >
                          <Button type="button" variant="outline" size="sm">
                            <Paperclip className="w-4 h-4 mr-2" />
                            Dosya Seç
                          </Button>
                        </ObjectUploader>
                      </div>
                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {attachments.map((url, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Paperclip className="w-3 h-3" />
                              <span className="truncate flex-1">{url.split('/').pop()}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                              >
                                Sil
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.setValue('targetRoles', null);
                        form.setValue('targetBranches', null);
                      }}
                      data-testid="button-send-all"
                    >
                      Herkese Gönder
                    </Button>
                  </div>

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMutation.isPending ? "Yayınlanıyor..." : "Yayınla"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const isUrgent = announcement.priority === 'urgent';
            const isActive = announcement.publishedAt && (!announcement.expiresAt || new Date(announcement.expiresAt) > new Date());
            const Icon = isUrgent ? AlertCircle : Megaphone;

            return (
              <Card 
                key={announcement.id}
                className={isUrgent ? 'border-destructive' : ''}
                data-testid={`card-announcement-${announcement.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${isUrgent ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <Icon className={`w-5 h-5 ${isUrgent ? 'text-destructive' : ''}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg" data-testid={`text-title-${announcement.id}`}>
                            {announcement.title}
                          </CardTitle>
                          <Badge 
                            variant={isUrgent ? "destructive" : "secondary"}
                            data-testid={`badge-priority-${announcement.id}`}
                          >
                            {priorityLabels[announcement.priority]}
                          </Badge>
                          {!isActive && (
                            <Badge variant="outline" data-testid={`badge-expired-${announcement.id}`}>
                              Süresi Dolmuş
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm" data-testid={`text-message-${announcement.id}`}>
                    {announcement.message}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span data-testid={`text-author-${announcement.id}`}>
                        {announcement.createdBy.fullName}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span data-testid={`text-published-${announcement.id}`}>
                        {announcement.publishedAt 
                          ? format(new Date(announcement.publishedAt), "d MMMM yyyy HH:mm", { locale: tr })
                          : "Taslak"}
                      </span>
                    </div>

                    {announcement.expiresAt && (
                      <div className="flex items-center gap-1">
                        <span data-testid={`text-expires-${announcement.id}`}>
                          Son: {format(new Date(announcement.expiresAt), "d MMMM yyyy", { locale: tr })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Henüz duyuru yok
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
