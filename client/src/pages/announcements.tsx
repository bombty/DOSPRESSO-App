import { useState, useEffect } from "react";
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
import { Megaphone, Plus, AlertCircle, Calendar, User, Download, FileText, FileImage } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Uppy from "@uppy/core";
import { Dashboard as UppyDashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

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
  const [showUploadStep, setShowUploadStep] = useState(false);
  const [createdAnnouncementId, setCreatedAnnouncementId] = useState<number | null>(null);
  const [uppy, setUppy] = useState<Uppy | null>(null);

  const isHQ = user?.role && isHQRole(user.role as any);

  useEffect(() => {
    if (showUploadStep && createdAnnouncementId) {
      const uppyInstance = new Uppy({
        restrictions: {
          maxFileSize: 10 * 1024 * 1024,
          allowedFileTypes: ['image/*', 'application/pdf'],
        },
        autoProceed: false,
      }).use(AwsS3, {
        async getUploadParameters(file) {
          const token = localStorage.getItem('dospresso_token');
          const response = await fetch(
            `/api/object-storage/presigned-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          
          if (!response.ok) throw new Error('Failed to get presigned URL');
          
          const data = await response.json();
          return {
            method: 'PUT',
            url: data.url,
            fields: {},
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          };
        },
      });

      uppyInstance.on('complete', async (result) => {
        if (result.successful.length > 0 && createdAnnouncementId) {
          for (const file of result.successful) {
            const s3Url = (file.uploadURL as string).split('?')[0];
            const fileType = file.type?.startsWith('image/') ? 'image' : 'pdf';
            
            await apiRequest('POST', `/api/announcements/${createdAnnouncementId}/attachments`, {
              url: s3Url,
              fileType,
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
          toast({
            title: "Başarılı",
            description: `${result.successful.length} dosya yüklendi`,
          });
          
          setShowUploadStep(false);
          setCreatedAnnouncementId(null);
          setIsCreateDialogOpen(false);
        }
      });

      setUppy(uppyInstance);

      return () => {
        uppyInstance.close();
      };
    }
  }, [showUploadStep, createdAnnouncementId]);

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
      const response = await apiRequest('POST', '/api/announcements', data);
      return response as { id: number };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Başarılı",
        description: "Duyuru oluşturuldu. Şimdi dosya ekleyebilirsiniz (opsiyonel).",
      });
      setCreatedAnnouncementId(response.id);
      setShowUploadStep(true);
      form.reset();
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

  const handleSkipUpload = () => {
    setShowUploadStep(false);
    setCreatedAnnouncementId(null);
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
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
