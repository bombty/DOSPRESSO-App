import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Users,
  Star,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { DobodySuggestionList } from "@/components/dobody-suggestion-card";
import { DobodyFlowMode } from "@/components/dobody-flow-mode";

interface FranchiseSummaryData {
  branches: Array<{
    id: number;
    name: string;
    staffCount: number;
    avgRating: number;
    feedbackCount: number;
  }>;
  totalBranches: number;
  suggestions: Array<{
    id: string;
    message: string;
    actionType: string;
    actionLabel: string;
    priority: string;
    icon: string;
    targetUserId?: string;
    payload?: Record<string, any>;
  }>;
}

export default function FranchiseOzet() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<FranchiseSummaryData>({
    queryKey: ["/api/franchise-summary"],
  });

  const quickAction = useMutation({
    mutationFn: async (action: any) => {
      const res = await apiRequest("POST", "/api/quick-action", action);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.details) {
        const d = data.details;
        const time = d.sentAt ? new Date(d.sentAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
        toast({
          title: "Bildirim Gönderildi",
          description: `${d.recipientName}${d.recipientRole ? ` (${d.recipientRole})` : ""}${d.branch ? ` — ${d.branch}` : ""}${time ? ` • ${time}` : ""}`,
        });
      } else {
        toast({ title: "İşlem tamamlandı", description: data.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-summary"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem gerçekleştirilemedi", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-lg mx-auto" data-testid="franchise-ozet-loading">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 max-w-lg mx-auto" data-testid="franchise-ozet-error">
        <Card><CardContent className="p-6 text-center text-muted-foreground">Veriler yüklenemedi</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto overflow-y-auto h-full" data-testid="franchise-ozet-page">
      <DobodyFlowMode
        userId={user?.id || ""}
        userRole={user?.role || ""}
        userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
        branchId={user?.branchId ? Number(user.branchId) : null}
      />
      <div data-testid="franchise-header">
        <h1 className="text-xl font-bold" data-testid="text-franchise-title">Franchise Özet</h1>
        <p className="text-sm text-muted-foreground">{data.totalBranches} şube</p>
      </div>

      {data.branches.map((branch) => (
        <Card key={branch.id} data-testid={`card-branch-${branch.id}`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{branch.name}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{branch.staffCount}</span>
                <span className="text-xs text-muted-foreground">personel</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-sm font-medium">{branch.avgRating || "---"}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{branch.feedbackCount}</span>
                <span className="text-xs text-muted-foreground">yorum</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <DobodySuggestionList
        suggestions={data.suggestions || []}
        title="Mr. Dobody Önerileri"
        onAction={(s) => quickAction.mutate({
          actionType: "send_notification",
          targetUserId: s.targetUserId || s.payload?.userIds?.[0],
          title: s.actionLabel,
          message: s.message,
          suggestionId: s.id,
        })}
        isPending={quickAction.isPending}
      />

      {data.branches.length === 0 && (
        <Card data-testid="card-no-branches">
          <CardContent className="p-6 text-center text-muted-foreground">
            Görüntülenecek şube bulunamadı
          </CardContent>
        </Card>
      )}

      <div className="pb-4">
        <Link href="/">
          <Button variant="outline" className="w-full" data-testid="btn-detailed-dashboard">
            <ExternalLink className="h-4 w-4 mr-2" />
            Detaylı Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
