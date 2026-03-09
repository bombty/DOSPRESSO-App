import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Megaphone, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ListSkeleton } from "@/components/list-skeleton";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const campaignFormSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().optional(),
  type: z.enum(["promotion", "seasonal", "new_product", "discount"]),
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().min(1, "Bitiş tarihi gerekli"),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface Campaign {
  id: number;
  name: string;
  title?: string;
  description: string | null;
  campaignType: string;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "paused" | "completed";
  priority?: string;
  targetMetric: string | null;
  targetValue: number | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  promotion: "Promosyon",
  seasonal: "Mevsimsel",
  new_product: "Yeni Ürün",
  discount: "İndirim",
  product_launch: "Ürün Lansmanı",
  loyalty: "Sadakat",
  awareness: "Farkındalık",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const STATUS_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "draft", label: "Taslak" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Duraklatıldı" },
  { value: "completed", label: "Tamamlandı" },
];

function getStatusBadge(status: string, id?: number) {
  const testId = id ? `badge-status-${id}` : "badge-status";
  switch (status) {
    case "active":
      return <Badge className="bg-success/10 text-success" data-testid={testId}>Aktif</Badge>;
    case "completed":
      return <Badge variant="outline" data-testid={testId}>Tamamlandı</Badge>;
    case "paused":
      return <Badge variant="secondary" data-testid={testId}>Duraklatıldı</Badge>;
    default:
      return <Badge variant="outline" data-testid={testId}>Taslak</Badge>;
  }
}

function getTypeBadge(type: string) {
  return <Badge variant="secondary" data-testid={`badge-type-${type}`}>{TYPE_LABELS[type] || type}</Badge>;
}

export default function CRMCampaigns() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: campaigns, isLoading, isError, refetch } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "promotion",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      priority: "medium",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      await apiRequest("POST", "/api/campaigns", {
        name: data.title,
        campaignType: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description || null,
        targetMetric: data.priority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Başarılı", description: "Kampanya oluşturuldu" });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message || "Kampanya oluşturulamadı", variant: "destructive" });
    },
  });

  const filtered = campaigns?.filter(
    (c) => statusFilter === "all" || c.status === statusFilter
  );

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="p-4">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4" data-testid="crm-campaigns-page">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-campaigns">Kampanyalar</h1>
          <p className="text-sm text-muted-foreground">CRM kampanya yönetimi</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-new-campaign">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kampanya
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            data-testid={`filter-status-${f.value}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {!filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-campaigns">
              {statusFilter !== "all" ? "Bu filtreye uygun kampanya bulunamadı" : "Henüz kampanya bulunmuyor"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((campaign) => (
            <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium" data-testid={`text-campaign-title-${campaign.id}`}>
                        {campaign.title || campaign.name}
                      </h3>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{campaign.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {getTypeBadge(campaign.campaignType)}
                      {getStatusBadge(campaign.status, campaign.id)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1" data-testid={`text-dates-${campaign.id}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(campaign.startDate), "dd.MM.yyyy")} - {format(new Date(campaign.endDate), "dd.MM.yyyy")}
                    </span>
                    {campaign.priority && (
                      <span data-testid={`text-priority-${campaign.id}`}>
                        {PRIORITY_LABELS[campaign.priority] || campaign.priority}
                      </span>
                    )}
                    {campaign.targetMetric && !campaign.priority && (
                      <span data-testid={`text-priority-${campaign.id}`}>
                        {PRIORITY_LABELS[campaign.targetMetric] || campaign.targetMetric}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kampanya</DialogTitle>
            <DialogDescription>Yeni bir kampanya oluşturun</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Kampanya başlığı" data-testid="input-campaign-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Kampanya açıklaması..." rows={3} data-testid="textarea-campaign-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tür</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign-type">
                          <SelectValue placeholder="Tür seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="promotion">Promosyon</SelectItem>
                        <SelectItem value="seasonal">Mevsimsel</SelectItem>
                        <SelectItem value="new_product">Yeni Ürün</SelectItem>
                        <SelectItem value="discount">İndirim</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öncelik</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Öncelik seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                        <SelectItem value="critical">Kritik</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
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
    </div>
  );
}