import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Megaphone, Plus, Users, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const CreateCampaignFormSchema = z.object({
  name: z.string().min(1, "Kampanya adı gerekli"),
  description: z.string().optional(),
  campaignType: z.enum(["product_launch", "seasonal", "discount", "loyalty", "awareness"]),
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().min(1, "Bitiş tarihi gerekli"),
  targetMetric: z.string().optional(),
  targetValue: z.string().optional(),
});

type CreateCampaignFormValues = z.infer<typeof CreateCampaignFormSchema>;

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  campaignType: string;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "paused" | "completed";
  targetMetric: string | null;
  targetValue: number | null;
  imageUrl: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: number;
  name: string;
  shortName: string;
}

export default function KampanyaYonetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isHQ = user?.role && isHQRole(user.role as any);
  const canManageCampaigns = isHQ;

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: canManageCampaigns,
  });

  const form = useForm<CreateCampaignFormValues>({
    resolver: zodResolver(CreateCampaignFormSchema),
    defaultValues: {
      name: "",
      description: "",
      campaignType: "seasonal",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      targetMetric: "",
      targetValue: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCampaignFormValues) => {
      await apiRequest("POST", "/api/campaigns", {
        ...data,
        targetValue: data.targetValue ? parseFloat(data.targetValue) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Başarılı", description: "Kampanya oluşturuldu" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kampanya oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, campaignId?: number) => {
    const testId = campaignId ? `badge-status-${campaignId}` : "badge-status";
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" data-testid={testId}>Aktif</Badge>;
      case "completed":
        return <Badge variant="outline" data-testid={testId}>Tamamlandı</Badge>;
      case "paused":
        return <Badge variant="secondary" data-testid={testId}>Duraklatıldı</Badge>;
      default:
        return <Badge variant="outline" data-testid={testId}>Taslak</Badge>;
    }
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      product_launch: "Ürün Lansmanı",
      seasonal: "Mevsimsel",
      discount: "İndirim",
      loyalty: "Sadakat",
      awareness: "Farkındalık",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-kampanya-yonetimi">Kampanya Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Pazarlama kampanyalarını oluşturun ve yönetin</p>
        </div>
        {canManageCampaigns && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-campaign">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kampanya
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Kampanya Oluştur</DialogTitle>
                <DialogDescription>Yeni bir pazarlama kampanyası başlatın</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kampanya Adı</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Örn: Yaz Sezonu 2024" data-testid="input-campaign-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="campaignType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kampanya Tipi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-campaign-type">
                              <SelectValue placeholder="Kampanya tipi seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product_launch">Ürün Lansmanı</SelectItem>
                            <SelectItem value="seasonal">Mevsimsel</SelectItem>
                            <SelectItem value="discount">İndirim</SelectItem>
                            <SelectItem value="loyalty">Sadakat</SelectItem>
                            <SelectItem value="awareness">Farkındalık</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlangıç Tarihi</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bitiş Tarihi</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Kampanya açıklaması..." rows={3} data-testid="textarea-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                      İptal
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-campaign">
                      {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-campaigns">Henüz kampanya bulunmuyor</p>
            {canManageCampaigns && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4" data-testid="button-create-first-campaign">
                <Plus className="w-4 h-4 mr-2" />
                İlk Kampanyayı Oluştur
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const isActive = campaign.status === "active";
            const startDate = new Date(campaign.startDate);
            const endDate = new Date(campaign.endDate);
            const today = new Date();
            const daysRemaining = isActive ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`} className="hover-elevate">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg" data-testid={`text-campaign-name-${campaign.id}`}>
                        {campaign.name}
                      </CardTitle>
                      <CardDescription>{getCampaignTypeLabel(campaign.campaignType)}</CardDescription>
                    </div>
                    {getStatusBadge(campaign.status, campaign.id)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-campaign-description-${campaign.id}`}>
                      {campaign.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>Başlangıç</span>
                      </div>
                      <p className="font-medium" data-testid={`text-start-date-${campaign.id}`}>
                        {format(startDate, "dd MMM yyyy")}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>Bitiş</span>
                      </div>
                      <p className="font-medium" data-testid={`text-end-date-${campaign.id}`}>
                        {format(endDate, "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>

                  {isActive && daysRemaining !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-muted-foreground">
                        {daysRemaining > 0 ? `${daysRemaining} gün kaldı` : "Bugün sona eriyor"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
