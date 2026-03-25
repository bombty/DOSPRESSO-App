import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
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
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

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

  const isHQ = !!(user?.role && isHQRole(user.role as any));
  const canManageCampaigns = isHQ;

  const { data: campaigns, isLoading, isError, refetch } = useQuery<Campaign[]>({
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
    onError: (error) => {
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
        return <Badge className="bg-success/10 text-success dark:bg-success/5 dark:text-green-100" data-testid={testId}>Aktif</Badge>;
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
      <div className="p-6">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-kampanya-yonetimi">Kampanya Yönetimi</h1>
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
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
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

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
        <div className="flex flex-col gap-3 sm:gap-4">
          {campaigns.map((campaign) => {
            const isActive = campaign.status === "active";
            const startDate = new Date(campaign.startDate);
            const endDate = new Date(campaign.endDate);
            const today = new Date();
            const daysRemaining = isActive ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`} className="hover-elevate">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium line-clamp-2" data-testid={`text-campaign-name-${campaign.id}`}>
                          {campaign.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{getCampaignTypeLabel(campaign.campaignType)}</p>
                      </div>
                      {getStatusBadge(campaign.status, campaign.id)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(startDate, "dd MMM")} - {format(endDate, "dd MMM")}
                    </p>
                    {isActive && daysRemaining !== null && (
                      <div className="text-xs text-primary">
                        {daysRemaining > 0 ? `${daysRemaining} gün` : "Bugün sona"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
